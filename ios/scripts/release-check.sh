#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
ok() { printf '  ok    %s\n' "$1"; }
bad() { printf '  FAIL  %s\n' "$1"; fail=1; }
warn() { printf '  warn  %s\n' "$1"; }

echo "湘足 iOS 发布前检查"

API_URL="${XC_API_BASE_URL:-$(grep -A3 '^    Release:' project.yml | grep 'XC_API_BASE_URL' | sed -E 's/.*"([^"]+)".*/\1/')}"
if [[ "$API_URL" == https://* ]] && [[ "$API_URL" != *example.com* ]] && [[ "$API_URL" != *localhost* ]] && [[ "$API_URL" != *127.0.0.1* ]]; then
  ok "Release API：$API_URL"
elif [[ "${ALLOW_PLACEHOLDER:-0}" == "1" ]]; then
  warn "Release API 仍是占位地址：${API_URL}（ALLOW_PLACEHOLDER=1）"
else
  bad "Release API 必须是真实 HTTPS 域名，当前：$API_URL"
fi

if [[ -f XiangChao/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png ]]; then
  size=$(sips -g pixelWidth -g pixelHeight XiangChao/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png | awk '/pixel/{print $2}' | paste -sd x -)
  alpha=$(sips -g hasAlpha XiangChao/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png | awk '/hasAlpha/{print $2}')
  if [[ "$size" == "1024x1024" && "$alpha" == "no" ]]; then
    ok "AppIcon 1024×1024，无透明通道"
  else
    bad "AppIcon 需要 1024×1024 且无 alpha，当前 $size alpha=$alpha"
  fi
else
  bad "缺少 AppIcon"
fi

if [[ -f XiangChao/Resources/PrivacyInfo.xcprivacy ]] && grep -q "CA92.1" XiangChao/Resources/PrivacyInfo.xcprivacy; then
  ok "PrivacyInfo.xcprivacy（UserDefaults CA92.1）"
else
  bad "缺少 PrivacyInfo.xcprivacy 或 UserDefaults 理由"
fi

if grep -q "ITSAppUsesNonExemptEncryption: false" project.yml; then
  ok "出口合规：未使用非豁免加密"
else
  bad "project.yml 缺少 ITSAppUsesNonExemptEncryption: false"
fi

if grep -q "com.apple.developer.applesignin" Support/XiangChao.entitlements; then
  ok "Sign in with Apple entitlement"
else
  bad "缺少 Sign in with Apple entitlement"
fi

if grep -rqE "sk-[A-Za-z0-9]{16,}|DEEPSEEK_API_KEY" XiangChao --include='*.swift' --include='*.json' --include='*.plist'; then
  bad "iOS 工程中出现疑似 DeepSeek Key"
else
  ok "iOS 工程不含 DeepSeek Key"
fi

if grep -rq "湘超" XiangChao --include='*.swift' --include='*.json' --include='*.plist'; then
  bad "iOS 工程仍在界面/资源中使用「湘超」"
else
  ok "界面与资源不含「湘超」"
fi

if [[ -d XiangChao/Resources/Assets.xcassets/TeamLogos ]]; then
  bad "App 资源仍包含官方队徽 TeamLogos"
else
  ok "官方队徽未打包进 App"
fi

if grep -rq "DeepSeekCard\|AIAPI" XiangChao --include='*.swift'; then
  bad "iOS 工程仍引用 AI 生成代码"
else
  ok "iOS 工程不包含 AI 生成入口"
fi

if git -C .. check-ignore -q server/.env 2>/dev/null; then
  ok "server/.env 已被 git 忽略"
else
  warn "server/.env 未被 git 忽略，确认不要提交密钥"
fi

version=$(grep 'MARKETING_VERSION:' project.yml | sed -E 's/.*"([^"]+)".*/\1/')
build=$(grep 'CURRENT_PROJECT_VERSION:' project.yml | sed -E 's/.*"([^"]+)".*/\1/')
ok "版本：$version ($build)"
if [[ "$build" == "1" ]]; then
  warn "App Store Connect 每次上传 build 必须递增，确认 build 未用过"
fi

if command -v xcodebuild >/dev/null; then
  ok "xcodebuild 可用（$(xcodebuild -version | head -1)）"
else
  bad "找不到 xcodebuild"
fi

echo
echo "仍需人工确认："
echo "  - Apple Developer Program 已付费，Team 已选择"
echo "  - App Store Connect 已创建 App，Bundle ID 为 com.xiangchao.app"
echo "  - Sign in with Apple capability 已在 Apple Developer 后台开启"
echo "  - 服务端已部署 HTTPS，ALLOW_DEV_AUTH 关闭，ADMIN_TOKEN 为强令牌"
echo "  - 隐私政策与支持 URL 已托管并填写"
echo "  - 中国区 App/ICP 备案已提交，名称商标检索完成，自绘队徽已确认"
echo "  - Archive 后上传 TestFlight，按 appstore/README.md 填元数据"

echo
if [[ "$fail" -ne 0 ]]; then
  echo "检查未通过。"
  exit 1
fi
echo "自动检查通过。"
