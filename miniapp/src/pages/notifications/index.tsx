import { useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import { useApp } from '../../state'
import { Icon } from '../../components/Icon'
import { NavBar } from '../../components/NavBar'
import { seedNotifications } from '../../lib/notifications'
import './index.scss'

export default function Notifications() {
  const app = useApp()
  const list = useMemo(() => seedNotifications(app.favTeam, app.matches), [app.favTeam, app.matches])

  return (
    <View className='app notice-page'>
      <NavBar title='消息中心' />
      <View className='notice-body'>
        <View className='card notice-list'>
          {list.length === 0 && <Text className='empty'>暂时没有待开赛的比赛提醒。</Text>}
          {list.map((n) => {
            const unread = !app.readNotifs.includes(n.id)
            return (
              <View
                key={n.id}
                className='notice-row'
                onClick={() => {
                  app.markRead(n.id)
                  if (n.target) app.open(n.target)
                }}
              >
                <View className='notice-icon'>
                  <Icon name='bell' size={16} color='rgba(20,16,17,.6)' />
                  {unread && <View className='notice-dot' />}
                </View>
                <View className='grow'>
                  <View className='row between'>
                    <Text className={`notice-title ${unread ? 'unread' : ''}`}>{n.title}</Text>
                    <Text className='notice-time'>{n.time}</Text>
                  </View>
                  <Text className='notice-body-text'>{n.body}</Text>
                </View>
              </View>
            )
          })}
        </View>
        <Text className='notice-note'>提醒由本机生成，不会发送推送；可在比赛详情加入或取消。</Text>
      </View>
    </View>
  )
}
