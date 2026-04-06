# VPS Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerise the NestJS API and Next.js frontend, configure Nginx as a reverse proxy with TLS, and wire up a GitHub Actions CI/CD pipeline that builds, pushes, and deploys on every push to `main`.

**Architecture:** Two Docker containers (`api` on port 4000, `web` on port 3000) sit behind an Nginx reverse proxy that terminates TLS and routes `/api/*` to the API (stripping the prefix) and `/*` to the frontend. Images are built in GitHub Actions, pushed to ghcr.io, then pulled on the VPS via SSH. Managed PostgreSQL lives outside the VPS; the `DATABASE_URL` is injected at runtime from `/opt/unicorns-edu/.env`.

**Tech Stack:** Docker (multi-stage builds), pnpm workspaces, Turborepo, NestJS 10, Next.js 15, Prisma 7, Nginx, Certbot, GitHub Actions, ghcr.io

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/web/next.config.ts` | Enable standalone output for lean Docker image |
| Create | `apps/api/Dockerfile` | Multi-stage build for NestJS API |
| Create | `apps/web/Dockerfile` | Multi-stage build for Next.js frontend |
| Create | `docker-compose.prod.yml` | Orchestrate api + web + nginx on VPS |
| Create | `nginx/nginx.conf` | Base Nginx configuration |
| Create | `nginx/conf.d/app.conf` | Reverse proxy routing rules |
| Create | `.github/workflows/deploy.yml` | CI/CD: build → push → deploy |
| Create | `.env.production.example` | Document all required VPS env vars |

---

## Task 1: Enable Next.js Standalone Output

**Files:**
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Add standalone output config**

```ts
// apps/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 2: Verify the build produces a standalone folder**

```bash
cd apps/web && pnpm build
```

Expected: `.next/standalone/` directory is created containing `server.js` and a `node_modules/` folder.

- [ ] **Step 3: Commit**

```bash
git add apps/web/next.config.ts
git commit -m "feat(web): enable Next.js standalone output for Docker"
```

---

## Task 2: Create API Dockerfile

**Files:**
- Create: `apps/api/Dockerfile`

**Key constraints:**
- Prisma 7 uses the `prisma-client` generator; `prisma generate` must run during build
- Prisma schema is at `prisma/schema/` (multi-file); generate command: `prisma generate --schema=./prisma/schema/`
- Prisma client output is at `apps/api/generated/` (from schema: `output = "../../generated/"`)
- `pnpm deploy --filter api --prod /deploy/api` creates a clean production `node_modules`

- [ ] **Step 1: Create the Dockerfile**

```dockerfile
# apps/api/Dockerfile
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Install all deps (including devDeps for build) ─────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile

# ── Build ──────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
# Generate Prisma client into apps/api/generated/
RUN pnpm --filter api run db:generate
# Compile TypeScript
RUN pnpm --filter api run build

# ── Prune to production deps only ─────────────────────────────────────────────
FROM base AS pruner
WORKDIR /app
COPY --from=builder /app .
RUN pnpm deploy --filter api --prod /deploy/api

# ── Final image ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Production node_modules (no devDeps)
COPY --from=pruner /deploy/api/node_modules ./node_modules
# Compiled JS
COPY --from=builder /app/apps/api/dist ./dist
# Prisma generated client
COPY --from=builder /app/apps/api/generated ./generated
# Migrations (needed for prisma migrate deploy at runtime)
COPY --from=builder /app/apps/api/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/main"]
```

- [ ] **Step 2: Build the image locally to verify**

```bash
docker build -f apps/api/Dockerfile -t unicorns-api:test .
```

Expected: image builds with no errors, final stage is `production`.

- [ ] **Step 3: Smoke-test the image**

```bash
docker run --rm -e DATABASE_URL="postgresql://x:x@localhost/x" \
  -e PORT=4000 \
  -e FRONTEND_URL="http://localhost:3000" \
  -e JWT_ACCESS_SECRET="test" \
  -e JWT_REFRESH_SECRET="test" \
  -e JWT_EMAIL_VERIFY_SECRET="test" \
  -e JWT_FORGOT_PASSWORD_SECRET="test" \
  -p 4000:4000 unicorns-api:test
```

