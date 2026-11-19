import { useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { CURRENT_ROUND, stageLabel } from '../data/league'
import { backtest, predictMatch } from '../data/predict'
import { TEAM_MAP } from '../data/teams'
import { useApp } from '../state'
import { Crest } from './Crest'
import { Icon } from './Icon'
import { SectionTitle } from './ui'
import './aipicks.scss'

export function AiPicks() {
  const app = useApp()
  const record = useMemo(() => backtest(app.matches), [app.matches])
  const picks = useMemo(
    () =>
      app.matches.filter((m) => m.round >= CURRENT_ROUND && m.status === 'upcoming')
        .slice(0, 6)
        .map((m) => ({ m, p: predictMatch(m, undefined, app.matches) })),
    [app.matches],
  )

  return (
    <View className='ai-picks'>
      <SectionTitle
        kicker='Model'
        action={
          <Text className='section-action'>
            本季命中 {record.hits}/{record.total}
          </Text>
        }
      >
        <Text>模型推演</Text>
        <Icon name='sparkles' size={15} color='#d7261e' />
      </SectionTitle>

      <ScrollView scrollX className='ai-scroll' showScrollbar={false}>
        <View className='ai-row'>
        {picks.map(({ m, p }) => {
          const home = TEAM_MAP[m.home]
          const away = TEAM_MAP[m.away]
          const pick =
            p.pick === 'home' ? `${home.city}胜` : p.pick === 'away' ? `${away.city}胜` : '平局'
          return (
            <View
              key={m.id}
              className='ai-card'
              onClick={() => app.open({ type: 'match', id: m.id, tab: 'ai' })}
            >
              <View
                className='ai-glow left'
                style={{ background: home.color }}
              />
              <View className='ai-glow right' style={{ background: away.color }} />
              <View className='ai-card-top'>
                <Text>
                  {stageLabel(m)} · {m.time}
                </Text>
                <Text className='ai-conf'>置信度{p.confidence}</Text>
              </View>
              <View className='ai-card-mid'>
                <View className='ai-team'>
                  <Crest team={home} size={30} />
                  <Text>{home.city}</Text>
                </View>
                <Text className='ai-score'>
                  {p.predicted[0]}
                  <Text className='ai-colon'>:</Text>
                  {p.predicted[1]}
                </Text>
                <View className='ai-team'>
                  <Crest team={away} size={30} />
                  <Text>{away.city}</Text>
                </View>
              </View>
              <View className='ai-bars'>
                <View style={{ flex: p.probs.home, background: home.color }} />
                <View style={{ flex: p.probs.draw, background: '#8a817a' }} />
                <View style={{ flex: p.probs.away, background: away.color }} />
              </View>
              <Text className='ai-pick'>看好 {pick}</Text>
            </View>
          )
        })}
        </View>
      </ScrollView>
      <Text className='ai-note'>模型推演，仅供娱乐，不构成投注建议</Text>
    </View>
  )
}
