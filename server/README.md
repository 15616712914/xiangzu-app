# 湘足 API / 赛果管理

一个不依赖数据库的小型 Node API，数据存在 `data.json`，方便先跑通运营流程。

## 启动

```bash
cd server
npm install
npm run seed     # 从 miniapp/src/data 生成 data.json
npm start        # http://127.0.0.1:8787
```

- 管理后台：`http://127.0.0.1:8787/admin`
- 默认管理令牌：`dev-token`
- 正式环境务必设置强令牌：`ADMIN_TOKEN=... npm start`

管理后台没有登录系统，令牌就是唯一凭证，不要直接暴露在公网。正式部署建议放在内网、VPN 或加一层登录网关。

后台可改：状态、比分、live 分钟、现场人数。令牌只存在标签页的 sessionStorage；每次保存前自动备份 `data.json` 到 `backups/`（保留最近 20 份），`fans.json` 启动时备份（保留 14 份）。操作记录写入 `logs/admin.jsonl`，可在后台「操作记录」查看最近 50 条。

## 部署

公网 HTTPS 部署（Render Blueprint、磁盘、环境变量、迁移到国内云）见 [DEPLOY.md](./DEPLOY.md)。

| 变量 | 说明 |
|---|---|
| `PORT` | 默认 8787 |
| `DATA_FILE` | 赛程数据路径，默认 `server/data.json`；首次启动不存在时会自动从内置快照初始化 |
| `FANS_FILE` | 账号数据路径，默认 `server/fans.json` |
| `ADMIN_LOG_FILE` | 后台操作日志，默认跟随 `DATA_FILE` 所在目录 |

隐私政策与支持页由服务端直接提供：

- `https://<域名>/privacy.html`
- `https://<域名>/support.html`

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/league` | 球队、阵容、全部比赛、元数据 |
| GET | `/api/matches` | 比赛列表 |
| GET | `/api/matches/:id` | 单场比赛 |
| GET | `/api/standings` | 积分榜（服务端实时计算） |
| GET | `/api/scorers` | 射手榜 |
| POST | `/api/admin/matches/:id` | 修改状态/比分/live 分钟/现场人数，需要 `x-admin-token` |
| GET | `/api/admin/log` | 最近 50 条后台操作记录，需要 `x-admin-token` |

修改比分时只更新官方比分与状态，不再生成进球事件或技术统计，并持久化到 `data.json`。

## 小程序接入状态

已接通。小程序启动时通过 `miniapp/src/lib/api.ts` 请求 `/api/league`，结果写入 `AppState.matches`，所有页面从 context 读比赛数据；请求失败或后端未启动时保留本地真实种子。有进行中的比赛时每 30 秒自动刷新，首页和比赛详情支持下拉刷新。

`data.json` 现在是 2026 湖南省足球联赛官方数据（103 场，含截至 11 月 15 日的淘汰赛），由 `npm run seed` 从 `miniapp/src/data/season.json` 生成。重新抓取官方数据：在仓库根目录运行 `node scripts/import-cfa.mjs`，再执行 `npm run seed`。

本地联调：

```bash
# miniapp/.env.development
TARO_APP_API=http://127.0.0.1:8787
```

改完 `.env.development` 需要重启 `npm run dev:weapp`。开发者工具需要关闭“校验合法域名”（`project.config.json` 的 `urlCheck` 已设为 `false`）。正式环境改成 HTTPS API 域名，并在微信后台配置服务器域名。

## 测试

```bash
npm test
```

覆盖健康检查、联赛数据、管理端鉴权和比分更新后的积分变化。

## 已知限制

- `data.json` 单文件存储，适合单实例/低并发；多人同时写会互相覆盖。
- 球迷账号已有 Apple/开发登录和会话；运营后台有操作日志，但没有角色权限、二次确认或独立登录。
- `fans.json` 与 `data.json` 分开存储；自动备份会保留最近若干份，但正式环境仍应做异地备份。
- 只管理比分/状态/live 分钟/现场人数，不支持编辑球队、球员、资讯、票务。
- 官方未公开技术统计，当前统一为 0，管理端修改比分也不会补造这些数据。

## 球迷账号 / 投票 / 助威 / 排行榜

`fans.json` 保存账号、会话、投票和助威记录，默认被 `.gitignore` 忽略。

### 环境变量

| 变量 | 说明 |
|---|---|
| `APPLE_CLIENT_ID` | iOS Bundle ID，例如 `com.xiangchao.app`；不配置时 Apple 登录接口返回 501 |
| `ALLOW_DEV_AUTH` | 仅本地调试设为 `1`，正式环境必须关闭 |
| `DEV_AUTH_TOKEN` | 开发登录令牌，默认 `dev-only`，与 `ALLOW_DEV_AUTH` 配合 |
| `ADMIN_TOKEN` | 原有比分管理令牌 |

### 部署

公网 HTTPS 部署（Render Blueprint、磁盘、环境变量、迁移到国内云）见 [DEPLOY.md](./DEPLOY.md)。

| 变量 | 说明 |
|---|---|
| `PORT` | 默认 8787 |
| `DATA_FILE` | 赛程数据路径，默认 `server/data.json`；首次启动不存在时会自动从内置快照初始化 |
| `FANS_FILE` | 账号数据路径，默认 `server/fans.json` |
| `ADMIN_LOG_FILE` | 后台操作日志，默认跟随 `DATA_FILE` 所在目录 |

隐私政策与支持页由服务端直接提供：

- `https://<域名>/privacy.html`
- `https://<域名>/support.html`

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/apple` | 校验 Apple identityToken，返回 `{ token, user }` |
| POST | `/api/auth/dev` | 仅开发环境；请求头 `x-dev-token` + 稳定 `deviceId` |
| GET | `/api/fans/me` | 当前账号积分、排名、今日助威和投票 |
| GET | `/api/fans/board` | 城市助威榜、预测排行榜、当前账号和本轮投票汇总 |
| GET | `/api/fans/votes/:matchId` | 单场票数、我的选择、是否截止 |
| POST | `/api/fans/votes` | `{ matchId, choice: home/draw/away }`，开赛前可改 |
| POST | `/api/fans/cheers` | `{ teamId }`，每账号每天最多 20 次 |
| POST | `/api/fans/logout` | 注销当前会话 |
| PATCH | `/api/fans/me` | `{ nickname }` 修改昵称（会公开显示在排行榜） |
| PATCH | `/api/fans/preferences` | `{ favouriteTeam, reminders }` 同步主队与开赛提醒 |
| DELETE | `/api/fans/me` | 注销账号并删除昵称、投票、助威、会话 |

积分规则：已结束比赛猜中胜平负 +10 分；积分只用于排行榜，不可兑换，不涉及投注。

### 本地联调

```bash
cd server
npm install
ALLOW_DEV_AUTH=1 APPLE_CLIENT_ID=com.xiangchao.app npm start
```

iOS Debug 默认请求 `http://127.0.0.1:8787`。真机联调时把 `ios/project.yml` 的 `XC_API_BASE_URL` 改成 Mac 的局域网地址或 HTTPS 域名。

