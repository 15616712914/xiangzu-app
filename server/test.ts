import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './index'

const dir = mkdtempSync(join(tmpdir(), 'xiangchao-server-'))
const dataFile = join(dir, 'data.json')
copyFileSync(join(import.meta.dirname, 'data.json'), dataFile)

const app = createApp({ dataFile, adminToken: 'test-token' })
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
