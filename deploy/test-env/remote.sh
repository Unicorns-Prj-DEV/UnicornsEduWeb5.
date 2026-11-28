#!/usr/bin/env bash
# deploy/test-env/remote.sh — chạy TRÊN máy test env (`sunny`), từ checkout ~/UnicornsEdu.
# Thường không gọi trực tiếp: dùng deploy/test-env/test-env.sh từ Mac.
#
#   remote.sh bootstrap        data → env → creds → build → migrate → buckets → up → seed
#   remote.sh deploy           build → migrate → up (sau khi test-env.sh push code mới)
#   remote.sh seed             admin + mock data + ngân hàng câu hỏi (idempotent)
#   remote.sh reset --yes      XOÁ toàn bộ dữ liệu app (DB public + object storage + mail) rồi seed lại
#   remote.sh status | logs [svc] | down | creds
#
# Layout (giống prod, đổi /root → $HOME):
#   ~/uniedu-data        data stack (deploy/data-stack): chỉ chạy `db` + `storage-it`
#   ~/UnicornsEdu        repo + .env (compose project unicorns-it-test)
#   ~/.uniedu-test/      credentials admin/mock (chmod 600), ngoài repo
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DATA_DIR="${TEST_DATA_DIR:-$HOME/uniedu-data}"
STATE_DIR="$HOME/.uniedu-test"
CREDS_FILE="$STATE_DIR/credentials"
PUBLIC_URL="${TEST_PUBLIC_URL:-https://uni-test.sunnydev.qzz.io}"
TEMPLATE="$REPO_DIR/deploy/test-env/env.it.test.template"
BUCKETS_PRIVATE=(avatars achievements student-gallery class-covers question-audio question-images)
BUCKETS_PUBLIC=(avatars-public achievements-public student-gallery-public)

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

dc() {
  (cd "$REPO_DIR" && docker compose -f docker-compose.prod.yml -f deploy/test-env/docker-compose.test.yml "$@")
}
dc_data() { (cd "$DATA_DIR" && docker compose "$@"); }

env_value() { # env_value <file> <KEY> — đọc KEY=value, bỏ ngoặc kép
  sed -n "s/^$2=//p" "$1" | tail -1 | sed 's/^"\(.*\)"$/\1/'
}

http_port() { env_value "$REPO_DIR/.env" NGINX_PUBLISH | awk -F: '{print $(NF-1)}'; }

require_docker() {
  command -v docker >/dev/null || die "Chưa cài Docker (xem docs/ops/test-env-sunny.md § Yêu cầu)."
  docker info >/dev/null 2>&1 || die "Không gọi được Docker daemon (user chưa vào group docker? đăng nhập lại)."
  docker compose version >/dev/null 2>&1 || die "Thiếu docker compose v2 (gói docker-compose-v2)."
}

# ── Data stack ───────────────────────────────────────────────────────────────
cmd_data() {
  log "Data stack ở $DATA_DIR (db + storage-it)"
  mkdir -p "$DATA_DIR"
  # Đồng bộ file từ repo, không đụng .env/volumes/backups.
  cp "$REPO_DIR/deploy/data-stack/docker-compose.yml" "$REPO_DIR/deploy/data-stack/gen-env.sh" "$DATA_DIR/"
  rm -rf "$DATA_DIR/initdb" && cp -r "$REPO_DIR/deploy/data-stack/initdb" "$DATA_DIR/initdb"
  if [ ! -e "$DATA_DIR/.env" ]; then
    # Compose bắt buộc đủ biến của 4 instance; chỉ IT dùng thật, còn lại URL giữ chỗ.
    "$DATA_DIR/gen-env.sh" "$PUBLIC_URL" https://eng.test.invalid https://jp.test.invalid https://physics.test.invalid
  fi
  mkdir -p "$DATA_DIR/volumes/storage-it" "$DATA_DIR/backups"
  dc_data up -d --wait --wait-timeout 180 db storage-it
}

