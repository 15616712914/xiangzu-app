import { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { NavBar } from '../../components/NavBar'
import { formatDate, type Match } from '../../data/league'
import { TEAM_MAP } from '../../data/teams'
import './index.scss'

type Tie = {
  home: string
  away: string
  legs: Match[]
  aggHome: number
  aggAway: number
  penHome?: number
  penAway?: number
  winner?: string
}

function makeTie(first: Match, second?: Match): Tie {
  const legs = second ? [first, second] : [first]
  const agg = (team: string) =>
    legs.reduce((n, m) => n + (m.home === team ? m.homeGoals : m.awayGoals), 0)
  const aggHome = agg(first.home)
  const aggAway = agg(first.away)
  const penLeg = legs.find((m) => m.penalty)
  const penFor = (team: string) =>
    penLeg?.penalty ? (penLeg.home === team ? penLeg.penalty[0] : penLeg.penalty[1]) : undefined
  const penHome = penFor(first.home)
  const penAway = penFor(first.away)
  const finished = legs.every((m) => m.status === 'finished')
  let winner: string | undefined
  if (finished) {
    if (aggHome !== aggAway) winner = aggHome > aggAway ? first.home : first.away
    else if (penHome != null && penAway != null && penHome !== penAway)
      winner = penHome > penAway ? first.home : first.away
  }
  return { home: first.home, away: first.away, legs, aggHome, aggAway, penHome, penAway, winner }
}

function stageTies(matches: Match[], firstRound: number, secondRound: number): Tie[] {
  const firsts = matches.filter((m) => m.phase === 'knockout' && m.round === firstRound)
  const seconds = matches.filter((m) => m.phase === 'knockout' && m.round === secondRound)
  return firsts.map((first) =>
    makeTie(
      first,
      seconds.find(
        (s) =>
          (s.home === first.home && s.away === first.away) ||
          (s.home === first.away && s.away === first.home),
      ),
    ),
  )
}

function TieCard({ tie }: { tie: Tie }) {
  const first = tie.legs[0]
  const second = tie.legs[1]
  const played = tie.legs.some((m) => m.status === 'finished')
  return (
    <View className='card bracket-tie'>
      {[tie.home, tie.away].map((id) => {
        const team = TEAM_MAP[id]
        const goals = id === tie.home ? tie.aggHome : tie.aggAway
        const won = tie.winner === id
        const lost = tie.winner && tie.winner !== id
        const pen = id === tie.home ? tie.penHome : tie.penAway
        return (
          <View key={id} className={`bracket-team ${lost ? 'dim' : ''}`}>
            <Crest team={team} size={20} />
            <Text className='grow'>{team.city}</Text>
            <Text className={`bracket-pct ${won ? 'win' : ''}`}>
              {played ? goals : '–'}
              {pen != null ? ` (${pen})` : ''}
            </Text>
          </View>
        )
      })}
      <View className='bracket-legs'>
        {tie.penHome != null && (
          <Text>
            点球 {tie.penHome}-{tie.penAway}，{TEAM_MAP[tie.winner ?? tie.home].city}晋级
          </Text>
        )}
        <Text>
          首回合 {first.date ? `${formatDate(first.date)} ${first.time}` : '待定'}
          {first.status === 'finished' ? ` · ${first.homeGoals}-${first.awayGoals}` : ''}
        </Text>
        <Text>
          次回合 {second?.date ? `${formatDate(second.date)} ${second.time}` : '待定'}
          {second?.status === 'finished' ? ` · ${second.homeGoals}-${second.awayGoals}` : ''}
        </Text>
      </View>
    </View>
  )
}

export default function Bracket() {
  const app = useApp()
  const rounds = useMemo(() => {
    const qf = stageTies(app.matches, 14, 15)
    const sf = stageTies(app.matches, 16, 17)
    return { qf, sf }
  }, [app.matches])

  return (
    <View className='app bracket-page'>
      <NavBar title='淘汰赛对阵' />
      <View className='bracket-body'>
        <View className='bracket-note'>
          2026 湘超淘汰赛：1/4 决赛与半决赛主客场两回合，决赛单场决胜。数据截至 11 月 15 日，
          来源：足球中国 / 湖南省足球联赛。
        </View>

        <ScrollView scrollX className='bracket-scroll' showScrollbar={false}>
          <View className='bracket-row'>
            <View className='bracket-col'>
              <Text className='bracket-stage'>1/4 决赛</Text>
              <View className='bracket-ties'>
                {rounds.qf.map((t) => (
                  <TieCard key={`${t.home}-${t.away}`} tie={t} />
                ))}
              </View>
            </View>

            <View className='bracket-col'>
              <Text className='bracket-stage'>半决赛</Text>
              <View className='bracket-ties'>
                {rounds.sf.map((t) => (
                  <TieCard key={`${t.home}-${t.away}`} tie={t} />
                ))}
              </View>
            </View>

            <View className='bracket-col champion-col'>
              <Text className='bracket-stage'>决赛</Text>
              <View className='champion-card'>
                <Icon name='trophy' size={30} color='#e3a83b' />
                <Text className='champion-name'>12月5日 19:38</Text>
                <Text className='champion-sub'>对阵双方待半决赛产生</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <Text className='bracket-disclaimer'>
          半决赛：11月21/22日首回合，11月28/29日次回合；总比分打平直接点球决胜。
        </Text>
      </View>
    </View>
  )
}
