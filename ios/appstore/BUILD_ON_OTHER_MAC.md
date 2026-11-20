# 在另一台 Mac 上打 TestFlight 包

## 前提

- 另一台 Mac 已安装 Xcode 16 或更新版本
- 能登录你付费的 Apple Developer 账号
- 能上网

## 1. 打开工程

解压 `xiangzu-testflight.zip`，双击：

```text
ios/XiangChao.xcodeproj
```

如果 Xcode 提示工程版本太新，先安装 XcodeGen：

```bash
brew install xcodegen
cd ios
xcodegen generate
```

## 2. 登录 Apple ID

Xcode 菜单 → **Settings → Accounts** → `+` → Apple ID，登录付费账号。

登录后回到工程：

1. 左侧选中项目 `XiangChao`
2. Target `XiangChao` → **Signing & Capabilities**
3. Team 选你的团队
4. Bundle Identifier 确认是 `com.xiangchao.app`
5. 如果列表里没有 **Sign in with Apple**，点 `+ Capability` 添加

## 3. 创建 App Store Connect 记录

浏览器打开 App Store Connect → Apps → `+` → New App：

| 字段 | 值 |
| --- | --- |
| 平台 | iOS |
| 名称 | 湘足 |
| 主要语言 | 简体中文 |
| Bundle ID | com.xiangchao.app |
| SKU | xiangzu2026 |
| 用户访问权限 | 完整访问 |

## 4. 归档

1. Xcode 顶部设备选 **Any iOS Device (arm64)**
2. 菜单 **Product → Archive**
3. 等构建完成，Organizer 会自动打开

## 5. 上传

Organizer → **Distribute App**：

1. 选 **App Store Connect**
2. 选 **Upload**
3. 保持默认签名选项
4. Upload

上传后等 10–30 分钟处理。

## 6. TestFlight

App Store Connect → TestFlight：

- 先建 **Internal Testing**，把自己加进去
- 用 TestFlight App 装到手机上
- 确认赛程、登录、提醒、通知跳转、投票都正常
- 再考虑 External Testing

## 已经配好的东西

- Release API：`https://reservoir-expired-concord-handed.trycloudflare.com`
- 显示名：湘足
- Bundle ID：`com.xiangchao.app`
- 自绘队徽、无第三方资讯、无 AI
- 版本：1.0 (1)

## 如果 Bundle ID 被占用

Xcode 会报错。把报错发我，我改 Bundle ID，同时要改服务器上的 `APPLE_CLIENT_ID`。

## 注意

- 隧道地址是临时的，服务器重启后会变；变了要重新打一个包
- 中国区 App Store 仍需要备案，TestFlight 不需要
