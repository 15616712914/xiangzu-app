import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Match } from '../miniapp/src/data/league'

export type Choice = 'home' | 'draw' | 'away'
export const CHEER_DAILY_LIMIT = 20
export const POINTS_PER_CORRECT = 10

export type UserPreferences = {
  favouriteTeam: string | null
  reminders: string[]
}

type StoredUser = {
  id: string
  nickname: string
  createdAt: string
  appleSub?: string
  devId?: string
  preferences?: UserPreferences
}

type SessionRecord = {
  userId: string
  expiresAt: string
}

type VoteRecord = {
  userId: string
  matchId: string
  choice: Choice
  updatedAt: string
}

type CheerRecord = {
  userId: string
  teamId: string
  date: string
  count: number
}

type FansData = {
  users: Record<string, StoredUser>
  sessions: Record<string, SessionRecord>
  votes: Record<string, VoteRecord>
  cheers: Record<string, CheerRecord>
}

export type PublicUser = Pick<StoredUser, 'id' | 'nickname' | 'createdAt'>

export type VoteSummary = {
  matchId: string
  counts: { home: number; draw: number; away: number; total: number }
  mine: Choice | null
  locked: boolean
}

export type LeaderRow = {
  rank: number
  nickname: string
  points: number
  correct: number
  total: number
  isMe: boolean
}

export type MeProfile = {
  user: PublicUser
  points: number
  rank: number | null
  correct: number
  total: number
  cheersToday: number
  cheersRemaining: number
  votes: Record<string, Choice>
  preferences: UserPreferences
}

const SESSION_DAYS = 30

function emptyData(): FansData {
  return { users: {}, sessions: {}, votes: {}, cheers: {} }
}

function load(file: string): FansData {
  if (!existsSync(file)) return emptyData()
  const raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<FansData>
  return {
    users: raw.users ?? {},
    sessions: raw.sessions ?? {},
    votes: raw.votes ?? {},
    cheers: raw.cheers ?? {},
  }
}

function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function sanitizeNickname(value: unknown): string {
  if (typeof value !== 'string') return '湘足球迷'
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 16)
  return cleaned || '湘足球迷'
}

export function kickoffTime(match: Pick<Match, 'date' | 'time'>): number {
  return new Date(`${match.date}T${match.time}:00+08:00`).getTime()
}

export function isVoteLocked(match: Match, now = Date.now()): boolean {
  return match.status !== 'upcoming' || kickoffTime(match) <= now
}

function outcome(match: Match): Choice {
  if (match.homeGoals > match.awayGoals) return 'home'
  if (match.homeGoals < match.awayGoals) return 'away'
  return 'draw'
}

