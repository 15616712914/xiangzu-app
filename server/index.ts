import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import {
  CURRENT_ROUND,
  TOTAL_ROUNDS,
  computeScorers,
  computeStandings,
  type Match,
} from '../miniapp/src/data/league'
import type { Player, Team } from '../miniapp/src/data/teams'
import { createFansStore } from './fans'
import { createFansRouter } from './fans-routes'
import { createAIRouter } from './ai'

export type StoreData = {
  updatedAt: string
  teams: Team[]
  squads: Record<string, Player[]>
  matches: Match[]
}

type AdminBody = {
  status?: string
  homeGoals?: number
  awayGoals?: number
  startMinute?: number
  attendance?: number
}

type AdminLogEntry = {
  at: string
  matchId: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  ip?: string
}

const here = dirname(fileURLToPath(import.meta.url))
const DEFAULT_DATA = resolve(here, 'data.json')
const DEFAULT_TOKEN = process.env.ADMIN_TOKEN || 'dev-token'
const STATUSES = ['upcoming', 'live', 'finished'] as const

function loadStore(file: string): StoreData {
  if (!existsSync(file)) throw new Error(`data file not found: ${file}. Run npm run seed first.`)
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as StoreData
  if (!Array.isArray(parsed.matches) || !Array.isArray(parsed.teams)) {
    throw new Error('invalid data.json: teams/matches missing')
  }
  return parsed
}

function saveStore(file: string, store: StoreData) {
  store.updatedAt = new Date().toISOString()
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(store, null, 2))
  renameSync(tmp, file)
}

function parseGoals(value: unknown): number | null {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n <= 20 ? n : null
}

function parseIntInRange(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  return Number.isInteger(n) && n >= min && n <= max ? n : null
}

function backupFile(file: string, kind: string, keep: number): void {
  if (!existsSync(file)) return
  const dir = resolve(dirname(file), 'backups')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  copyFileSync(file, resolve(dir, `${kind}-${stamp}.json`))
  const files = readdirSync(dir)
    .filter((name) => name.startsWith(`${kind}-`) && name.endsWith('.json'))
    .sort()
  for (const stale of files.slice(0, Math.max(0, files.length - keep))) {
    unlinkSync(resolve(dir, stale))
  }
}

function readAdminLog(file: string, limit: number): AdminLogEntry[] {
  if (!existsSync(file)) return []
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-limit)
  return lines.flatMap((line) => {
    try {
      return [JSON.parse(line) as AdminLogEntry]
    } catch {
      return []
    }
  })
}

