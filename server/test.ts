import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './index'
import { createFansStore, isVoteLocked } from './fans'
import { syncOfficial } from './official-sync'

const dir = mkdtempSync(join(tmpdir(), 'xiangchao-server-'))
const dataFile = join(dir, 'data.json')
copyFileSync(join(import.meta.dirname, 'data.json'), dataFile)

const fansFile = join(dir, 'fans.json')
const app = createApp({
  dataFile,
  adminToken: 'test-token',
  fansFile,
  allowDevAuth: true,
  devAuthToken: 'test-dev',
  ai: { mock: true },
})
const server = app.listen(0)
const port = (server.address() as { port: number }).port
const base = `http://127.0.0.1:${port}`

after(() => {
  server.close()
  rmSync(dir, { recursive: true, force: true })
})

test('health and real league data', async () => {
  const health = await fetch(`${base}/api/health`).then((r) => r.json())
  assert.equal(health.ok, true)
  assert.equal(health.matches, 103)

  const league = await fetch(`${base}/api/league`).then((r) => r.json())
  assert.equal(league.teams.length, 14)
  assert.equal(league.matches.length, 103)
  assert.equal(league.meta.totalRounds, 13)
  assert.equal(league.matches.filter((m: any) => m.phase === 'league').length, 91)
  assert.equal(league.matches.filter((m: any) => m.phase === 'knockout').length, 12)
  assert.equal(league.matches.find((m: any) => m.id === 'm664647').homeGoals, 4)
})

test('admin update requires token and changes standings', async () => {
  const before = await fetch(`${base}/api/standings`).then((r) => r.json())
  const matches = await fetch(`${base}/api/matches`).then((r) => r.json()).then((d) => d.matches)
  // Pick a finished league draw so a new home win changes the table.
  const target = matches.find(
    (m: any) =>
      m.phase === 'league' &&
      m.status === 'finished' &&
      m.homeGoals === m.awayGoals,
  )

  const denied = await fetch(`${base}/api/admin/matches/${target.id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'finished', homeGoals: 5, awayGoals: 0 }),
  })
  assert.equal(denied.status, 401)

  const saved = await fetch(`${base}/api/admin/matches/${target.id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': 'test-token' },
    body: JSON.stringify({ status: 'finished', homeGoals: 5, awayGoals: 0 }),
  })
  assert.equal(saved.status, 200)
  const { match } = await saved.json()
  assert.equal(match.status, 'finished')
  assert.equal(match.homeGoals, 5)
  assert.equal(match.awayGoals, 0)
  assert.equal(match.events.length, 0)

  const after = await fetch(`${base}/api/standings`).then((r) => r.json())
  const beforeRow = before.find((r: any) => r.teamId === target.home)
  const afterRow = after.find((r: any) => r.teamId === target.home)
  assert.equal(afterRow.played, beforeRow.played)
  assert.ok(afterRow.points > beforeRow.points)
})


async function devLogin(deviceId: string, nickname = '测试球迷') {
  const res = await fetch(`${base}/api/auth/dev`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dev-token': 'test-dev' },
    body: JSON.stringify({ deviceId, nickname }),
  })
  assert.equal(res.status, 200)
  return res.json() as Promise<{ token: string; user: { id: string; nickname: string } }>
}

test('fan auth requires the dev token', async () => {
  const denied = await fetch(`${base}/api/auth/dev`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-dev-token': 'wrong' },
    body: JSON.stringify({ deviceId: 'device-0001' }),
  })
  assert.equal(denied.status, 403)

  const apple = await fetch(`${base}/api/auth/apple`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identityToken: 'x'.repeat(30) }),
  })
  assert.equal(apple.status, 501)
})

