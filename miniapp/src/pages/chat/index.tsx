import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import { Icon } from '../../components/Icon'
import { NavBar } from '../../components/NavBar'
import { SUGGESTIONS, answer } from '../../data/assistant'
import { useApp } from '../../state'
import './index.scss'

type Msg = { role: 'user' | 'ai'; text: string }

export default function Chat() {
  const app = useApp()
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'ai',
      text: '你好，我是湘超 AI 球评助手。可以问我球队状态、积分排名、射手榜、球员资料和比赛预测。',
    },
  ])
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [scrollTo, setScrollTo] = useState('msg-end')

  const ask = (q: string) => {
    const t = q.trim()
    if (!t || thinking) return
    setMsgs((m) => [...m, { role: 'user', text: t }])
    setText('')
    setThinking(true)
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'ai', text: answer(t, app.matches) }])
      setThinking(false)
      setScrollTo(`msg-${msgs.length + 1}`)
    }, 600)
  }

  return (
    <View className='app chat-page'>
      <NavBar title='AI 球评助手' />
      <ScrollView
        scrollY
        className='chat-scroll'
        scrollIntoView={scrollTo}
        scrollWithAnimation
        showScrollbar={false}
      >
        <View className='chat-inner'>
          {msgs.map((m, i) => (
            <View key={i} id={`msg-${i}`} className={`chat-msg ${m.role}`}>
              {m.role === 'ai' && (
                <View className='chat-avatar'>
                  <Icon name='bot' size={16} color='#e3a83b' />
                </View>
              )}
              <Text className='chat-bubble'>{m.text}</Text>
            </View>
          ))}
          {thinking && (
            <View className='chat-msg ai'>
              <View className='chat-avatar'>
                <Icon name='bot' size={16} color='#e3a83b' />
              </View>
              <Text className='chat-bubble thinking'>正在翻比赛数据…</Text>
            </View>
          )}
          <View id='msg-end' className='chat-end' />
        </View>
      </ScrollView>

      <View className='chat-suggestions'>
        {SUGGESTIONS.slice(0, 4).map((s) => (
          <Text key={s} className='chat-suggestion' onClick={() => ask(s)}>
            {s}
          </Text>
        ))}
      </View>

      <View className='chat-input-bar'>
        <Input
          className='chat-input'
          value={text}
          confirmType='send'
          placeholder='问状态、排名、预测…'
          onInput={(e) => setText(e.detail.value)}
          onConfirm={() => ask(text)}
        />
        <View className='chat-send' onClick={() => ask(text)}>
          <Icon name='send' size={16} color='#ffffff' />
        </View>
      </View>

      <Text className='chat-note'>规则引擎演示，正式版将接入大模型。</Text>
    </View>
  )
}
