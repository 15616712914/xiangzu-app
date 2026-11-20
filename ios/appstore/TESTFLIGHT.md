# TestFlight 操作清单

## 当前后端

```text
https://reservoir-expired-concord-handed.trycloudflare.com
```

归档时必须带上这个地址：

```bash
XC_API_BASE_URL=https://reservoir-expired-concord-handed.trycloudflare.com
```

快速隧道重启后地址会变；先用 `deploy/aliyun/README.md` 里的命令取新地址，再重新打包。

## 1. 在 Xcode 登录 Apple ID

这台 Mac 目前没有 Xcode 账号，所以自动签名失败。

1. 打开 Xcode
2. 菜单 Xcode → Settings → Accounts
3. 点 `+` → Apple ID
4. 登录付费的 Apple Developer 账号
5. 选中 Team，记下 Team ID

现有证书是 `Apple Development: Aihua Liu (6V3KP947G5)`，Team ID `R9TC286V25`。如果这是你的团队，登录对应 Apple ID 即可。

## 2. 注册 Bundle ID

Apple Developer → Certificates, Identifiers & Profiles → Identifiers：

- Bundle ID：`com.xiangchao.app`
- 名称：湘足
- Capability：Sign in with Apple

如果 Xcode 自动签名已经创建过，这一步可以跳过。

## 3. 创建 App Store Connect 记录

App Store Connect → Apps → `+` → New App：

| 字段 | 值 |
| --- | --- |
| 平台 | iOS |
| 名称 | 湘足 |
| 主要语言 | 简体中文 |
| Bundle ID | com.xiangchao.app |
| SKU | xiangzu2026 |
| 用户访问权限 | 完整访问 |

## 4. 归档上传

Xcode 打开 `ios/XiangChao.xcodeproj`：

1. Target → Signing & Capabilities
2. Team 选你的团队
3. Bundle Identifier 确认是 `com.xiangchao.app`
4. Scheme 选 XiangChao，目的设备选 Any iOS Device
5. Product → Archive
6. Organizer → Distribute App → App Store Connect → Upload

归档前也可以在命令行跑：

```bash
cd ios
./scripts/release-check.sh
XC_API_BASE_URL=https://reservoir-expired-concord-handed.trycloudflare.com \
xcodebuild archive \
  -project XiangChao.xcodeproj -scheme XiangChao -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/XiangChao.xcarchive \
  DEVELOPMENT_TEAM=<你的TeamID> -allowProvisioningUpdates
```

## 5. TestFlight

上传后等 10–30 分钟处理：

- **内部测试**：App Store Connect → TestFlight → Internal Testing，最多 100 人，不需要 Beta 审核
- **外部测试**：External Testing → 创建组 → 公开链接，需要一次 Beta 审核

第一次建议先内部测试，自己装一台确认：

- 赛程能加载
- 登录能用
- 开赛提醒能收到
- 通知点击能进比赛详情
- 投票能提交

## 6. 已知限制

- 免费隧道地址不是永久的
- 服务器重启后要取新地址并重新打包
- 中国区 App Store 仍需要 App 备案，TestFlight 不需要
