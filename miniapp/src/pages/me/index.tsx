import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { PageHeader, SectionTitle } from '../../components/ui'
import { TabBar } from '../../components/TabBar'
import { formatDate } from '../../data/league'
import { TEAMS, TEAM_MAP } from '../../data/teams'
import { buildIcs } from '../../lib/calendar'
import { unreadCount } from '../../lib/notifications'
import './index.scss'

export default function Me() {
  const app = useApp()
  const fav = app.favTeam ? TEAM_MAP[app.favTeam] : null
  const reminders = app.matches.filter(
    (m) => app.reminders.includes(m.id) && m.status === 'upcoming',
  )
  const unread = unreadCount(app.favTeam, app.readNotifs, app.matches)

  const copyCalendar = () => {
    const text = buildIcs(reminders)
    void Taro.setClipboardData({ data: text }).then(() =>
      Taro.showToast({ title: '日历内容已复制，粘贴到日历导入', icon: 'none', duration: 2200 }),
    )
  }

  return (
    <View className='app'>
      <PageHeader kicker='My Xiangchao' title='我的' subtitle='主队、开赛提醒与数据说明' />

      <View className='sheet me-sheet'>
        <View className='card profile'>
          <View className='avatar-big'>湘</View>
          <View className='grow'>
            <Text className='profile-name'>湘超 2026</Text>
            <Text className='profile-phone'>无需登录 · 赛事数据只读</Text>
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
                <Text className='fav-slogan'>主场 · {fav.stadium}</Text>
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
          <SectionTitle>更多</SectionTitle>
          <View className='card list-card'>
            <View
              className='list-row'
              onClick={() => app.open({ type: 'notifications', id: 'inbox' })}
            >
              <Icon name='bell' size={16} color='rgba(20,16,17,.5)' />
              <Text className='list-main grow'>消息中心</Text>
              {unread > 0 && <Text className='list-side chili'>{unread}</Text>}
              <Icon name='right' size={16} color='rgba(20,16,17,.25)' />
            </View>
            <View
              className='list-row'
              onClick={() => app.open({ type: 'privacy', id: 'privacy' })}
            >
              <Icon name='file' size={16} color='rgba(20,16,17,.5)' />
              <Text className='list-main grow'>隐私、协议与数据来源</Text>
              <Icon name='right' size={16} color='rgba(20,16,17,.25)' />
            </View>
            <View className='list-row'>
              <Icon name='info' size={16} color='rgba(20,16,17,.5)' />
              <Text className='list-main grow'>关于湘超</Text>
              <Text className='list-sub'>v0.2.0</Text>
            </View>
          </View>
        </View>

        <Text className='me-note'>
          赛事数据来自湘超官方公开渠道，一切以官方发布为准。模型推演仅供娱乐。
        </Text>
      </View>

      <TabBar active='me' />
    </View>
  )
}
