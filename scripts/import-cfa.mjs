// Pull the public 2026 湘超 fixtures, results and registered squads from 足球中国.
// Run with Node 22: node scripts/import-cfa.mjs
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MINI = resolve(ROOT, 'miniapp')
const COMPETITION = 26854
const BASE = 'http://soccer.thecfa.info'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36'

const TEAM_IDS = {
  135605: 'cs',
  135602: 'yz',
  135597: 'ld',
  135594: 'cz',
  135593: 'cd',
  135606: 'zz',
  135603: 'yy',
  135601: 'yiy',
  135599: 'xt',
  135596: 'hh',
  135604: 'zjj',
  81265: 'xx',
  135595: 'hy',
  135598: 'sy',
}

// The site's own round labels are off by one for some rounds; these IDs are in played order.
const LEAGUE_ROUNDS = [202871, 202873, 202874, 202875, 202876, 202877, 202878, 202881, 202880, 202882, 202879, 202883, 203086]
const QF_FIRST = 220224
const QF_SECOND = 220223
const SF_FIRST = 220225
const SF_SECOND = 220227

async function get(path, as = 'json') {
  const res = await fetch(BASE + path, { headers: { 'user-agent': UA } })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return as === 'json' ? res.json() : res.text()
}

function uniqueRoundIds(html) {
  const m = html.match(/var phases = (\[[\s\S]*?\]);/)
  if (!m) return []
  const phases = JSON.parse(m[1])
  const league = phases.find((p) => p.phase_name === '联赛')
  return league
    ? league.real_round
        .slice()
        .sort((a, b) => a.round_order - b.round_order)
        .map((r) => r.competition_real_round_id)
    : []
}

function resultOf(raw) {
  const [h, a] = String(raw || '').split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(a) ? [h, a] : null
}

function toMatch(row, { round, phase, stage, leg }) {
  const [hs, as] = resultOf(row.result) ?? [0, 0]
  const [date, time] = String(row.begintime || '').split(' ')
  return {
    id: `m${row.match_id}`,
    round,
    phase,
    stage,
    leg,
    date,
    time: time?.slice(0, 5) || '',
    home: TEAM_IDS[row.home_team.team_id],
    away: TEAM_IDS[row.away_team.team_id],
    status: row.result ? 'finished' : 'upcoming',
    homeGoals: hs,
    awayGoals: as,
    venue: row.stadium_id || row.stadium?.name || '',
    attendance: 0,
    events: [],
    stats: {
      possession: [50, 50],
      shots: [0, 0],
      onTarget: [0, 0],
      corners: [0, 0],
      fouls: [0, 0],
    },
  }
}

const page = await get(`/league/${COMPETITION}/`, 'text')
const token = page.match(/id="_token"[^>]*value="([^"]+)"/)?.[1]
if (!token) throw new Error('missing _token')

const roundIds = uniqueRoundIds(page)
const rounds = roundIds.length ? roundIds : LEAGUE_ROUNDS
const matches = []
const teams = new Map()
const stadiums = {}

for (let i = 0; i < rounds.length; i++) {
  const data = await get(`/competition/schedule?round_id=${rounds[i]}&is_web_page=1`)
  for (const row of data.result ?? []) {
    const m = toMatch(row, { round: i + 1, phase: 'league', stage: `第${i + 1}轮`, leg: null })
    if (!m.home || !m.away) throw new Error(`unmapped team in ${row.match_id}`)
    matches.push(m)
    for (const side of ['home_team', 'away_team']) {
      const t = row[side]
      teams.set(t.team_id, { cfaId: t.team_id, id: TEAM_IDS[t.team_id], name: t.team_name, image: t.image })
    }
    ;(stadiums[m.home] ??= []).push(m.venue)
    ;(stadiums[m.away] ??= []).push(m.venue)
  }
}

async function addKnockout(roundId, round, stage, leg, dates) {
  const data = await get(`/competition/schedule?round_id=${roundId}&is_web_page=1`)
  let i = 0
  for (const row of data.result ?? []) {
    const m = toMatch(row, { round, phase: 'knockout', stage, leg })
    if (!m.home || !m.away) throw new Error(`unmapped team in ${row.match_id}`)
    if (!m.date) {
      m.date = dates?.[i]?.date ?? ''
      m.time = dates?.[i]?.time ?? '19:38'
    }
    matches.push(m)
    i++
  }
}

