import { useState } from 'react'
import Taro, { usePageScroll } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import { Icon } from './Icon'
import './navbar.scss'

export function statusBarHeight() {
  try {
    const h = Number(Taro.getWindowInfo().statusBarHeight)
    return Number.isFinite(h) && h > 0 ? h : 24
  } catch {
    return 24
  }
}

export function goBack() {
  const pages = Taro.getCurrentPages?.() ?? []
  if (pages.length > 1) Taro.navigateBack()
  else Taro.reLaunch({ url: '/pages/home/index' })
}

export function NavBar({
  title,
  tone = 'light',
  share = false,
}: {
  title?: string
  tone?: 'light' | 'dark'
  share?: boolean
}) {
  const top = statusBarHeight()
  const [stuck, setStuck] = useState(false)

  usePageScroll(({ scrollTop }) => {
    const next = scrollTop > 44
    setStuck((prev) => (prev === next ? prev : next))
  })

  return (
    <View className={`navbar ${tone} ${stuck ? 'stuck' : ''}`} style={{ paddingTop: `${top}px` }}>
      <View className='navbar-row'>
        <View className='navbar-back' onClick={goBack}>
          <Icon name='back' size={20} color={tone === 'dark' ? '#ffffff' : '#141011'} />
        </View>
        <Text className='navbar-title'>{title ?? ''}</Text>
        {share ? (
          <Button className='navbar-share' openType='share'>
            <Icon name='share' size={17} color={tone === 'dark' ? '#ffffff' : '#141011'} />
          </Button>
        ) : (
          <View className='navbar-share' />
        )}
      </View>
    </View>
  )
}
