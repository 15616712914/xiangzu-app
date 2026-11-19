import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { MVP } from '../config'
import { Icon, type IconName } from './Icon'
import './tabbar.scss'

const ALL_TABS: { key: string; label: string; icon: IconName; url: string }[] = [
  { key: 'home', label: '赛事', icon: 'calendar', url: '/pages/home/index' },
  { key: 'table', label: '数据', icon: 'chart', url: '/pages/table/index' },
  { key: 'fans', label: '球迷', icon: 'flame', url: '/pages/fans/index' },
  { key: 'discover', label: '发现', icon: 'compass', url: '/pages/discover/index' },
  { key: 'me', label: '我的', icon: 'user', url: '/pages/me/index' },
]

const TABS = ALL_TABS.filter((t) => !MVP || t.key !== 'fans')

export function TabBar({ active }: { active: string }) {
  return (
    <>
      <View className='tabbar-fade' />
      <View className='tabbar'>
      <View className='tabbar-inner'>
        {TABS.map((t) => {
          const on = t.key === active
          return (
            <View
              key={t.key}
              className={`tabbar-item ${on ? 'is-active' : ''}`}
              onClick={() => {
                if (on) return
                Taro.reLaunch({ url: t.url })
              }}
            >
              <Icon name={t.icon} size={20} color={on ? '#ffffff' : 'rgba(255,255,255,.5)'} strokeWidth={on ? 2.4 : 1.9} />
              <Text className='tabbar-label'>{t.label}</Text>
            </View>
          )
        })}
      </View>
      </View>
    </>
  )
}
