import { useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { PageHeader, SectionTitle } from '../../components/ui'
import { TabBar } from '../../components/TabBar'
import {
  CHEER_BASE,
  CHEER_DAILY_LIMIT,
  LEADERBOARD,
  SEED_GUESS_HISTORY,
  SEED_POINTS,
  guessPoints,
} from '../../data/fans'
import { CURRENT_ROUND } from '../../data/league'
import { TEAMS, TEAM_MAP } from '../../data/teams'
import './index.scss'

function useMyPoints() {
  const app = useApp()
  if (!app.user) return 0
  return SEED_POINTS + SEED_GUESS_HISTORY.reduce((s, h) => s + guessPoints(h.match, h.guess), 0)
}

function formatCount(n: number) {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString()
}

export default function Fans() {
  const app = useApp()
  const points = useMyPoints()
  const board = useMemo(
    () =>
      TEAMS.map((t) => ({ team: t, count: CHEER_BASE[t.id] + (app.cheers[t.id] ?? 0) })).sort(
        (a, b) => b.count - a.count,
      ),
    [app.cheers],
  )
  const max = board[0].count
  const fav = app.favTeam ? TEAM_MAP[app.favTeam] : null
  const left = CHEER_DAILY_LIMIT - app.cheersToday
  const upcoming = app.matches.filter(
    (m) => m.round >= CURRENT_ROUND && m.status === 'upcoming',
  ).slice(0, 5)
  const lb = app.user
    ? [
        ...LEADERBOARD,
        { id: 'me', nick: app.user.nick, teamId: app.favTeam ?? 'cs', points, hits: 3 },
      ].sort((a, b) => b.points - a.points)
    : LEADERBOARD
  const myRank = lb.findIndex((u) => u.id === 'me') + 1

  return (
    <View className='app'>
      <PageHeader kicker='Fan Zone' title='球迷' subtitle='为城市打 call · 竞猜赢积分 · 和 AI 聊球'>
        <View className='fan-stats'>
          <View className='fan-stat'>
            <Text className='fan-stat-num gold'>{app.user ? points : '—'}</Text>
            <Text className='fan-stat-label'>我的积分</Text>
          </View>
          <View className='fan-stat'>
            <Text className='fan-stat-num'>{app.user ? `#${myRank}` : '—'}</Text>
            <Text className='fan-stat-label'>竞猜排名</Text>
          </View>
          <View className='fan-stat'>
            <Text className='fan-stat-num'>{left}</Text>
            <Text className='fan-stat-label'>今日助威</Text>
          </View>
        </View>
      </PageHeader>

      <View className='sheet fans-sheet'>
        <View className='section'>
          <View className='ai-entry' onClick={() => app.open({ type: 'chat', id: 'ai' })}>
            <View className='ai-entry-icon'>
              <Icon name='bot' size={22} color='#e3a83b' />
            </View>
            <View className='grow'>
              <Text className='ai-entry-title'>AI 球评助手</Text>
              <Text className='ai-entry-sub'>问状态、问排名、问预测，随时聊湘超</Text>
            </View>
            <Icon name='right' size={18} color='rgba(255,255,255,.4)' />
          </View>
        </View>

        <View className='section cheer-section'>
          <SectionTitle action={<Text className='section-action'>今日剩余 {left} 次</Text>}>
            <Text>城市助威榜</Text>
            <Icon name='flame' size={15} color='#d7261e' />
          </SectionTitle>

          {fav ? (
            <View
              className={`cheer-btn ${left <= 0 ? 'disabled' : ''}`}
              style={{
                background: `linear-gradient(120deg, ${fav.color}, ${fav.color}aa)`,
              }}
              onClick={() => {
                if (left <= 0) return
                app.cheer(fav.id)
              }}
            >
              <Icon name='megaphone' size={18} color='#ffffff' />
              <Text className='cheer-btn-text'>
                {left > 0 ? `为${fav.city}助威 +1` : '今日助威次数已用完'}
              </Text>
              {(app.cheers[fav.id] ?? 0) > 0 && (
                <Text className='cheer-btn-count'>（我已助威 {app.cheers[fav.id]}）</Text>
              )}
            </View>
          ) : (
            <View className='cheer-empty' onClick={() => app.open({ type: 'team', id: 'cs' })}>
              <Text>在「我的」选择主队后即可为城市助威</Text>
            </View>
          )}

          <View className='card cheer-list'>
            {board.map(({ team, count }, i) => (
              <View
                key={team.id}
                className={`cheer-row ${team.id === app.favTeam ? 'fav' : ''}`}
                onClick={() => app.open({ type: 'team', id: team.id })}
              >
                <Text className={`cheer-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</Text>
                <Crest team={team} size={22} />
                <View className='cheer-main'>
                  <View className='cheer-line'>
                    <Text className='cheer-name'>{team.city}</Text>
                    <Text className='cheer-count'>{formatCount(count)}</Text>
                  </View>
                  <View className='cheer-track'>
                    <View
                      className='cheer-fill'
                      style={{ width: `${(count / max) * 100}%`, background: team.color }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className='section guess-section'>
          <SectionTitle action={<Text className='section-action'>开赛前可修改</Text>}>
            本轮竞猜
          </SectionTitle>
          <View className='guess-list'>
            {upcoming.map((m) => {
              const g = app.guesses[m.id]
              return (
                <View
                  key={m.id}
                  className='card guess-row'
                  onClick={() => app.open({ type: 'match', id: m.id })}
                >
                  <Crest team={TEAM_MAP[m.home]} size={22} />
                  <Text className='guess-teams'>
                    {TEAM_MAP[m.home].city} vs {TEAM_MAP[m.away].city}
                  </Text>
                  <Crest team={TEAM_MAP[m.away]} size={22} />
                  <Text className={`guess-state ${g ? 'done' : ''}`}>
                    {g ? `已猜 ${g[0]}:${g[1]}` : '去竞猜'}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        <View className='section board-section'>
          <SectionTitle
            action={
              app.user ? (
                <Text className='section-action'>我的排名 第{myRank}</Text>
              ) : undefined
            }
          >
            <Text>竞猜排行榜</Text>
            <Icon name='trophy' size={15} color='#f59e0b' />
          </SectionTitle>
          <View className='card leaderboard'>
            {lb.slice(0, 10).map((u, i) => (
              <View key={u.id} className={`leader-row ${u.id === 'me' ? 'me' : ''}`}>
                <Text className={`leader-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</Text>
                <Crest team={TEAM_MAP[u.teamId]} size={22} />
                <Text className='leader-name'>
                  {u.nick}
                  {u.id === 'me' && <Text className='leader-me'>我</Text>}
                </Text>
                <Text className='leader-points'>{u.points}</Text>
                <Text className='leader-unit'>分</Text>
              </View>
            ))}
          </View>
          {!app.user && (
            <View
              className='login-tip'
              onClick={() => app.open({ type: 'login', id: 'me' })}
            >
              登录后参与排名
            </View>
          )}
        </View>

        <Text className='fans-note'>
          竞猜积分仅用于社区排名，不可兑换现金，请勿用于任何形式的博彩。榜单为测试数据。
        </Text>
      </View>

      <TabBar active='fans' />
    </View>
  )
}
