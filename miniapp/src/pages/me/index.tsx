import Taro from '@tarojs/taro'
import { View, Text, Switch } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { PageHeader, SectionTitle } from '../../components/ui'
import { TabBar } from '../../components/TabBar'
import { formatDate, stageLabel } from '../../data/league'
import { SEED_GUESS_HISTORY, SEED_POINTS, guessPoints } from '../../data/fans'
import { TEAMS, TEAM_MAP } from '../../data/teams'
import { buildIcs } from '../../lib/calendar'
import { unreadCount } from '../../lib/notifications'
import type { Settings } from '../../state'
import './index.scss'

const TOGGLES: [keyof Settings, string, string][] = [
  ['goal', '进球推送', '关注比赛有进球时通知我'],
  ['kickoff', '开赛提醒', '已加入提醒的比赛开赛前 30 分钟'],
  ['fav', '主队动态', '主队赛果、阵容与新闻'],
  ['news', '资讯推荐', '每日精选湘超资讯'],
]

export default function Me() {
  const app = useApp()
  const fav = app.favTeam ? TEAM_MAP[app.favTeam] : null
  const reminders = app.matches.filter(
    (m) => app.reminders.includes(m.id) && m.status === 'upcoming',
  )
  const pending = app.matches.filter((m) => app.guesses[m.id] && m.status === 'upcoming')
  const hits = SEED_GUESS_HISTORY.filter((h) => guessPoints(h.match, h.guess) > 0).length
  const unread = unreadCount(app.favTeam, app.readNotifs, app.matches)
  const points =
    app.user && SEED_GUESS_HISTORY.length
      ? SEED_POINTS + SEED_GUESS_HISTORY.reduce((s, h) => s + guessPoints(h.match, h.guess), 0)
      : 0

  const copyCalendar = () => {
    const text = buildIcs(reminders)
    void Taro.setClipboardData({ data: text }).then(() =>
      Taro.showToast({ title: '日历内容已复制，粘贴到日历导入', icon: 'none', duration: 2200 }),
    )
  }

  return (
    <View className='app'>
      <PageHeader kicker='My Xiangchao' title='我的' subtitle='主队、竞猜、提醒与设置' />

      <View className='sheet me-sheet'>
        {app.user ? (
          <View className='card profile'>
            <View className='avatar-big'>{app.user.nick[0]}</View>
            <View className='grow'>
              <Text className='profile-name'>{app.user.nick}</Text>
              <Text className='profile-phone'>
                {app.user.phone
                  ? app.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
                  : '微信登录'}
              </Text>
            </View>
            <View className='profile-points'>
              <Text className='profile-points-num'>{points}</Text>
              <Text className='profile-points-label'>竞猜积分</Text>
            </View>
          </View>
        ) : (
          <View className='card profile login' onClick={() => app.open({ type: 'login', id: 'me' })}>
            <View className='avatar-empty'>
              <Icon name='message' size={20} color='rgba(20,16,17,.4)' />
            </View>
            <View className='grow'>
              <Text className='profile-name'>登录 / 注册</Text>
              <Text className='profile-phone'>参与竞猜、助威与评论</Text>
            </View>
            <Icon name='right' size={18} color='rgba(20,16,17,.3)' />
          </View>
        )}

        <View className='quick-grid'>
          <View
            className='quick-item'
            onClick={() => app.open({ type: 'notifications', id: 'inbox' })}
          >
            <Icon name='bell' size={18} color='rgba(20,16,17,.6)' />
            <Text className='quick-label'>消息中心</Text>
            {unread > 0 && <Text className='quick-badge'>{unread}</Text>}
          </View>
          <View className='quick-item'>
            <Text className='quick-num'>{app.user ? pending.length : 0}</Text>
            <Text className='quick-label'>待开奖竞猜</Text>
          </View>
          <View className='quick-item'>
            <Text className='quick-num'>
              {app.user ? `${hits}/${SEED_GUESS_HISTORY.length}` : '—'}
            </Text>
            <Text className='quick-label'>竞猜命中</Text>
          </View>
        </View>

        <View
          className='fav-card'
          style={{
            background: fav
              ? `linear-gradient(140deg, ${fav.color}, ${fav.color}99)`
              : '#17120f',
          }}
        >
          <Text className='fav-label'>我的主队</Text>
          {fav ? (
            <View className='fav-body'>
              <Crest team={fav} size={52} />
              <View className='grow'>
                <Text className='fav-name'>{fav.city}队</Text>
                <Text className='fav-slogan'>“{fav.slogan}”</Text>
              </View>
              <View
                className='fav-change'
                onClick={() => Taro.showToast({ title: '在下方选择新的主队', icon: 'none' })}
              >
                更换
              </View>
            </View>
          ) : (
            <Text className='fav-empty'>选一支城市球队，首页会置顶它的下一场比赛。</Text>
          )}
          <View className='team-picker'>
            {TEAMS.map((t) => (
              <View
                key={t.id}
                className={`team-pick ${t.id === app.favTeam ? 'on' : ''}`}
                onClick={() => {
                  app.setFavTeam(t.id)
                  app.toast(`已将${t.city}设为主队`)
                }}
              >
                <Crest team={t} size={26} />
                <Text>{t.city}</Text>
              </View>
            ))}
          </View>
        </View>

        {app.user && (
          <View className='me-section'>
            <SectionTitle>我的竞猜</SectionTitle>
            <View className='card list-card'>
              {pending.length === 0 && <Text className='list-empty'>还没有待开奖的竞猜</Text>}
              {pending.map((m) => (
                <View key={m.id} className='list-row' onClick={() => app.open({ type: 'match', id: m.id })}>
                  <Text className='list-main'>
                    {TEAM_MAP[m.home].city} vs {TEAM_MAP[m.away].city}
                  </Text>
                  <Text className='list-side chili'>{app.guesses[m.id][0]}:{app.guesses[m.id][1]}</Text>
                </View>
              ))}
              {SEED_GUESS_HISTORY.map((h) => {
                const pts = guessPoints(h.match, h.guess)
                return (
                  <View
                    key={h.match.id}
                    className='list-row'
                    onClick={() => app.open({ type: 'match', id: h.match.id })}
                  >
                    <View className='grow'>
                      <Text className='list-main'>
                        {TEAM_MAP[h.match.home].city} vs {TEAM_MAP[h.match.away].city}
                      </Text>
                      <Text className='list-sub'>
                        {stageLabel(h.match)} · 猜 {h.guess[0]}:{h.guess[1]}
                      </Text>
                    </View>
                    <Text className={`list-side ${pts ? 'green' : 'muted'}`}>
                      {pts ? `+${pts}` : '未中'}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        <View className='me-section'>
          <SectionTitle
            action={
              reminders.length > 0 ? (
                <Text className='section-action' onClick={copyCalendar}>
                  导出到日历
                </Text>
              ) : undefined
            }
          >
            开赛提醒
          </SectionTitle>
          <View className='card list-card'>
            {reminders.length === 0 && <Text className='list-empty'>还没有加入提醒的比赛</Text>}
            {reminders.map((m) => (
              <View
                key={m.id}
                className='list-row'
                onClick={() => app.open({ type: 'match', id: m.id })}
              >
                <View className='grow'>
                  <Text className='list-main'>
                    {TEAM_MAP[m.home].city} vs {TEAM_MAP[m.away].city}
                  </Text>
                  <Text className='list-sub'>
                    {formatDate(m.date)} {m.time}
                  </Text>
                </View>
                <Icon name='bellRing' size={16} color='#d7261e' />
              </View>
            ))}
          </View>
        </View>

        <View className='me-section'>
          <SectionTitle>推送设置</SectionTitle>
          <View className='card list-card'>
            {TOGGLES.map(([key, title, desc]) => (
              <View key={key} className='toggle-row'>
                <View className='grow'>
                  <Text className='list-main'>{title}</Text>
                  <Text className='list-sub'>{desc}</Text>
                </View>
                <Switch
                  checked={app.settings[key]}
                  color='#d7261e'
                  onChange={(e) =>
                    app.setSettings({ ...app.settings, [key]: e.detail.value })
                  }
                />
              </View>
            ))}
          </View>
        </View>

        <View className='me-section'>
          <View className='card list-card'>
            <View
              className='list-row'
              onClick={() => app.open({ type: 'privacy', id: 'privacy' })}
            >
              <Icon name='file' size={16} color='rgba(20,16,17,.5)' />
              <Text className='list-main grow'>隐私与用户协议</Text>
              <Icon name='right' size={16} color='rgba(20,16,17,.25)' />
            </View>
            <View className='list-row'>
              <Icon name='info' size={16} color='rgba(20,16,17,.5)' />
              <Text className='list-main grow'>关于湘超</Text>
              <Text className='list-sub'>v0.1.0</Text>
            </View>
            {app.user && (
              <View
                className='list-row'
                onClick={() => {
                  app.logout()
                  app.toast('已退出登录')
                }}
              >
                <Icon name='logout' size={16} color='#d7261e' />
                <Text className='list-main grow chili'>退出登录</Text>
              </View>
            )}
          </View>
        </View>

        <Text className='me-note'>赛事数据来自 2026 湘超官方公开数据；登录、积分与竞猜记录仍为演示。</Text>
      </View>

      <TabBar active='me' />
    </View>
  )
}
