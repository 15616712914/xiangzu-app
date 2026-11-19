# 湘足 iOS

原生 SwiftUI，目标 iOS 17+，无第三方依赖。赛程数据来自 `../miniapp/src/data/season.json`（2026 赛季 14 队 / 103 场 / 598 名球员），球迷账号/投票/助威/排行榜走 `../server` 的 Node API。

## 运行

```bash
brew install xcodegen   # 已安装可跳过
cd server
npm install
ALLOW_DEV_AUTH=1 APPLE_CLIENT_ID=com.xiangchao.app npm start

cd ios
xcodegen generate
open XiangChao.xcodeproj
```

Debug 默认请求 `http://127.0.0.1:8787`（`project.yml` 的 `XC_API_BASE_URL`）。真机联调改成 Mac 局域网 IP 或 HTTPS 域名。

测试：

```bash
xcodebuild -project XiangChao.xcodeproj -scheme XiangChao \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 18 Pro' test
```

命令行构建：

```bash
xcodebuild -project XiangChao.xcodeproj -scheme XiangChao \
  -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 18 Pro' \
  -configuration Debug build CODE_SIGNING_ALLOWED=NO
```

Debug 启动自检：内置数据量、积分榜、射手榜排序、半决赛点球、预测概率。Debug 且 API 是本机时，登录页会出现“开发登录（仅调试）”，不需要 Apple 账号。

## 账号与数据

- 登录：Sign in with Apple；服务端校验 identityToken 的签名、issuer 和 audience。
- 赛季浏览不需要登录；投票、助威、排行榜需要登录。
- 投票：胜/平/负，开赛前可改，截止后锁定。
- 助威：每账号每天 20 次，按 Asia/Shanghai 日期重置。
- 排行榜：已结束比赛猜中胜平负 +10 分，只用于排名，不可兑换。
- 注销：`我的 → 注销账号并删除数据`，服务端删除昵称、投票、助威、会话和积分。
- 无评论、私信、广告或第三方统计。

签名后 `Sign in with Apple` 需要：Apple Developer 后台开启 capability、Xcode 选择 Team、`APPLE_CLIENT_ID` 与 Bundle ID 一致。当前 entitlements 已写入 `Support/XiangChao.entitlements`。

## 上架前必须改

1. **Bundle ID**：`com.xiangchao.app` 是占位，改成你账号下唯一的 ID；同步改 `PRODUCT_BUNDLE_IDENTIFIER` 和 `APPLE_CLIENT_ID`。
2. **签名**：选择 Team，开启 Sign in with Apple。
3. **API 地址**：`project.yml` 的 Release `XC_API_BASE_URL` 目前是占位 `https://api.example.com`，换成真实 HTTPS 地址。
4. **后端**：关闭 `ALLOW_DEV_AUTH`，用 HTTPS 反向代理；`fans.json` 定期备份。中国区上架还需要 App/ICP 备案。
5. **隐私政策 URL**：服务端已提供 `/privacy.html` 和 `/support.html`，部署后直接填这两个地址。
6. **版权/队徽**：已使用非官方名称「湘足」和自绘盾形徽章，不再使用官方队徽；提交前仍建议做一次商标检索。
7. **开发者账号**：个人主体需 Apple Developer Program（$99/年）。

## 数据更新

```bash
cp ../miniapp/src/data/season.json XiangChao/Resources/season.json
cd ../server && npm run seed
```

淘汰赛按 `round 14/15`（1/4 决赛）、`16/17`（半决赛）计算总比分和点球。**决赛目前是占位**，官方赛程进入 `season.json` 后需补 `BracketView.finalColumn` 动态展示。

## 目录

- `XiangChao/Models`：赛季、积分榜/射手榜/淘汰赛、泊松预测、球迷 DTO
- `XiangChao/Data`：赛季存储、提醒、Keychain、FanAPI/FanStore
- `XiangChao/Views`：5 个 Tab、比赛/球队/球员/淘汰赛/海报、账号、球迷
- `XiangChao/Resources`：season.json、队徽、AppIcon、隐私清单
- `appstore`：隐私政策 HTML、元数据草稿、6.9 英寸截图

## 已知边界

