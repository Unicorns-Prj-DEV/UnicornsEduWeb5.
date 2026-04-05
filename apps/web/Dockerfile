# apps/web/Dockerfile
FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# ── Install deps ───────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
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

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Standalone output (includes its own node_modules)
COPY --from=builder /app/apps/web/.next/standalone ./
# Static assets (CSS, JS chunks — not included in standalone)
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# Public assets
COPY --from=builder /app/apps/web/public ./apps/web/public

RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/web/server.js"]
