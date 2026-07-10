#!/usr/bin/env bash
# Resolve migrate DATABASE_URL (Supavisor session / DIRECT_URL) and run prisma migrate deploy.
# Runtime API keeps using pooled DATABASE_URL via PrismaService — only this script swaps URL.
set -euo pipefail

is_ipv6_direct_supabase() {
  printf '%s' "$1" | grep -qE '@db\.[^/]+\.supabase\.co'
}

derive_supavisor_session_url() {
  local url="$1"
  url=$(printf '%s' "$url" | sed -E 's/:6543\//:5432\//')
  url=$(printf '%s' "$url" | sed -E 's/\?pgbouncer=true(&|$)/?/; s/&pgbouncer=true//')
  url=$(printf '%s' "$url" | sed -E 's/\?$//')
  printf '%s' "$url"
}

resolve_migrate_database_url() {
  local direct="${DIRECT_URL:-}"
  local pooled="${DATABASE_URL:-}"

  if [ -n "$direct" ] && ! is_ipv6_direct_supabase "$direct"; then
    printf '%s' "$direct"
    return 0
  fi

  if [ -n "$direct" ] && is_ipv6_direct_supabase "$direct"; then
    echo "WARN: DIRECT_URL uses db.*.supabase.co (IPv6-only). Deriving Supavisor session URL from DATABASE_URL instead." >&2
  elif printf '%s' "$pooled" | grep -qE 'pgbouncer=true|:6543/'; then
    echo "INFO: Using Supavisor session migrate URL derived from DATABASE_URL (:6543 -> :5432)." >&2
  fi

  if printf '%s' "$pooled" | grep -qE 'pgbouncer=true|:6543/'; then
    derive_supavisor_session_url "$pooled"
    return 0
  fi

  if [ -n "$direct" ]; then
    printf '%s' "$direct"
    return 0
  fi

  printf '%s' "$pooled"
}

mask_database_url() {
  printf '%s' "$1" | sed -E 's#(://[^:@/]+:)[^@]+#\1***#g'
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d /app ] && [ -f /app/prisma.config.ts ]; then
  API_DIR="/app"
else
  API_DIR="$(cd "${SCRIPT_DIR}/../apps/api" && pwd)"
fi
cd "${API_DIR}"

MIGRATE_URL="$(resolve_migrate_database_url)"
if [ -z "${MIGRATE_URL}" ]; then
  echo "DATABASE_URL is required for prisma migrate deploy" >&2
  exit 1
fi

export DATABASE_URL="${MIGRATE_URL}"
echo "Migrate datasource: $(mask_database_url "${MIGRATE_URL}")"

exec ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema/
