import { useMemo, useState } from 'react'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { MatchCard } from '../../components/ui'
import { PhotoWall } from '../../components/PhotoWall'
import { RankChart } from '../../components/RankChart'
import { NavBar, statusBarHeight } from '../../components/NavBar'
import { SQUADS, computeStandings } from '../../data/league'
import { TEAM_MAP } from '../../data/teams'
import './index.scss'

type Tab = 'schedule' | 'wall' | 'squad'

export default function TeamDetail() {
  const router = useRouter()
  const app = useApp()
  const id = router.params.id ?? ''
  const team = TEAM_MAP[id]
  const [tab, setTab] = useState<Tab>('schedule')
  const standings = useMemo(() => computeStandings(app.matches), [app.matches])
  const rank = standings.findIndex((r) => r.teamId === id)
  const row = standings[rank]
  const matches = app.matches.filter((m) => m.home === id || m.away === id)
  const isFav = app.favTeam === id
  const top = statusBarHeight()

  useShareAppMessage(() => ({
    title: `湘超 · ${team?.city ?? ''}队`,
    path: `/pages/team/index?id=${id}`,
  }))

  if (!team || !row) {
    return (
      <View className='app'>
        <NavBar title='球队' />
        <Text className='empty'>球队不存在</Text>
      </View>
    )
  }

  return (
    <View className='app team-page'>
      <View
        className='team-hero'
        style={{
          paddingTop: `${top + 52}px`,
          background: `linear-gradient(160deg, ${team.color}, ${team.color}99)`,
        }}
      >
        <NavBar tone='dark' share />
        <Text className='team-alias'>{team.alias} · 湘超</Text>
        <View className='team-hero-row'>
          <Crest team={team} size={72} />
          <View className='grow'>
            <Text className='team-hero-name'>{team.city}队</Text>
            <Text className='team-hero-slogan'>2026 湘超 · 常规赛第 {rank + 1} 名</Text>
          </View>
        </View>

        <View className='team-stats'>
          {[
            ['排名', `#${rank + 1}`],
            ['积分', row.points],
            ['战绩', `${row.won}-${row.drawn}-${row.lost}`],
            ['进球', row.gf],
          ].map(([label, value]) => (
            <View key={label} className='team-stat'>
              <Text className='team-stat-value'>{value}</Text>
              <Text className='team-stat-label'>{label}</Text>
            </View>
          ))}
        </View>

        <View
          className={`team-fav ${isFav ? 'on' : ''}`}
          onClick={() => {
            app.setFavTeam(isFav ? null : id)
            app.toast(isFav ? '已取消主队' : `已将${team.city}设为主队`)
          }}
        >
          <Icon name='heart' size={16} color={isFav ? 'currentColor' : '#141011'} />
          <Text>{isFav ? '已设为我的主队' : '设为我的主队'}</Text>
        </View>
      </View>

      <View className='sheet team-sheet'>
        <RankChart teamId={id} matches={app.matches} />

        <View className='team-tabs'>
          <Text
            className={`team-tab ${tab === 'schedule' ? 'on' : ''}`}
            onClick={() => setTab('schedule')}
          >
            赛程
          </Text>
          <Text
            className={`team-tab ${tab === 'wall' ? 'on' : ''}`}
            onClick={() => setTab('wall')}
          >
            照片墙
          </Text>
          <Text
            className={`team-tab ${tab === 'squad' ? 'on' : ''}`}
            onClick={() => setTab('squad')}
          >
            阵容
          </Text>
        </View>

        {tab === 'wall' && <PhotoWall teamId={id} matches={app.matches} />}

        {tab === 'schedule' && (
          <View className='team-schedule'>
            {matches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                liveMinute={app.liveMinute}
                reminded={app.reminders.includes(m.id)}
                onToggleRemind={() => app.toggleRemind(m.id)}
                onOpen={() => app.open({ type: 'match', id: m.id })}
              />
            ))}
          </View>
        )}

        {tab === 'squad' && (
          <View className='team-squad'>
            <Text className='squad-pos'>2026 赛季报名名单 · {SQUADS[id]?.length ?? 0} 人</Text>
            <View className='card squad-list'>
              {SQUADS[id]?.map((p) => (
                <View
                  key={p.id}
                  className='squad-row'
                  onClick={() => Taro.navigateTo({ url: `/pages/player/index?id=${p.id}` })}
                >
                  <Text className='squad-num'>{p.number}</Text>
                  <Text className='squad-name'>{p.name}</Text>
                  {(p.goals ?? 0) > 0 && <Text className='squad-job'>{p.goals} 球</Text>}
                  <Icon name='right' size={14} color='rgba(20,16,17,.2)' />
                </View>
              ))}
            </View>
          </View>
        )}

        <View className='city-card'>
          {[
            ['pin', '主场', team.stadium],
            ['food', '必吃', team.food],
            ['landmark', '必游', team.sight],
          ].map(([icon, label, value]) => (
            <View key={label} className='city-item'>
              <Icon name={icon as 'pin'} size={16} color={team.color} />
              <Text className='city-label'>{label}</Text>
              <Text className='city-value'>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