test('vote, change vote, lock finished matches and aggregate counts', async () => {
  const { token, user } = await devLogin('device-vote-1', '投票球迷')
  assert.equal(user.nickname, '投票球迷')

  const matches = await fetch(`${base}/api/matches`).then((r) => r.json()).then((d) => d.matches)
  const upcoming = matches.find((m: any) => m.status === 'upcoming')
  const finished = matches.find((m: any) => m.status === 'finished')
  assert.ok(upcoming)
  assert.ok(finished)

  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` }
  const first = await fetch(`${base}/api/fans/votes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ matchId: upcoming.id, choice: 'home' }),
  })
  assert.equal(first.status, 200)
  const firstBody = await first.json()
  assert.equal(firstBody.counts.home, 1)
  assert.equal(firstBody.mine, 'home')
  assert.equal(firstBody.locked, false)

  const changed = await fetch(`${base}/api/fans/votes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ matchId: upcoming.id, choice: 'draw' }),
  })
  const changedBody = await changed.json()
  assert.equal(changedBody.counts.home, 0)
  assert.equal(changedBody.counts.draw, 1)
  assert.equal(changedBody.counts.total, 1)

  const denied = await fetch(`${base}/api/fans/votes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ matchId: finished.id, choice: 'home' }),
  })
  assert.equal(denied.status, 409)

  const summary = await fetch(`${base}/api/fans/votes/${upcoming.id}`, {
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => r.json())
  assert.equal(summary.mine, 'draw')
  assert.equal(summary.counts.total, 1)
})

test('cheer daily limit and board totals', async () => {
  const { token } = await devLogin('device-cheer-1', '助威球迷')
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` }

  let last = 0
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${base}/api/fans/cheers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ teamId: 'cs' }),
    })
    last = res.status
    assert.equal(res.status, 200)
  }
  assert.equal(last, 200)

  const blocked = await fetch(`${base}/api/fans/cheers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ teamId: 'cs' }),
  })
  assert.equal(blocked.status, 429)

  const me = await fetch(`${base}/api/fans/me`, { headers }).then((r) => r.json())
  assert.equal(me.cheersToday, 20)
  assert.equal(me.cheersRemaining, 0)

  const board = await fetch(`${base}/api/fans/board`, {
    headers: { authorization: `Bearer ${token}` },
  }).then((r) => r.json())
  assert.equal(board.teams.length, 14)
  const changsha = board.teams.find((t: any) => t.teamId === 'cs')
  assert.ok(changsha.count >= 20)

  const renamed = await fetch(`${base}/api/fans/me`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ nickname: '改名球迷' }),
  })
  assert.equal(renamed.status, 200)
  assert.equal((await renamed.json()).nickname, '改名球迷')

  const renamedMe = await fetch(`${base}/api/fans/me`, { headers }).then((r) => r.json())
  assert.equal(renamedMe.user.nickname, '改名球迷')

  const deleted = await fetch(`${base}/api/fans/me`, { method: 'DELETE', headers })
  assert.equal(deleted.status, 204)
  const after = await fetch(`${base}/api/fans/me`, { headers })
  assert.equal(after.status, 401)
})

test('scoring counts settled predictions', () => {
  const fans = createFansStore(join(dir, 'score-fans.json'))
  const user = fans.createUser({ nickname: '积分球迷' })
  const match = {
    id: 'test-match',
    status: 'finished',
    date: '2026-11-01',
    time: '19:30',
    homeGoals: 2,
    awayGoals: 1,
  }
  fans.recordVote(user.id, match.id, 'home')
  const profile = fans.meProfile(user.id, [match as any])
  assert.equal(profile?.points, 10)
  assert.equal(profile?.correct, 1)
  assert.equal(profile?.rank, 1)

  const locked = isVoteLocked({ ...match, status: 'upcoming', date: '2020-01-01' } as any)
  assert.equal(locked, true)
})


