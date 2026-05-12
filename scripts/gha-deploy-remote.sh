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

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans

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

if command -v certbot >/dev/null 2>&1; then
  certbot renew --quiet
fi

docker compose -f docker-compose.prod.yml exec -T nginx nginx -t
docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload

trim_ws() { printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'; }

DEPLOY_HOST="$(trim_ws "${VPS_PUBLIC_HOST:-}")"
if [ -z "$DEPLOY_HOST" ] && [ -f .env ]; then
  line="$(grep -E '^[[:space:]]*VPS_PUBLIC_HOST=' .env | tail -n1 || true)"
  if [ -n "$line" ]; then
    val="${line#*=}"
    val="${val%%#*}"
    val="$(trim_ws "$val")"
    val="${val%\"}"
    val="${val#\"}"
    val="${val%\'}"
    val="${val#\'}"
    DEPLOY_HOST="$(trim_ws "$val")"
  fi
fi

if [ -n "$DEPLOY_HOST" ] && command -v curl >/dev/null 2>&1; then
  if ! curl -sfS --max-time 25 --resolve "${DEPLOY_HOST}:443:127.0.0.1" \
    "https://${DEPLOY_HOST}/api/" >/dev/null; then
    curl -sfS --http1.1 --max-time 25 --resolve "${DEPLOY_HOST}:443:127.0.0.1" \
      "https://${DEPLOY_HOST}/api/" >/dev/null
  fi
  echo "HTTPS OK for https://${DEPLOY_HOST}/api/"
else
  echo "Skipping HTTPS smoke test (set VPS_PUBLIC_HOST in GitHub Variables/Secrets and/or VPS .env)"
fi

docker image prune -f
