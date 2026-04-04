# apps/api/Dockerfile
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# ── Install all deps (including devDeps for build) ─────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
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
FROM node:20-alpine AS production
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

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4000
CMD ["node", "dist/main"]
