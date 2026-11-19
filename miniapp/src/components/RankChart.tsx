import { useMemo } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { CURRENT_ROUND, computeStandings, type Match } from '../data/league'
import { TEAMS, TEAM_MAP } from '../data/teams'
import './rankchart.scss'

const GRID_RANKS = [1, 4, 8, 14]

/** League position after each completed round, drawn as an inverted line chart. */
export function RankChart({ teamId, matches }: { teamId: string; matches: Match[] }) {
  const team = TEAM_MAP[teamId]
  const ranks = useMemo(() => {
    const out: number[] = []
    for (let r = 1; r <= CURRENT_ROUND; r++) {
      const table = computeStandings(matches.filter((m) => m.round <= r))
      out.push(Math.max(1, table.findIndex((x) => x.teamId === teamId) + 1))
    }
    return out
  }, [teamId, matches])

  const W = useMemo(() => Taro.getSystemInfoSync().windowWidth - 72, [])
  const H = 116
  const left = 24
  const bottom = 22
  const n = TEAMS.length
  const x = (i: number) => left + (i * (W - left)) / Math.max(1, ranks.length - 1)
  const y = (rank: number) => 6 + ((rank - 1) * (H - bottom - 6)) / (n - 1)

  if (ranks.length === 0) return null

  return (
    <View className='rank-card card'>
      <View className='rank-head'>
        <Text className='rank-title'>排名走势</Text>
        <Text className='rank-range'>第1–{ranks.length}轮</Text>
      </View>
      <View className='rank-plot' style={{ width: `${W}px`, height: `${H}px` }}>
        {GRID_RANKS.map((r) => (
          <View key={r} className='rank-grid' style={{ top: `${y(r)}px`, left: `${left}px` }}>
            <Text className='rank-grid-label'>{r}</Text>
          </View>
        ))}

        {ranks.slice(1).map((r, i) => {
          const x1 = x(i)
          const y1 = y(ranks[i])
          const dx = x(i + 1) - x1
          const dy = y(r) - y1
          const len = Math.sqrt(dx * dx + dy * dy)
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI
          return (
            <View
              key={`l${i}`}
              className='rank-line'
              style={{
                left: `${x1}px`,
                top: `${y1}px`,
                width: `${len}px`,
                background: team.color,
                transform: `rotate(${angle}deg)`,
              }}
            />
          )
        })}

        {ranks.map((r, i) => (
          <View
            key={`d${i}`}
            className={`rank-dot ${i === ranks.length - 1 ? 'last' : ''}`}
            style={{
              left: `${x(i)}px`,
              top: `${y(r)}px`,
              borderColor: team.color,
              background: i === ranks.length - 1 ? team.color : '#fff',
            }}
          />
        ))}

        {ranks.map((_, i) => (
          <Text key={`x${i}`} className='rank-x' style={{ left: `${x(i)}px` }}>
            {i + 1}
          </Text>
        ))}
      </View>
    </View>
  )
}
