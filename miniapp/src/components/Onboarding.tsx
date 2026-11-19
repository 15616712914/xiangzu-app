import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { TEAMS } from '../data/teams'
import { Crest } from './Crest'
import { Icon } from './Icon'
import './onboarding.scss'

export function Onboarding({ onDone }: { onDone: (teamId: string | null) => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const team = TEAMS.find((t) => t.id === picked)

  return (
    <View className='onboarding'>
      <View className='onboarding-hero'>
        <Text className='onboarding-watermark'>湘</Text>
        <View className='onboarding-brand'>湘</View>
        <Text className='onboarding-title'>欢迎来到湘超</Text>
        <Text className='onboarding-sub'>十四市州，为城市荣誉而战。先选一支你支持的球队吧。</Text>
      </View>

      <View className='onboarding-grid'>
        {TEAMS.map((t) => {
          const active = picked === t.id
          return (
            <View
              key={t.id}
              className={`onboarding-team ${active ? 'on' : ''}`}
              onClick={() => setPicked(active ? null : t.id)}
            >
              <Crest team={t} size={30} />
              <Text className='onboarding-city'>{t.city}</Text>
              {active && (
                <View className='onboarding-check'>
                  <Icon name='check' size={9} color='#ffffff' />
                </View>
              )}
            </View>
          )
        })}
      </View>

      <View className='onboarding-foot'>
        <View
          className={`onboarding-cta ${picked ? '' : 'off'}`}
          onClick={() => picked && onDone(picked)}
        >
          {team ? `支持${team.city}，进入湘超` : '选择一支主队'}
        </View>
        <Text className='onboarding-skip' onClick={() => onDone(null)}>
          先随便逛逛
        </Text>
      </View>
    </View>
  )
}
