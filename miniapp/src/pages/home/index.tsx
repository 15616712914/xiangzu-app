import { useEffect, useMemo, useState } from 'react'
import Taro, { usePullDownRefresh } from '@tarojs/taro'
import { View, Text, ScrollView } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { LiveBadge, MatchCard, SectionTitle, TopBar } from '../../components/ui'
import { statusBarHeight } from '../../components/NavBar'
import { AiPicks } from '../../components/AiPicks'
import { Onboarding } from '../../components/Onboarding'
import { TabBar } from '../../components/TabBar'
import {
  CURRENT_ROUND,
  TOTAL_ROUNDS,
  formatDate,
  score,
  stageLabel,
  type Match,
} from '../../data/league'
import { TEAM_MAP } from '../../data/teams'
import { unreadCount } from '../../lib/notifications'
import './index.scss'

export default function Home() {
  const app = useApp()

  usePullDownRefresh(() => {
    void app.refresh().finally(() => Taro.stopPullDownRefresh())
  })
  const [round, setRound] = useState(CURRENT_ROUND)
  const [sheetTop, setSheetTop] = useState(0)
  const live =
    app.matches.find((m) => m.status === 'live') ??
    app.matches.find((m) => m.status === 'upcoming') ??
    app.matches[app.matches.length - 1]
  const favNext = app.favTeam
    ? app.matches.find(
        (m) => m.status !== 'finished' && (m.home === app.favTeam || m.away === app.favTeam),
      )
    : null
  const unread = unreadCount(app.favTeam, app.readNotifs, app.matches)

  const grouped = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of app.matches.filter((x) => x.round === round)) {
      if (!map.has(m.date)) map.set(m.date, [])
      map.get(m.date)!.push(m)
    }
    return [...map.entries()]
  }, [round, app.matches])

  const top = statusBarHeight()
  const iconBtn = 'hero-icon'

  // The compact bar's rounded cap should appear exactly when the sheet reaches it.
  useEffect(() => {
    const timer = setTimeout(() => {
      Taro.createSelectorQuery()
        .select('.home-sheet')
        .boundingClientRect()
        .selectViewport()
        .scrollOffset()
        .exec((res) => {
          const rect = res?.[0] as { top?: number } | null
          const viewport = res?.[1] as { scrollTop?: number } | null
          if (rect && typeof rect.top === 'number') {
            setSheetTop(rect.top + (viewport?.scrollTop ?? 0))
          }
        })
    }, 200)
    return () => clearTimeout(timer)
  }, [live.id, live.status])

  const showAt = sheetTop ? Math.max(0, sheetTop - top - 44) : Number.MAX_SAFE_INTEGER

  return (
    <View className='app home'>
      <TopBar title='湘超' capAt={showAt} />
      <View className='home-hero' style={{ paddingTop: `${top + 8}px` }}>
        <View className='hero-top'>
          <View className='brand'>
            <View className='brand-mark'>湘</View>
            <View>
              <Text className='brand-name'>湘超</Text>
              <Text className='brand-sub'>HUNAN LEAGUE · 2026</Text>
            </View>
          </View>
        </View>

        {/* Kept below the brand row so WeChat's capsule menu never covers these actions. */}
        <View className='hero-tools'>
          <View
            className={iconBtn}
            onClick={() => app.open({ type: 'search', id: 'all' })}
          >
            <Icon name='search' size={18} color='rgba(255,255,255,.8)' />
          </View>
          <View
            className={iconBtn}
            onClick={() => app.open({ type: 'notifications', id: 'inbox' })}
          >
            <Icon name='bell' size={18} color='rgba(255,255,255,.8)' />
            {unread > 0 && <Text className='badge'>{unread}</Text>}
          </View>
          <View
            className={`${iconBtn} avatar`}
            onClick={() => Taro.reLaunch({ url: '/pages/me/index' })}
          >
            {app.favTeam ? (
              <Crest team={TEAM_MAP[app.favTeam]} size={24} />
            ) : (
              <Icon name='user' size={18} color='rgba(255,255,255,.8)' />
            )}
          </View>
        </View>

        <LiveHero matchId={live.id} />
      </View>

      <View className='sheet home-sheet'>
        {favNext && (
          <View className='section'>
            <SectionTitle kicker='My Club'>我的主队</SectionTitle>
            <View
              className='card fav-next'
              onClick={() => app.open({ type: 'match', id: favNext.id })}
            >
              <View
                className='fav-stripe'
                style={{ background: TEAM_MAP[app.favTeam!].color }}
              />
              <Crest team={TEAM_MAP[app.favTeam!]} size={42} />
              <View className='grow fav-next-main'>
                <Text className='fav-next-sub'>
                  {favNext.status === 'live'
                    ? '正在比赛'
                    : `下一场 · ${stageLabel(favNext)} · ${formatDate(favNext.date)} ${favNext.time}`}
                </Text>
                <Text className='fav-next-title'>
                  {TEAM_MAP[favNext.home].city} vs {TEAM_MAP[favNext.away].city}
                </Text>
              </View>
              <Icon name='right' size={18} color='rgba(20,16,17,.25)' />
            </View>
          </View>
        )}

        <AiPicks />

        <View className='section bracket-wrap'>
          <View
            className='bracket-card'
            onClick={() => app.open({ type: 'bracket', id: 'ko' })}
          >
            <View className='bracket-icon'>
              <Icon name='trophy' size={20} color='#e3a83b' />
            </View>
            <View className='grow'>
              <Text className='kicker bracket-kicker'>Knockout</Text>
              <Text className='bracket-title'>淘汰赛对阵 · 四强出炉</Text>
            </View>
            <Icon name='right' size={18} color='rgba(20,16,17,.3)' />
          </View>
        </View>

        <View className='section fixtures-head'>
          <SectionTitle
            action={<Text className='section-action'>共 {TOTAL_ROUNDS} 轮</Text>}
          >
            赛程赛果
          </SectionTitle>
        </View>

        <ScrollView scrollX className='rounds' showScrollbar={false}>
          {Array.from({ length: TOTAL_ROUNDS }, (_, i) => i + 1).map((r) => (
            <View
              key={r}
              className={`round-chip ${r === round ? 'on' : ''}`}
              onClick={() => setRound(r)}
            >
              <Text>第{r}轮</Text>
              {r === CURRENT_ROUND && <View className='round-dot' />}
            </View>
          ))}
        </ScrollView>

        <View className='fixture-list'>
          {grouped.map(([date, list]) => (
            <View key={date} className='fixture-group'>
              <View className='fixture-date'>
                <Text>{formatDate(date)}</Text>
                <View className='fixture-line' />
                <Text className='fixture-count'>{list.length} 场</Text>
              </View>
              <View className='card fixture-card'>
                {list.map((m, i) => (
                  <View key={m.id}>
                    {i > 0 && <View className='hairline' />}
                    <MatchCard
                      bare
                      match={m}
                      liveMinute={app.liveMinute}
                      reminded={app.reminders.includes(m.id)}
                      onToggleRemind={() => app.toggleRemind(m.id)}
                      onOpen={() => app.open({ type: 'match', id: m.id })}
                      highlightTeam={app.favTeam}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View className='home-foot'>
          <Text>湘超 · 湖南人的城市足球联赛</Text>
        </View>
      </View>

      <TabBar active='home' />

      {!app.onboarded && !app.favTeam && <Onboarding onDone={app.finishOnboarding} />}
    </View>
  )
}

function LiveHero({ matchId }: { matchId: string }) {
  const app = useApp()
  const match = app.matches.find((m) => m.id === matchId)!
  const home = TEAM_MAP[match.home]
  const away = TEAM_MAP[match.away]
  const [hs, as] = score(match, app.liveMinute)
  const pct = Math.min(app.liveMinute, 90) / 90
  const isLive = match.status === 'live'
  const isUpcoming = match.status === 'upcoming'
  const stage = stageLabel(match)

  return (
    <View
      className='live-hero'
      onClick={() => app.open({ type: 'match', id: match.id })}
      style={{
        background: `linear-gradient(135deg, ${home.color}55 0%, #141011 48%, ${away.color}55 100%)`,
      }}
    >
      <View className='live-head'>
        <View className='row gap-2'>
          <Text className='kicker live-kicker'>{isLive ? 'Live' : isUpcoming ? 'Next' : 'FT'}</Text>
          <Text className='live-round'>
            {isLive ? `${stage}焦点战` : `${stage} · ${match.time}`}
          </Text>
        </View>
        {isLive ? (
          <LiveBadge minute={app.liveMinute} />
        ) : (
          <Text className='live-round'>{isUpcoming ? '未开赛' : '完场'}</Text>
        )}
      </View>

      <View className='hero-score'>
        <View className='hero-team'>
          <Crest team={home} size={60} />
          <Text className='hero-city'>{home.city}</Text>
        </View>
        {isUpcoming ? (
          <Text className='hero-vs'>VS</Text>
        ) : (
          <View className='hero-nums'>
            <Text className='hero-num'>{hs}</Text>
            <Text className='hero-colon'>:</Text>
            <Text className='hero-num'>{as}</Text>
          </View>
        )}
        <View className='hero-team'>
          <Crest team={away} size={60} />
          <Text className='hero-city'>{away.city}</Text>
        </View>
      </View>

      {isLive && (
        <View className='hero-progress'>
          <View className='hero-progress-fill' style={{ width: `${pct * 100}%` }} />
        </View>
      )}
      <View className='hero-meta'>
        <Icon name='pin' size={13} color='rgba(255,255,255,.55)' />
        <Text>
          {home.stadium}
          {!isUpcoming && ` · 现场 ${match.attendance.toLocaleString()} 人`}
        </Text>
      </View>
    </View>
  )
}
