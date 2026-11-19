import { Router, type Request, type RequestHandler, type Response } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Match } from '../miniapp/src/data/league'
import {
  CHEER_DAILY_LIMIT,
  isVoteLocked,
  type Choice,
  type FansStore,
} from './fans'

type Options = {
  fans: FansStore
  matches: () => Match[]
  teamIds: () => string[]
  appleClientId?: string
  allowDevAuth?: boolean
  devAuthToken?: string
}

type AuthedRequest = Request & { fanUser?: { id: string; nickname: string; createdAt: string } }

const CHOICES: Choice[] = ['home', 'draw', 'away']
const JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'))

function bearer(req: Request): string | null {
  const value = req.header('authorization')
  if (!value?.startsWith('Bearer ')) return null
  return value.slice(7).trim() || null
}

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next)
  }
}

export function createFansRouter(options: Options) {
  const { fans } = options
  const appleClientId = options.appleClientId
  const allowDevAuth = options.allowDevAuth === true
  const devAuthToken = options.devAuthToken ?? 'dev-only'

  const currentUser = (req: Request) => {
    const token = bearer(req)
    return token ? fans.userByToken(token) : null
  }

  const requireUser: RequestHandler = (req, res, next) => {
    const user = currentUser(req)
    if (!user) {
      res.status(401).json({ error: '请先登录' })
      return
    }
    ;(req as AuthedRequest).fanUser = user
    next()
  }

  const router = Router()

  router.post(
    '/auth/dev',
    asyncRoute(async (req, res) => {
      if (!allowDevAuth) {
        res.status(403).json({ error: '开发登录未开启' })
        return
      }
      if (req.header('x-dev-token') !== devAuthToken) {
        res.status(403).json({ error: '开发登录令牌无效' })
        return
      }
      const deviceId = typeof req.body?.deviceId === 'string' ? req.body.deviceId.slice(0, 80) : ''
      if (deviceId.length < 8) {
        res.status(400).json({ error: '缺少设备标识' })
        return
      }
      const user = fans.upsertDevUser(deviceId, req.body?.nickname)
      const token = fans.createSession(user.id)
      res.json({ token, user: fans.publicUser(user) })
    }),
  )

  router.post(
    '/auth/apple',
    asyncRoute(async (req, res) => {
      if (!appleClientId) {
        res.status(501).json({ error: 'Apple 登录未配置' })
        return
      }
      const identityToken = req.body?.identityToken
      if (typeof identityToken !== 'string' || identityToken.length < 20) {
        res.status(400).json({ error: '缺少 Apple 身份令牌' })
        return
      }
      try {
        const { payload } = await jwtVerify(identityToken, JWKS, {
          issuer: 'https://appleid.apple.com',
          audience: appleClientId,
        })
        if (!payload.sub) {
          res.status(401).json({ error: 'Apple 身份令牌无效' })
          return
        }
        const user = fans.upsertAppleUser(payload.sub, req.body?.nickname)
        const token = fans.createSession(user.id)
        res.json({ token, user: fans.publicUser(user) })
      } catch {
        res.status(401).json({ error: 'Apple 登录校验失败' })
      }
    }),
  )

  router.get(
    '/fans/me',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = (req as AuthedRequest).fanUser!
      const profile = fans.meProfile(user.id, options.matches())
      if (!profile) {
        res.status(404).json({ error: '账号不存在' })
        return
      }
      res.json(profile)
    }),
  )

  router.get(
    '/fans/board',
    asyncRoute(async (req, res) => {
      const user = currentUser(req)
      res.json(fans.board(user?.id ?? null, options.matches(), options.teamIds()))
    }),
  )

  router.get(
    '/fans/votes/:matchId',
    asyncRoute(async (req, res) => {
      const match = options.matches().find((m) => m.id === req.params.matchId)
      if (!match) {
        res.status(404).json({ error: '比赛不存在' })
        return
      }
      const user = currentUser(req)
      res.json(fans.voteSummary(match, user?.id))
    }),
  )

  router.post(
    '/fans/votes',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = (req as AuthedRequest).fanUser!
      const matchId = req.body?.matchId
      const choice = req.body?.choice
      if (typeof matchId !== 'string' || !CHOICES.includes(choice)) {
        res.status(400).json({ error: '投票参数无效' })
        return
      }
      const match = options.matches().find((m) => m.id === matchId)
      if (!match) {
        res.status(404).json({ error: '比赛不存在' })
        return
      }
      if (isVoteLocked(match)) {
        res.status(409).json({ error: '这场比赛已截止投票' })
        return
      }
      fans.recordVote(user.id, match.id, choice as Choice)
      res.json(fans.voteSummary(match, user.id))
    }),
  )

  router.post(
    '/fans/cheers',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = (req as AuthedRequest).fanUser!
      const teamId = typeof req.body?.teamId === 'string' ? req.body.teamId : ''
      if (!options.teamIds().includes(teamId)) {
        res.status(400).json({ error: '球队不存在' })
        return
      }
      if (!fans.recordCheer(user.id, teamId)) {
        res.status(429).json({ error: '今日助威次数已用完' })
        return
      }
      const today = fans.cheersToday(user.id)
      res.json({
        teamId,
        count: fans.teamCheerCount(teamId),
        cheersToday: today,
        cheersRemaining: Math.max(0, CHEER_DAILY_LIMIT - today),
      })
    }),
  )

  router.patch(
    '/fans/preferences',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = (req as AuthedRequest).fanUser!
      const rawFavourite = req.body?.favouriteTeam
      if (rawFavourite !== null && typeof rawFavourite !== 'string') {
        res.status(400).json({ error: '主队参数无效' })
        return
      }
      if (typeof rawFavourite === 'string' && !options.teamIds().includes(rawFavourite)) {
        res.status(400).json({ error: '主队不存在' })
        return
      }
      const rawReminders = req.body?.reminders
      if (!Array.isArray(rawReminders)) {
        res.status(400).json({ error: '提醒参数无效' })
        return
      }
      const validMatchIds = new Set(options.matches().map((match) => match.id))
      const reminders = rawReminders
        .filter((id): id is string => typeof id === 'string' && validMatchIds.has(id))
        .slice(0, 100)
      fans.updatePreferences(user.id, {
        favouriteTeam: rawFavourite ?? null,
        reminders,
      })
      const profile = fans.meProfile(user.id, options.matches())
      res.json(profile)
    }),
  )

  router.patch(
    '/fans/me',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = (req as AuthedRequest).fanUser!
      const updated = fans.updateNickname(user.id, req.body?.nickname)
      if (!updated) {
        res.status(404).json({ error: '账号不存在' })
        return
      }
      res.json(fans.publicUser(updated))
    }),
  )

  router.post('/fans/logout', (req, res) => {
    const token = bearer(req)
    if (token) fans.revokeToken(token)
    res.status(204).end()
  })

  router.delete(
    '/fans/me',
    requireUser,
    asyncRoute(async (req, res) => {
      const user = (req as AuthedRequest).fanUser!
      fans.deleteUser(user.id)
      res.status(204).end()
    }),
  )

  return router
}
