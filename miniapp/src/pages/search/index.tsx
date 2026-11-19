import { useMemo, useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { goBack, statusBarHeight } from '../../components/NavBar'
import { PLAYER_MAP, computeScorers, formatDate, score, stageLabel } from '../../data/league'
import { TEAMS, TEAM_MAP } from '../../data/teams'
import './index.scss'

const ALL_PLAYERS = Object.values(PLAYER_MAP)

export default function Search() {
  const app = useApp()
  const [q, setQ] = useState('')
  const query = q.trim()
  const top = statusBarHeight()

  const hot = useMemo(() => {
    const names = computeScorers(app.matches)
      .slice(0, 3)
      .map((s) => s.player.name)
    const fav = app.favTeam ? [TEAM_MAP[app.favTeam].city] : []
    return [...new Set([...fav, '永州', '长沙', ...names])]
  }, [app.favTeam])

  const results = useMemo(() => {
    if (!query) return null
    const num = query.replace(/号$/, '')
    const teams = TEAMS.filter(
      (t) => t.city.includes(query) || t.alias.includes(query) || query.includes(t.city),
    )
    const teamIds = new Set(teams.map((t) => t.id))
    const players = ALL_PLAYERS.filter(
      (p) =>
        p.name.includes(query) ||
        (/^\d+$/.test(num) && String(p.number) === num),
    ).slice(0, 30)
    const matches = app.matches.filter(
      (m) => teamIds.has(m.home) || teamIds.has(m.away),
    ).slice(0, 13)
    return { teams, players, matches }
  }, [query, app.matches])

  const empty =
    results && !results.teams.length && !results.players.length && !results.matches.length

  return (
    <View className='app search-page'>
      <View className='search-top' style={{ paddingTop: `${top + 6}px` }}>
        <View className='search-box'>
          <Icon name='search' size={16} color='rgba(20,16,17,.4)' />
          <Input
            className='search-input'
            value={q}
            focus
            placeholder='搜球队、球员、号码、职业'
            onInput={(e) => setQ(e.detail.value)}
          />
          {q && (
            <View className='search-clear' onClick={() => setQ('')}>
              <Icon name='close' size={14} color='rgba(20,16,17,.4)' />
            </View>
          )}
        </View>
        <Text className='search-cancel' onClick={goBack}>
          取消
        </Text>
      </View>

      <View className='search-body'>
        {!query && (
          <>
            <Text className='search-label'>热门搜索</Text>
            <View className='hot-tags'>
              {hot.map((h) => (
                <Text key={h} className='hot-tag' onClick={() => setQ(h)}>
                  {h}
                </Text>
              ))}
            </View>
            <Text className='search-tip'>
              试试搜「长沙」「前锋」「外卖骑手」，或者球员号码「9号」。
            </Text>
          </>
        )}

        {empty && <Text className='search-empty'>没有找到“{query}”的结果</Text>}

        {results && results.teams.length > 0 && (
          <View className='search-group'>
            <Text className='search-group-title'>球队</Text>
            <View className='card search-list'>
              {results.teams.map((t) => (
                <View
                  key={t.id}
                  className='search-row'
                  onClick={() => app.open({ type: 'team', id: t.id })}
                >
                  <Crest team={t} size={26} />
                  <View className='grow'>
                    <Text className='search-row-title'>{t.city}队</Text>
                    <Text className='search-row-sub'>
                      {t.alias} · {t.stadium}
                    </Text>
                  </View>
                  <Icon name='right' size={14} color='rgba(20,16,17,.2)' />
                </View>
              ))}
            </View>
          </View>
        )}

        {results && results.players.length > 0 && (
          <View className='search-group'>
            <Text className='search-group-title'>球员</Text>
            <View className='card search-list'>
              {results.players.map((p) => {
                const t = TEAM_MAP[p.teamId]
                return (
                  <View
                    key={p.id}
                    className='search-row'
                    onClick={() => app.open({ type: 'player', id: p.id })}
                  >
                    <View className='player-pill' style={{ background: t.color }}>
                      {p.number}
                    </View>
                    <View className='grow'>
                      <Text className='search-row-title'>{p.name}</Text>
                      <Text className='search-row-sub'>
                        {t.city}队 · {p.number}号{(p.goals ?? 0) > 0 ? ` · ${p.goals}球` : ''}
                      </Text>
                    </View>
                    <Icon name='right' size={14} color='rgba(20,16,17,.2)' />
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {results && results.matches.length > 0 && (
          <View className='search-group'>
            <Text className='search-group-title'>比赛</Text>
            <View className='card search-list'>
              {results.matches.map((m) => {
                const [hs, as] = score(m)
                return (
                  <View
                    key={m.id}
                    className='search-row'
                    onClick={() => app.open({ type: 'match', id: m.id })}
                  >
                    <View className='grow'>
                      <Text className='search-row-title'>
                        {TEAM_MAP[m.home].city} vs {TEAM_MAP[m.away].city}
                      </Text>
                      <Text className='search-row-sub'>
                        {stageLabel(m)} · {formatDate(m.date)} {m.time}
                      </Text>
                    </View>
                    <Text className='search-score'>
                      {m.status === 'upcoming' ? 'VS' : `${hs}:${as}`}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}
      </View>

    </View>
  )
}
