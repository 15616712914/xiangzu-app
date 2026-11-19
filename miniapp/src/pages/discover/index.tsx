import { View, Text } from '@tarojs/components'
import { useApp } from '../../state'
import { PageHeader } from '../../components/ui'
import { TabBar } from '../../components/TabBar'
import { NEWS } from '../../data/news'
import './index.scss'

export default function Discover() {
  return (
    <View className='app'>
      <PageHeader kicker='News' title='资讯' subtitle='2026 湘超官方公开报道摘要' />

      <View className='sheet discover-sheet'>
        <NewsList />
      </View>

      <TabBar active='discover' />
    </View>
  )
}

function NewsList() {
  const app = useApp()
  return (
    <View className='news-list'>
      <View className='news-hero' onClick={() => app.open({ type: 'news', id: NEWS[0].id })}>
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

      <Text className='discover-note'>
        摘要整理自赛事官方与公开报道，原文版权归原发布方所有
      </Text>
    </View>
  )
}
