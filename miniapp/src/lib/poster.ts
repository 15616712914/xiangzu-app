import Taro from '@tarojs/taro'
import { formatDate, score, stageLabel, type Match } from '../data/league'
import { predictMatch } from '../data/predict'
import { createRng, hashString } from '../data/random'
import { TEAM_MAP, type Team } from '../data/teams'

const W = 720
const H = 1180
const SANS = '"PingFang SC", "Microsoft YaHei", sans-serif'
const DISPLAY = 'sans-serif'
const MARK: Record<string, string> = { xt: '潭', xx: '西' }

type Ctx = any

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function shield(ctx: Ctx, team: Team, cx: number, cy: number, size: number) {
  const s = size / 44
  ctx.save()
  ctx.translate(cx - 20 * s, cy - 22 * s)
  ctx.scale(s, s)

  ctx.beginPath()
  ctx.moveTo(20, 1)
  ctx.lineTo(38, 6)
  ctx.lineTo(38, 22)
  ctx.bezierCurveTo(38, 33, 30, 40, 20, 43)
  ctx.bezierCurveTo(10, 40, 2, 33, 2, 22)
  ctx.lineTo(2, 6)
  ctx.closePath()
  ctx.fillStyle = team.color
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(20, 1)
  ctx.lineTo(38, 6)
  ctx.lineTo(38, 22)
  ctx.bezierCurveTo(38, 33, 30, 40, 20, 43)
  ctx.closePath()
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(2, 30)
  ctx.lineTo(38, 16)
  ctx.lineTo(38, 20)
  ctx.lineTo(3.6, 33.5)
  ctx.closePath()
  ctx.fillStyle = team.accent
  ctx.globalAlpha = 0.9
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(20, 1)
  ctx.lineTo(38, 6)
  ctx.lineTo(38, 22)
  ctx.bezierCurveTo(38, 33, 30, 40, 20, 43)
  ctx.bezierCurveTo(10, 40, 2, 33, 2, 22)
  ctx.lineTo(2, 6)
  ctx.closePath()
  ctx.stroke()

  ctx.fillStyle = '#fff'
  ctx.font = `900 17px ${SANS}`
  ctx.textAlign = 'center'
  ctx.fillText(MARK[team.id] ?? team.city[0], 20, 28)
  ctx.restore()
}

function fakeQr(ctx: Ctx, seed: string, x: number, y: number, size: number) {
  const n = 21
  const cell = size / n
  const rng = createRng(hashString(seed))
  ctx.fillStyle = '#fff'
  ctx.fillRect(x - 8, y - 8, size + 16, size + 16)
  ctx.fillStyle = '#17120f'
  const finder = (fx: number, fy: number) => {
    ctx.fillRect(x + fx * cell, y + fy * cell, cell * 7, cell * 7)
    ctx.fillStyle = '#fff'
    ctx.fillRect(x + (fx + 1) * cell, y + (fy + 1) * cell, cell * 5, cell * 5)
    ctx.fillStyle = '#17120f'
    ctx.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, cell * 3, cell * 3)
  }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const inFinder = (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9)
      if (!inFinder && rng.next() < 0.48) ctx.fillRect(x + i * cell, y + j * cell, cell, cell)
    }
  finder(0, 0)
  finder(n - 7, 0)
  finder(0, n - 7)
}

