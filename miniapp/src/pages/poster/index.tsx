import { useEffect, useState } from 'react'
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro'
import { View, Text, Canvas, Button } from '@tarojs/components'
import { useApp } from '../../state'
import { Icon } from '../../components/Icon'
import { NavBar } from '../../components/NavBar'

import { stageLabel } from '../../data/league'
import { TEAM_MAP } from '../../data/teams'
import { renderPoster } from '../../lib/poster'
import './index.scss'

export default function Poster() {
  const router = useRouter()
  const app = useApp()
  const match = app.matches.find((m) => m.id === router.params.id)
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  const [drawing, setDrawing] = useState(true)

  useShareAppMessage(() => ({
    title: match
      ? `湘超${stageLabel(match)} · ${TEAM_MAP[match.home].city} vs ${TEAM_MAP[match.away].city}`
      : '湘超',
    path: match ? `/pages/match/index?id=${match.id}` : '/pages/home/index',
    imageUrl: path || undefined,
  }))

  useEffect(() => {
    if (!match) return
    const timer = setTimeout(() => {
      Taro.createSelectorQuery()
        .select('#posterCanvas')
        .fields({ node: true, size: true } as any)
        .exec(async (res) => {
          const canvas = res?.[0]?.node
          if (!canvas) {
            setError('当前环境不支持 Canvas 2D，请在微信小程序中重试')
            setDrawing(false)
            return
          }
          try {
            const file = await renderPoster(match, app.liveMinute, canvas, app.matches)
            setPath(file)
          } catch (e) {
            setError(`海报生成失败：${(e as Error).message}`)
          } finally {
            setDrawing(false)
          }
        })
    }, 200)
    return () => clearTimeout(timer)
  }, [match, app.liveMinute])

  const save = () => {
    if (!path) return
    void Taro.saveImageToPhotosAlbum({ filePath: path }).catch(() =>
      Taro.previewImage({ urls: [path] }).catch(() =>
        app.toast('保存失败，请长按图片保存'),
      ),
    )
  }

  return (
    <View className='app poster-page'>
      <NavBar title='分享海报' share />
      <View className='poster-body'>
        <View className='poster-frame'>
          <Canvas
            type='2d'
            id='posterCanvas'
            canvasId='posterCanvas'
            className='poster-canvas'
          />
          {drawing && <Text className='poster-loading'>正在生成…</Text>}
        </View>

        {error && <Text className='poster-error'>{error}</Text>}

        <View className='poster-actions'>
          <Button className='poster-share' openType='share' disabled={!path}>
            <Icon name='share' size={16} color='#ffffff' />
            <Text>分享给朋友</Text>
          </Button>
          <View className={`poster-save ${path ? '' : 'off'}`} onClick={save}>
            <Icon name='download' size={16} color='#141011' />
            <Text>保存到相册</Text>
          </View>
        </View>

        <Text className='poster-note'>
          海报为本地生成；正式版可接入小程序码。保存失败时可直接长按图片保存。
        </Text>
      </View>
    </View>
  )
}