Expected: Container starts and logs `Nest application successfully started` (may error on DB connection — that's fine at this stage).

- [ ] **Step 4: Commit**

```bash
git add apps/api/Dockerfile
git commit -m "feat(api): add multi-stage production Dockerfile"
```

---

## Task 3: Create Web Dockerfile

**Files:**
- Create: `apps/web/Dockerfile`

**Key constraint:** Next.js standalone output places the entry point at `apps/web/server.js` within the standalone folder (mirrors the monorepo path). Static assets must be copied separately.

- [ ] **Step 1: Create the Dockerfile**

```dockerfile
# apps/web/Dockerfile
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Install deps ───────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile

# ── Build ──────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_BACKEND_URL must be passed at build time so it is inlined
# into client-side bundles. Pass via --build-arg in docker-compose / CI.
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
RUN pnpm --filter web run build

# ── Final image ────────────────────────────────────────────────────────────────
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Standalone output (includes its own node_modules)
COPY --from=builder /app/apps/web/.next/standalone ./
# Static assets (CSS, JS chunks — not included in standalone)
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# Public assets
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 2: Build the image locally to verify**

```bash
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_BACKEND_URL=https://yourdomain.com/api \
  -t unicorns-web:test .
```

Expected: image builds with no errors, `.next/standalone` folder is used in the final stage.

- [ ] **Step 3: Smoke-test the image**

```bash
docker run --rm -p 3000:3000 unicorns-web:test
```

Expected: Container starts and Next.js server listens on port 3000.

- [ ] **Step 4: Commit**

```bash
git add apps/web/Dockerfile
git commit -m "feat(web): add multi-stage production Dockerfile"
```

---

## Task 4: Create docker-compose.prod.yml

**Files:**
- Create: `docker-compose.prod.yml`

**Note:** This file is used **on the VPS** (`/opt/unicorns-edu/docker-compose.prod.yml`). Images are pulled from ghcr.io — they are not built on the VPS. Replace `<YOUR_GITHUB_ORG>` with your GitHub username or org (e.g. `SunnyYeahBoiii`).

- [ ] **Step 1: Create the file**

```yaml
# docker-compose.prod.yml
services:
  api:
    image: ghcr.io/<YOUR_GITHUB_ORG>/unicorns-api:latest
    restart: unless-stopped
    env_file: .env
    expose:
      - "4000"
    networks:
      - app-net
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - fetch('http://127.0.0.1:4000/').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 20s

  web:
    image: ghcr.io/<YOUR_GITHUB_ORG>/unicorns-web:latest
    restart: unless-stopped
    env_file: .env
    expose:
      - "3000"
    networks:
      - app-net
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - fetch('http://127.0.0.1:3000/api/healthcheck').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 30s

  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/lib/letsencrypt:/var/lib/letsencrypt:ro
    depends_on:
      api:
        condition: service_healthy
        restart: true
      web:
        condition: service_healthy
        restart: true
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
```

- [ ] **Step 2: Validate compose file syntax**

```bash
docker compose -f docker-compose.prod.yml config
```

Expected: Prints the resolved compose configuration with no errors.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "feat: add production Docker Compose configuration"
```

---

## Task 5: Create Nginx Configuration

**Files:**
- Create: `nginx/nginx.conf`
- Create: `nginx/conf.d/app.conf`

**Routing logic:**
- `/socket.io/*` → `api:4000/socket.io/*` (WebSocket, no prefix strip)
- `/api/` → `api:4000/` (strip `/api` prefix via trailing slash in `proxy_pass`)
- `/` → `web:3000/`

**Important:** `app.conf` starts as HTTP-only. Certbot will update it for HTTPS on first deploy.

- [ ] **Step 1: Create base nginx.conf**

```nginx
# nginx/nginx.conf
user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    resolver 127.0.0.11 valid=5s ipv6=off;
    resolver_timeout 5s;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    keepalive_timeout  65;

    gzip  on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript;

    include /etc/nginx/conf.d/*.conf;
}
```

- [ ] **Step 2: Create app.conf (HTTP only — Certbot will add HTTPS)**

```nginx
# nginx/conf.d/app.conf
# Docker Compose gives containers new IPs on recreate. Plain `upstream` blocks
# resolve hostnames only at nginx start, so use variable `proxy_pass` instead.

server {
    listen 80;
    server_name _;   # catch-all for IP access and domains that may be added later

    client_max_body_size 20m;

    # ── Socket.io WebSocket ──────────────────────────────────────────────────
    location /socket.io/ {
        set $upstream_api api;
        proxy_pass         http://$upstream_api:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host               $host;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto  $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # ── API (strip /api prefix) ──────────────────────────────────────────────
    location = /api {
        return 302 /api/;
    }

    # Trailing slash on proxy_pass strips the /api prefix before forwarding.
    # e.g.  GET /api/auth/login  →  api:4000/auth/login
    location /api/ {
        set $upstream_api api;
        proxy_pass         http://$upstream_api:4000/;
        proxy_http_version 1.1;
        proxy_set_header   Host               $host;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto  $scheme;
    }

    # ── Next.js frontend ─────────────────────────────────────────────────────
    location / {
        set $upstream_web web;
        proxy_pass         http://$upstream_web:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host               $host;
        proxy_set_header   X-Real-IP          $remote_addr;
        proxy_set_header   X-Forwarded-For    $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto  $scheme;
    }
}
```

- [ ] **Step 3: Replace `yourdomain.com` with your actual domain in app.conf**

Bạn có thể giữ `server_name _;` để accept cả IP trực tiếp lẫn domain. Nếu muốn pin về domain cụ thể sau khi TLS ổn định, thay lại ở bước hardening cuối.

- [ ] **Step 4: Validate nginx config via Docker**

```bash
docker run --rm \
  -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v $(pwd)/nginx/conf.d:/etc/nginx/conf.d:ro \
  nginx:1.27-alpine nginx -t
```

Expected:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

- [ ] **Step 5: Commit**

```bash
git add nginx/
git commit -m "feat: add Nginx reverse proxy configuration"
```

---

## Task 6: Create GitHub Actions CI/CD Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Required GitHub repository secrets** (set at Settings → Secrets and variables → Actions):

| Secret name | Value |
|-------------|-------|
| `VPS_HOST` | VPS IP or domain |
| `VPS_USER` | SSH user on VPS (e.g. `deploy`) |
| `VPS_SSH_KEY` | Full Ed25519 private key content (including header/footer lines) |

`GITHUB_TOKEN` is automatically available — no manual secret needed for ghcr.io push.

- [ ] **Step 1: Create the workflow file**

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  ORG: ${{ github.repository_owner }}

jobs:
  build-and-push:
    name: Build & push Docker images
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to ghcr.io
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/api/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.ORG }}/unicorns-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push Web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/web/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.ORG }}/unicorns-web:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NEXT_PUBLIC_BACKEND_URL=https://yourdomain.com/api

  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest
    needs: build-and-push

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            set -e
            cd /opt/unicorns-edu

            # Pull latest images
            docker compose -f docker-compose.prod.yml pull

            # Restart containers with new images
            docker compose -f docker-compose.prod.yml up -d --remove-orphans

            wait_for_healthy() {
              service="$1"
              container_id="$(docker compose -f docker-compose.prod.yml ps -q "$service")"

              if [ -z "$container_id" ]; then
                echo "No container found for service: $service"
                exit 1
              fi

              for attempt in $(seq 1 40); do
                status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id")"

                if [ "$status" = "healthy" ]; then
                  echo "Service $service is healthy"
                  return 0
                fi

                if [ "$status" = "unhealthy" ]; then
                  echo "Service $service is unhealthy"
                  docker compose -f docker-compose.prod.yml logs --tail=100 "$service"
                  exit 1
                fi

                sleep 3
              done

              echo "Timed out waiting for service: $service"
              docker compose -f docker-compose.prod.yml logs --tail=100 "$service"
              exit 1
            }

            wait_for_healthy api
            wait_for_healthy web

            docker compose -f docker-compose.prod.yml exec -T nginx nginx -t
            docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload

            # Run pending Prisma migrations
            docker compose -f docker-compose.prod.yml exec -T api \
              npx prisma migrate deploy --schema=./prisma/schema/

            # Remove dangling images to save disk space
            docker image prune -f
