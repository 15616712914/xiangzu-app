import { MATCHES, formatDate, stageLabel, type Match } from '../data/league'
import { TEAM_MAP } from '../data/teams'
import type { View } from '../state'

/**
 * Local reminder feed built from the real fixture list.
 * Until subscription messages are configured, this is the only honest "notification" source.
 */
export function seedNotifications(favTeam: string | null, matches: Match[] = MATCHES) {
  const upcoming = matches
    .filter((m) => m.status === 'upcoming')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  const fav = favTeam ? TEAM_MAP[favTeam] : null
  const chosen = fav
    ? upcoming.filter((m) => m.home === fav.id || m.away === fav.id).slice(0, 3)
    : upcoming.slice(0, 3)

  return chosen.map((m) => ({
    id: `kickoff-${m.id}`,
    kind: 'kickoff' as const,
    title: fav && (m.home === fav.id || m.away === fav.id) ? `${fav.city}队比赛预告` : '下一场比赛',
    body: `${stageLabel(m)} ${TEAM_MAP[m.home].city} vs ${TEAM_MAP[m.away].city}，${formatDate(m.date)} ${m.time}`,
    time: '即将开始',
    target: { type: 'match' as const, id: m.id } as View,
  }))
}

export function unreadCount(favTeam: string | null, read: string[], matches: Match[] = MATCHES) {
  return seedNotifications(favTeam, matches).filter((n) => !read.includes(n.id)).length
}
