import { View, Text } from '@tarojs/components'
import { NavBar } from '../../components/NavBar'
import './index.scss'

export default function Privacy() {
  return (
    <View className='app privacy-page'>
      <NavBar title='隐私与用户协议' />
      <View className='privacy-body'>
        <Text className='privacy-title'>湘超隐私政策与用户协议</Text>
        <Text className='privacy-updated'>更新日期：2026年11月</Text>

        <Text className='privacy-h'>一、我们收集什么</Text>
        <Text className='privacy-p'>
          当前原型不会收集你的真实个人信息。演示登录仅在本地保存昵称和手机号，用于展示登录后的界面状态，不会上传到服务器。
        </Text>

        <Text className='privacy-h'>二、我们如何使用</Text>
        <Text className='privacy-p'>
          主队、竞猜、助威、提醒等数据保存在你的设备本地，用于恢复你的使用状态。正式版接入后端后，我们会在收集前明确告知用途并征得同意。
        </Text>

        <Text className='privacy-h'>三、第三方服务</Text>
        <Text className='privacy-p'>
          正式版可能使用微信登录、订阅消息、地图与支付能力。相关服务由微信提供，遵循微信的隐私政策。
        </Text>

        <Text className='privacy-h'>四、内容与社区</Text>
        <Text className='privacy-p'>
          评论等功能上线前会接入内容安全审核。请勿发布违法违规、侮辱谩骂、赌博或侵权内容。
        </Text>

        <Text className='privacy-h'>五、你的权利</Text>
        <Text className='privacy-p'>
          你可以随时在「我的」中退出登录，或清除小程序缓存以删除本地数据。正式版将提供账号注销与数据删除入口。
        </Text>

        <Text className='privacy-h'>六、联系我们</Text>
        <Text className='privacy-p'>
          如对隐私或协议有疑问，可通过赛事官方渠道联系我们。本文为原型演示文本，正式上线前需由法务审核。
        </Text>
      </View>
    </View>
  )
}