test('ai preview is disabled without a key', async () => {
  const plainApp = createApp({
    dataFile,
    adminToken: 'test-token',
    fansFile: join(dir, 'fans-ai-plain.json'),
  })
  const plainServer = plainApp.listen(0)
  const plainPort = (plainServer.address() as { port: number }).port
  try {
    const status = await fetch(`http://127.0.0.1:${plainPort}/api/ai/status`).then((r) => r.json())
    assert.equal(status.configured, false)
    const matches = await fetch(`http://127.0.0.1:${plainPort}/api/matches`).then((r) => r.json()).then((d) => d.matches)
    const upcoming = matches.find((m: any) => m.status === 'upcoming')
    const denied = await fetch(`http://127.0.0.1:${plainPort}/api/ai/preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ matchId: upcoming.id }),
    })
    assert.equal(denied.status, 503)
  } finally {
    plainServer.close()
  }
})

test('ai preview returns a cached structured prediction', async () => {
  const matches = await fetch(`${base}/api/matches`).then((r) => r.json()).then((d) => d.matches)
  const upcoming = matches.find((m: any) => m.status === 'upcoming')
  const finished = matches.find((m: any) => m.status === 'finished')

  const first = await fetch(`${base}/api/ai/preview`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ matchId: upcoming.id }),
  })
  assert.equal(first.status, 200)
  const body = await first.json()
  assert.equal(body.matchId, upcoming.id)
  assert.ok(['home', 'draw', 'away'].includes(body.prediction.result))
  assert.equal(body.prediction.score.length, 2)
  assert.ok(body.prediction.analysis.length > 10)
  assert.equal(body.cached, false)

  const second = await fetch(`${base}/api/ai/preview`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ matchId: upcoming.id }),
  }).then((r) => r.json())
  assert.equal(second.cached, true)

  const denied = await fetch(`${base}/api/ai/preview`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ matchId: finished.id }),
  })
  assert.equal(denied.status, 409)
})


test('account preferences sync favourite team and reminders', async () => {
  const { token } = await devLogin('device-prefs-1', '偏好球迷')
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` }
  const matches = await fetch(`${base}/api/matches`).then((r) => r.json()).then((d) => d.matches)
  const upcoming = matches.find((m: any) => m.status === 'upcoming')

  const saved = await fetch(`${base}/api/fans/preferences`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ favouriteTeam: 'yz', reminders: [upcoming.id, 'missing-match'] }),
  })
  assert.equal(saved.status, 200)
  const body = await saved.json()
  assert.equal(body.preferences.favouriteTeam, 'yz')
  assert.deepEqual(body.preferences.reminders, [upcoming.id])

  const me = await fetch(`${base}/api/fans/me`, { headers }).then((r) => r.json())
  assert.equal(me.preferences.favouriteTeam, 'yz')
  assert.deepEqual(me.preferences.reminders, [upcoming.id])

  const invalid = await fetch(`${base}/api/fans/preferences`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ favouriteTeam: 'nope', reminders: [] }),
  })
  assert.equal(invalid.status, 400)
})


test('admin saves live minute, attendance, log and backup', async () => {
  const matches = await fetch(`${base}/api/matches`).then((r) => r.json()).then((d) => d.matches)
  const target = matches.find((m: any) => m.phase === 'knockout' && m.status === 'upcoming')
  assert.ok(target)

  const denied = await fetch(`${base}/api/admin/log`)
  assert.equal(denied.status, 401)

  const beforeBackups = existsSync(join(dir, 'backups'))
    ? readdirSync(join(dir, 'backups')).filter((name) => name.startsWith('data-')).length
    : 0

  const saved = await fetch(`${base}/api/admin/matches/${target.id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': 'test-token' },
    body: JSON.stringify({ status: 'live', homeGoals: 1, awayGoals: 0, startMinute: 67, attendance: 12000 }),
  })
  assert.equal(saved.status, 200)
  const { match } = await saved.json()
  assert.equal(match.status, 'live')
  assert.equal(match.startMinute, 67)
  assert.equal(match.attendance, 12000)

  const invalid = await fetch(`${base}/api/admin/matches/${target.id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-token': 'test-token' },
    body: JSON.stringify({ status: 'live', homeGoals: 1, awayGoals: 0, startMinute: 200 }),
  })
  assert.equal(invalid.status, 400)

  const log = await fetch(`${base}/api/admin/log`, {
    headers: { 'x-admin-token': 'test-token' },
  }).then((r) => r.json())
  assert.equal(log.entries[0].matchId, target.id)
  assert.equal(log.entries[0].after.startMinute, 67)
  assert.equal(log.entries[0].after.attendance, 12000)

  const afterBackups = readdirSync(join(dir, 'backups')).filter((name) => name.startsWith('data-')).length
  assert.ok(afterBackups > beforeBackups)
})


