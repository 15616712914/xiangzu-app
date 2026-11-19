import { useMemo, useState } from 'react'
import Taro, { usePullDownRefresh, useRouter, useShareAppMessage } from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { LiveBadge } from '../../components/ui'
import { NavBar, statusBarHeight } from '../../components/NavBar'
import {
  PLAYER_MAP,
  formatDate,
  score,
  stageLabel,
  startersOf,
  visibleEvents,
  type Match,
} from '../../data/league'
import { TEAM_MAP, type Player } from '../../data/teams'
import { createRng, hashString } from '../../data/random'
import { predictMatch, actualOutcome } from '../../data/predict'
import { buildIcs } from '../../lib/calendar'
import './index.scss'

type Tab = 'events' | 'live' | 'ai' | 'stats' | 'lineup' | 'talk'

export default function MatchDetail() {
  const router = useRouter()
  const app = useApp()
  const id = router.params.id ?? ''
  const match = app.matches.find((m) => m.id === id)

  usePullDownRefresh(() => {
    void app.refresh().finally(() => Taro.stopPullDownRefresh())
  })
  const initialTab = router.params.tab === 'ai' ? 'ai' : undefined
  const [tab, setTab] = useState<Tab>(initialTab ?? (match?.status === 'upcoming' ? 'ai' : 'events'))

  useShareAppMessage(() => {
    if (!match) return { title: '湘超', path: '/pages/home/index' }
    const home = TEAM_MAP[match.home]
    const away = TEAM_MAP[match.away]
    const [hs, as] = score(match, app.liveMinute)
    return {
      title:
        match.status === 'upcoming'
          ? `湘超${stageLabel(match)} ${home.city} vs ${away.city}`
          : `湘超 ${home.city} ${hs}:${as} ${away.city}`,
      path: `/pages/match/index?id=${match.id}`,
    }
  })

  if (!match) {
    return (
      <View className='app'>
        <NavBar title='比赛' />
        <Text className='empty'>比赛不存在</Text>
      </View>
    )
  }

  const home = TEAM_MAP[match.home]
  const away = TEAM_MAP[match.away]
  const [hs, as] = score(match, app.liveMinute)
  const reminded = app.reminders.includes(match.id)
  const top = statusBarHeight()

  return (
    <View className='app match-page'>
      <View
        className='match-hero'
        style={{
          paddingTop: `${top + 52}px`,
          background: `radial-gradient(circle at 0% 40%, ${home.color}66, transparent 55%), radial-gradient(circle at 100% 40%, ${away.color}66, transparent 55%), #141011`,
        }}
      >
        <NavBar tone='dark' share />
        <Text className='match-round'>
          {match.phase === 'knockout' ? match.stage : `第${match.round}轮`} ·{' '}
          {formatDate(match.date)} {match.time}
        </Text>

        <View className='match-score'>
          <View className='match-team' onClick={() => app.open({ type: 'team', id: home.id })}>
            <Crest team={home} size={60} />
            <Text className='match-team-name'>{home.city}</Text>
            <Text className='match-team-side'>主场</Text>
          </View>
          <View className='match-center'>
            {match.status === 'upcoming' ? (
              <Text className='match-vs'>VS</Text>
            ) : (
              <View className='row'>
                <Text className='match-num'>{hs}</Text>
                <Text className='match-colon'>:</Text>
                <Text className='match-num'>{as}</Text>
              </View>
            )}
            {match.status === 'live' ? (
              <LiveBadge minute={app.liveMinute} />
            ) : (
              <Text className='match-status'>
                {match.status === 'finished'
                  ? match.penalty
                    ? `点球 ${match.penalty[0]}:${match.penalty[1]}`
                    : '完场'
                  : '未开赛'}
              </Text>
            )}
          </View>
          <View className='match-team' onClick={() => app.open({ type: 'team', id: away.id })}>
            <Crest team={away} size={60} />
            <Text className='match-team-name'>{away.city}</Text>
            <Text className='match-team-side'>客场</Text>
          </View>
        </View>

        <View className='match-venue'>
          <Icon name='pin' size={13} color='rgba(255,255,255,.55)' />
          <Text>
            {match.venue || home.stadium}
            {match.status !== 'upcoming' && match.attendance > 0
              ? ` · 观众 ${match.attendance.toLocaleString()}`
              : ''}
          </Text>
        </View>

        {match.status === 'upcoming' && (
          <View className='match-actions'>
            <View
              className={`action-btn ${reminded ? 'light' : 'chili'}`}
              onClick={() => app.toggleRemind(match.id)}
            >
              <Icon
                name={reminded ? 'bellRing' : 'bell'}
                size={15}
                color={reminded ? '#141011' : '#ffffff'}
              />
              <Text>{reminded ? '已加入提醒' : '加入提醒'}</Text>
            </View>
            <View
              className='action-btn ghost'
              onClick={() => {
                Taro.setClipboardData({ data: buildIcs([match]) }).then(() =>
                  Taro.showToast({ title: '日历内容已复制', icon: 'none' }),
                )
              }}
            >
              <Icon name='calendarPlus' size={15} color='#ffffff' />
              <Text>加入日历</Text>
            </View>
          </View>
        )}

        <View
          className='poster-link'
          onClick={() => app.open({ type: 'poster', id: match.id })}
        >
          <Icon name='imageDown' size={14} color='rgba(255,255,255,.75)' />
          <Text>生成分享海报</Text>
        </View>
      </View>

      <View className='sheet match-sheet'>
        <MatchInfo match={match} />
        <GuessCard match={match} />
        <VoteCard match={match} />

        <View className='match-tabs'>
          {(
            [
              ['events', '赛况'],
              ['live', '直播'],
              ['ai', 'AI预测'],
              ['stats', '数据'],
              ['lineup', '名单'],
              ['talk', '讨论'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <Text
              key={key}
              className={`match-tab ${tab === key ? 'on' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </Text>
          ))}
        </View>

        {tab === 'events' && <Events match={match} />}
        {tab === 'live' && (
          <Text className='panel-empty'>官方暂未提供文字直播，比赛数据以官方公告为准。</Text>
        )}
        {tab === 'ai' && <AiPanel match={match} />}
        {tab === 'stats' && <Stats match={match} />}
        {tab === 'lineup' && <Lineups match={match} />}
        {tab === 'talk' && <Talk match={match} />}
      </View>
    </View>
  )
}

function MatchInfo({ match }: { match: Match }) {
  const home = TEAM_MAP[match.home]
  return (
    <View className='card info-card'>
      <View className='info-row'>
        <Text className='info-label'>赛事</Text>
        <Text className='info-value'>
          2026 湘超 · {match.phase === 'knockout' ? match.stage : `第${match.round}轮`}
        </Text>
      </View>
      <View className='info-row'>
        <Text className='info-label'>开球</Text>
        <Text className='info-value'>
          {formatDate(match.date)} {match.time}
        </Text>
      </View>
      <View className='info-row'>
        <Text className='info-label'>场地</Text>
        <Text className='info-value'>{match.venue || home.stadium}</Text>
      </View>
    </View>
  )
}

function GuessCard({ match }: { match: Match }) {
  const app = useApp()
  const mine = app.guesses[match.id]
  const [draft, setDraft] = useState<[number, number]>(mine ?? [1, 1])
  const home = TEAM_MAP[match.home]
  const away = TEAM_MAP[match.away]
  const open = match.status === 'upcoming'
  const earned = match.status === 'finished' && mine ? guessPoints(match, mine) : null

  return (
    <View className='card guess-card'>
      <View className='row between'>
        <Text className='card-title'>比分竞猜</Text>
        <Text className='card-hint'>猜中比分 +30 · 猜中胜负 +10</Text>
      </View>
      {open ? (
        <>
          <View className='stepper-row'>
            <View className='stepper-team'>
              <Crest team={home} size={24} />
              <Text>{home.city}</Text>
            </View>
            <Stepper
              value={draft[0]}
              color={home.color}
              onChange={(v) => setDraft([v, draft[1]])}
            />
            <Text className='stepper-colon'>:</Text>
            <Stepper
              value={draft[1]}
              color={away.color}
              onChange={(v) => setDraft([draft[0], v])}
            />
            <View className='stepper-team'>
              <Crest team={away} size={24} />
              <Text>{away.city}</Text>
            </View>
          </View>
          <View
            className='btn-primary guess-submit'
            onClick={() => {
              if (!app.requireLogin()) return
              app.setGuess(match.id, draft)
              app.toast(`已提交竞猜 ${draft[0]}:${draft[1]}`)
            }}
          >
            {mine
              ? mine[0] === draft[0] && mine[1] === draft[1]
                ? `已竞猜 ${mine[0]}:${mine[1]}`
                : '修改竞猜'
              : '提交竞猜'}
          </View>
        </>
      ) : (
        <Text className='guess-closed'>
          {mine ? `你的竞猜 ${mine[0]}:${mine[1]}` : '你没有参与本场竞猜'}
          {match.status === 'live' && ' · 比赛进行中，竞猜已截止'}
          {earned !== null && (
            <Text className={`guess-earned ${earned ? 'green' : ''}`}>
              {earned ? ` · +${earned} 积分` : ' · 未猜中'}
            </Text>
          )}
        </Text>
      )}
    </View>
  )
}

function guessPoints(m: Match, guess: [number, number]) {
  const [hs, as] = score(m)
  if (guess[0] === hs && guess[1] === as) return 30
  const o = (x: number, y: number) => Math.sign(x - y)
  return o(guess[0], guess[1]) === o(hs, as) ? 10 : 0
}

function Stepper({
  value,
  onChange,
  color,
}: {
  value: number
  onChange: (v: number) => void
  color: string
}) {
  return (
    <View className='stepper'>
      <View className='stepper-btn' onClick={() => onChange(Math.max(0, value - 1))}>
        <Text>−</Text>
      </View>
      <Text className='stepper-value' style={{ color }}>
        {value}
      </Text>
      <View className='stepper-btn' onClick={() => onChange(Math.min(9, value + 1))}>
        <Text>＋</Text>
      </View>
    </View>
  )
}

function VoteCard({ match }: { match: Match }) {
  const app = useApp()
  const mine = app.votes[match.id]
  const rng = createRng(hashString('vote-' + match.id))
  const base = { home: rng.int(800, 3000), draw: rng.int(300, 1200), away: rng.int(800, 3000) }
  if (mine) base[mine]++
  const total = base.home + base.draw + base.away
  const pct = (n: number) => Math.round((n / total) * 100)
  const home = TEAM_MAP[match.home]
  const away = TEAM_MAP[match.away]
  const options = [
    ['home', `${home.city}胜`, home.color, base.home],
    ['draw', '平局', '#8a817a', base.draw],
    ['away', `${away.city}胜`, away.color, base.away],
  ] as const

  return (
    <View className='card vote-card'>
      <View className='row between'>
        <Text className='card-title'>球迷支持率</Text>
        <Text className='card-hint'>{mine ? `本地演示 · ${total.toLocaleString()} 人参与` : '本地演示 · 投票后查看结果'}</Text>
      </View>
      <View className='vote-options'>
        {options.map(([key, label, color, n]) => (
          <View
            key={key}
            className={`vote-option ${mine === key ? 'on' : ''}`}
            style={mine === key ? { borderColor: color, background: `${color}14` } : undefined}
            onClick={() => app.vote(match.id, key)}
          >
            <Text className='vote-label'>{label}</Text>
            <Text className='vote-pct' style={{ color: mine ? color : undefined }}>
              {mine ? `${pct(n)}%` : '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function Events({ match }: { match: Match }) {
  const app = useApp()
  const events = visibleEvents(match, app.liveMinute)
  if (match.status === 'upcoming') {
    return <Text className='panel-empty'>比赛尚未开始，先去 AI 预测看看双方胜率。</Text>
  }
  if (events.length === 0) {
    return (
      <Text className='panel-empty'>
        官方未公布进球时间与关键事件，比分和赛果已同步。
      </Text>
    )
  }
  return (
    <View className='events'>
      {events.map((e, i) => {
        const team = TEAM_MAP[e.side === 'home' ? match.home : match.away]
        const player = e.playerId
        return (
          <View key={i} className={`event-row ${e.side}`}>
            <Text className='event-minute'>{e.minute}'</Text>
            <View className='event-body'>
              <View className='row gap-2'>
                <View className={`event-icon ${e.type}`}>
                  <Icon
                    name={e.type === 'goal' ? 'goal' : e.type === 'sub' ? 'repeat' : 'info'}
                    size={12}
                    color='#fff'
                  />
                </View>
                <Text className='event-title'>
                  {e.type === 'goal'
                    ? `进球！${team.city}`
                    : e.type === 'yellow'
                      ? '黄牌'
                      : e.type === 'red'
                        ? '红牌'
                        : '换人'}
                </Text>
              </View>
              <Text className='event-sub'>
                {playerName(player)} {e.note ? `· ${e.note}` : ''}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

function playerName(id: string) {
  return PLAYER_MAP[id]?.name ?? ''
}

function AiPanel({ match }: { match: Match }) {
  const app = useApp()
  const minute = match.status === 'live' ? app.liveMinute : undefined
  const p = useMemo(() => predictMatch(match, minute, app.matches), [match, minute, app.matches])
  const home = TEAM_MAP[match.home]
  const away = TEAM_MAP[match.away]
  const verdict =
    match.status === 'finished' ? p.pick === actualOutcome(match) : null

  return (
    <View className='ai-panel'>
      <View className='ai-hero'>
        <View
          className='ai-hero-glow left'
          style={{ background: home.color }}
        />
        <View className='ai-hero-glow right' style={{ background: away.color }} />
        <View className='row between'>
          <View className='row gap-2'>
            <Icon name='sparkles' size={15} color='#e3a83b' />
            <Text className='ai-title'>
              {match.status === 'live' ? 'AI 实时预测' : 'AI 赛前预测'}
            </Text>
          </View>
          <Text className='ai-confidence'>置信度 · {p.confidence}</Text>
        </View>

        <View className='ai-predicted'>
          <View>
            <Text className='ai-label'>预测比分</Text>
            <Text className='ai-big'>
              {p.predicted[0]}:{p.predicted[1]}
            </Text>
          </View>
          <View className='ai-xg'>
            <Text className='ai-label'>预期进球</Text>
            <Text className='ai-xg-value'>
              {p.xg[0].toFixed(1)} - {p.xg[1].toFixed(1)}
            </Text>
          </View>
        </View>

        <View className='ai-prob-bar'>
          <View style={{ flex: p.probs.home, background: home.color }} />
          <View style={{ flex: p.probs.draw, background: '#a39a91' }} />
          <View style={{ flex: p.probs.away, background: away.color }} />
        </View>
        <View className='ai-prob-labels'>
          <View>
            <Text className='ai-prob-num' style={{ color: home.color }}>
              {Math.round(p.probs.home * 100)}%
            </Text>
            <Text className='ai-prob-label'>{home.city}胜</Text>
          </View>
          <View className='center'>
            <Text className='ai-prob-num'>{Math.round(p.probs.draw * 100)}%</Text>
            <Text className='ai-prob-label'>平局</Text>
          </View>
          <View className='right'>
            <Text className='ai-prob-num' style={{ color: away.color }}>
              {Math.round(p.probs.away * 100)}%
            </Text>
            <Text className='ai-prob-label'>{away.city}胜</Text>
          </View>
        </View>
      </View>

      <View className='card ai-summary'>
        <Text className='ai-summary-label'>模型解读</Text>
        <Text className='ai-summary-text'>{p.summary}</Text>
        {verdict !== null && (
          <Text className={`ai-verdict ${verdict ? 'hit' : 'miss'}`}>
            {verdict ? '赛前预测命中' : '赛前预测未中'}
          </Text>
        )}
      </View>

      <View className='card ai-likely'>
        <Text className='ai-summary-label'>最可能比分</Text>
        {p.likely.map((c) => (
          <View key={c.score.join(':')} className='ai-likely-row'>
            <Text className='ai-likely-score'>
              {c.score[0]}:{c.score[1]}
            </Text>
            <View className='ai-likely-track'>
              <View style={{ width: `${Math.min(100, c.p * 100 * 2.2)}%`, background: '#d7261e' }} />
            </View>
            <Text className='ai-likely-p'>{Math.round(c.p * 100)}%</Text>
          </View>
        ))}
      </View>

      <View className='card ai-factors'>
        <Text className='ai-summary-label'>关键因素</Text>
        {p.factors.map((f, i) => (
          <Text key={i} className='ai-factor'>
            · {f.text}
          </Text>
        ))}
      </View>

      <Text className='ai-disclaimer'>
        预测由数据模型基于历史赛果生成，仅供娱乐参考，请勿用于任何形式的博彩。
      </Text>
    </View>
  )
}

function Stats({ match }: { match: Match }) {
  if (match.status === 'upcoming') {
    return <Text className='panel-empty'>比赛尚未开始，暂无技术统计。</Text>
  }
  return <Text className='panel-empty'>官方未公布本场技术统计。</Text>
}

function Lineups({ match }: { match: Match }) {
  const home = TEAM_MAP[match.home]
  const away = TEAM_MAP[match.away]
  return (
    <View className='lineups'>
      {[
        { team: home, players: startersOf(home.id) },
        { team: away, players: startersOf(away.id) },
      ].map(({ team, players }) => (
        <View key={team.id} className='lineup-team'>
          <View className='lineup-head'>
            <Crest team={team} size={22} />
            <Text>{team.city}队报名名单 · {players.length} 人</Text>
          </View>
          <View className='lineup-group'>
            <View className='lineup-players'>
              {players.map((p) => (
                <Text
                  key={p.id}
                  className='lineup-player'
                  onClick={() => Taro.navigateTo({ url: `/pages/player/index?id=${p.id}` })}
                >
                  {p.number} {p.name}
                </Text>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

function Talk({ match }: { match: Match }) {
  const app = useApp()
  const [text, setText] = useState('')
  const mine = app.myComments[match.id] ?? []

  return (
    <View className='talk'>
      <View className='talk-input'>
        <Input
          className='talk-field'
          value={text}
          placeholder='说点什么，为你的城市加油…'
          maxlength={80}
          onInput={(e) => setText(e.detail.value)}
        />
        <View
          className='talk-send'
          onClick={() => {
            const t = text.trim()
            if (!t) return
            if (!app.requireLogin()) return
            app.addComment(match.id, t)
            setText('')
          }}
        >
          <Icon name='send' size={16} color='#ffffff' />
        </View>
      </View>

      {mine.length === 0 && (
        <Text className='panel-empty'>还没有讨论，来说第一句。</Text>
      )}

      {mine.map((c) => (
        <View key={c.id} className='comment mine'>
          <View className='comment-avatar'>{app.user?.nick[0] ?? '我'}</View>
          <View className='comment-body'>
            <Text className='comment-nick'>
              {app.user?.nick ?? '我'} <Text className='comment-tag'>我</Text>
            </Text>
            <Text className='comment-text'>{c.text}</Text>
          </View>
        </View>
      ))}

    </View>
  )
}
