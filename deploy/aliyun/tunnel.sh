#!/usr/bin/env bash
set -euo pipefail

# Finish the HTTPS part only. Assumes the API is already running on 127.0.0.1:8787.

if [[ "$(id -u)" != "0" ]]; then
  echo "请用 root 运行。"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "==> 尝试 Cloudflare 官方 apt 源"
  rm -f /usr/local/bin/cloudflared
  if curl -fsSL --connect-timeout 10 --max-time 30 \
      https://pkg.cloudflare.com/cloudflare-main.gpg \
      | gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg; then
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
      > /etc/apt/sources.list.d/cloudflared.list
    apt-get update -y || true
    apt-get install -y cloudflared || true
  fi
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "==> apt 源失败，回退 GitHub 直连（支持断点续传）"
  mkdir -p /usr/local/bin
  curl -fL --retry 3 -C - \
    -o /usr/local/bin/cloudflared \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x /usr/local/bin/cloudflared
fi

echo "==> 启动 HTTPS 隧道"
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

echo "==> 等待公网地址"
URL=""
for _ in $(seq 1 40); do
  URL="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' /var/log/xiangzu-tunnel.log 2>/dev/null | tail -1 || true)"
  [[ -n "$URL" ]] && break
  sleep 2
done

if [[ -z "$URL" ]]; then
  echo "没有拿到隧道地址，最近日志："
  tail -50 /var/log/xiangzu-tunnel.log || true
  exit 1
fi

echo "==> 验证"
curl -fsS "$URL/api/health"
echo
curl -fsS -o /dev/null -w "privacy: %{http_code}\n" "$URL/privacy.html"
curl -fsS -o /dev/null -w "support: %{http_code}\n" "$URL/support.html"

echo
echo "================================================"
echo "API 地址：$URL"
echo "后台：$URL/admin"
echo "管理令牌在 /opt/xiangzu/credentials.txt"
echo "================================================"
