import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
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

export function createApp(options: { dataFile?: string; adminToken?: string } = {}) {
  const dataFile = options.dataFile ?? DEFAULT_DATA
  const adminToken = options.adminToken ?? DEFAULT_TOKEN
  const store = loadStore(dataFile)

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`)
    next()
  })
  app.use('/admin', express.static(resolve(here, 'public')))

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

  app.post('/api/admin/matches/:id', (req, res) => {
    if (req.header('x-admin-token') !== adminToken) {
      return res.status(401).json({ error: 'invalid admin token' })
    }
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

    match.status = status
    match.startMinute = status === 'live' ? (match.startMinute ?? 61) : undefined
    // Only the official result is editable; the app no longer invents goal events or stats.
    match.homeGoals = homeGoals
    match.awayGoals = awayGoals
    match.events = []
    saveStore(dataFile, store)
    res.json({ match, updatedAt: store.updatedAt })
  })

  app.get('/admin', (_req, res) => {
    res.sendFile(resolve(here, 'public/index.html'))
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
    console.log(`湘超 API http://127.0.0.1:${port}`)
    console.log(`管理后台 http://127.0.0.1:${port}/admin`)
    console.log(`管理令牌 ${token}`)
  })
}