### 上线前

- 关闭 `ALLOW_DEV_AUTH`，设置强 `DEV_AUTH_TOKEN` 也没有用，直接不要设置 `ALLOW_DEV_AUTH`。
- 用 HTTPS 反向代理暴露 API，例如 Caddy/Nginx；App Store 构建不能使用 `http://`。
- 生产环境用 `DATA_FILE`、`FANS_FILE` 指向持久磁盘，避免重新部署丢账号和比分。
- `fans.json` 是单文件存储，适合低并发；要做规模化的评论/活动再换 Postgres。
- 中国区上架需要 App/ICP 备案，隐私政策要写明账号、投票和助威数据的用途与删除方式。
- 定期备份 `fans.json` 和 `data.json`。

## AI 深度推演（DeepSeek）

可选功能。App 不会内置 API Key，只通过服务端调用 DeepSeek。

### 环境变量

| 变量 | 说明 |
|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API Key，只放在服务端 |
| `DEEPSEEK_MODEL` | 默认 `deepseek-chat`，可改为 `deepseek-reasoner` |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MOCK` | 本地联调设为 `1`，返回固定结构，不消耗额度；正式环境关闭 |

### 部署

公网 HTTPS 部署（Render Blueprint、磁盘、环境变量、迁移到国内云）见 [DEPLOY.md](./DEPLOY.md)。

| 变量 | 说明 |
|---|---|
| `PORT` | 默认 8787 |
| `DATA_FILE` | 赛程数据路径，默认 `server/data.json`；首次启动不存在时会自动从内置快照初始化 |
| `FANS_FILE` | 账号数据路径，默认 `server/fans.json` |
| `ADMIN_LOG_FILE` | 后台操作日志，默认跟随 `DATA_FILE` 所在目录 |

隐私政策与支持页由服务端直接提供：

- `https://<域名>/privacy.html`
- `https://<域名>/support.html`

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/ai/status` | 是否已配置、当前模型 |
| POST | `/api/ai/preview` | `{ matchId }`，仅未开赛比赛；返回结构化推演 |
| GET | `/api/ai/context/:matchId` | 调试用，查看实际发送给模型的公开数据 |

- 只发送公开赛程、排名、近期战绩、交锋和射手数据，不发送账号或设备信息。
- 服务端限制每 IP 每小时 20 次，同一场比赛缓存 30 分钟。
- 模型输出经过结构校验，比分与胜平负不一致时以比分推导结果。
- Prompt 明确禁止编造伤停、首发、天气、技术统计、赔率和投注建议。

本地不需要真实 Key：

```bash
DEEPSEEK_MOCK=1 npm start
```

正式部署：

```bash
DEEPSEEK_API_KEY=sk-... npm start
```

### API Key 填在哪里

**不要填进 iOS 工程、Info.plist、Xcode 配置或 App 代码。**

本地：

```bash
cd server
cp .env.example .env
```

编辑 `server/.env`：

```dotenv
DEEPSEEK_API_KEY=sk-你的真实Key
DEEPSEEK_MODEL=deepseek-chat
APPLE_CLIENT_ID=com.xiangchao.app
```

然后重启：

```bash
lsof -ti:8787 | xargs kill  # 如果旧服务还在跑
npm start
```

`npm start` 和 `npm run dev` 都会自动读取 `server/.env`。`.env` 已在 `.gitignore`，不要提交。

验证：

```bash
curl -s http://127.0.0.1:8787/api/ai/status
```

返回 `{"configured":true,"model":"deepseek-chat"}` 才说明 Key 已生效。

正式环境：在服务器/容器/云平台的环境变量或 Secret 里填 `DEEPSEEK_API_KEY`，不要在仓库里保存 Key。当前开发服务器如果还带着 `DEEPSEEK_MOCK=1`，需要去掉它再重启，否则会继续返回 mock 结果。
