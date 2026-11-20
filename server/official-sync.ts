import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Match } from '../miniapp/src/data/league'
import type { Player } from '../miniapp/src/data/teams'

type SyncStore = {
  updatedAt: string
  matches: Match[]
  squads: Record<string, Player[]>
}

type SyncOptions = {
  force?: boolean
  forcePlayers?: boolean
  now?: Date
}

export type SyncResult = {
  skipped?: string
  matchesUpdated: number
  playersUpdated: number
  changes: string[]
}

const BASE = 'http://soccer.thecfa.info'
const COMPETITION = 26854
const UA = 'Xiangzu/1.0 (+https://github.com/15616712914/xiangzu-app)'

const TEAM_IDS: Record<number, string> = {
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

const ROUND_IDS = [
  202871, 202873, 202874, 202875, 202876, 202877, 202878, 202881, 202880, 202882, 202879, 202883, 203086,
  220224, 220223, 220225, 220227, 228360,
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function getJson(path: string): Promise<any> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(BASE + path, {
        headers: { 'user-agent': UA },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) throw new Error(`${path} -> ${res.status}`)
      return await res.json()
    } catch (error) {
      lastError = error
      if (attempt < 2) await sleep(700 * (attempt + 1))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('official request failed')
}

function parseScore(raw: unknown): [number, number] | null {
  const [home, away] = String(raw ?? '').split(':').map(Number)
  return Number.isInteger(home) && Number.isInteger(away) ? [home, away] : null
}

function kickoff(match: Match): Date | null {
  if (!match.date || !match.time) return null
  const date = new Date(`${match.date}T${match.time}:00+08:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function inWindow(matches: Match[], now: Date): boolean {
  return matches.some((match) => {
    if (match.status === 'live') return true
    const start = kickoff(match)
    if (!start) return false
    const from = start.getTime() - 2 * 60 * 60 * 1000
    const to = start.getTime() + 6 * 60 * 60 * 1000
    return now.getTime() >= from && now.getTime() <= to
  })
}

/**
 * Pull official CFA results into the in-memory store. The caller owns persistence.
 * Only finished scores are authoritative; live minute is computed by the app.
 */
export async function syncOfficial(store: SyncStore, options: SyncOptions = {}): Promise<SyncResult> {
  const now = options.now ?? new Date()
  if (!options.force && !inWindow(store.matches, now)) {
    return { skipped: 'no match within the sync window', matchesUpdated: 0, playersUpdated: 0, changes: [] }
  }

  const rows = new Map<number, any>()
  for (const roundId of ROUND_IDS) {
    const data = await getJson(`/competition/schedule?round_id=${roundId}&is_web_page=1`)
    for (const row of data.result ?? []) rows.set(Number(row.match_id), row)
    await sleep(120)
  }

  const changes: string[] = []
  let matchesUpdated = 0
  let resultChanged = false

  for (const match of store.matches) {
    const row = rows.get(Number(match.id.replace(/^m/, '')))
    if (!row) continue

    const score = parseScore(row.result)
    if (score) {
      if (match.status !== 'finished' || match.homeGoals !== score[0] || match.awayGoals !== score[1]) {
        changes.push(`${match.id} ${match.home}/${match.away} ${match.homeGoals}:${match.awayGoals} -> ${score[0]}:${score[1]} finished`)
        match.homeGoals = score[0]
        match.awayGoals = score[1]
        match.status = 'finished'
        match.startMinute = undefined
        matchesUpdated += 1
        resultChanged = true
      }
      const penalties = parseScore(row.penalty_result)
      if (penalties && !match.penalty) {
        match.penalty = penalties
        changes.push(`${match.id} penalty ${penalties[0]}:${penalties[1]}`)
      }
      continue
    }

    if (match.status === 'finished') continue
    const start = kickoff(match)
    if (!start) continue
    // A postponed match should not stay "live" forever. Leave the status for the admin after 6h.
    if (now.getTime() > start.getTime() + 6 * 60 * 60 * 1000) continue
    const nextStatus = now < start ? 'upcoming' : 'live'
    if (match.status !== nextStatus) {
      match.status = nextStatus
      if (nextStatus === 'live') match.startMinute = undefined
      changes.push(`${match.id} ${match.home}/${match.away} status ${nextStatus}`)
      matchesUpdated += 1
    }
  }

  let playersUpdated = 0
  if (resultChanged || options.forcePlayers) {
    const page = await fetch(`${BASE}/league/${COMPETITION}/`, { headers: { 'user-agent': UA } })
    const html = await page.text()
    const token = html.match(/id="_token"[^>]*value="([^"]+)"/)?.[1]
    if (!token) throw new Error('official page is missing _token')

    const cfaToTeam = new Map(Object.entries(TEAM_IDS).map(([cfa, team]) => [Number(cfa), team]))
    const teams = [...new Set(store.matches.flatMap((m) => [m.home, m.away]))]
    const cfaByTeam = new Map([...cfaToTeam.entries()].map(([cfa, team]) => [team, cfa]))

    for (const teamId of teams) {
      const cfaId = cfaByTeam.get(teamId)
      if (!cfaId) continue
      const data = await getJson(
        `/league/players_and_staff?competition_id=${COMPETITION}&team_id=${cfaId}&_token=${token}`,
      )
      const squad = store.squads[teamId] ?? []
      const byId = new Map(squad.map((player) => [player.id, player]))
      for (const raw of data.result?.players ?? []) {
        const id = `${teamId}-${raw.user_id}`
        const goals = (Number(raw.goal_count) || 0) + (Number(raw.penalty_goal_count) || 0)
        const next: Player = {
          ...(byId.get(id) ?? {
            id,
            teamId,
            position: '',
            number: 0,
            name: '',
          }),
          number: Number(raw.player_number) || 0,
          name: raw.nickname || byId.get(id)?.name || '',
          appearances: Number(raw.match_count) || 0,
          goals,
          penalties: Number(raw.penalty_goal_count) || 0,
          yellow: Number(raw.yellow_card_count) || 0,
          red: Number(raw.red_card_count) || 0,
        }
        const prev = byId.get(id)
        if (
          !prev ||
          prev.goals !== next.goals ||
          prev.appearances !== next.appearances ||
          prev.penalties !== next.penalties ||
          prev.yellow !== next.yellow ||
          prev.red !== next.red ||
          prev.number !== next.number ||
          prev.name !== next.name
        ) {
          byId.set(id, next)
          playersUpdated += 1
        }
      }
      store.squads[teamId] = [...byId.values()].sort((a, b) => a.number - b.number || a.name.localeCompare(b.name))
      await sleep(120)
    }
    if (playersUpdated > 0) changes.push(`players updated: ${playersUpdated}`)
  }

  return { matchesUpdated, playersUpdated, changes }
}

export function writeSyncLog(file: string, result: SyncResult) {
  mkdirSync(dirname(file), { recursive: true })
  appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), ...result })}\n`)
}