# ── .env instance ────────────────────────────────────────────────────────────
cmd_env() {
  local target="$REPO_DIR/.env"
  if [ -e "$target" ]; then
    log ".env đã có — giữ nguyên ($target)"
    return
  fi
  log "Sinh $target từ template"
  local db_pw service_key
  db_pw="$(env_value "$DATA_DIR/.env" IT_DB_PASSWORD)"
  service_key="$(env_value "$DATA_DIR/.env" IT_STORAGE_SERVICE_KEY)"
  [ -n "$db_pw" ] && [ -n "$service_key" ] || die "Thiếu IT_DB_PASSWORD / IT_STORAGE_SERVICE_KEY trong $DATA_DIR/.env"
  umask 077
  sed -e "s|__IT_DB_PASSWORD__|$db_pw|g" \
      -e "s|__IT_STORAGE_SERVICE_KEY__|$service_key|g" \
      -e "s|__PUBLIC_URL__|$PUBLIC_URL|g" \
      "$TEMPLATE" > "$target.tmp"
  # Mỗi __RAND_HEX__ một giá trị riêng (JWT secrets, webhook secret).
  while grep -q '__RAND_HEX__' "$target.tmp"; do
    sed -i "0,/__RAND_HEX__/s//$(openssl rand -hex 48)/" "$target.tmp"
  done
  mv "$target.tmp" "$target"
}

# ── Credentials admin + mock ─────────────────────────────────────────────────
cmd_creds() {
  if [ ! -e "$CREDS_FILE" ]; then
    mkdir -p "$STATE_DIR" && chmod 700 "$STATE_DIR"
    umask 077
    cat > "$CREDS_FILE" <<EOF
TEST_ADMIN_HANDLE=admin
TEST_ADMIN_EMAIL=admin@mock.uniedu.test
TEST_ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)
MOCK_PASSWORD=Mock-$(openssl rand -hex 4)
EOF
  fi
  [ "${1:-}" = "--quiet" ] && return
  echo "Credentials ($CREDS_FILE):"
  sed 's/^/  /' "$CREDS_FILE"
}

load_creds() {
  cmd_creds --quiet
  set -a; . "$CREDS_FILE"; set +a
}

# ── Build / migrate / up ─────────────────────────────────────────────────────
cmd_build() {
  log "Build image local (cùng Dockerfile prod; tuần tự để đỡ RAM)"
  dc build api
  dc build web
  dc --profile tools build seed-tools
}

cmd_migrate() {
  log "prisma migrate deploy (y hệt CD)"
  dc run --rm --no-deps -T api \
    env NODE_OPTIONS=--max-old-space-size=384 \
    sh -c 'if [ -n "${DIRECT_URL:-}" ]; then export DATABASE_URL="$DIRECT_URL"; fi; ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema/' </dev/null
  dc run --rm --no-deps -T api ./node_modules/.bin/prisma generate --schema=./prisma/schema/ </dev/null >/dev/null
}

storage_call() { # storage_call <method> <path> [json] — gọi thẳng storage-it (loopback)
  local key; key="$(env_value "$DATA_DIR/.env" IT_STORAGE_SERVICE_KEY)"
  curl -sS -o /dev/null -w '%{http_code}' -X "$1" "http://127.0.0.1:55001$2" \
    -H "Authorization: Bearer $key" -H 'Content-Type: application/json' ${3:+-d "$3"}
}

cmd_buckets() {
  log "Tạo bucket storage (API không tự tạo)"
  local b code
  for b in "${BUCKETS_PRIVATE[@]}" "${BUCKETS_PUBLIC[@]}"; do
    local public=false
    [[ "$b" == *-public ]] && public=true
    code="$(storage_call POST /bucket "{\"id\":\"$b\",\"name\":\"$b\",\"public\":$public}")"
    case "$code" in
      200) echo "  + $b (public=$public)" ;;
      400|409) echo "  = $b (đã có)" ;;
      *) die "Tạo bucket $b lỗi HTTP $code" ;;
    esac
  done
}

wait_http() { # wait_http <service> <url> — giống wait_for_http của CD
  local i
  for i in $(seq 1 90); do
    if dc exec -T "$1" sh -c 'node -e "fetch(process.argv[1]).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" "$0" 2>/dev/null || wget -q -O /dev/null "$0"' "$2" </dev/null; then
      echo "  $1 OK: $2"; return 0
    fi
    sleep 2
  done
  dc logs --tail=80 "$1"; die "Hết giờ chờ $1 ($2)"
}

