import { useRouter, useShareAppMessage } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import { useApp } from '../../state'
import { NavBar } from '../../components/NavBar'
import { NEWS } from '../../data/news'
import './index.scss'

export default function NewsDetail() {
  const router = useRouter()
  const app = useApp()
  const id = router.params.id ?? ''
  const news = NEWS.find((n) => n.id === id)

  useShareAppMessage(() => ({
    title: news?.title ?? '湘超资讯',
    path: `/pages/news/index?id=${id}`,
  }))

  if (!news) {
    return (
      <View className='app'>
        <NavBar title='资讯' />
        <Text className='empty'>资讯不存在</Text>
      </View>
    )
  }

  return (
    <View className='app news-page'>
      <NavBar title='资讯' tone='dark' share />
      <View className='news-cover'>
        <Text className='news-cover-tag'>{news.tag}</Text>
        <Text className='news-cover-mark'>湘</Text>
      </View>
      <View className='news-body'>
        <Text className='news-title'>{news.title}</Text>
        <Text className='news-info'>
          {news.time} · {news.reads}
        </Text>
        <Text className='news-lead'>{news.summary}</Text>
        {news.body.map((p, i) => (
          <Text key={i} className='news-para'>
            {p}
          </Text>
        ))}
        <Text className='news-disclaimer'>内容摘要整理自官方公开报道，具体以官方发布为准。</Text>

        <View className='related'>
          <Text className='related-title'>更多资讯</Text>
          {NEWS.filter((n) => n.id !== news.id)
            .slice(0, 3)
            .map((n) => (
              <View
                key={n.id}
                className='related-row'
                onClick={() => app.open({ type: 'news', id: n.id })}
              >
                <Text className='related-tag'>{n.tag}</Text>
                <Text className='related-name'>{n.title}</Text>
              </View>
            ))}
        </View>
      </View>
    </View>
  )
}