- 官方未公布逐场进球事件、首发和技术统计，比赛详情显示“官方未公布”。
- 模型推演在本地计算，统一标注“仅供娱乐，不构成投注建议”。
- 排行榜需要真实用户参与；空榜显示引导文案，不造假数据。
- `fans.json` 单文件存储，适合低并发；评论/大规模活动需要换数据库。

## AI 功能状态（中国版关闭）

为避免生成式 AI 备案和第三方数据说明，中国版不包含 AI 解读，只保留本地泊松模型。AI 相关 App 代码存档在 `appstore/legacy-source/`，服务端 `ai.ts` 保留但 App 不会调用。以后恢复需要重新评估备案、数据出境和隐私政策。


## 工程基础（Phase 1）

- `APIClient` 统一处理 base URL、超时、Bearer token、错误体和 401；`FanAPI`、`SeasonAPI` 只保留业务路径
- `LocalCache` 将最近一次远端赛程写入 Application Support；启动时先显示缓存快照，再后台刷新
- 首页/数据页显示 `官方数据 / 离线数据` 与更新时间
- `Analytics.track` 已接入 onboarding、提醒、投票、助威、AI、比赛打开；目前只在 Debug 输出，远端 sink 待接
- `XiangChaoTests` 覆盖积分榜、射手榜、淘汰赛点球、预测概率归一化、缓存读写

## Phase 2：账号与通知

- `PATCH /api/fans/preferences` 同步主队与开赛提醒；登录时合并远端偏好，本地修改回写
- 首屏选队后可直接开启开赛提醒；系统权限请求只在这个上下文里出现
- 「我的 → 通知设置」显示系统权限、已加入提醒，并预留赛果推送位
- Token 只走 Keychain；Debug 未签名模拟器有 UserDefaults 兜底

## Phase 3：比赛日与赛后闭环

- 首页新增「比赛日」：最近比赛日 chips、live 优先、当天比赛列表；没有 live/upcoming 时整块隐藏
- 投票后赛果出来时，比赛详情显示「猜中了 · +10 分」或「未猜中 · 本场X胜」
- 球迷页新增「我的预测」：最近 8 场已投票比赛、你的选择、猜中/未中标记
- 积分与排名直接取服务端 `me`，不在客户端重算
- 深链和 App Store 链接等拿到正式 App ID 后再加，避免分享无效链接

## Phase 5：体验与上架

- 正文灰色 `Theme.muted` 调整为纸面 4.5:1 对比度；深色 Tab 栏单独使用 `mutedOnInk`
- 首页搜索、提醒、主队按钮扩大到 44pt，并补 VoiceOver 标签；底部 Tab 标记选中态
- 助威榜分享、投票按钮点击区不小于 44pt
- App Store 截图按当前设计重拍：比赛日、积分榜、对阵、详情、海报、投票（1320×2868）
- 隐私政策与 App 内说明同步「主队/提醒登录后同步到服务器」
- 已知缺口：未完整支持 Dynamic Type，字体仍是固定字号

## Phase 6：通知深链与 Dynamic Type

- 开赛提醒携带 `matchId`，点击通知会切到首页并打开对应比赛详情
- 前台收到通知也显示横幅；通知中心点击同样生效
- 新增 `appFont(size:weight:design:)`，按系统 Dynamic Type 缩放固定字号
- 积分榜在辅助功能字号下隐藏胜平负/净胜球列，避免表格挤压
- 品牌副标题限制单行，避免大字号换行破坏头部布局

## Phase 7：Release 收口

归档前先跑自动检查：

```bash
./scripts/release-check.sh
```

检查 Release API 是否为真实 HTTPS 域名、AppIcon 是否 1024 且无 alpha、隐私清单、出口合规、Sign in with Apple、iOS 工程是否混入 DeepSeek Key、版本号和 Xcode。

真实域名不需要改 `project.yml`，归档时覆盖即可：

```bash
XC_API_BASE_URL=https://api.your-domain.com xcodebuild archive \
  -project XiangChao.xcodeproj -scheme XiangChao -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/XiangChao.xcarchive
```

`XCApiBaseURL` 会以覆盖后的值写入 Info.plist。已用 `CODE_SIGNING_ALLOWED=NO` 演练 Archive，`ARCHIVE SUCCEEDED`。

域名未确定时可临时跳过 API 检查：

```bash
ALLOW_PLACEHOLDER=1 ./scripts/release-check.sh
```