/** Draws the poster into a mini program Canvas 2D node and returns a temp PNG path. */
export async function renderPoster(match: Match, liveMinute: number, canvas: any, matches: Match[] = []) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d') as Ctx
  const home = TEAM_MAP[match.home]
  const away = TEAM_MAP[match.away]

  ctx.fillStyle = '#17120f'
  ctx.fillRect(0, 0, W, H)
  for (const [color, x] of [
    [home.color, 0],
    [away.color, W],
  ] as const) {
    const g = ctx.createRadialGradient(x, 420, 0, x, 420, 520)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(23,18,15,0)')
    ctx.globalAlpha = 0.65
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  ctx.globalAlpha = 1

  ctx.fillStyle = '#d7261e'
  roundRect(ctx, 56, 64, 72, 72, 18)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.font = `900 40px ${SANS}`
  ctx.fillText('湘', 92, 114)
  ctx.textAlign = 'left'
  ctx.font = `900 40px ${SANS}`
  ctx.fillText('湘超', 148, 104)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = `500 20px ${SANS}`
  ctx.fillText('湖南省足球联赛 · 2026 赛季', 148, 134)

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = `700 26px ${SANS}`
  const status =
    match.status === 'finished'
      ? '完场'
      : match.status === 'live'
        ? `进行中 ${liveMinute}'`
        : '比赛预告'
  ctx.fillText(`${stageLabel(match)} · ${status}`, W / 2, 250)

  shield(ctx, home, 170, 400, 150)
  shield(ctx, away, W - 170, 400, 150)
  ctx.fillStyle = '#fff'
  ctx.font = `900 38px ${SANS}`
  ctx.fillText(home.city, 170, 530)
  ctx.fillText(away.city, W - 170, 530)

  const p = predictMatch(match, match.status === 'live' ? liveMinute : undefined, matches.length ? matches : undefined)
  if (match.status === 'upcoming') {
    ctx.font = `700 96px ${DISPLAY}`
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillText('VS', W / 2, 432)
  } else {
    const [hs, as] = score(match, liveMinute)
    ctx.font = `700 140px ${DISPLAY}`
    ctx.fillStyle = '#fff'
    ctx.fillText(`${hs} : ${as}`, W / 2, 450)
  }

  const boxY = 600
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  roundRect(ctx, 56, boxY, W - 112, 250, 28)
  ctx.fill()
  ctx.textAlign = 'left'
  ctx.fillStyle = '#fcd34d'
  ctx.font = `700 24px ${SANS}`
  ctx.fillText(match.status === 'finished' ? 'AI 赛前预测' : 'AI 预测', 92, boxY + 52)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#fff'
  ctx.font = `700 64px ${DISPLAY}`
  ctx.fillText(`${p.predicted[0]} : ${p.predicted[1]}`, W - 92, boxY + 74)
  const barY = boxY + 120
  const barW = W - 184
  let x = 92
  const parts: [number, string, string][] = [
    [p.probs.home, home.color, `${home.city}胜 ${Math.round(p.probs.home * 100)}%`],
    [p.probs.draw, '#a39a91', `平 ${Math.round(p.probs.draw * 100)}%`],
    [p.probs.away, away.color, `${away.city}胜 ${Math.round(p.probs.away * 100)}%`],
  ]
  for (const [v, color] of parts) {
    ctx.fillStyle = color
    roundRect(ctx, x, barY, Math.max(4, v * barW - 4), 18, 9)
    ctx.fill()
    x += v * barW
  }
  ctx.font = `700 24px ${SANS}`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'left'
  ctx.fillText(parts[0][2], 92, barY + 64)
  ctx.textAlign = 'center'
  ctx.fillText(parts[1][2], W / 2, barY + 64)
  ctx.textAlign = 'right'
  ctx.fillText(parts[2][2], W - 92, barY + 64)

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = `500 24px ${SANS}`
  ctx.fillText(`${formatDate(match.date)} ${match.time} · ${home.stadium}`, W / 2, 910)

  fakeQr(ctx, match.id, 72, 990, 120)
  ctx.textAlign = 'left'
  ctx.fillStyle = '#fff'
  ctx.font = `900 30px ${SANS}`
  ctx.fillText('长按识别，一起看湘超', 236, 1040)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = `500 20px ${SANS}`
  ctx.fillText('原型示意二维码 · 预测仅供娱乐参考', 236, 1080)

  const res = await Taro.canvasToTempFilePath({
    canvas,
    x: 0,
    y: 0,
    width: W,
    height: H,
    destWidth: W,
    destHeight: H,
    fileType: 'png',
  } as any)
  return res.tempFilePath
}
