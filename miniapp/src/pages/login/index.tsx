import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import { useApp } from '../../state'
import { Icon } from '../../components/Icon'
import { NavBar } from '../../components/NavBar'
import './index.scss'

export default function Login() {
  const app = useApp()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [nick, setNick] = useState('')
  const [agree, setAgree] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const phoneOk = /^1\d{10}$/.test(phone)
  const ok = phoneOk && /^\d{6}$/.test(code) && agree

  const sendCode = () => {
    if (!phoneOk) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    setCountdown(60)
    Taro.showToast({ title: '演示环境：验证码为任意 6 位数字', icon: 'none', duration: 2200 })
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) clearInterval(timer)
        return c - 1
      })
    }, 1000)
  }

  return (
    <View className='app login-page'>
      <NavBar title='登录' />
      <View className='login-body'>
        <View className='login-logo'>湘</View>
        <Text className='login-title'>登录湘超</Text>
        <Text className='login-sub'>登录后可参与竞猜、助威和评论</Text>

        <View
          className='wechat-btn'
          onClick={() => {
            app.login({ nick: '湘超球迷', phone: '' })
            app.toast('已登录（演示）')
            Taro.navigateBack()
          }}
        >
          <View className='wechat-icon'>微</View>
          <Text>微信一键登录</Text>
        </View>

        <View className='login-divider'>
          <View className='login-line' />
          <Text>或使用手机号</Text>
          <View className='login-line' />
        </View>

        <View className='login-field'>
          <Text className='login-prefix'>+86</Text>
          <Input
            className='login-input'
            type='number'
            maxlength={11}
            value={phone}
            placeholder='手机号'
            onInput={(e) => setPhone(e.detail.value.replace(/\D/g, ''))}
          />
        </View>

        <View className='login-field'>
          <Input
            className='login-input'
            type='number'
            maxlength={6}
            value={code}
            placeholder='验证码'
            onInput={(e) => setCode(e.detail.value.replace(/\D/g, ''))}
          />
          <Text
            className={`login-code ${countdown > 0 ? 'off' : ''}`}
            onClick={() => countdown === 0 && sendCode()}
          >
            {countdown > 0 ? `${countdown}s` : '获取验证码'}
          </Text>
        </View>

        <View className='login-field'>
          <Input
            className='login-input'
            maxlength={16}
            value={nick}
            placeholder='昵称（选填）'
            onInput={(e) => setNick(e.detail.value)}
          />
        </View>

        <View className='login-agree' onClick={() => setAgree(!agree)}>
          <View className={`agree-box ${agree ? 'on' : ''}`}>
            {agree && <Icon name='check' size={11} color='#ffffff' />}
          </View>
          <Text>
            我已阅读并同意
            <Text className='login-link' onClick={() => app.open({ type: 'privacy', id: 'privacy' })}>
              《用户协议》
            </Text>
            与
            <Text className='login-link' onClick={() => app.open({ type: 'privacy', id: 'privacy' })}>
              《隐私政策》
            </Text>
          </Text>
        </View>

        <View
          className={`login-submit ${ok ? 'on' : ''}`}
          onClick={() => {
            if (!ok) {
              Taro.showToast({ title: '请完整填写并同意协议', icon: 'none' })
              return
            }
            app.login({ nick: nick.trim() || `湘超球迷${phone.slice(-4)}`, phone })
            app.toast('登录成功（演示）')
            Taro.navigateBack()
          }}
        >
          登录
        </View>

        <Text className='login-note'>当前为演示登录，不会真实发送短信或获取微信信息。</Text>
      </View>
    </View>
  )
}
