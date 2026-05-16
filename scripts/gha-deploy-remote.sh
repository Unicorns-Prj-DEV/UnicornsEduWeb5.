#!/usr/bin/env bash
# Remote commands for GitHub Actions deploy (VPS). Sourced via stdin by ssh / appleboy.
set -euo pipefail
cd /root/UnicornsEdu

git fetch --prune origin main
git checkout main
git pull --ff-only origin main

export COMPOSE_PARALLEL_LIMIT=1

if [ -z "${GHCR_TOKEN:-}" ]; then
  echo "Missing GHCR_TOKEN: VPS cannot pull private images from ghcr.io. Add repo secret GHCR_TOKEN (PAT with read:packages)."
  exit 1
fi
if [ -z "${GHCR_USERNAME:-}" ]; then
  echo "Missing GHCR_USERNAME: set repo secret or variable GHCR_USERNAME (GitHub username that owns the PAT)."
  exit 1
fi

printf '%s' "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin

# Docker Hub (nginx) can hit transient TLS timeouts from small VPS / busy networks.
compose_pull_with_retry() {
  local max="${COMPOSE_PULL_RETRIES:-5}"
  local attempt=1
  while [ "$attempt" -le "$max" ]; do
    if docker compose -f docker-compose.prod.yml pull; then
      return 0
    fi
    if [ "$attempt" -eq "$max" ]; then
      echo "docker compose pull failed after ${max} attempt(s)."
      return 1
    fi
    local wait=$((attempt * 15))
    echo "docker compose pull failed (attempt ${attempt}/${max}), retrying in ${wait}s..."
    sleep "$wait"
    attempt=$((attempt + 1))
  done
}
compose_pull_with_retry

echo "Applying database migrations..."
docker compose -f docker-compose.prod.yml run --rm --no-deps api \
  ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema/

docker compose -f docker-compose.prod.yml up -d --force-recreate --remove-orphans

wait_for_http() {
  service="$1"
  url="$2"

  for attempt in $(seq 1 60); do
    if docker compose -f docker-compose.prod.yml exec -T "$service" \
      node -e "fetch(process.argv[1]).then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))" \
      "$url"; then
      echo "Service $service is ready at $url"
      return 0
    fi

    sleep 3
  done

  echo "Timed out waiting for service: $service ($url)"
  docker compose -f docker-compose.prod.yml ps
  docker compose -f docker-compose.prod.yml logs --tail=100 "$service"
  container_id="$(docker compose -f docker-compose.prod.yml ps -q "$service")"
  if [ -n "$container_id" ]; then
    docker inspect --format '{{json .State.Health}}' "$container_id" || true
  fi
  exit 1
}

wait_for_http api http://127.0.0.1:4000/
wait_for_http web http://127.0.0.1:3000/api/healthcheck

docker compose -f docker-compose.prod.yml exec -T nginx nginx -t
docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload

wait_for_http nginx http://127.0.0.1/nginx-health
wait_for_http nginx http://127.0.0.1/api/
echo "Local nginx OK for cloudflared tunnel: http://127.0.0.1:80"

docker image prune -f
