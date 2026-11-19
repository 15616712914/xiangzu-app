import { View, Text } from '@tarojs/components'
import { NavBar } from '../../components/NavBar'
import './index.scss'

export default function Privacy() {
  return (
    <View className='app privacy-page'>
      <NavBar title='隐私与数据来源' />
      <View className='privacy-body'>
        <Text className='privacy-title'>湘超小程序隐私说明</Text>
        <Text className='privacy-updated'>更新日期：2026年11月</Text>

        <Text className='privacy-h'>一、我们收集什么</Text>
        <Text className='privacy-p'>
          本小程序无需登录，不收集昵称、手机号、头像、位置或设备通讯录。你选择的主队、加入提醒的比赛和已读状态只保存在本机微信缓存中，不会上传。
        </Text>

        <Text className='privacy-h'>二、我们如何使用</Text>
        <Text className='privacy-p'>
          本机保存的设置仅用于恢复你的浏览状态：首页置顶主队下一场比赛、消息中心显示真实赛程提醒。清除微信缓存或删除小程序即可全部删除。
        </Text>

        <Text className='privacy-h'>三、第三方服务</Text>
        <Text className='privacy-p'>
          赛程数据通过微信云开发读取，不涉及你的个人信息。小程序未接入微信登录、支付、广告、地图或第三方统计。
        </Text>

        <Text className='privacy-h'>四、赛事数据与免责声明</Text>
        <Text className='privacy-p'>
          赛程、比分、积分、射手榜与名单来自湘超官方公开渠道，更新可能有延迟，一切以赛事官方发布为准。AI 推演由本地模型计算，仅供娱乐，不构成任何投注建议。本小程序与赛事主办方无隶属关系。
        </Text>

        <Text className='privacy-h'>五、你的权利</Text>
        <Text className='privacy-p'>
          由于不建立账号、不保存服务器端个人数据，你可以随时清除本机缓存删除全部本地设置。
        </Text>

        <Text className='privacy-h'>六、联系我们</Text>
        <Text className='privacy-p'>
          如对数据来源或隐私有疑问，可通过小程序「我的 - 关于」中的联系方式反馈；涉及官方数据的更正，请以赛事官方渠道为准。
        </Text>
      </View>
    </View>
  )
}
