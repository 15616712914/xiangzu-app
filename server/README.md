# 湘超 API / 赛果管理

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

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 |
| GET | `/api/league` | 球队、阵容、全部比赛、元数据 |
| GET | `/api/matches` | 比赛列表 |
| GET | `/api/matches/:id` | 单场比赛 |
| GET | `/api/standings` | 积分榜（服务端实时计算） |
| GET | `/api/scorers` | 射手榜 |
| POST | `/api/admin/matches/:id` | 修改状态/比分，需要 `x-admin-token` |

修改比分时只更新官方比分与状态，不再生成进球事件或技术统计，并持久化到 `data.json`。

## 小程序接入状态

已接通。小程序启动时通过 `miniapp/src/lib/api.ts` 请求 `/api/league`，结果写入 `AppState.matches`，所有页面从 context 读比赛数据；请求失败或后端未启动时保留本地真实种子。有进行中的比赛时每 30 秒自动刷新，首页和比赛详情支持下拉刷新。

`data.json` 现在是 2026 湘超官方数据（103 场，含截至 11 月 15 日的淘汰赛），由 `npm run seed` 从 `miniapp/src/data/season.json` 生成。重新抓取官方数据：在仓库根目录运行 `node scripts/import-cfa.mjs`，再执行 `npm run seed`。

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
- 没有登录、审计日志、角色权限。
- 只管理比分/状态，不支持编辑球队、球员、资讯、票务。
- 官方未公开技术统计，当前统一为 0，管理端修改比分也不会补造这些数据。
