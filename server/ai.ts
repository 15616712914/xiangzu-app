import { Router, type Request, type Response } from 'express'
import {
  computeScorers,
  computeStandings,
  type Match,
} from '../miniapp/src/data/league'
import type { Team } from '../miniapp/src/data/teams'
import type { StoreData } from './index'

type AIResult = {
  result: 'home' | 'draw' | 'away'
  score: [number, number]
  confidence: '低' | '中' | '高'
  headline: string
  analysis: string
  factors: string[]
}

type Cached = {
  expiresAt: number
  result: AIResult
  model: string
}

type AIOptions = {
  apiKey?: string
  model?: string
  baseUrl?: string
  mock?: boolean
  fetchImpl?: typeof fetch
}

type Options = {
  store: StoreData
  ai: AIOptions
}

const PROMPT_VERSION = 1
const CACHE_MS = 30 * 60 * 1000
const MAX_REQUESTS_PER_HOUR = 20
const cache = new Map<string, Cached>()
const rate = new Map<string, number[]>()

function clean(value: unknown, max: number): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max)
    : ''
}

function teamName(teams: Team[], id: string): string {
  return teams.find((team) => team.id === id)?.city ?? id
}

function recentMatches(store: StoreData, teamId: string): object[] {
  return store.matches
    .filter(
      (match) =>
        match.status === 'finished' &&
        (match.home === teamId || match.away === teamId),
    )
    .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)))
    .slice(0, 5)
    .map((match) => ({
      stage: match.stage ?? `第${match.round}轮`,
      opponent: teamName(store.teams, match.home === teamId ? match.away : match.home),
      home: match.home === teamId,
      score: match.home === teamId
        ? `${match.homeGoals}-${match.awayGoals}`
        : `${match.awayGoals}-${match.homeGoals}`,
    }))
}

function contextFor(store: StoreData, match: Match): object {
  const standings = computeStandings(store.matches)
  const scorers = computeScorers(store.matches)
  const row = (teamId: string) => {
    const item = standings.find((entry) => entry.teamId === teamId)
    return item
      ? {
          rank: standings.findIndex((entry) => entry.teamId === teamId) + 1,
          played: item.played,
          won: item.won,
          drawn: item.drawn,
          lost: item.lost,
          goalsFor: item.gf,
          goalsAgainst: item.ga,
          points: item.points,
          form: item.form,
        }
      : null
  }
  const topScorers = (teamId: string) =>
    scorers
      .filter((entry) => entry.player.teamId === teamId)
      .slice(0, 3)
      .map((entry) => ({ name: entry.player.name, goals: entry.goals }))
  const squad = (teamId: string) =>
    (store.squads[teamId] ?? []).length

  const h2h = store.matches
    .filter(
      (item) =>
        item.status === 'finished' &&
        ((item.home === match.home && item.away === match.away) ||
          (item.home === match.away && item.away === match.home)),
    )
    .map((item) => ({
      date: item.date,
      stage: item.stage ?? `第${item.round}轮`,
      home: teamName(store.teams, item.home),
      away: teamName(store.teams, item.away),
      score: `${item.homeGoals}-${item.awayGoals}`,
    }))

  return {
    match: {
      stage: match.stage ?? `第${match.round}轮`,
      date: match.date,
      time: match.time,
      venue: match.venue || store.teams.find((team) => team.id === match.home)?.stadium || '',
      status: match.status,
    },
    home: {
      team: teamName(store.teams, match.home),
      standing: row(match.home),
      recent: recentMatches(store, match.home),
      topScorers: topScorers(match.home),
      squadSize: squad(match.home),
    },
    away: {
      team: teamName(store.teams, match.away),
      standing: row(match.away),
      recent: recentMatches(store, match.away),
      topScorers: topScorers(match.away),
      squadSize: squad(match.away),
    },
    headToHead: h2h,
    dataNotice:
      '官方未公布本场首发、伤停、逐场进球时间、控球和射门等技术统计。不得编造这些信息。',
  }
}

const SYSTEM_PROMPT = `你是“湖南省足球联赛”湖南省足球联赛的赛前数据分析助手。

规则：
1. 只能使用用户提供的 JSON 数据，不得编造伤停、首发、天气、场地状况、进球时间、技术统计或赔率。
2. 不要提到博彩、投注、赔率、奖金或任何下注建议。
3. 语言克制、客观，像体育编辑的赛前观察，不做夸张承诺。
4. 只输出 JSON，不要 Markdown，不要代码块。

JSON 结构：
{
  "result": "home" | "draw" | "away",
  "score": [主队进球整数, 客队进球整数],
  "confidence": "低" | "中" | "高",
  "headline": "不超过 18 个汉字",
  "analysis": "80-160 个汉字，基于排名、近期状态、交锋和射手数据",
  "factors": ["2-4 条简短依据，每条不超过 30 个汉字"]
}`

