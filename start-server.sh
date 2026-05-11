#!/usr/bin/env bash
# Khởi động API (apps/api) và Web (apps/web) cùng lúc — macOS / Unix
# Chạy từ thư mục gốc repo: chmod +x start-server.sh && ./start-server.sh
#
# Tương đương start-server.bat (Windows): giải phóng cổng, gỡ lock Next.js,
# kiểm tra node_modules, mở hai cửa sổ Terminal (Terminal.app).

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_PORT="${FE_PORT:-3000}"
BE_PORT="${BE_PORT:-3001}"

# Terminal.app thường không load ~/.zshrc — bổ sung PATH giống shell đăng nhập
bootstrap_runtime_path() {
  export PATH="/opt/homebrew/bin:/opt/homebrew/opt/node/bin:/usr/local/bin:/usr/local/opt/node/bin:${HOME}/.local/share/pnpm:${HOME}/.volta/bin:${PATH:-}"

  if [[ -s "${HOME}/.volta/load.sh" ]]; then
    # shellcheck disable=SC1090
    source "${HOME}/.volta/load.sh" 2>/dev/null || true
  fi

  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env 2>/dev/null)" || true
  elif [[ -x "${HOME}/.local/share/fnm/fnm" ]]; then
    eval "$("${HOME}/.local/share/fnm/fnm" env 2>/dev/null)" || true
  fi

  if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    source "${HOME}/.nvm/nvm.sh" 2>/dev/null || true
  fi

  if [[ -s "${HOME}/.asdf/asdf.sh" ]]; then
    # shellcheck disable=SC1090
    source "${HOME}/.asdf/asdf.sh" 2>/dev/null || true
  fi

  # Fallback: Node helpers đi kèm Cursor (khi chưa cài Node global / PATH tối giản)
  local cursor_helpers="/Applications/Cursor.app/Contents/Resources/app/resources/helpers"
  if [[ -x "${cursor_helpers}/node" ]]; then
    export PATH="${cursor_helpers}:${PATH}"
  fi
}

kill_next_web() {
  echo "Checking stale Next.js processes..."
  local web_root="${REPO_ROOT}/apps/web"
  local pid
  while read -r pid; do
    [[ -z "${pid:-}" ]] && continue
    if ps -p "$pid" -o command= 2>/dev/null | grep -F "$web_root" >/dev/null; then
      echo "Killing stale Next.js pid=$pid"
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done < <(pgrep -f "next/dist/bin/next dev" 2>/dev/null || true)
  sleep 1
}

kill_port() {
  local port=$1
  echo "Checking port $port..."
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids:-}" ]]; then
    echo "Found process(es) on port $port: $pids. Killing..."
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
    sleep 1
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids:-}" ]]; then
      # shellcheck disable=SC2086
      kill -KILL $pids 2>/dev/null || true
    fi
  else
    echo "Port $port is free"
  fi
}

pick_package_runner() {
  if command -v pnpm >/dev/null 2>&1; then
    printf '%s' "$(command -v pnpm)"
    return 0
  fi
  if command -v npm >/dev/null 2>&1; then
    echo "WARNING: Không tìm thấy pnpm — dùng npm. apps/api có predev gọi pnpm db:generate; nên cài pnpm (xem docs/Cách làm việc.md)." >&2
    printf '%s' "$(command -v npm)"
    return 0
  fi
  return 1
}

write_launcher() {
  local path=$1
  local dir=$2
  local port_var=$3

  {
    echo '#!/usr/bin/env bash'
    echo 'set -euo pipefail'
    printf 'export PATH=%q\n' "$PATH"
    printf 'cd %q\n' "$dir"
    echo 'export CHOKIDAR_USEPOLLING=true'
    if [[ -n "$port_var" ]]; then
      echo "export PORT=$port_var"
    fi
    printf 'exec %q run dev\n' "$PM"
  } >"$path"
  chmod +x "$path"
}

open_terminal_script() {
  local script_path=$1
  osascript <<APPLESCRIPT 2>/dev/null
tell application "Terminal"
    activate
    do script "exec bash " & quoted form of "$script_path"
end tell
APPLESCRIPT
}

run_in_current_terminal() {
  echo ""
  echo "Không mở được Terminal.app (hoặc bị chặn Automation). Chạy song song tại đây — Ctrl+C dừng cả hai."
  trap 'for j in $(jobs -p); do kill "$j" 2>/dev/null || true; done; exit 130' INT
  (
    cd "$REPO_ROOT/apps/api" || exit 1
    export CHOKIDAR_USEPOLLING=true
    exec "$PM" run dev
  ) &
  sleep 3
  (
    cd "$REPO_ROOT/apps/web" || exit 1
    export CHOKIDAR_USEPOLLING=true
    export PORT="$FE_PORT"
    exec "$PM" run dev
  ) &
  wait
}

