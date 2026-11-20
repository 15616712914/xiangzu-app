#!/usr/bin/env bash
set -euo pipefail

# 湘足 API one-shot deploy for a fresh Ubuntu/Debian Aliyun ECS.
# Existing nginx / websites are left untouched: the API uses 127.0.0.1:8787
# and a Cloudflare quick tunnel for public HTTPS.

if [[ "$(id -u)" != "0" ]]; then
  echo "请用 root 运行（阿里云 Workbench 默认就是 root）。"
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "这个脚本只支持 Ubuntu/Debian。把 /etc/os-release 发我，我改成对应系统。"
  exit 1
fi

REPO="https://github.com/15616712914/xiangzu-app.git"
BRANCH="mvp"
APP_DIR="/opt/xiangzu"
NODE_DIR="/opt/node22"
NODE_VERSION="22.11.0"

echo "==> 安装基础依赖"
apt-get update -y
apt-get install -y curl ca-certificates xz-utils openssl gnupg git

echo "==> 安装 Node ${NODE_VERSION}"
if [[ ! -x "$NODE_DIR/bin/node" ]]; then
  curl -fL --retry 3 \
    "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    -o /tmp/node.tar.xz
  mkdir -p "$NODE_DIR"
  tar -xJf /tmp/node.tar.xz -C "$NODE_DIR" --strip-components=1
fi
export PATH="$NODE_DIR/bin:$PATH"
node -v

echo "==> 拉取代码"
mkdir -p "$APP_DIR"
if [[ -d "$APP_DIR/app/.git" ]]; then
  git -C "$APP_DIR/app" fetch origin "$BRANCH"
  git -C "$APP_DIR/app" checkout "$BRANCH"
  git -C "$APP_DIR/app" pull --ff-only origin "$BRANCH"
else
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR/app"
fi

echo "==> 安装后端依赖"
cd "$APP_DIR/app/server"
if ! npm ci --no-audit --no-fund; then
  echo "npm ci 失败，改用国内镜像重试"
  npm install --no-audit --no-fund --registry=https://registry.npmmirror.com
fi

echo "==> 初始化数据目录"
mkdir -p "$APP_DIR/data"
TOKEN="$(openssl rand -hex 24)"
cat > "$APP_DIR/api.env" <<EOF
PORT=8787
HOST=127.0.0.1
DATA_FILE=$APP_DIR/data/data.json
FANS_FILE=$APP_DIR/data/fans.json
ADMIN_TOKEN=$TOKEN
APPLE_CLIENT_ID=com.xiangchao.app
NODE_ENV=production
EOF
chmod 600 "$APP_DIR/api.env"
cat > "$APP_DIR/credentials.txt" <<EOF
API 地址和管理员令牌（不要发到公开群）
ADMIN_TOKEN=$TOKEN
EOF
chmod 600 "$APP_DIR/credentials.txt"

echo "==> 启动 API（systemd）"
cat > /etc/systemd/system/xiangzu-api.service <<EOF
[Unit]
Description=Xiangzu API
After=network.target

[Service]
WorkingDirectory=$APP_DIR/app/server
EnvironmentFile=$APP_DIR/api.env
ExecStart=$NODE_DIR/bin/node --import tsx index.ts
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now xiangzu-api

echo "==> 等待 API 就绪"
ok=0
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8787/api/health >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done
if [[ "$ok" != "1" ]]; then
  echo "API 没有启动，最近日志："
  journalctl -u xiangzu-api -n 40 --no-pager || true
  exit 1
fi

echo "==> 安装 cloudflared"
if ! command -v cloudflared >/dev/null 2>&1; then
  if ! curl -fL --retry 3 -o /usr/local/bin/cloudflared \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64; then
    echo "直接下载失败，改用 Cloudflare 官方 apt 源"
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
      | gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
      > /etc/apt/sources.list.d/cloudflared.list
    apt-get update -y
    apt-get install -y cloudflared
  else
    chmod +x /usr/local/bin/cloudflared
  fi
fi

echo "==> 启动 HTTPS 隧道（systemd）"
: > /var/log/xiangzu-tunnel.log
cat > /etc/systemd/system/xiangzu-tunnel.service <<EOF
[Unit]
Description=Xiangzu HTTPS tunnel
After=network.target xiangzu-api.service
Wants=xiangzu-api.service

[Service]
ExecStart=/usr/local/bin/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8787
Restart=always
RestartSec=5
StandardOutput=append:/var/log/xiangzu-tunnel.log
StandardError=append:/var/log/xiangzu-tunnel.log

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now xiangzu-tunnel

echo "==> 等待公网 HTTPS 地址"
URL=""
for _ in $(seq 1 30); do
  URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' /var/log/xiangzu-tunnel.log 2>/dev/null | tail -1 || true)"
  [[ -n "$URL" ]] && break
  sleep 2
done

if [[ -z "$URL" ]]; then
  echo "没有拿到隧道地址，最近日志："
  tail -40 /var/log/xiangzu-tunnel.log || true
  exit 1
fi

echo "==> 验证公网地址"
curl -fsS "$URL/api/health"
echo
curl -fsS -o /dev/null -w "privacy: %{http_code}\n" "$URL/privacy.html"
curl -fsS -o /dev/null -w "support: %{http_code}\n" "$URL/support.html"

cat >> "$APP_DIR/credentials.txt" <<EOF
API_URL=$URL
EOF

echo
echo "================================================"
echo "API 地址：$URL"
echo "管理令牌：$TOKEN"
echo "后台：$URL/admin"
echo "================================================"
echo "把上面的 API 地址发给我。"
echo "注意：Cloudflare 快速隧道重启后地址会变；服务器重启后把新地址发我。"
