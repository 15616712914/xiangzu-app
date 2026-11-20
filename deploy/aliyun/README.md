# 阿里云部署（当前使用）

服务器：阿里云 ECS 北京，2 核 2G，Ubuntu 22.04，公网 IP `39.107.72.59`。  
现有 nginx 网站保持不动；湘足 API 只监听 `127.0.0.1:8787`，通过 Cloudflare 快速隧道提供 HTTPS。

## 当前地址

```text
API: https://reservoir-expired-concord-handed.trycloudflare.com
隐私: https://reservoir-expired-concord-handed.trycloudflare.com/privacy.html
支持: https://reservoir-expired-concord-handed.trycloudflare.com/support.html
后台: https://reservoir-expired-concord-handed.trycloudflare.com/admin
```

管理员令牌保存在服务器：

```bash
cat /opt/xiangzu/credentials.txt
```

快速隧道地址在隧道服务重启后会变化；变化后用下面的命令取新地址：

```bash
grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' /var/log/xiangzu-tunnel.log | tail -1
```

## 服务

```bash
systemctl status xiangzu-api
systemctl status xiangzu-tunnel
```

重启：

```bash
systemctl restart xiangzu-api
systemctl restart xiangzu-tunnel
```

## 数据

```text
/opt/xiangzu/data/data.json     赛程与比分
/opt/xiangzu/data/fans.json     账号、投票、助威
/opt/xiangzu/data/backups/      自动备份
/opt/xiangzu/data/logs/         后台操作日志
```

这些在服务器磁盘上，重启不会丢。

## 更新代码

仓库当前是公开的，服务器可以直接拉：

```bash
cd /opt/xiangzu/app
git pull origin mvp
cd server && npm ci
systemctl restart xiangzu-api
```

以后把仓库改回私有后，需要给服务器配 Deploy Key，或者在 GitHub 生成只读 token。

## 注意

- 不要停掉或改 nginx，现有网站还在用它。
- 8787 只监听本机，不要加到安全组公网放行。
- 快速隧道不适合长期正式运营；拿到域名和备案后，改用 Caddy/Nginx + 正式域名。
