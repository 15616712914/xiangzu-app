import { useRouter, useShareAppMessage } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { NavBar, statusBarHeight } from '../../components/NavBar'
import { PLAYER_MAP, computePlayerStats } from '../../data/league'
import { TEAM_MAP } from '../../data/teams'
import './index.scss'

export default function PlayerDetail() {
  const router = useRouter()
  const app = useApp()
  const id = router.params.id ?? ''
  const player = PLAYER_MAP[id]
  const top = statusBarHeight()

  useShareAppMessage(() => ({
    title: player ? `湘超球员 · ${player.name}` : '湘超',
    path: `/pages/player/index?id=${id}`,
  }))

  if (!player) {
    return (
      <View className='app'>
        <NavBar title='球员' />
        <Text className='empty'>球员不存在</Text>
      </View>
    )
  }

  const team = TEAM_MAP[player.teamId]
  const stats = computePlayerStats(player.id, app.matches)

  return (
    <View className='app player-page'>
      <View
        className='player-hero'
        style={{
          paddingTop: `${top + 52}px`,
          background: `linear-gradient(150deg, ${team.color}, ${team.color}99)`,
        }}
      >
        <NavBar tone='dark' share />
        <View className='player-portrait'>
          <Text className='player-number'>{player.number}</Text>
          <Text className='player-jersey'>湘超</Text>
        </View>
        <View className='player-head'>
          <View className='grow'>
            <Text className='player-name'>{player.name}</Text>
            <Text className='player-meta'>
              {team.city}队 · {player.number}号
            </Text>
          </View>
          <Crest team={team} size={44} />
        </View>
      </View>

      <View className='sheet player-sheet'>
        <View className='player-facts'>
          {[
            ['号码', player.number],
            ['球队', team.city],
            ['进球', stats.goals],
            ['黄牌', stats.yellow],
          ].map(([label, value]) => (
            <View key={label} className='player-fact'>
              <Text className='player-fact-value'>{value}</Text>
              <Text className='player-fact-label'>{label}</Text>
            </View>
          ))}
        </View>

        <View className='player-stats'>
          {[
            ['进球', stats.goals],
            ['点球', stats.penalties],
            ['黄牌', stats.yellow],
            ['红牌', stats.red],
          ].map(([label, value]) => (
            <View key={label} className='player-stat'>
              <Text className={`player-stat-value ${label === '进球' ? 'chili' : ''}`}>
                {value}
              </Text>
              <Text className='player-stat-label'>{label}</Text>
            </View>
          ))}
        </View>

        <View className='player-section'>
          <Text className='player-section-title'>赛季数据</Text>
          <Text className='player-empty'>
            数据来自 2026 湘超官方报名名单与赛季统计；官方未公布逐场进球时间。
          </Text>
        </View>

        <View
          className='player-team'
          onClick={() => app.open({ type: 'team', id: team.id })}
        >
          <Crest team={team} size={34} />
          <View className='grow'>
            <Text className='player-team-name'>{team.city}队</Text>
            <Text className='player-team-sub'>查看球队赛程与阵容</Text>
          </View>
          <Icon name='right' size={16} color='rgba(20,16,17,.25)' />
        </View>
      </View>
    </View>
  )
}