test('fresh volume seeds data and serves the privacy page', async () => {
  const seedDir = mkdtempSync(join(tmpdir(), 'xiangchao-seed-'))
  const second = createApp({
    dataFile: join(seedDir, 'nested', 'data.json'),
    fansFile: join(seedDir, 'fans.json'),
    adminToken: 'test-token',
    ai: { mock: true },
  })
  const server2 = second.listen(0)
  const port2 = (server2.address() as { port: number }).port
  try {
    const health = await fetch(`http://127.0.0.1:${port2}/api/health`).then((r) => r.json())
    assert.equal(health.ok, true)
    assert.equal(health.matches, 103)

    const privacy = await fetch(`http://127.0.0.1:${port2}/privacy.html`)
    assert.equal(privacy.status, 200)
    assert.match(await privacy.text(), /隐私政策/)
  } finally {
    server2.close()
    rmSync(seedDir, { recursive: true, force: true })
  }
})


test('official sync updates finished scores, live status and player stats', async () => {
  const originalFetch = globalThis.fetch
  const baseMatch = {
    round: 1,
    phase: 'league',
    stage: '第1轮',
    leg: null,
    venue: '',
    penalty: null,
    startMinute: null,
    attendance: 0,
    events: [],
    stats: { possession: [50, 50], shots: [0, 0], onTarget: [0, 0], corners: [0, 0], fouls: [0, 0] },
  }
  const store = {
    updatedAt: '',
    matches: [
      { ...baseMatch, id: 'm1', date: '2026-11-21', time: '19:38', home: 'cs', away: 'yz', status: 'upcoming', homeGoals: 0, awayGoals: 0 },
      { ...baseMatch, id: 'm2', date: '2026-11-21', time: '20:00', home: 'ld', away: 'xt', status: 'upcoming', homeGoals: 0, awayGoals: 0 },
    ],
    squads: { cs: [], yz: [], ld: [], xt: [] },
  } as any

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/league/26854/')) {
      return new Response('<input id="_token" value="test-token">')
    }
    if (url.includes('players_and_staff')) {
      return new Response(JSON.stringify({
        result: {
          players: [{
            user_id: 9,
            nickname: '测试球员',
            player_number: 9,
            match_count: 1,
            goal_count: 2,
            penalty_goal_count: 1,
            yellow_card_count: 0,
            red_card_count: 0,
          }],
        },
      }))
    }
    if (url.includes('round_id=202871')) {
      return new Response(JSON.stringify({ result: [{ match_id: 1, result: '2:1', penalty_result: '' }] }))
    }
    if (url.includes('round_id=202873')) {
      return new Response(JSON.stringify({ result: [{ match_id: 2, result: '', penalty_result: '' }] }))
    }
    return new Response(JSON.stringify({ result: [] }))
  }) as typeof fetch

  try {
    const result = await syncOfficial(store, {
      force: true,
      now: new Date('2026-11-21T20:10:00+08:00'),
    })
    assert.equal(store.matches[0].status, 'finished')
    assert.equal(store.matches[0].homeGoals, 2)
    assert.equal(store.matches[0].awayGoals, 1)
    assert.equal(store.matches[1].status, 'live')
    assert.ok(result.matchesUpdated >= 2)
    const player = store.squads.cs.find((p: any) => p.id === 'cs-9')
    assert.equal(player.goals, 3)
    assert.equal(player.penalties, 1)
    assert.equal(player.appearances, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})
