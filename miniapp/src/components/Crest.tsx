import { useMemo } from 'react'
import { svgDataUrl } from '../lib/svg'
import { AppImage } from './AppImage'
import { TEAM_LOGOS } from '../data/logos'
import type { Team } from '../data/teams'

const MARK_OVERRIDES: Record<string, string> = { xt: '潭', xx: '西' }
const cache = new Map<string, string>()

function crestUrl(team: Team) {
  const hit = cache.get(team.id)
  if (hit) return hit
  const mark = MARK_OVERRIDES[team.id] ?? team.city[0]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="44" viewBox="0 0 40 44"><path d="M20 1 L38 6 V22 C38 33 30 40 20 43 C10 40 2 33 2 22 V6 Z" fill="${team.color}"/><path d="M20 1 L38 6 V22 C38 33 30 40 20 43 Z" fill="#000" opacity="0.12"/><path d="M2 30 L38 16 V20 L3.6 33.5 Z" fill="${team.accent}" opacity="0.9"/><path d="M20 1 L38 6 V22 C38 33 30 40 20 43 C10 40 2 33 2 22 V6 Z" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1.5"/><text x="20" y="25" text-anchor="middle" font-size="17" font-weight="900" font-family="PingFang SC, sans-serif" fill="#fff">${mark}</text></svg>`
  const url = svgDataUrl(svg)
  cache.set(team.id, url)
  return url
}

export function Crest({ team, size = 36, className }: { team: Team; size?: number; className?: string }) {
  const src = useMemo(() => TEAM_LOGOS[team.id] ?? crestUrl(team), [team])
  return (
    <AppImage
      className={className}
      src={src}
      mode='aspectFit'
      style={{ width: `${size}px`, height: `${Math.round(size * 1.1)}px`, flexShrink: 0 }}
    />
  )
}
