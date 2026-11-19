import { useState } from 'react'
import { usePageScroll } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useApp } from '../state'
import { score, type Match } from '../data/league'
import { TEAM_MAP, type Team } from '../data/teams'
import { Crest } from './Crest'
import { Icon } from './Icon'
import { statusBarHeight } from './NavBar'
import './ui.scss'

export function LiveBadge({ minute }: { minute: number }) {
  return (
    <View className='live-badge'>
      <View className='live-dot' />
      <Text>{minute >= 90 ? "90+'" : `${minute}'`}</Text>
    </View>
  )
}

export function SectionTitle({
  children,
  action,
  kicker,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  kicker?: string
}) {
  return (
    <View className='section-head'>
      <View className='section-title-wrap'>
        {kicker && <Text className='section-kicker'>{kicker}</Text>}
        <View className='section-title'>{children}</View>
      </View>
      {action ?? null}
    </View>
  )
}

export function MatchCard({
  match,
  liveMinute,
  reminded,
  onToggleRemind,
  onOpen,
  highlightTeam,
  bare = false,
}: {
  match: Match
  liveMinute: number
  reminded: boolean
  onToggleRemind: () => void
  onOpen: () => void
  highlightTeam?: string | null
  bare?: boolean
}) {
  const home = TEAM_MAP[match.home]
  const away = TEAM_MAP[match.away]
  const [hs, as] = score(match, liveMinute)
  const isFav = highlightTeam && (match.home === highlightTeam || match.away === highlightTeam)
  const live = match.status === 'live'
  const penWinner = match.penalty
    ? match.penalty[0] > match.penalty[1]
      ? 'home'
      : 'away'
    : null

  return (
    <View
      className={`match-card ${bare ? 'bare' : ''} ${isFav ? 'fav' : ''}`}
      onClick={onOpen}
    >
      {(live || isFav) && <View className={`match-mark ${live ? 'live' : ''}`} />}
      <View className='match-time'>
        {live ? (
          <LiveBadge minute={liveMinute} />
        ) : (
          <Text className='match-clock'>{match.time}</Text>
        )}
        <Text className={`match-state ${live ? 'live' : ''}`}>
          {match.status === 'finished'
            ? match.penalty
              ? `点球 ${match.penalty[0]}:${match.penalty[1]}`
              : '完场'
            : live
              ? '进行中'
              : '未开赛'}
        </Text>
      </View>
      <View className='match-teams'>
        <TeamLine
          team={home}
          goals={match.status === 'upcoming' ? null : hs}
          winner={match.status === 'finished' && (hs > as || penWinner === 'home')}
          dim={match.status === 'finished' && (hs < as || penWinner === 'away')}
        />
        <TeamLine
          team={away}
          goals={match.status === 'upcoming' ? null : as}
          winner={match.status === 'finished' && (as > hs || penWinner === 'away')}
          dim={match.status === 'finished' && (as < hs || penWinner === 'home')}
        />
      </View>
      {match.status === 'upcoming' && (
        <View
          className={`remind ${reminded ? 'on' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleRemind()
          }}
        >
          <Icon name={reminded ? 'bellRing' : 'bell'} size={16} color={reminded ? '#ffffff' : 'rgba(20,16,17,.45)'} />
        </View>
      )}
    </View>
  )
}

function TeamLine({
  team,
  goals,
  winner,
  dim,
}: {
  team: Team
  goals: number | null
  winner: boolean
  dim: boolean
}) {
  return (
    <View className='team-line'>
      <Crest team={team} size={22} />
      <Text className={`team-name ${winner ? 'win' : dim ? 'dim' : ''}`}>{team.city}</Text>
      {goals !== null && (
        <Text className={`team-goals ${winner ? 'win' : dim ? 'dim' : ''}`}>{goals}</Text>
      )}
    </View>
  )
}

/** Fixed title bar that fades in once the page header scrolls out from under the status bar. */
export function TopBar({ title, capAt = 44 }: { title: string; capAt?: number }) {
  const top = statusBarHeight()
  const [on, setOn] = useState(false)
  const [cap, setCap] = useState(false)

  usePageScroll(({ scrollTop }) => {
    const nextOn = scrollTop > 44
    const nextCap = scrollTop > capAt
    setOn((prev) => (prev === nextOn ? prev : nextOn))
    setCap((prev) => (prev === nextCap ? prev : nextCap))
  })

  return (
    <View
      className={`topbar ${on ? 'on' : ''} ${cap ? 'capped' : ''}`}
      style={{ paddingTop: `${top}px` }}
    >
      <View className='topbar-row'>
        <Text className='topbar-title'>{title}</Text>
      </View>
    </View>
  )
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  children,
  dark = true,
}: {
  kicker?: string
  title: string
  subtitle?: string
  children?: React.ReactNode
  dark?: boolean
}) {
  const top = statusBarHeight()
  const [stuck, setStuck] = useState(false)

  usePageScroll(({ scrollTop }) => {
    const next = scrollTop > 0
    setStuck((prev) => (prev === next ? prev : next))
  })

  return (
    <View
      className={`page-header ${dark ? 'dark' : ''} ${stuck ? 'stuck' : ''}`}
      style={{ paddingTop: `${top + 20}px` }}
    >
      {kicker && <Text className='page-kicker'>{kicker}</Text>}
      <Text className='page-title'>{title}</Text>
      {subtitle && <Text className='page-sub'>{subtitle}</Text>}
      {children}
    </View>
  )
}

export function DarkSegments<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: readonly (readonly [T, string])[]
}) {
  return (
    <View className='segments'>
      {options.map(([key, label]) => (
        <Text
          key={key}
          className={`segment ${value === key ? 'on' : ''}`}
          onClick={() => onChange(key)}
        >
          {label}
        </Text>
      ))}
    </View>
  )
}

export function Empty({ text }: { text: string }) {
  return <Text className='empty'>{text}</Text>
}

export function useTeamName(id: string) {
  return TEAM_MAP[id]?.city ?? id
}

export function useMatchTeams(match: Match) {
  const app = useApp()
  return { home: TEAM_MAP[match.home], away: TEAM_MAP[match.away], app }
}