export function createFansStore(file: string) {
  let data = load(file)
  const now = () => new Date().toISOString()

  function save() {
    mkdirSync(dirname(file), { recursive: true })
    const tmp = `${file}.tmp`
    writeFileSync(tmp, JSON.stringify(data, null, 2))
    renameSync(tmp, file)
  }

  function purgeSessions() {
    const at = Date.now()
    let changed = false
    for (const [key, session] of Object.entries(data.sessions)) {
      if (new Date(session.expiresAt).getTime() <= at) {
        delete data.sessions[key]
        changed = true
      }
    }
    if (changed) save()
  }

  function publicUser(user: StoredUser): PublicUser {
    return { id: user.id, nickname: user.nickname, createdAt: user.createdAt }
  }

  function createUser(input: { nickname?: unknown; appleSub?: string }): StoredUser {
    const nowIso = now()
    const user: StoredUser = {
      id: `u_${randomUUID()}`,
      nickname: sanitizeNickname(input.nickname),
      createdAt: nowIso,
    }
    if (input.appleSub) user.appleSub = input.appleSub
    data.users[user.id] = user
    save()
    return user
  }

  function findByAppleSub(appleSub: string): StoredUser | undefined {
    return Object.values(data.users).find((u) => u.appleSub === appleSub)
  }

  function upsertAppleUser(appleSub: string, nickname?: unknown): StoredUser {
    const existing = findByAppleSub(appleSub)
    if (existing) return existing
    return createUser({ appleSub, nickname })
  }

  function upsertDevUser(devId: string, nickname?: unknown): StoredUser {
    const existing = Object.values(data.users).find((u) => u.devId === devId)
    if (existing) return existing
    const user = createUser({ nickname })
    user.devId = devId
    save()
    return user
  }

  function createSession(userId: string): string {
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString()
    data.sessions[hashToken(token)] = { userId, expiresAt: expires }
    save()
    return token
  }

  function preferencesOf(user: StoredUser): UserPreferences {
    return user.preferences ?? { favouriteTeam: null, reminders: [] }
  }

  function updatePreferences(userId: string, preferences: UserPreferences): StoredUser | null {
    const user = data.users[userId]
    if (!user) return null
    user.preferences = {
      favouriteTeam: preferences.favouriteTeam,
      reminders: [...new Set(preferences.reminders)].slice(0, 100),
    }
    save()
    return user
  }

  function updateNickname(userId: string, nickname: unknown): StoredUser | null {
    const user = data.users[userId]
    if (!user) return null
    user.nickname = sanitizeNickname(nickname)
    save()
    return user
  }

  function userByToken(token: string): StoredUser | null {
    purgeSessions()
    const session = data.sessions[hashToken(token)]
    if (!session) return null
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      delete data.sessions[hashToken(token)]
      save()
      return null
    }
    return data.users[session.userId] ?? null
  }

  function revokeToken(token: string) {
    const key = hashToken(token)
    if (data.sessions[key]) {
      delete data.sessions[key]
      save()
    }
  }

  function deleteUser(userId: string) {
    delete data.users[userId]
    for (const [key, session] of Object.entries(data.sessions)) {
      if (session.userId === userId) delete data.sessions[key]
    }
    for (const [key, vote] of Object.entries(data.votes)) {
      if (vote.userId === userId) delete data.votes[key]
    }
    for (const [key, cheer] of Object.entries(data.cheers)) {
      if (cheer.userId === userId) delete data.cheers[key]
    }
    save()
  }

  function userVotes(userId: string): Record<string, Choice> {
    const result: Record<string, Choice> = {}
    for (const vote of Object.values(data.votes)) {
      if (vote.userId === userId) result[vote.matchId] = vote.choice
    }
    return result
  }

  function voteSummary(match: Match, userId?: string): VoteSummary {
    const counts = { home: 0, draw: 0, away: 0, total: 0 }
    let mine: Choice | null = null
    for (const vote of Object.values(data.votes)) {
      if (vote.matchId !== match.id) continue
      if (!data.users[vote.userId]) continue
      counts[vote.choice] += 1
      counts.total += 1
      if (userId && vote.userId === userId) mine = vote.choice
    }
    return { matchId: match.id, counts, mine, locked: isVoteLocked(match) }
  }

  function recordVote(userId: string, matchId: string, choice: Choice) {
    const key = `${userId}:${matchId}`
    data.votes[key] = { userId, matchId, choice, updatedAt: now() }
    save()
  }

  function cheersToday(userId: string): number {
    const day = today()
    return Object.values(data.cheers)
      .filter((cheer) => cheer.userId === userId && cheer.date === day)
      .reduce((sum, cheer) => sum + cheer.count, 0)
  }

  function teamCheerCount(teamId: string): number {
    return Object.values(data.cheers)
      .filter((cheer) => cheer.teamId === teamId)
      .reduce((sum, cheer) => sum + cheer.count, 0)
  }

  function recordCheer(userId: string, teamId: string) {
    if (cheersToday(userId) >= CHEER_DAILY_LIMIT) return false
    const day = today()
    const key = `${userId}:${teamId}:${day}`
    const existing = data.cheers[key]
    data.cheers[key] = {
      userId,
      teamId,
      date: day,
      count: (existing?.count ?? 0) + 1,
    }
    save()
    return true
  }

  function scoreUser(userId: string, matches: Match[]) {
    let points = 0
    let correct = 0
    let total = 0
    for (const vote of Object.values(data.votes)) {
      if (vote.userId !== userId) continue
      const match = matches.find((m) => m.id === vote.matchId)
      if (!match || match.status !== 'finished') continue
      total += 1
      if (vote.choice === outcome(match)) {
        correct += 1
        points += POINTS_PER_CORRECT
      }
    }
    return { points, correct, total }
  }

  function meProfile(userId: string, matches: Match[]): MeProfile | null {
    const user = data.users[userId]
    if (!user) return null
    const scored = Object.values(data.users)
      .map((item) => ({ id: item.id, ...scoreUser(item.id, matches) }))
      .filter((item) => item.total > 0)
      .sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points
        if (a.correct !== b.correct) return b.correct - a.correct
        const ua = data.users[a.id]?.createdAt ?? ''
        const ub = data.users[b.id]?.createdAt ?? ''
        return ua.localeCompare(ub)
      })
    const index = scored.findIndex((item) => item.id === userId)
    const mine = scoreUser(userId, matches)
    return {
      user: publicUser(user),
      points: mine.points,
      rank: index >= 0 ? index + 1 : null,
      correct: mine.correct,
      total: mine.total,
      cheersToday: cheersToday(userId),
      cheersRemaining: Math.max(0, CHEER_DAILY_LIMIT - cheersToday(userId)),
      votes: userVotes(userId),
      preferences: preferencesOf(user),
    }
  }

  function board(userId: string | null, matches: Match[], teamIds: string[]) {
    const scored = Object.values(data.users)
      .map((item) => ({ user: item, ...scoreUser(item.id, matches) }))
      .filter((item) => item.total > 0)
      .sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points
        if (a.correct !== b.correct) return b.correct - a.correct
        return a.user.createdAt.localeCompare(b.user.createdAt)
      })

    const leaderboard: LeaderRow[] = scored.slice(0, 20).map((item, index) => ({
      rank: index + 1,
      nickname: item.user.nickname,
      points: item.points,
      correct: item.correct,
      total: item.total,
      isMe: item.user.id === userId,
    }))

    const voteMap: Record<string, VoteSummary> = {}
    for (const match of matches.filter((m) => m.status === 'upcoming')) {
      voteMap[match.id] = voteSummary(match, userId ?? undefined)
    }

    return {
      teams: teamIds.map((teamId) => ({ teamId, count: teamCheerCount(teamId) })),
      leaderboard,
      me: userId ? meProfile(userId, matches) : null,
      votes: voteMap,
    }
  }

  return {
    createUser,
    upsertAppleUser,
    upsertDevUser,
    createSession,
    userByToken,
    revokeToken,
    deleteUser,
    updateNickname,
    updatePreferences,
    publicUser,
    voteSummary,
    recordVote,
    cheersToday,
    recordCheer,
    teamCheerCount,
    meProfile,
    board,
    userVotes,
  }
}

export type FansStore = ReturnType<typeof createFansStore>