function parseResult(content: string): AIResult | null {
  const text = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const item = parsed as Record<string, unknown>
  const score = item.score
  if (!Array.isArray(score) || score.length !== 2) return null
  const homeGoals = Number(score[0])
  const awayGoals = Number(score[1])
  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals)) return null
  if (homeGoals < 0 || homeGoals > 9 || awayGoals < 0 || awayGoals > 9) return null

  const result = homeGoals > awayGoals ? 'home' : homeGoals < awayGoals ? 'away' : 'draw'
  const confidence =
    item.confidence === '低' || item.confidence === '中' || item.confidence === '高'
      ? item.confidence
      : '低'
  const headline = clean(item.headline, 30)
  const analysis = clean(item.analysis, 360)
  const factors = Array.isArray(item.factors)
    ? item.factors.map((factor) => clean(factor, 50)).filter(Boolean).slice(0, 4)
    : []
  if (!headline || !analysis || factors.length === 0) return null
  return {
    result,
    score: [homeGoals, awayGoals],
    confidence,
    headline,
    analysis,
    factors,
  }
}

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const stamps = (rate.get(ip) ?? []).filter((stamp) => now - stamp < 60 * 60 * 1000)
  if (stamps.length >= MAX_REQUESTS_PER_HOUR) {
    rate.set(ip, stamps)
    return true
  }
  stamps.push(now)
  rate.set(ip, stamps)
  return false
}

async function askDeepSeek(
  ai: AIOptions,
  context: object,
  fetchImpl: typeof fetch,
): Promise<AIResult | null> {
  if (ai.mock) {
    return {
      result: 'away',
      score: [0, 1],
      confidence: '中',
      headline: '客队状态更稳，谨防小比分',
      analysis:
        '从常规赛排名与近期走势看，客队整体稳定性更好。主队坐镇主场会主动压迫，但双方近几次交手比分接近，比赛大概率不会早早失去悬念。模型更倾向于客队以一球优势取胜。',
      factors: ['客队常规赛排名更高', '主队近期防守起伏', '双方历史交锋比分接近'],
    }
  }

  const base = (ai.baseUrl ?? 'https://api.deepseek.com').replace(/\/$/, '')
  const response = await fetchImpl(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ai.apiKey}`,
    },
    body: JSON.stringify({
      model: ai.model ?? 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({ task: '对本场比赛做赛前推演', data: context }),
        },
      ],
      temperature: 0.35,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(25000),
  })
  if (!response.ok) {
    throw new Error(`DeepSeek ${response.status}`)
  }
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = body.choices?.[0]?.message?.content
  return content ? parseResult(content) : null
}

export function createAIRouter({ store, ai }: Options) {
  const router = Router()
  const configured = Boolean(ai.apiKey) || ai.mock === true
  const fetchImpl = ai.fetchImpl ?? fetch

  router.get('/ai/status', (_req, res) => {
    res.json({ configured, model: ai.mock ? 'mock' : ai.model ?? 'deepseek-chat' })
  })

  router.post('/ai/preview', async (req: Request, res: Response) => {
    const matchId = typeof req.body?.matchId === 'string' ? req.body.matchId : ''
    const match = store.matches.find((item) => item.id === matchId)
    if (!match) {
      res.status(404).json({ error: '比赛不存在' })
      return
    }
    if (match.status !== 'upcoming') {
      res.status(409).json({ error: 'AI 赛前推演仅适用于未开赛比赛' })
      return
    }
    if (!configured) {
      res.status(503).json({ error: 'AI 推演服务未配置', code: 'not_configured' })
      return
    }

    const key = `${PROMPT_VERSION}:${match.id}`
    const hit = cache.get(key)
    if (hit && hit.expiresAt > Date.now()) {
      res.json({
        matchId: match.id,
        prediction: hit.result,
        model: hit.model,
        cached: true,
        disclaimer: 'DeepSeek 生成内容，仅供娱乐，不构成投注建议。',
      })
      return
    }

    if (!ai.mock) {
      const ip = req.ip ?? 'unknown'
      if (rateLimited(ip)) {
        res.status(429).json({ error: '今天调用次数较多，请稍后再试' })
        return
      }
    }

    try {
      const context = contextFor(store, match)
      const result = await askDeepSeek(ai, context, fetchImpl)
      if (!result) {
        res.status(502).json({ error: 'AI 返回格式异常，请稍后重试' })
        return
      }
      const model = ai.mock ? 'mock' : ai.model ?? 'deepseek-chat'
      cache.set(key, { expiresAt: Date.now() + CACHE_MS, result, model })
      res.json({
        matchId: match.id,
        prediction: result,
        model,
        cached: false,
        disclaimer: 'DeepSeek 生成内容，仅供娱乐，不构成投注建议。',
      })
    } catch (error) {
      console.error('AI preview failed', error instanceof Error ? error.message : error)
      res.status(502).json({ error: 'AI 推演暂时不可用，请稍后重试' })
    }
  })

  router.get('/ai/context/:matchId', (req, res) => {
    const match = store.matches.find((item) => item.id === req.params.matchId)
    if (!match) {
      res.status(404).json({ error: '比赛不存在' })
      return
    }
    res.json(contextFor(store, match))
  })

  return router
}
