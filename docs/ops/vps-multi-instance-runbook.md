# Runbook: Multi-instance VPS (IT + ENG trên cùng máy)

Triển khai **hai bản UnicornsEduWeb5** độc lập trên **một VPS**: **IT** và **ENG** (Tiếng Anh). Mỗi instance có database riêng, domain Cloudflare riêng, cổng loopback Nginx riêng; **dùng chung image `unicorns-api:latest` và `unicorns-web:latest`**. Web gọi API qua same-origin `/api` nên một web image phục vụ cả hai domain.

## Tổng quan kiến trúc

```
GitHub push main
    │
    ├─ build-api  ──► unicorns-api:latest
    ├─ build-web  ──► unicorns-web:latest  (NEXT_PUBLIC_BACKEND_URL=/api)
    └─ deploy     ──► SSH: it → eng (tuần tự)
```

| Instance | Thư mục VPS | Compose project | Nginx loopback | Domain ví dụ |
|----------|-------------|-----------------|----------------|--------------|
| `it` | `/root/UnicornsEdu` | `unicorns-it` | `127.0.0.1:80` | `it.unicornsedu.com` |
| `eng` | `/root/UnicornsEduEng` | `unicorns-eng` | `127.0.0.1:8080` | `eng.unicornsedu.com` |

**Khác nhau giữa IT và ENG:** chỉ `.env` runtime (DB, `FRONTEND_URL`, `BACKEND_URL`, JWT, SePay, …) — **không** build web image riêng.

Registry: [`deploy/instances.json`](../../deploy/instances.json). Tắt ENG tạm thời: `"enabled": false`.

---

## Phần A — GitHub (một lần)

| Secret / variable | Mô tả |
|-------------------|--------|
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | SSH VPS |
| `GHCR_USERNAME`, `GHCR_TOKEN` | Pull GHCR trên VPS |

**Không cần** `NEXT_PUBLIC_BACKEND_URL_ENG` hay `DEPLOY_ENG_ENABLED` — web build một lần với `/api`.

Bật deploy ENG: bootstrap VPS (Phần B) → `"enabled": true` cho `eng` trong `deploy/instances.json`.

---

## Phần B — Bootstrap instance `eng` trên VPS

### B1. `jq`

```bash
apt update && apt install -y jq
```

### B2. Clone

```bash
git clone https://github.com/unicorns-prj-dev/UnicornsEduWeb5.git /root/UnicornsEduEng
cd /root/UnicornsEduEng && git checkout main
```

### B3. `.env`

```bash
cp /root/UnicornsEduEng/.env.production.eng.example /root/UnicornsEduEng/.env
nano /root/UnicornsEduEng/.env
```

Bắt buộc khác IT: `DATABASE_URL`, `JWT_*`, `FRONTEND_URL`, `BACKEND_URL`, `GOOGLE_CALLBACK_URL`.

```env
COMPOSE_PROJECT_NAME=unicorns-eng
NGINX_PUBLISH=127.0.0.1:8080:80
```

### B4. Migration DB ENG

```bash
cd /root/UnicornsEduEng
pnpm --filter api db:deploy   # từ máy dev với DATABASE_URL ENG
# hoặc trong container api sau khi pull image
```

### B5. Cloudflared

```yaml
ingress:
  - hostname: it.unicornsedu.com
    service: http://127.0.0.1:80
  - hostname: eng.unicornsedu.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

### B6. Smoke test

```bash
cd /root/UnicornsEduEng
export COMPOSE_PROJECT_NAME=unicorns-eng NGINX_PUBLISH=127.0.0.1:8080:80
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
curl -fsS http://127.0.0.1:8080/nginx-health
curl -fsS https://eng.unicornsedu.com/api/
```

---

## Phần C — Cập nhật instance IT (một lần)

Thêm vào `/root/UnicornsEdu/.env`:

```env
COMPOSE_PROJECT_NAME=unicorns-it
NGINX_PUBLISH=127.0.0.1:80:80
```

```bash
cd /root/UnicornsEdu && git pull --ff-only origin main
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

---

## Phần D — CD tự động

Push `main` → build **một** web image → deploy tuần tự `it` rồi `eng` (nếu enabled).

Migration: chạy tay **từng DB** (`pnpm --filter api db:deploy` hoặc `prisma migrate deploy` trong container) — CD không auto-migrate.

---

## Checklist

- [ ] DB Supabase riêng cho ENG
- [ ] Clone `/root/UnicornsEduEng` + `.env`
- [ ] Migrate DB ENG
- [ ] Cloudflared `eng.*` → `:8080`
- [ ] `jq` trên VPS
- [ ] `"enabled": true` cho `eng`
- [ ] Push `main` → verify cả hai domain

---

## Tài liệu liên quan

- [`docs/Cách làm việc.md`](../Cách%20làm%20việc.md)
- [`deploy/instances.json`](../../deploy/instances.json)
- [`.env.production.example`](../../.env.production.example) · [`.env.production.eng.example`](../../.env.production.eng.example)
