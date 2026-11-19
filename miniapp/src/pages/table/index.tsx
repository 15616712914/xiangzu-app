import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { DarkSegments, PageHeader } from '../../components/ui'
import { TabBar } from '../../components/TabBar'
import {
  CURRENT_ROUND,
  computeScorers,
  computeStandings,
} from '../../data/league'
import { TEAMS, TEAM_MAP } from '../../data/teams'
import { simulateSeason } from '../../data/predict'
import './index.scss'

type Seg = 'table' | 'scorers' | 'teams' | 'ai'

const FORM_STYLE = { W: '#10b981', D: 'rgba(20,16,17,.25)', L: '#d7261e' }

export default function Table() {
  const app = useApp()
  const [seg, setSeg] = useState<Seg>('table')
  const standings = useMemo(() => computeStandings(app.matches), [app.matches])
  const scorers = useMemo(() => computeScorers(app.matches).slice(0, 20), [app.matches])
  const projection = useMemo(
    () => (seg === 'ai' ? simulateSeason(3000, app.matches) : null),
    [seg, app.matches],
  )

  return (
    <View className='app'>
      <PageHeader
        kicker='Standings & Stats'
        title='数据'
        subtitle={`截至第 ${CURRENT_ROUND} 轮已完赛场次`}
      >
        <DarkSegments<Seg>
          value={seg}
          onChange={setSeg}
          options={[
            ['table', '积分榜'],
            ['scorers', '射手榜'],
            ['teams', '球队'],
            ['ai', 'AI推演'],
          ]}
        />
      </PageHeader>

      <View className='sheet table-sheet'>
        {seg === 'table' && (
          <View className='card standings'>
            <View className='standings-head'>
              <Text className='col-rank'>#</Text>
              <Text className='col-team'>球队</Text>
              <Text className='col-num'>胜</Text>
              <Text className='col-num'>平</Text>
              <Text className='col-num'>负</Text>
              <Text className='col-gd'>净胜</Text>
              <Text className='col-pts'>积分</Text>
            </View>
            {standings.map((row, i) => {
              const team = TEAM_MAP[row.teamId]
              const fav = row.teamId === app.favTeam
              const gd = row.gf - row.ga
              return (
                <View
                  key={row.teamId}
                  className={`standings-row ${fav ? 'fav' : ''}`}
                  onClick={() => app.open({ type: 'team', id: row.teamId })}
                >
                  <Text className={`rank-num ${i < 3 ? 'top' : ''}`}>{i + 1}</Text>
                  <View className='team-cell'>
                    <Crest team={team} size={22} />
                    <View className='team-cell-main'>
                      <Text className='team-cell-name'>{team.city}</Text>
                      <View className='form-dots'>
                        {row.form.map((f, j) => (
                          <View
                            key={j}
                            className='form-dot'
                            style={{ background: FORM_STYLE[f] }}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text className='col-num value'>{row.won}</Text>
                  <Text className='col-num value'>{row.drawn}</Text>
                  <Text className='col-num value'>{row.lost}</Text>
                  <Text className='col-gd value'>{gd > 0 ? `+${gd}` : gd}</Text>
                  <Text className='col-pts pts'>{row.points}</Text>
                </View>
              )
            })}
          </View>
        )}

        {seg === 'scorers' && (
          <View className='scorers'>
            {scorers.map((s, i) => {
              const team = TEAM_MAP[s.player.teamId]
              return (
                <View
                  key={s.player.id}
                  className={`card scorer ${i === 0 ? 'first' : ''}`}
                  onClick={() => app.open({ type: 'player', id: s.player.id })}
                >
                  <Text className={`scorer-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</Text>
                  <Crest team={team} size={28} />
                  <View className='scorer-main'>
                    <Text className='scorer-name'>{s.player.name}</Text>
                    <Text className='scorer-meta'>
                      {team.city}队 · {s.player.number}号
                    </Text>
                  </View>
                  <View className='scorer-goals'>
                    <Text className='scorer-num'>{s.goals}</Text>
                    <Text className='scorer-label'>
                      {s.penalties ? `含${s.penalties}点球` : '进球'}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {seg === 'teams' && (
          <View className='team-grid'>
            {TEAMS.map((t) => {
              const row = standings.find((r) => r.teamId === t.id)!
              return (
                <View
                  key={t.id}
                  className='card team-tile'
                  onClick={() => app.open({ type: 'team', id: t.id })}
                >
                  <View className='team-tile-top'>
                    <Crest team={t} size={34} />
                    <View className='team-tile-rank'>
                      <Text className='team-tile-pos'>#{standings.findIndex((r) => r.teamId === t.id) + 1}</Text>
                      <Text className='team-tile-pts'>{row.points}分</Text>
                    </View>
                  </View>
                  <Text className='team-tile-name'>{t.city}队</Text>
                  <Text className='team-tile-alias'>{t.alias} · 主场 {t.stadium}</Text>
                  <View className='team-tile-bar'>
                    <View
                      className='team-tile-bar-fill'
                      style={{ width: `${Math.max(8, (row.points / 30) * 100)}%`, background: t.color }}
                    />
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {seg === 'ai' && projection && projection.remaining === 0 && (
          <Text className='panel-empty'>常规赛已结束，AI 推演将在淘汰赛阶段更新。</Text>
        )}

        {seg === 'ai' && projection && projection.remaining > 0 && (
          <View className='projection'>
            <View className='projection-hero'>
              <View className='row gap-2'>
                <Icon name='sparkles' size={15} color='#e3a83b' />
                <Text className='projection-title'>AI 赛季推演</Text>
              </View>
              <Text className='projection-sub'>
                剩余 {projection.remaining} 场模拟 {projection.runs.toLocaleString()} 次
              </Text>
              <View className='projection-leader'>
                <Crest team={TEAM_MAP[projection.rows[0].teamId]} size={48} />
                <View className='grow'>
                  <Text className='projection-leader-label'>最有希望登顶</Text>
                  <Text className='projection-leader-name'>
                    {TEAM_MAP[projection.rows[0].teamId].city}队
                  </Text>
                </View>
                <View className='projection-pct'>
                  <Text className='projection-pct-num'>
                    {Math.round(projection.rows[0].pFirst * 100)}%
                  </Text>
                  <Text className='projection-pct-label'>登顶概率</Text>
                </View>
              </View>
            </View>

            <View className='card projection-list'>
              {projection.rows.slice(0, 8).map((r, i) => {
                const team = TEAM_MAP[r.teamId]
                return (
                  <View key={r.teamId} className='projection-row'>
                    <Text className='projection-rank'>{i + 1}</Text>
                    <Crest team={team} size={22} />
                    <Text className='projection-name'>{team.city}</Text>
                    <View className='projection-track'>
                      <View
                        className='projection-fill'
                        style={{ width: `${Math.max(2, r.pFirst * 100)}%`, background: team.color }}
                      />
                    </View>
                    <Text className='projection-value'>{Math.round(r.pFirst * 100)}%</Text>
                  </View>
                )
              })}
            </View>
            <Text className='disclaimer'>
              推演基于已完赛数据的泊松模型，仅为参考，不构成任何投注建议。
            </Text>
          </View>
        )}

        <Text className='data-source'>
          数据来源：足球中国 / 湖南省足球联赛 · 更新至 2026-11-15
        </Text>
      </View>

      <TabBar active='table' />
    </View>
  )
}
