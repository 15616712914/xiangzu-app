import { useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { SQUADS, type Match } from '../data/league'
import { TEAM_MAP } from '../data/teams'
import { Icon } from './Icon'
import './photowall.scss'

export function PhotoWall({ teamId }: { teamId: string; matches: Match[] }) {
  const team = TEAM_MAP[teamId]
  const squad = SQUADS[teamId] ?? []
  const goals = useMemo(
    () => Object.fromEntries(squad.map((p) => [p.id, p.goals ?? 0])),
    [squad],
  )
  const topScorer = [...squad].sort((a, b) => (goals[b.id] ?? 0) - (goals[a.id] ?? 0) || a.number - b.number)[0]
  const featured = topScorer && (goals[topScorer.id] ?? 0) > 0 ? topScorer : null
  const players = squad
    .filter((p) => p.id !== featured?.id)
    .sort((a, b) => (goals[b.id] ?? 0) - (goals[a.id] ?? 0) || a.number - b.number)

  const open = (id: string) => Taro.navigateTo({ url: `/pages/player/index?id=${id}` })
  const portrait = { background: `linear-gradient(160deg, ${team.color}, ${team.color}55)` }

  return (
    <View className='wall'>
      {featured && (
        <View className='wall-featured' style={portrait} onClick={() => open(featured.id)}>
          <Text className='wall-featured-num'>{featured.number}</Text>
          <View className='wall-featured-body'>
            <Text className='wall-featured-kicker'>队内射手王 · {goals[featured.id]}球</Text>
            <Text className='wall-featured-name'>{featured.name}</Text>
            <Text className='wall-featured-meta'>{featured.number}号</Text>
          </View>
          <Icon name='right' size={16} color='rgba(255,255,255,.7)' />
        </View>
      )}

      <View className='wall-grid'>
        {players.map((p) => (
          <View key={p.id} className='wall-tile' style={portrait} onClick={() => open(p.id)}>
            <Text className='wall-num'>{p.number}</Text>
            {(goals[p.id] ?? 0) > 0 && <Text className='wall-goals'>{goals[p.id]}球</Text>}
            <View className='wall-info'>
              <Text className='wall-name'>{p.name}</Text>
              <Text className='wall-meta'>{p.number}号</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