await addKnockout(QF_FIRST, 14, '1/4决赛首回合', 1)
await addKnockout(QF_SECOND, 15, '1/4决赛次回合', 2)
// The official API omits shoot-out scores. 娄底 beat 衡阳 7-6 on penalties after a 2-2 aggregate.
const shootout = matches.find((m) => m.round === 15 && m.home === 'ld' && m.away === 'hy')
if (shootout) shootout.penalty = [7, 6]
await addKnockout(SF_FIRST, 16, '半决赛首回合', 1, [
  { date: '2026-11-21', time: '19:38' },
  { date: '2026-11-22', time: '19:38' },
])
await addKnockout(SF_SECOND, 17, '半决赛次回合', 2, [
  { date: '2026-11-28', time: '19:38' },
  { date: '2026-11-29', time: '19:38' },
])

const squads = {}
for (const t of teams.values()) {
  const data = await get(`/league/players_and_staff?competition_id=${COMPETITION}&team_id=${t.cfaId}&_token=${token}`)
  const seen = new Set()
  squads[t.id] = (data.result?.players ?? [])
    .filter((p) => {
      if (!p.user_id || seen.has(p.user_id)) return false
      seen.add(p.user_id)
      return true
    })
    .map((p) => ({
      id: `${t.id}-${p.user_id}`,
      teamId: t.id,
      number: Number(p.player_number) || 0,
      name: p.nickname,
      position: '',
      appearances: Number(p.match_count) || 0,
      goals: (Number(p.goal_count) || 0) + (Number(p.penalty_goal_count) || 0),
      penalties: Number(p.penalty_goal_count) || 0,
      yellow: Number(p.yellow_card_count) || 0,
      red: Number(p.red_card_count) || 0,
    }))
    .sort((a, b) => a.number - b.number || a.name.localeCompare(b.name))
}

// One real logo per team. 湘西州 is not published, so it keeps the drawn crest.
const logoDir = resolve(MINI, 'src/assets/teams')
mkdirSync(logoDir, { recursive: true })
const logos = []
for (const t of teams.values()) {
  if (!t.image?.startsWith('http')) continue
  const res = await fetch(t.image, { headers: { 'user-agent': UA } })
  if (!res.ok) continue
  const buf = Buffer.from(await res.arrayBuffer())
  const tmp = resolve(logoDir, `${t.id}-raw`)
  writeFileSync(tmp, buf)
  const out = resolve(logoDir, `${t.id}.png`)
  execFileSync('sips', ['-Z', '96', '-s', 'format', 'png', tmp, '--out', out], { stdio: 'ignore' })
  execFileSync('rm', ['-f', tmp])
  logos.push(t.id)
}
const logoLines = logos
  .map((id) => `import ${id} from '../assets/teams/${id}.png'`)
  .join('\n')
writeFileSync(
  resolve(MINI, 'src/data/logos.ts'),
  `${logoLines}\n\nexport const TEAM_LOGOS: Record<string, string> = { ${logos.join(', ')} }\n`,
)

const mostCommon = (list) => {
  const count = new Map()
  for (const x of list) count.set(x, (count.get(x) ?? 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

const payload = {
  season: 2026,
  source: '足球中国 / 湖南省足球联赛',
  updatedAt: new Date().toISOString(),
  teams: [...teams.values()]
    .map((t) => ({ id: t.id, cfaId: t.cfaId, name: t.name, stadium: mostCommon(stadiums[t.id] ?? []) }))
    .sort((a, b) => a.id.localeCompare(b.id)),
  matches: matches.sort((a, b) => a.round - b.round || a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
  squads,
}
writeFileSync(resolve(MINI, 'src/data/season.json'), JSON.stringify(payload, null, 2))
mkdirSync(resolve(MINI, 'cloudfunctions/league'), { recursive: true })
writeFileSync(
  resolve(MINI, 'cloudfunctions/league/season.json'),
  JSON.stringify({ updatedAt: payload.updatedAt, matches: payload.matches }),
)
console.log(`wrote ${payload.matches.length} matches, ${Object.values(squads).reduce((n, s) => n + s.length, 0)} players, ${logos.length} logos`)