```

- [ ] **Step 2: Replace `yourdomain.com` in the `build-args` section with your real domain**

- [ ] **Step 3: Validate YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions CI/CD pipeline for VPS deployment"
```

---

## Task 7: Document Required VPS Environment Variables

**Files:**
- Create: `.env.production.example`

- [ ] **Step 1: Create the file**

```bash
# .env.production.example
# Copy this to /opt/unicorns-edu/.env on the VPS and fill in all values.
# NEVER commit the actual .env file.

# ── Database (Managed PostgreSQL) ────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# ── App URLs ─────────────────────────────────────────────────────────────────
PORT=4000
BACKEND_URL="https://yourdomain.com/api"
FRONTEND_URL="https://yourdomain.com"

# ── Reverse proxy ────────────────────────────────────────────────────────────
# Must be 1 when running behind Nginx so throttler sees real client IPs
TRUST_PROXY=1

# ── JWT Secrets (generate with: openssl rand -base64 64) ─────────────────────
JWT_ACCESS_SECRET=""
JWT_REFRESH_SECRET=""
JWT_EMAIL_VERIFY_SECRET=""
JWT_FORGOT_PASSWORD_SECRET=""

# ── Email / SMTP ─────────────────────────────────────────────────────────────
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_SECURE=false
MAIL_FROM="no-reply@yourdomain.com"

# ── Google OAuth ─────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="https://yourdomain.com/api/auth/google/callback"

# ── Rate limiting ────────────────────────────────────────────────────────────
THROTTLE_DEFAULT_LIMIT=300
THROTTLE_DEFAULT_TTL_MS=60000
THROTTLE_DEFAULT_BLOCK_DURATION_MS=60000

# ── Caching ──────────────────────────────────────────────────────────────────
DASHBOARD_CACHE_DEFAULT_TTL_SECONDS=60
AUTH_IDENTITY_CACHE_TTL_MS=5000
AUTH_IDENTITY_CACHE_MAX_ENTRIES=2000
```

