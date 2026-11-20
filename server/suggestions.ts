import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Match } from '../miniapp/src/data/league'

export type SuggestionField = 'penalty' | 'attendance' | 'score'

export type Suggestion = {
  id: string
  matchId: string
  field: SuggestionField
  before: unknown
  after: unknown
  confidence: number
  evidence: string
  source: string
  createdAt: string
  status: 'pending' | 'accepted' | 'rejected'
}

export type ExtractedSuggestion = Omit<Suggestion, 'id' | 'createdAt' | 'status' | 'matchId'>

const MAX_TEXT = 12000

function clampScore(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null
  const home = Number(value[0])
  const away = Number(value[1])
  if (!Number.isInteger(home) || !Number.isInteger(away)) return null
  if (home < 0 || home > 20 || away < 0 || away > 20) return null
  return [home, away]
}

function parseJson(text: string): any {
  const clean = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  return JSON.parse(clean)
}

export async function fetchSourceText(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`战报链接返回 ${res.status}`)
  const type = res.headers.get('content-type') ?? ''
  if (type.includes('pdf')) throw new Error('PDF 战报暂不支持，请把正文粘贴进来')
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length < 80) throw new Error('战报正文太短，可能是登录页或防抓取页面，请直接粘贴正文')
  return text.slice(0, MAX_TEXT)
}

export async function extractSuggestions(input: {
  match: Match
  text: string
  source: string
  apiKey: string
  model?: string
  baseUrl?: string
  fetchImpl?: typeof fetch
}): Promise<ExtractedSuggestion[]> {
  const doFetch = input.fetchImpl ?? fetch
  const baseUrl = (input.baseUrl ?? 'https://api.deepseek.com').replace(/\/$/, '')
  const prompt = `你是足球赛事数据校对员。只根据下面这段官方战报提取数据，找不到的字段返回 null，禁止猜测、禁止补全。

比赛：${input.match.home} vs ${input.match.away}
当前比分：${input.match.homeGoals}:${input.match.awayGoals}
当前点球：${input.match.penalty ? input.match.penalty.join(':') : '无'}
当前现场人数：${input.match.attendance || '无'}

请返回严格 JSON：
{
  "penalty": [主队点球数, 客队点球数] 或 null,
  "attendance": 整数 或 null,
  "score": [主队进球, 客队进球] 或 null,
  "evidence": "支持这些数字的原文片段，最多 200 字",
  "confidence": 0 到 1 之间的小数
}

战报正文：
${input.text.slice(0, MAX_TEXT)}`

  const res = await doFetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model ?? 'deepseek-chat',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: '你只输出 JSON，不输出解释。数字必须来自原文。' },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`AI 解析失败（${res.status}）：${body.slice(0, 200)}`)
  }
  const data = (await res.json()) as any
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 没有返回内容')
  const parsed = parseJson(content)
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0))
  const evidence = String(parsed.evidence ?? '').slice(0, 300)
  const items: ExtractedSuggestion[] = []

  const penalty = clampScore(parsed.penalty)
  const currentPenalty = input.match.penalty ?? null
  if (penalty && JSON.stringify(penalty) !== JSON.stringify(currentPenalty)) {
    items.push({
      field: 'penalty',
      before: currentPenalty,
      after: penalty,
      confidence,
      evidence,
      source: input.source,
    })
  }

  const attendance = Number(parsed.attendance)
  if (Number.isInteger(attendance) && attendance >= 0 && attendance <= 200000 && attendance !== (input.match.attendance ?? 0)) {
    items.push({
      field: 'attendance',
      before: input.match.attendance ?? 0,
      after: attendance,
      confidence,
      evidence,
      source: input.source,
    })
  }

  const score = clampScore(parsed.score)
  if (score && (score[0] !== input.match.homeGoals || score[1] !== input.match.awayGoals)) {
    items.push({
      field: 'score',
      before: [input.match.homeGoals, input.match.awayGoals],
      after: score,
      confidence,
      evidence,
      source: input.source,
    })
  }

  return items
}

export function loadSuggestions(file: string): Suggestion[] {
  if (!existsSync(file)) return []
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveSuggestions(file: string, list: Suggestion[]) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(list.slice(-200), null, 2))
}

export function applySuggestion(match: Match, field: SuggestionField, after: unknown): boolean {
  if (field === 'penalty') {
    const value = clampScore(after)
    if (!value) return false
    match.penalty = value
    return true
  }
  if (field === 'attendance') {
    const value = Number(after)
    if (!Number.isInteger(value) || value < 0 || value > 200000) return false
    match.attendance = value
    return true
  }
  if (field === 'score') {
    const value = clampScore(after)
    if (!value) return false
    match.homeGoals = value[0]
    match.awayGoals = value[1]
    match.status = 'finished'
    return true
  }
  return false
}
