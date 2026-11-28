#!/usr/bin/env bash
# deploy/test-env/test-env.sh — điều khiển test env IT trên máy `sunny` từ Mac (qua Tailscale).
#
#   test-env.sh bootstrap      push code + dựng toàn bộ (data stack, .env, build, migrate, seed)
#   test-env.sh deploy         push code + build + migrate + restart (như CD prod)
#   test-env.sh push           chỉ đồng bộ code (snapshot working tree, gồm thay đổi chưa commit)
#   test-env.sh up | seed | status | creds | down | logs [svc]   (up: restart app, đọc lại .env)
#   test-env.sh reset --yes    XOÁ dữ liệu test env rồi seed lại mock data
#   test-env.sh mail           mở Mailpit UI: http://localhost:18025 (Ctrl-C để đóng)
#   test-env.sh ssh            shell trên sunny, đứng ở ~/UnicornsEdu
#
# Biến tuỳ chọn: TEST_SSH_TARGET (mặc định sunny@sunny), TEST_REMOTE_DIR (~/UnicornsEdu).
# Docs: docs/ops/test-env-sunny.md
set -euo pipefail

TARGET="${TEST_SSH_TARGET:-sunny@sunny}"
REMOTE_DIR="${TEST_REMOTE_DIR:-UnicornsEdu}" # tương đối $HOME phía remote
SNAPSHOT_REF="refs/test-env/snapshot"
MAIL_PORT="${TEST_MAIL_PORT:-18025}"

REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# ssh thường đi qua `tailscale nc` (Tailscale SSH lo xác thực) — cần cho port forward,
# thứ `tailscale ssh` không nhận.
rsh() {
  ssh -o ProxyCommand='tailscale nc %h %p' -o StrictHostKeyChecking=accept-new \
    -o ServerAliveInterval=30 "$TARGET" "$@"
}

log() { printf '\n\033[1;35m[test-env] %s\033[0m\n' "$*"; }

# Snapshot working tree thành commit tạm (index tạm → không đụng staging/branch của bạn).
# File gitignored (.env, node_modules, …) không đi theo.
make_snapshot() {
  local idx tree head
  idx="$(mktemp)"
  cp "$(git rev-parse --git-path index)" "$idx"
  GIT_INDEX_FILE="$idx" git add -A
  tree="$(GIT_INDEX_FILE="$idx" git write-tree)"
  rm -f "$idx"
  head="$(git rev-parse HEAD)"
  if [ "$tree" = "$(git rev-parse 'HEAD^{tree}')" ]; then
    SNAPSHOT_SHA="$head"
    SNAPSHOT_LABEL="$(git rev-parse --abbrev-ref HEAD)@$(git rev-parse --short HEAD)"
  else
    SNAPSHOT_SHA="$(git commit-tree "$tree" -p "$head" -m "test-env snapshot of working tree on $(git rev-parse --short HEAD)")"
    SNAPSHOT_LABEL="$(git rev-parse --abbrev-ref HEAD)@$(git rev-parse --short HEAD)+dirty"
  fi
  git update-ref "$SNAPSHOT_REF" "$SNAPSHOT_SHA"
}

cmd_push() {
  make_snapshot
  log "Push $SNAPSHOT_LABEL ($SNAPSHOT_SHA) → $TARGET:~/$REMOTE_DIR"
  local remote_head bundle range=("$SNAPSHOT_REF")
  remote_head="$(rsh "git -C ~/$REMOTE_DIR rev-parse HEAD 2>/dev/null || true")"
  if [ "$remote_head" = "$SNAPSHOT_SHA" ]; then
    echo "Remote đã ở đúng snapshot — bỏ qua."
    return
  fi
  # Bundle tăng dần nếu remote đang ở commit Mac biết.
  if [ -n "$remote_head" ] && git cat-file -e "${remote_head}^{commit}" 2>/dev/null; then
    range+=("^$remote_head")
  fi
  local tmpdir; tmpdir="$(mktemp -d)"
  bundle="$tmpdir/push.bundle"
  git bundle create -q "$bundle" "${range[@]}"
  echo "Bundle $(du -h "$bundle" | cut -f1)"
  rsh 'mkdir -p ~/.uniedu-test && chmod 700 ~/.uniedu-test && cat > ~/.uniedu-test/push.bundle' < "$bundle"
  rm -rf "$tmpdir"
  rsh "set -e
    B=~/.uniedu-test/push.bundle
    if [ ! -d ~/$REMOTE_DIR/.git ]; then
      [ ! -e ~/$REMOTE_DIR ] || { echo '~/$REMOTE_DIR tồn tại nhưng không phải git repo' >&2; exit 1; }
      git init -q ~/$REMOTE_DIR
    fi
    cd ~/$REMOTE_DIR
    git fetch -q \"\$B\" $SNAPSHOT_REF
    git checkout -q --force --detach FETCH_HEAD
    git clean -fdq   # giữ file gitignored (.env)
    rm -f \"\$B\"
    chmod +x deploy/test-env/*.sh
    echo '$SNAPSHOT_LABEL $(date -u +%Y-%m-%dT%H:%M:%SZ)' > ~/.uniedu-test/version
    echo \"Remote HEAD: \$(git rev-parse --short HEAD)\""
}

remote() { rsh -t "cd ~/$REMOTE_DIR && deploy/test-env/remote.sh $*"; }

cmd_mail() {
  log "Mailpit UI: http://localhost:$MAIL_PORT  (Ctrl-C để đóng tunnel)"
  rsh -N -o ExitOnForwardFailure=yes -L "127.0.0.1:$MAIL_PORT:127.0.0.1:18025"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  push)      cmd_push ;;
  bootstrap) cmd_push; remote bootstrap ;;
  deploy)    cmd_push; remote deploy ;;
  up|seed|status|creds|down|logs|reset) remote "$cmd" "$@" ;;
  mail)      cmd_mail ;;
  ssh)       rsh -t "cd ~/$REMOTE_DIR 2>/dev/null; exec \$SHELL -l" ;;
  *) sed -n '2,13p' "$0"; exit 1 ;;
esac
