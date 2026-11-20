#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" != "0" ]]; then
  echo "请用 root 运行。"
  exit 1
fi

APP_DIR=/opt/xiangzu/app
ENV_FILE=/opt/xiangzu/api.env
PORT=$(grep '^PORT=' "$ENV_FILE" | cut -d= -f2-)

echo "==> 拉取最新代码"
cd "$APP_DIR"
if [[ "${SKIP_PULL:-0}" != "1" ]]; then
  git fetch origin mvp
  git checkout mvp
  git pull --ff-only origin mvp
else
  echo "SKIP_PULL=1，跳过 git，使用已解压的代码"
fi

echo "==> 安装依赖并重启 API"
cd "$APP_DIR/server"
export PATH=/opt/node22/bin:$PATH
npm ci --no-audit --no-fund
systemctl restart xiangzu-api

echo "==> 检查 API"
for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" | grep -q '"matches"'; then
    break
  fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$PORT/api/health" | grep -q '"matches"'

echo "==> 安装每 10 分钟自动同步"
cat > /etc/systemd/system/xiangzu-sync.service <<EOF
[Unit]
Description=Xiangzu official data sync
After=network.target xiangzu-api.service
Wants=xiangzu-api.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'curl -fsS -X POST -H "x-admin-token: \$(grep ^ADMIN_TOKEN= $ENV_FILE | cut -d= -f2-)" http://127.0.0.1:$PORT/api/admin/sync-official'
StandardOutput=append:/var/log/xiangzu-sync.log
StandardError=append:/var/log/xiangzu-sync.log
EOF
cat > /etc/systemd/system/xiangzu-sync.timer <<'EOF'
[Unit]
Description=Sync Xiangzu official data every 10 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=10min
Persistent=false

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now xiangzu-sync.timer
systemctl start xiangzu-sync.service || true

echo "==> 同步测试"
curl -fsS -X POST \
  -H "x-admin-token: $(grep '^ADMIN_TOKEN=' "$ENV_FILE" | cut -d= -f2-)" \
  "http://127.0.0.1:$PORT/api/admin/sync-official?force=1&players=1" | head -c 500
echo

echo "==> 完成。后台刷新后会出现「同步官方」按钮。"