- [ ] **Step 2: Commit**

```bash
git add .env.production.example
git commit -m "docs: add production environment variable reference"
```

---

## Task 8: VPS Bootstrap (One-Time Manual Steps)

These steps are run **once on the VPS** before the first CI/CD deploy. They are not automated.

- [ ] **Step 1: SSH into VPS and install Docker**

```bash
# On the VPS as root or sudo user
apt update && apt upgrade -y
apt install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

- [ ] **Step 2: Create deploy user**

```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
# Paste your CI/CD public key (matching VPS_SSH_KEY secret)
echo "ssh-ed25519 AAAA... your-ci-public-key" >> /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

- [ ] **Step 3: Create app directory and copy config files**

```bash
mkdir -p /opt/unicorns-edu/nginx/conf.d
chown -R deploy:deploy /opt/unicorns-edu

# Copy from your local machine:
scp docker-compose.prod.yml deploy@VPS_IP:/opt/unicorns-edu/
scp nginx/nginx.conf deploy@VPS_IP:/opt/unicorns-edu/nginx/
scp nginx/conf.d/app.conf deploy@VPS_IP:/opt/unicorns-edu/nginx/conf.d/
```

- [ ] **Step 4: Create the .env file on the VPS**

```bash
# On the VPS, as deploy user
cp /dev/stdin /opt/unicorns-edu/.env
# Paste the contents of .env.production.example with all real values filled in
# Press Ctrl+D when done
```

- [ ] **Step 5: Open firewall ports**

```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

- [ ] **Step 6: Install Certbot**

```bash
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot
```

- [ ] **Step 7: Run the first deploy (images must be pushed first via CI)**

```bash
# As deploy user
cd /opt/unicorns-edu
echo $CR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

- [ ] **Step 8: Issue TLS certificate with Certbot**

```bash
# Nginx must be running and port 80 must be open
certbot --nginx -d yourdomain.com
```

Expected: Certbot edits `app.conf` to add HTTPS, sets up auto-renewal cron. Site now available at `https://yourdomain.com`.

- [ ] **Step 9: Verify end-to-end**

```bash
curl https://yourdomain.com/api/health    # or any existing health endpoint
curl https://yourdomain.com              # should return Next.js HTML
```

---

## Spec Coverage Check

| Spec section | Covered by |
|-------------|-----------|
| Docker multi-stage API | Task 2 |
| Docker multi-stage Web + standalone | Tasks 1, 3 |
| docker-compose.prod.yml (3 services, no DB) | Task 4 |
| Nginx routing + WebSocket | Task 5 |
| Nginx TLS via Certbot | Task 8 |
| CI: build + push to ghcr.io | Task 6 |
| CI: SSH deploy + migrate | Task 6 |
| GitHub secrets | Task 6 |
| VPS env vars | Task 7 |
| VPS bootstrap | Task 8 |
