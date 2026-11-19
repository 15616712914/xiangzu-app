import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useApp } from '../../state'
import { Crest } from '../../components/Crest'
import { Icon } from '../../components/Icon'
import { DarkSegments, PageHeader, SectionTitle } from '../../components/ui'
import { TabBar } from '../../components/TabBar'
import { DEALS, WATCH_SPOTS } from '../../data/fans'
import { score, stageLabel } from '../../data/league'
import { NEWS } from '../../data/news'
import { TEAM_MAP } from '../../data/teams'
import './index.scss'

type Seg = 'news' | 'video' | 'travel'

export default function Discover() {
  const [seg, setSeg] = useState<Seg>('news')

  return (
    <View className='app'>
      <PageHeader kicker='Discover' title='发现' subtitle='资讯 · 集锦 · 跟着湘超去旅行'>
        <DarkSegments<Seg>
          value={seg}
          onChange={setSeg}
          options={[
            ['news', '资讯'],
            ['video', '集锦'],
            ['travel', '文旅'],
          ]}
        />
      </PageHeader>

      <View className='sheet discover-sheet'>
        {seg === 'news' && <NewsList />}
        {seg === 'video' && <Highlights />}
        {seg === 'travel' && <Travel />}
      </View>

      <TabBar active='discover' />
    </View>
  )
}

function NewsList() {
  const app = useApp()
  return (
    <View className='news-list'>
      <View
        className='news-hero'
        onClick={() => app.open({ type: 'news', id: NEWS[0].id })}
      >
        <View className='news-hero-cover'>
          <Text className='cover-tag'>{NEWS[0].tag}</Text>
          <Text className='cover-mark'>湘</Text>
        </View>
        <View className='news-hero-body'>
          <Text className='news-hero-title'>{NEWS[0].title}</Text>
          <Text className='news-hero-summary'>{NEWS[0].summary}</Text>
          <Text className='news-meta'>
            {NEWS[0].time} · {NEWS[0].reads}
          </Text>
        </View>
      </View>

      <View className='card news-rows'>
        {NEWS.slice(1).map((n) => (
          <View
            key={n.id}
            className='news-row'
            onClick={() => app.open({ type: 'news', id: n.id })}
          >
            <View className='news-thumb'>
              <Text className='cover-tag small'>{n.tag}</Text>
              <Text className='cover-mark small'>湘</Text>
            </View>
            <View className='news-row-body'>
              <Text className='news-row-title'>{n.title}</Text>
              <Text className='news-meta'>
                {n.time} · {n.reads}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function Highlights() {
  const app = useApp()
  const recent = app.matches.filter((m) => m.status === 'finished').slice(-10).reverse()
  return (
    <View className='highlights'>
      {recent.map((m, i) => {
        const h = TEAM_MAP[m.home]
        const a = TEAM_MAP[m.away]
        const [hs, as] = score(m)
        return (
          <View
            key={m.id}
            className='highlight'
            onClick={() => app.open({ type: 'match', id: m.id })}
          >
            <View
              className='highlight-cover'
              style={{ background: `linear-gradient(120deg, ${h.color}, #17120f 50%, ${a.color})` }}
            >
              <Crest team={h} size={26} />
              <Text className='highlight-score'>
                {hs}:{as}
              </Text>
              <Crest team={a} size={26} />
              <View className='play-icon'>
                <Icon name='play' size={26} color='rgba(255,255,255,.85)' />
              </View>
              <Text className='highlight-time'>
                0{2 + (i % 4)}:{String(10 + ((i * 17) % 49)).padStart(2, '0')}
              </Text>
            </View>
            <Text className='highlight-title'>
              {stageLabel(m)} {h.city} vs {a.city} 全场集锦
            </Text>
          </View>
        )
      })}
      <Text className='discover-note'>集锦为占位内容，正式版将接入授权视频</Text>
    </View>
  )
}

function Travel() {
  const app = useApp()
  return (
    <View className='travel'>
      <View className='travel-hero'>
        <View className='travel-hero-glow' />
        <Text className='travel-kicker'>跟着湘超去旅行</Text>
        <Text className='travel-title'>看一场球，逛一座城</Text>
        <Text className='travel-sub'>凭当轮球票享景区与美食优惠</Text>
      </View>

      <SectionTitle>凭票优惠</SectionTitle>
      <View className='deal-list'>
        {DEALS.map((d) => {
          const t = TEAM_MAP[d.teamId]
          return (
            <View
              key={d.teamId}
              className='card deal'
              onClick={() => app.open({ type: 'team', id: t.id })}
            >
              <View className='deal-mark' style={{ background: t.color }}>
                <Text>{t.city.slice(0, 2)}</Text>
              </View>
              <View className='grow'>
                <Text className='deal-title'>{d.title}</Text>
                <View className='deal-meta'>
                  <View className='row gap-1'>
                    <Icon name='ticket' size={11} color='rgba(20,16,17,.45)' />
                    <Text>{d.detail}</Text>
                  </View>
                  <View className='row gap-1'>
                    <Icon name='food' size={11} color='rgba(20,16,17,.45)' />
                    <Text>{d.food}</Text>
                  </View>
                </View>
              </View>
            </View>
          )
        })}
      </View>

      <View className='watch-section'>
        <SectionTitle>球迷观赛点</SectionTitle>
        <View className='card watch-list'>
          {WATCH_SPOTS.map((w) => (
            <View key={w.name} className='watch-row'>
              <Icon name='pin' size={16} color={TEAM_MAP[w.teamId].color} />
              <View className='grow'>
                <Text className='watch-name'>{w.name}</Text>
                <Text className='watch-detail'>{w.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Text className='discover-note'>优惠与观赛点均为测试数据，以各地官方发布为准</Text>
    </View>
  )
}
