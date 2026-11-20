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
import { randomUUID } from 'node:crypto'
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
import { syncOfficial, writeSyncLog } from './official-sync'
import {
  applySuggestion,
  extractSuggestions,
  fetchSourceText,
  loadSuggestions,
  saveSuggestions,
} from './suggestions'

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
  const suggestionsFile = resolve(dirname(dataFile), 'suggestions.json')
  const syncStatusFile = resolve(dirname(dataFile), 'sync-status.json')
  const writeSyncStatus = (status: Record<string, unknown>) => {
    mkdirSync(dirname(syncStatusFile), { recursive: true })
    writeFileSync(syncStatusFile, JSON.stringify({ ...status, at: new Date().toISOString() }, null, 2))
  }
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

  let lastSyncAt = 0
  app.post('/api/admin/sync-official', async (req, res) => {
    if (!requireAdmin(req, res)) return
    if (Date.now() - lastSyncAt < 30_000 && req.query.force !== '1') {
      return res.status(429).json({ error: '同步太频繁，请 30 秒后再试' })
    }
    lastSyncAt = Date.now()
    const draft = structuredClone(store)
    try {
      const result = await syncOfficial(draft, {
        force: req.query.force === '1',
        forcePlayers: req.query.players === '1',
      })
      if (result.matchesUpdated > 0 || result.playersUpdated > 0) {
        backupFile(dataFile, 'data', 20)
        store.matches = draft.matches
        store.squads = draft.squads
        saveStore(dataFile, store)
      }
      if (!result.skipped) {
        writeSyncLog(resolve(dirname(dataFile), 'logs', 'sync.jsonl'), result)
      }
      writeSyncStatus({ ok: true, updatedAt: store.updatedAt, ...result })
      res.json({ ok: true, ...result, updatedAt: store.updatedAt })
    } catch (error) {
      const message = error instanceof Error ? error.message : '官方同步失败'
      writeSyncStatus({ ok: false, error: message })
      res.status(502).json({ error: message })
    }
  })

  app.get('/api/admin/sync-status', (req, res) => {
    if (!requireAdmin(req, res)) return
    if (!existsSync(syncStatusFile)) return res.json({ status: null })
    try {
      res.json({ status: JSON.parse(readFileSync(syncStatusFile, 'utf8')) })
    } catch {
      res.json({ status: null })
    }
  })

  app.get('/api/admin/suggestions', (req, res) => {
    if (!requireAdmin(req, res)) return
    const entries = loadSuggestions(suggestionsFile)
      .filter((entry) => entry.status === 'pending')
      .slice(-50)
      .reverse()
    res.json({ entries })
  })

  app.post('/api/admin/suggestions/scan', async (req, res) => {
    if (!requireAdmin(req, res)) return
    const match = store.matches.find((item) => item.id === req.body?.matchId)
    if (!match) return res.status(404).json({ error: '比赛不存在' })
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
    const sourceUrl = typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl.trim() : ''
    if (!text && !sourceUrl) return res.status(400).json({ error: '请提供战报链接或正文' })
    const apiKey = options.ai?.apiKey ?? process.env.DEEPSEEK_API_KEY
    if (!apiKey) return res.status(503).json({ error: 'AI 未配置' })

    try {
      const content = text || (await fetchSourceText(sourceUrl))
      const items = await extractSuggestions({
        match,
        text: content,
        source: sourceUrl || '手动粘贴',
        apiKey,
        model: options.ai?.model ?? process.env.DEEPSEEK_MODEL,
        baseUrl: options.ai?.baseUrl ?? process.env.DEEPSEEK_BASE_URL,
      })
      if (!items.length) return res.json({ ok: true, created: 0, reason: '战报里没有与当前数据不同的字段' })
      const created = items.map((item) => ({
        ...item,
        id: randomUUID(),
        matchId: match.id,
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
      }))
      const all = [...loadSuggestions(suggestionsFile), ...created]
      saveSuggestions(suggestionsFile, all)
      res.json({ ok: true, created: created.length, entries: created })
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : 'AI 解析失败' })
    }
  })

  app.post('/api/admin/suggestions/:id/:action', (req, res) => {
    if (!requireAdmin(req, res)) return
    const { id, action } = req.params
    if (action !== 'accept' && action !== 'reject') {
      return res.status(400).json({ error: '操作无效' })
    }
    const all = loadSuggestions(suggestionsFile)
    const entry = all.find((item) => item.id === id)
    if (!entry || entry.status !== 'pending') {
      return res.status(404).json({ error: '建议不存在或已处理' })
    }
    const match = store.matches.find((item) => item.id === entry.matchId)
    if (!match) return res.status(404).json({ error: '比赛不存在' })

    if (action === 'accept') {
      if (!applySuggestion(match, entry.field, entry.after)) {
        return res.status(400).json({ error: '建议数据不合法' })
      }
      backupFile(dataFile, 'data', 20)
      saveStore(dataFile, store)
      appendFileSync(
        adminLogFile,
        `${JSON.stringify({
          at: store.updatedAt,
          matchId: match.id,
          action: 'accept-ai-suggestion',
          field: entry.field,
          before: entry.before,
          after: entry.after,
          ip: req.ip,
        })}\n`,
      )
    }

    entry.status = action === 'accept' ? 'accepted' : 'rejected'
    saveSuggestions(suggestionsFile, all)
    res.json({ ok: true, match, entry })
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
  const host = process.env.HOST ?? '0.0.0.0'
  createApp().listen(port, host, () => {
    console.log(`湘足 API http://${host}:${port}`)
    console.log(`管理后台 http://${host}:${port}/admin`)
    console.log(`管理令牌 ${token}`)
  })
}
