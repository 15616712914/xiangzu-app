import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { initCloud } from './lib/api'
import { AppProvider } from './state'
import './app.scss'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    initCloud()
    // Keep the prototype's dark status bar text on the paper background.
    // eslint-disable-next-line no-console
    console.log('湘超小程序启动')
  })
  return <AppProvider>{children}</AppProvider>
}

export default App
