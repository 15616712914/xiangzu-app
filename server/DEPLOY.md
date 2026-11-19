# 后端部署（Render）

目标：得到一个公网 HTTPS API，让真机上的赛程、登录、投票、AI 和隐私政策 URL 都能用。

## 0. 前置

- 一个 GitHub 账号
- 一个 Render 账号（用 GitHub 登录）
- 代码已推到 GitHub 仓库

```bash
git add .
git commit -m "prepare testflight"
git remote add origin https://github.com/<你的账号>/<仓库名>.git
git push -u origin mvp
```

确认 `server/.env`、`server/fans.json` 没有被提交。

## 1. 用 Blueprint 创建服务

1. 打开 <https://dashboard.render.com/blueprints>
2. New Blueprint Instance
3. 选择刚才的仓库
4. Render 会读取根目录的 `render.yaml`
5. 点 Apply

`render.yaml` 已经配好：

| 配置 | 值 |
| --- | --- |
| 运行时 | Docker |
| 计划 | Starter（约 $7/月，免费计划没有持久磁盘） |
| 磁盘 | 1 GB，挂载到 `/var/data` |
| 数据文件 | `/var/data/data.json` |
| 账号文件 | `/var/data/fans.json` |
| 健康检查 | `/api/health` |
| 管理令牌 | Render 自动生成 |

首次启动时，如果 `/var/data/data.json` 不存在，服务会从镜像内置的真实赛程快照自动初始化，不需要手动 seed。

## 2. 填环境变量

在 Render 服务的 Environment 页面：

| 变量 | 说明 |
| --- | --- |
| `ADMIN_TOKEN` | 已自动生成，复制保存，后台登录用 |
| `APPLE_CLIENT_ID` | `com.xiangchao.app`；如果改 Bundle ID 要同步改 |
| `DEEPSEEK_API_KEY` | 可选；不填则 AI 解读返回“未配置” |
| `DEEPSEEK_MODEL` | `deepseek-chat` |

不要设置 `ALLOW_DEV_AUTH`。生产环境保持关闭。

## 3. 验证

把 `<service>` 换成 Render 给你的域名，例如 `xiangchao-api.onrender.com`：

```bash
curl https://<service>/api/health
curl https://<service>/api/ai/status
curl https://<service>/privacy.html
curl https://<service>/support.html
```

预期：

- `/api/health` 返回 `ok: true` 和 103 场比赛
- `/privacy.html`、`/support.html` 是网页，不是 404
- 后台地址：`https://<service>/admin`

## 4. 让 App 指向公网

不用改 `project.yml`，归档时覆盖：

```bash
cd ios
./scripts/release-check.sh
XC_API_BASE_URL=https://<service> xcodebuild archive \
  -project XiangChao.xcodeproj -scheme XiangChao -configuration Release \
  -destination 'generic/platform=iOS' -archivePath build/XiangChao.xcarchive
```

然后在 Xcode Organizer 里 Distribute App → App Store Connect → Upload。

## 5. 数据与备份

- 比赛数据：后台修改后写入 `/var/data/data.json`
- 账号数据：`/var/data/fans.json`
- 自动备份：`/var/data/backups/`，data 保留最近 20 份，fans 保留最近 14 份
- 操作日志：`/var/data/logs/admin.jsonl`

Render 的磁盘随服务保留，重新部署不会丢。要下载备份，用 Render Shell：

```bash
ls /var/data/backups
```

## 6. 比赛日运营

1. 打开 `https://<service>/admin`
2. 填入 `ADMIN_TOKEN`
3. 开赛前把状态改成「进行中」，填 live 分钟
4. 有官方现场人数时填入，没有就留空
5. 比分变化后保存
6. 完场后改成「已完场」
7. 在「操作记录」确认改动

## 7. 中国区上架与备案

Render 海外部署：

- 适合 TestFlight，不需要 ICP
- 也能提交海外区 App Store
- **不能替代中国区 App 备案**

中国区 App Store 目前要求填写备案号。可行路径：

1. 购买域名
2. 在国内云（阿里云/腾讯云）完成 ICP 备案
3. 用同一份 Dockerfile 部署到境内服务器
4. 通过云厂商或 App 分发平台完成 App 备案
5. 在 App Store Connect 填写备案号

个人主体的具体材料、周期和是否受理，以工信部、云厂商和 App Store 最新要求为准。

## 8. 迁移到国内云

镜像本身不变，改三个环境变量即可：

```bash
DATA_FILE=/data/xiangchao/data.json
FANS_FILE=/data/xiangchao/fans.json
PORT=8787
```

前面放 Nginx 或 Caddy 做 HTTPS 反向代理，把 `https://api.<你的域名>` 指到 `127.0.0.1:8787`。记得把 `/data/xiangchao` 挂成持久磁盘。

## 9. 常见问题

**首次打开很慢**

Render Starter 不会休眠；免费计划会休眠，所以没有采用免费计划。

**登录失败**

检查 `APPLE_CLIENT_ID` 是否等于 Bundle ID，Apple Developer 后台是否开启了 Sign in with Apple。

**AI 不可用**

`/api/ai/status` 返回 `configured: false` 就是没填 `DEEPSEEK_API_KEY`。App 会显示未配置，不会崩溃。

**改了代码怎么更新**

推到 GitHub 后 Render 自动重新部署。`/var/data` 不变。