cmd_up() {
  log "Khởi động app (thứ tự như CD: api → web → nginx)"
  dc up -d --no-deps mailpit
  dc up -d --no-deps --force-recreate api
  wait_http api http://127.0.0.1:4000/
  dc up -d --no-deps --force-recreate web
  wait_http web http://127.0.0.1:3000/api/healthcheck
  dc up -d --no-deps --force-recreate --remove-orphans nginx
  dc exec -T nginx nginx -t </dev/null
  dc exec -T nginx nginx -s reload </dev/null
  wait_http nginx http://127.0.0.1/nginx-health
  wait_http nginx http://127.0.0.1/api/
  echo "  Loopback cho cloudflared: http://localhost:$(http_port)"
}

# ── Seed ─────────────────────────────────────────────────────────────────────
cmd_seed() {
  load_creds
  log "Admin"
  dc run --rm --no-deps -T -e TEST_ADMIN_HANDLE -e TEST_ADMIN_EMAIL -e TEST_ADMIN_PASSWORD \
    api node /app/test-seed/bootstrap-admin.mjs </dev/null
  log "Mock data (qua HTTP API, đi nginx)"
  dc run --rm --no-deps -T -e SEED_BASE_URL=http://nginx/api \
    -e TEST_ADMIN_HANDLE -e TEST_ADMIN_PASSWORD -e MOCK_PASSWORD \
    api node /app/test-seed/seed-mock.mjs </dev/null
  log "Ngân hàng câu hỏi (apps/api/scripts/seed-question-bank.ts --apply)"
  dc --profile tools run --rm --no-deps -T seed-tools \
    ./node_modules/.bin/tsx scripts/seed-question-bank.ts --apply </dev/null
}

cmd_reset() {
  [ "${1:-}" = "--yes" ] || die "reset xoá TOÀN BỘ dữ liệu test env. Chạy lại với: remote.sh reset --yes"
  log "Dừng api/web (ngắt kết nối DB)"
  dc stop api web nginx || true
  log "Xoá object trong bucket"
  local b
  for b in "${BUCKETS_PRIVATE[@]}" "${BUCKETS_PUBLIC[@]}"; do
    echo "  $b: HTTP $(storage_call POST "/bucket/$b/empty")"
  done
  log "Drop + tạo lại schema public của uniedu_it (schema storage giữ nguyên)"
  dc_data exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d uniedu_it <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public AUTHORIZATION pg_database_owner;
GRANT USAGE ON SCHEMA public TO PUBLIC;
SQL
  log "Xoá mail trong Mailpit"
  curl -fsS -o /dev/null -X DELETE "http://127.0.0.1:$(env_value "$REPO_DIR/.env" MAILPIT_UI_PORT)/api/v1/messages" \
    || echo "  (Mailpit chưa chạy — bỏ qua)"
  cmd_migrate
  cmd_up
  cmd_seed
}

cmd_status() {
  dc ps
  local port; port="$(http_port)"
  echo
  printf 'nginx-health: '; curl -fsS "http://127.0.0.1:$port/nginx-health" || echo FAIL
  printf 'app-config  : '; curl -fsS "http://127.0.0.1:$port/api/public/app-config" || echo FAIL
  echo
  printf 'public      : '; curl -sS -o /dev/null -w '%{http_code}\n' --max-time 10 "$PUBLIC_URL/nginx-health" || true
  [ -f "$STATE_DIR/version" ] && echo "code        : $(cat "$STATE_DIR/version")"
  return 0
}

main() {
  local cmd="${1:-}"; shift || true
  case "$cmd" in
    bootstrap) require_docker; cmd_data; cmd_env; cmd_creds --quiet; cmd_build; cmd_migrate; cmd_buckets; cmd_up; cmd_seed; cmd_creds ;;
    deploy)    require_docker; cmd_build; cmd_migrate; cmd_up ;;
    data)      require_docker; cmd_data ;;
    env)       cmd_env ;;
    creds)     cmd_creds ;;
    build)     require_docker; cmd_build ;;
    migrate)   require_docker; cmd_migrate ;;
    buckets)   cmd_buckets ;;
    up)        require_docker; cmd_up ;;
    seed)      require_docker; cmd_seed ;;
    reset)     require_docker; cmd_reset "$@" ;;
    status)    cmd_status ;;
    logs)      dc logs --tail="${TAIL:-200}" "$@" ;;
    down)      dc stop ;;
    *) sed -n '2,15p' "$0"; exit 1 ;;
  esac
}

main "$@"