export function createApp(
  options: {
    dataFile?: string
    adminToken?: string
    fansFile?: string
    appleClientId?: string
    allowDevAuth?: boolean
    devAuthToken?: string
    ai?: {
      apiKey?: string
      model?: string
      baseUrl?: string
      mock?: boolean
      fetchImpl?: typeof fetch
    }
    adminLogFile?: string
  } = {},
) {
  const dataFile = options.dataFile ?? process.env.DATA_FILE ?? DEFAULT_DATA
  const fansFile = options.fansFile ?? process.env.FANS_FILE ?? resolve(here, 'fans.json')
  const adminToken = options.adminToken ?? DEFAULT_TOKEN

  // First boot on a fresh volume: seed from the bundled snapshot.
  if (!existsSync(dataFile)) {
    mkdirSync(dirname(dataFile), { recursive: true })
    copyFileSync(DEFAULT_DATA, dataFile)
  }

  const store = loadStore(dataFile)
  const fans = createFansStore(fansFile)
  backupFile(fansFile, 'fans', 14)

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`)
    next()
  })
  app.use('/admin', express.static(resolve(here, 'public')))
  app.use(
    '/api',
    createAIRouter({
      store,
      ai: {
        apiKey: options.ai?.apiKey ?? process.env.DEEPSEEK_API_KEY,
        model: options.ai?.model ?? process.env.DEEPSEEK_MODEL,
        baseUrl: options.ai?.baseUrl ?? process.env.DEEPSEEK_BASE_URL,
        mock: options.ai?.mock ?? process.env.DEEPSEEK_MOCK === '1',
        fetchImpl: options.ai?.fetchImpl,
      },
    }),
  )
  app.use(
    '/api',
    createFansRouter({
      fans,
      matches: () => store.matches,
      teamIds: () => store.teams.map((team) => team.id),
      appleClientId: options.appleClientId ?? process.env.APPLE_CLIENT_ID,
      allowDevAuth: options.allowDevAuth ?? process.env.ALLOW_DEV_AUTH === '1',
      devAuthToken: options.devAuthToken ?? process.env.DEV_AUTH_TOKEN,
    }),
  )

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, updatedAt: store.updatedAt, matches: store.matches.length })
  })

  app.get('/api/league', (_req, res) => {
    res.json({
      ...store,
      meta: {
        currentRound: CURRENT_ROUND,
        totalRounds: TOTAL_ROUNDS,
        updatedAt: store.updatedAt,
      },
    })
  })

  app.get('/api/matches', (_req, res) => {
    res.json({ matches: store.matches, updatedAt: store.updatedAt })
  })

  app.get('/api/matches/:id', (req, res) => {
    const match = store.matches.find((m) => m.id === req.params.id)
    if (!match) return res.status(404).json({ error: 'match not found' })
    res.json(match)
  })

  app.get('/api/standings', (_req, res) => {
    res.json(computeStandings(store.matches))
  })

  app.get('/api/scorers', (_req, res) => {
    res.json(computeScorers(store.matches).slice(0, 50))
  })

  const adminLogFile = options.adminLogFile ?? resolve(dirname(dataFile), 'logs', 'admin.jsonl')
  const requireAdmin = (req: Request, res: Response): boolean => {
    if (req.header('x-admin-token') === adminToken) return true
    res.status(401).json({ error: 'invalid admin token' })
    return false
  }

  app.post('/api/admin/matches/:id', (req, res) => {
    if (!requireAdmin(req, res)) return
    const match = store.matches.find((m) => m.id === req.params.id)
    if (!match) return res.status(404).json({ error: 'match not found' })

    const body = req.body as AdminBody
    const status = STATUSES.includes(body.status as (typeof STATUSES)[number])
      ? (body.status as (typeof STATUSES)[number])
      : match.status
    const homeGoals = parseGoals(body.homeGoals)
    const awayGoals = parseGoals(body.awayGoals)
    if (homeGoals === null || awayGoals === null) {
      return res.status(400).json({ error: 'homeGoals/awayGoals must be integers between 0 and 20' })
    }
    const startMinute = parseIntInRange(body.startMinute, 0, 90)
    const attendance = parseIntInRange(body.attendance, 0, 200000)
    if (body.startMinute !== undefined && startMinute === null) {
      return res.status(400).json({ error: 'startMinute must be an integer between 0 and 90' })
    }
    if (body.attendance !== undefined && attendance === null) {
      return res.status(400).json({ error: 'attendance must be an integer between 0 and 200000' })
    }

    const before = {
      status: match.status,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      startMinute: match.startMinute,
      attendance: match.attendance,
    }

    match.status = status
    match.startMinute = status === 'live' ? (startMinute ?? 0) : undefined
    if (attendance !== null) match.attendance = attendance
    // Only the official result is editable; the app no longer invents goal events or stats.
    match.homeGoals = homeGoals
    match.awayGoals = awayGoals
    match.events = []
    backupFile(dataFile, 'data', 20)
    saveStore(dataFile, store)
    const entry: AdminLogEntry = {
      at: store.updatedAt,
      matchId: match.id,
      before,
      after: {
        status: match.status,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        startMinute: match.startMinute,
        attendance: match.attendance,
      },
      ip: req.ip,
    }
    mkdirSync(dirname(adminLogFile), { recursive: true })
    appendFileSync(adminLogFile, `${JSON.stringify(entry)}\n`)
    res.json({ match, updatedAt: store.updatedAt })
  })

  app.get('/api/admin/log', (req, res) => {
    if (!requireAdmin(req, res)) return
    res.json({ entries: readAdminLog(adminLogFile, 50).reverse() })
  })

  app.get('/admin', (_req, res) => {
    res.sendFile(resolve(here, 'public/index.html'))
  })

  app.get(['/support', '/support.html'], (_req, res) => {
    res.sendFile(resolve(here, 'public', 'support.html'))
  })

  app.get(['/privacy', '/privacy.html'], (_req, res) => {
    const bundled = resolve(here, 'public', 'privacy.html')
    const source = existsSync(bundled)
      ? bundled
      : resolve(here, '..', 'ios', 'appstore', 'privacy.html')
    res.sendFile(source)
  })

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err)
    res.status(500).json({ error: err.message })
  })

  return app
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isDirectRun) {
  const port = Number(process.env.PORT || 8787)
  const token = process.env.ADMIN_TOKEN || DEFAULT_TOKEN
  createApp().listen(port, () => {
    console.log(`湘足 API http://127.0.0.1:${port}`)
    console.log(`管理后台 http://127.0.0.1:${port}/admin`)
    console.log(`管理令牌 ${token}`)
  })
}