bootstrap_runtime_path

echo ""
echo "========================================"
echo "   UNICORNS EDU 5.0 - START SERVER"
echo "========================================"
echo ""

kill_next_web
kill_port "$FE_PORT"
kill_port "$BE_PORT"

LOCK_FILE="$REPO_ROOT/apps/web/.next/dev/lock"
if [[ -f "$LOCK_FILE" ]]; then
  rm -f "$LOCK_FILE" 2>/dev/null || true
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Không tìm thấy lệnh node trong PATH (Terminal.app thường không đọc ~/.zshrc)."
  echo "  • Cài Node: https://nodejs.org/ hoặc Homebrew: brew install node"
  echo "  • Hoặc thêm vào ~/.zprofile: export PATH=\"/opt/homebrew/bin:\$PATH\""
  exit 1
fi

PM="$(pick_package_runner)" || {
  echo "ERROR: Không tìm thấy pnpm hoặc npm."
  exit 1
}

if [[ ! -d "$REPO_ROOT/apps/api" ]]; then
  echo "ERROR: Không tìm thấy thư mục apps/api"
  exit 1
fi

if [[ ! -d "$REPO_ROOT/apps/web" ]]; then
  echo "ERROR: Không tìm thấy thư mục apps/web"
  exit 1
fi

echo "Đang kiểm tra dependencies..."
echo ""

if [[ ! -d "$REPO_ROOT/apps/api/node_modules" ]]; then
  echo "WARNING: API chưa có node_modules. Đang cài đặt..."
  (cd "$REPO_ROOT/apps/api" && "$PM" install)
  echo "OK: API dependencies đã cài xong"
  echo ""
fi

if [[ ! -d "$REPO_ROOT/apps/web/node_modules/next" ]]; then
  echo "WARNING: Web chưa có đủ node_modules hoặc thiếu next. Đang cài đặt..."
  if ! (cd "$REPO_ROOT/apps/web" && "$PM" install); then
    echo ""
    echo "LỖI: ${PM} install thất bại. Thử: ${PM} store prune hoặc xóa node_modules rồi cài lại."
    exit 1
  fi
  echo "OK: Web dependencies đã cài xong"
  echo ""
fi

if [[ ! -f "$REPO_ROOT/apps/api/.env" ]]; then
  echo "WARNING: Chưa có file apps/api/.env"
  echo "  Tạo file .env với DATABASE_URL và các biến cần thiết"
  echo ""
fi

echo "========================================"
echo "   ĐANG KHỞI ĐỘNG SERVERS..."
echo "========================================"
echo ""

API_LAUNCHER="/tmp/unicorns-edu-api-dev-$$.sh"
WEB_LAUNCHER="/tmp/unicorns-edu-web-dev-$$.sh"
write_launcher "$API_LAUNCHER" "$REPO_ROOT/apps/api" ""
write_launcher "$WEB_LAUNCHER" "$REPO_ROOT/apps/web" "$FE_PORT"

echo "Khởi động API (NestJS — port $BE_PORT hoặc PORT trong apps/api/.env, tự tải khi sửa code)..."
if ! open_terminal_script "$API_LAUNCHER"; then
  echo "WARN: Mở Terminal.app cho API thất bại."
  run_in_current_terminal
  exit 0
fi
sleep 3
echo "Khởi động Web (Next.js — port $FE_PORT, tự tải khi sửa code)..."
if ! open_terminal_script "$WEB_LAUNCHER"; then
  echo ""
  echo "WARN: Không mở được cửa sổ Terminal cho Web. Chạy tay trong một terminal khác:"
  echo "  bash $(printf '%q' "$WEB_LAUNCHER")"
  echo ""
fi

echo ""
echo "========================================"
echo "   SERVERS ĐÃ KHỞI ĐỘNG"
echo "========================================"
echo ""
echo "  API:  http://localhost:${BE_PORT}  (hoặc PORT trong apps/api/.env)"
echo "  Web:  http://localhost:${FE_PORT}"
echo ""
echo "Hai cửa sổ Terminal đang chạy dev. Script này đã thoát."
echo ""
echo "Launcher tạm (có thể xóa sau):"
echo "  $API_LAUNCHER"
echo "  $WEB_LAUNCHER"
echo ""
