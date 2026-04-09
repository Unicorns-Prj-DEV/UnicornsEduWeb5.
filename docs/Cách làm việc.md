# Cách làm việc với Turborepo, Next.js và NestJS

## Tổng quan

Dự án sử dụng **Turborepo** để quản lý monorepo, kết hợp **pnpm workspaces** để quản lý dependencies. Trong monorepo có các ứng dụng:

| Ứng dụng | Đường dẫn | Framework | Mô tả |
|-----------|-----------|-----------|-------|
| `web` | `apps/web` | Next.js | Giao diện người dùng (Frontend) |
| `api` | `apps/api` | NestJS | Backend API (Auth, Learning, Finance, Lesson, …) |

## Cấu trúc thư mục (thực tế)

```
UnicornsEduWeb5./
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # App Router (routes, layout, pages)
│   │   │   ├── admin/          # /admin (dashboard, classes, students, …)
│   │   │   ├── auth/           # /auth/*
│   │   │   ├── landing-page/   # /landing-page
│   │   │   ├── api/            # Route handlers API (vd. healthcheck)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── lib/                # API client, utils
│   └── api/                    # NestJS backend
│       ├── src/                # modules, controllers, services
│       │   ├── auth/
│       │   ├── cache/          # dashboard_cache helpers (PostgreSQL-backed)
│       │   ├── action-history/ # audit log service cho create/update/delete
│       │   ├── prisma/
│       │   ├── session/        # session facade + create/update/delete/reporting workflows
│       │   ├── staff-ops/      # shared access rules for staff operations flows
│       │   └── …
│       ├── prisma/schema/      # Prisma schema
│       ├── generated/          # Prisma Client output
│       └── dtos/
├── packages/                   # Shared libs (hiện chỉ .gitkeep)
├── docs/                       # Tài liệu dự án
├── archived/                   # Bản lưu (vd. UniEdu-Web-3.9)
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── pnpm-lock.yaml
```

## Tech stack Frontend (`apps/web`)

Dùng làm context khi implement hoặc review code frontend; giúp model chọn đúng thư viện và pattern.

| Hạng mục | Công nghệ / Phiên bản | Ghi chú |
|----------|------------------------|---------|
| **Framework** | Next.js 16.x | App Router (thư mục `app/`). |
| **UI** | React 19.x | react, react-dom 19.2.x. |
| **Styling** | Tailwind CSS v4 | `@tailwindcss/postcss` trong `postcss.config.mjs`; trong `globals.css` dùng `@import "tailwindcss"`. |
| **Theme / Design tokens** | CSS variables | Trong `app/globals.css`: tokens theo `docs/UI-Schema.md` (--ue-bg-primary, --ue-text-primary, --ue-primary, …); chuyển theme bằng `[data-theme]` trên `<html>` (light / dark / pink). |
| **Fonts** | next/font/google | Geist (sans), Geist_Mono (mono); khai báo trong `app/layout.tsx`, dùng biến CSS `--font-geist-sans`, `--font-geist-mono`. |
| **Data fetching / API** | TanStack React Query v5, Axios | React Query cho server state; Axios instance trong `lib/client.ts` (baseURL từ env, withCredentials, xử lý refresh token, chuẩn hóa lỗi `429 Too Many Requests` để FE hiện toast rate-limit nhất quán). |
| **Validation / Transform** | Tùy chọn theo module | Không bắt buộc class-validator/class-transformer; chọn giải pháp phù hợp yêu cầu từng phần. |
| **TypeScript** | TS 5.x | Path alias `@/*` → `./*` (tsconfig.json). Target ES2017, moduleResolution bundler, strict. |
| **API base URL** | Biến môi trường | `NEXT_PUBLIC_BACKEND_URL`; nên set tường minh trong `apps/web/.env`. Frontend hiện có fallback `http://localhost:3001`, trong khi API listen ở `PORT` hoặc `4000` nếu không cấu hình. |

**Cấu trúc thư mục frontend:** `apps/web/app/` (routes, layout, page), `apps/web/lib/` (API client, utils). Component và style theo cấu trúc Next.js App Router; tokens và theme đã định nghĩa sẵn trong `globals.css`.

### Quy tắc BE-first cho frontend

- Frontend không được giữ logic nghiệp vụ mang tính authoritative.
- Không tự tính ở FE các giá trị ảnh hưởng dữ liệu lưu trữ hoặc số liệu chính thức như: tổng tiền, unpaid/paid summary, công thức học phí/trợ cấp, effective tuition/package, hoặc diff membership nhiều bản ghi.
- Không lấy list rộng rồi mới filter/search/classify bắt buộc ở FE nếu backend có thể và nên enforce; cần bổ sung query param hoặc endpoint ở BE.
- FE chỉ nên làm các biến đổi mang tính trình bày: format, label, UI-only sorting/filter cục bộ trên dữ liệu đã authoritative, state tạm trong form.
- Nếu một giá trị có thể làm thay đổi payload gửi đi, thay đổi quyền truy cập, hoặc xuất hiện như số liệu chính thức trên màn hình, hãy chuyển logic đó sang backend trước khi hoàn thiện FE.
- Với simple single-select dropdown trong `apps/web`, dùng component chung `apps/web/components/ui/UpgradedSelect.tsx` thay cho native `<select>`.
- Chỉ dùng custom combobox/listbox khác khi thật sự cần search, multi-select, async suggestion hoặc option content phức tạp hơn simple dropdown.

## Yêu cầu hệ thống

- **Node.js** >= 20
- **pnpm** >= 10 (dự án dùng `pnpm@10.27.0`)

## Cài đặt

**Cách 1 — Cài từ root (cả monorepo):**

```bash
git clone <repo-url>
cd UnicornsEduWeb5.
pnpm install
```

**Cách 2 — Cài trong từng app (chỉ app cần dùng):**

```bash
# Frontend
cd apps/web
pnpm i

# Backend (ví dụ api)
cd apps/api
pnpm i
```

Khi dùng cách 2, pnpm workspace vẫn resolve dependencies theo `pnpm-workspace.yaml`; chạy `pnpm i` trong thư mục app sẽ cài đúng dependencies của app đó (và hoist về root nếu cấu hình workspace cho phép). Các lệnh như `pnpm dev`, `pnpm build` chạy ngay trong thư mục app đó.

> Nếu gặp cảnh báo về build scripts bị bỏ qua, chạy `pnpm approve-builds` (từ root) để cho phép.

## Các lệnh thường dùng

### Chạy tất cả ứng dụng

```bash
# Chạy tất cả ở chế độ development
pnpm dev

# Build tất cả
pnpm build

# Lint tất cả
pnpm lint

# Kiểm tra TypeScript types
pnpm check-types

# Dọn dẹp build outputs
pnpm clean
```

### Chạy một ứng dụng cụ thể (dùng --filter)

```bash
# Chỉ chạy frontend (Next.js)
pnpm --filter web dev

# Chỉ chạy api (NestJS)
pnpm --filter api dev

# Build chỉ một app
pnpm --filter web build
```

### Thêm dependency cho một app

```bash
# Thêm dependency vào web
pnpm --filter web add <package>

# Thêm devDependency vào api
pnpm --filter api add -D <package>

# Thêm dependency vào root (ít khi dùng)
pnpm add -D <package> -w
```

## Cách Turborepo hoạt động

### Pipeline (`turbo.json`)

Turborepo sử dụng file `turbo.json` để định nghĩa các task và mối quan hệ giữa chúng:

- **`build`** — Build tất cả apps. `dependsOn: ["^build"]` nghĩa là package phụ thuộc sẽ được build trước.
- **`dev`** — Chạy development server. Không cache, chạy persistent (không tự tắt).
- **`lint`** — Kiểm tra code style. Chạy sau khi build xong các packages phụ thuộc.
- **`check-types`** — Kiểm tra TypeScript types. Chạy sau khi build xong các packages phụ thuộc.
- **`clean`** — Xóa build outputs. Không cache.

### Cache

Turborepo tự động cache kết quả của `build`, `lint`, `check-types`. Nếu code không thay đổi, lần chạy tiếp theo sẽ dùng cache thay vì chạy lại → **tiết kiệm thời gian đáng kể**.

Để bỏ qua cache:

```bash
pnpm build --force
```

### Xem task graph

```bash
pnpm exec turbo run build --dry
pnpm exec turbo run build --graph
```

## Làm việc với Next.js (`apps/web`)

Tech stack chi tiết xem mục **Tech stack Frontend** ở trên.

```bash
# Chạy dev server (mặc định port 3000)
pnpm --filter web dev

# Build production
pnpm --filter web build

# Chạy production server
pnpm --filter web start
```

Cấu trúc Next.js: App Router trong `apps/web/app/` (layout, page, route segments); components và styles trong `app/` hoặc thư mục con; shared logic trong `apps/web/lib/`.

**Logo & favicon (tối ưu dung lượng):** Asset logo nằm trong `apps/web/image/logo/` (mọi `*.png`). Script `square-trim-logos.mjs` (`pnpm square:logos`): trim viền, **cắt khung vuông** căn giữa với margin trong suốt ~3px (`LOGO_PAD_PX`), tùy chọn giới hạn cạnh `LOGO_MAX_EDGE` (mặc định 1024; `0` = không scale). Sau khi đổi logo nên chạy `pnpm square:logos` rồi `pnpm favicon:ico` (hoặc gộp quy trình tương đương). `pnpm optimize:assets` gọi `optimize-ui-logo.mjs` + `png-to-favicon-ico.mjs` (master 512px, `favicon.ico` qua png2icons + `icon.png`, `apple-icon.png`). Chi tiết biến môi trường xem comment đầu từng script.

## Làm việc với NestJS (`apps/api`)

```bash
# Từ root
pnpm --filter api dev
pnpm --filter api build
pnpm --filter api prod
pnpm --filter api db:deploy
pnpm --filter api test
pnpm --filter api test:e2e

# Hoặc trong thư mục app
cd apps/api
pnpm dev
pnpm build
pnpm test
pnpm run test:e2e
```

Cấu trúc NestJS: modules, controllers, services, guards, pipes trong `apps/api/src/`; Prisma schema trong `apps/api/prisma/schema/`; Prisma Client generate ra `apps/api/generated/`. Với các flow nhiều nghiệp vụ như `session`, ưu tiên chia theo workflow service nhỏ (`create`, `update`, `delete`, `reporting`) và gom rule truy cập dùng chung vào service riêng như `src/staff-ops/` thay vì dồn hết vào một god-service. Với các thao tác mutate nghiệp vụ, ưu tiên ghi audit qua `src/action-history/` ngay trong transaction để `action_history` luôn đồng bộ với dữ liệu chính. Hiện coverage đã phủ các mutate flow chính ở `session`, `class`, `cost`, `bonus`, `extra_allowance`, `cf_problem_tutorial`, `user`, `student`, `staff`, cùng các auth flow thay đổi dữ liệu `user` như `register`, `verify email`, `reset/change/setup password` và Google OAuth create/verify. Với snapshot `user`, `before_value` / `after_value` phản ánh đúng dữ liệu lưu DB, gồm cả các field hash như `passwordHash` / `refreshToken` nếu thao tác đó chạm vào chúng. Flow OAuth Google hiện expose cờ `requiresPasswordSetup` qua `GET /auth/profile` / `GET /auth/me`; frontend dùng route `/auth/setup-password` và gate tại `apps/web/app/providers.tsx` để buộc user chưa có `passwordHash` hoàn tất bước tạo mật khẩu trước khi dùng tiếp app. **Swagger UI:** khi chạy API, mở `http://localhost:<PORT>/api` để xem và gọi thử API (DocumentBuilder + SwaggerModule trong `main.ts`). Mọi controller nên có Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, …). Với request body cần validation runtime, ưu tiên DTO dạng `class` + `ValidationPipe`; không nên dùng `interface` nếu muốn `class-validator` hoạt động. Dashboard read endpoints hiện dùng bảng `dashboard_cache` của PostgreSQL qua `src/cache/dashboard-cache.service.ts`; cấu hình TTL bằng `DASHBOARD_CACHE_DEFAULT_TTL_SECONDS` trong `apps/api/.env`. Backend auth cũng có in-memory identity cache theo process để giảm query lặp `users` / `staff_info` ở `JwtStrategy`, `RolesGuard` và `GET /auth/profile`; cấu hình bằng `AUTH_IDENTITY_CACHE_TTL_MS` và `AUTH_IDENTITY_CACHE_MAX_ENTRIES`, cache chỉ giữ TTL ngắn và luôn invalidate sau các mutate làm đổi auth-visible fields. Nếu thao tác cache lỗi hoặc row đã hết hạn, service sẽ fail-open và query dữ liệu tươi trực tiếp từ PostgreSQL. API cũng bật global HTTP rate limiting bằng `@nestjs/throttler` với cấu hình `THROTTLE_DEFAULT_LIMIT`, `THROTTLE_DEFAULT_TTL_MS`, `THROTTLE_DEFAULT_BLOCK_DURATION_MS`; các auth endpoint nhạy cảm (`login`, `register`, `forgot-password`, `reset-password`, `change-password`, `verify`, `refresh`) có limit chặt hơn ngay tại controller, còn `POST /auth/setup-password` dùng chung ngưỡng `10 lần / 30 phút / IP` như đổi mật khẩu. Nếu deploy sau reverse proxy, cấu hình thêm `TRUST_PROXY` để Express ghi nhận đúng client IP cho throttler. Khi thay đổi Prisma schema hoặc phiên bản Prisma, chỉ generate qua workspace-local script như `pnpm --filter api db:generate`; không dùng Prisma CLI global vì `apps/api/generated/` phải khớp tuyệt đối với version `prisma` và `@prisma/client` đang cài trong repo. Các script `build`, `dev`, `start`, `check-types` của `apps/api` hiện đã tự chạy `db:generate` trước để giảm rủi ro lệch client/runtime, còn lệnh production `pnpm --filter api prod` chạy entrypoint đã build tại `dist/src/main.js`. Với database Supabase/shared đã có dữ liệu, không chạy `prisma migrate dev` trực tiếp vì Prisma có thể yêu cầu reset khi phát hiện history conflict hoặc drift; hãy tạo migration trên DB local/disposable, commit file SQL, rồi áp dụng lên shared DB bằng `pnpm --filter api db:deploy`.
Avatar và CCCD hiện đều dùng backend proxy lên Supabase Storage. Avatar người dùng lưu ở bucket `avatars` với object key `users/{userId}/avatar`; ảnh CCCD lưu ở bucket `id-cards` với object key `${userId}-front` / `${userId}-back`. Vì vậy cần cấu hình `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` trong `apps/api/.env` (không expose service role key ra frontend). Backend chịu trách nhiệm upload, xoá file và ký signed URL ngắn hạn; frontend chỉ gọi API NestJS và không tự ký URL hoặc truy cập bucket bằng service role key.

## Thêm shared package mới

Khi cần chia sẻ code giữa các apps (ví dụ: types, utils, configs):

1. Tạo thư mục trong `packages/`:

```bash
mkdir packages/shared
cd packages/shared
pnpm init
```

2. Đặt tên package trong `packages/shared/package.json`:

```json
{
  "name": "@unicorns/shared",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

3. Thêm vào app cần dùng:

```bash
pnpm --filter web add @unicorns/shared --workspace
```

## Quy tắc làm việc

1. **Cài đặt:** Có thể chạy `pnpm i` từ root (cả monorepo) hoặc `cd` vào từng app rồi chạy `pnpm i` trong app đó.
2. **Chạy / build:** Từ root dùng `pnpm --filter web dev` (hoặc filter khác); hoặc `cd apps/web` rồi chạy `pnpm dev` / `pnpm build` trực tiếp trong app.
3. **Dùng `--filter`** — Khi ở root, dùng `--filter=<app>` để chỉ chạy task cho một app.
4. **Không commit `node_modules`** — Đã có trong `.gitignore`.
5. **Không chỉnh sửa `pnpm-lock.yaml` bằng tay** — File này được tự động tạo bởi pnpm.
6. **Kiểm tra types trước khi commit** — Từ root: `pnpm check-types`; với frontend nên chạy thêm `pnpm --filter web exec tsc --noEmit` vì `apps/web` hiện chưa khai báo script `check-types` riêng.

## Deploy VPS (GitHub Actions)

Pipeline: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — build image → push GHCR → SSH vào VPS → `git pull --ff-only` để sync compose/nginx/workflow-side config → `docker compose pull` / `up` → probe readiness thật từ trong container → `prisma migrate deploy`.

### Lỗi `Process exited with status 137`

**137** = tiến trình bị **SIGKILL**; trên VPS nhỏ (512MB–1GB RAM) nguyên nhân hay gặp nhất là **OOM** (kernel kill) khi Docker **pull/giải nén layer**, **recreate** `api` + `web` cùng lúc, hoặc khi chạy **`npx prisma migrate deploy`** ngay sau khi container vừa start.

**Việc nên làm trên VPS:**

1. **Thêm swap** (ví dụ 2G) nếu RAM &lt; 2G — giảm đột biến OOM khi deploy.
2. **Nâng RAM** hoặc tách DB sang host khác để VPS chỉ chạy stack app.
3. Workflow đã bật `COMPOSE_PARALLEL_LIMIT=1`, `command_timeout: 30m`, `git pull --ff-only` trên VPS để cập nhật `docker-compose.prod.yml` / `nginx`, probe HTTP readiness thật từ trong container trước migrate, và `NODE_OPTIONS=--max-old-space-size=384` cho bước Prisma để giảm spike; nếu vẫn 137, ưu tiên swap / RAM.

### Nginx 502 `Connection refused` tới `172.x.x.x:3000` sau khi `docker compose up`

Nginx có thể giữ upstream tới IP container **trước khi recreate**; `web`/`api` đổi IP trong mạng Docker sẽ gây 502 nếu proxy chỉ resolve hostname lúc start. Repo hiện đã chặn trường hợp này theo 3 lớp:

1. `nginx/nginx.conf` khai báo Docker DNS `resolver 127.0.0.11` ở `http` scope để mọi server block (kể cả block TLS do Certbot thêm) đều re-resolve `api` / `web`.
2. `nginx/conf.d/app.conf` dùng `proxy_pass` qua biến thay vì `upstream` tĩnh để Nginx hỏi lại Docker DNS khi container đổi IP.
3. `docker-compose.prod.yml` thêm `healthcheck` cho `api` / `web`, còn workflow deploy sẽ `git pull --ff-only` trên VPS rồi probe HTTP readiness thật (`api` qua `http://127.0.0.1:4000/`, `web` qua `http://127.0.0.1:3000/api/healthcheck`) trước khi chạy `nginx -t` + `nginx -s reload`, nên không còn phụ thuộc vào `docker inspect .State.Health` của container cũ hoặc phải restart tay cả container `nginx`.

Nếu VPS vẫn đang dùng config cũ, pull repo mới rồi chạy lại:

```bash
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

Khi verify routing, **đừng dùng `http://IP/api` để kết luận API còn sống**. Với Nginx chỉ có `location /api/`, path `/api` không có dấu `/` cuối sẽ rơi xuống `location /` và có thể trả HTML của Next.js. Repo hiện đã thêm exact-match redirect `location = /api { return 301 /api/; }` để normalize case này. Với cấu hình proxy đang strip prefix `/api`, cách test đúng là `curl -i http://IP/api/` và kỳ vọng backend trả `Hello World!`; nếu mở Swagger qua reverse proxy thì URL ngoài là `http://IP/api/api`.

Lưu ý: khi `proxy_pass` dùng **biến hostname** để tránh stale Docker IP, **không** thêm URI `/` ở cuối kiểu `http://$upstream_api:4000/` trong block `location /api/`. Cách đó sẽ làm Nginx đẩy mọi request `/api/*` về `/` của backend. Repo hiện rewrite `^/api/(.*)` trước rồi `proxy_pass http://$upstream_api:4000` không kèm URI để giữ đúng path còn lại.

Nếu log `web` hiển thị Next.js chạy ở `http://0.0.0.0:4000` thay vì `3000`, nguyên nhân thường là cả `api` và `web` cùng ăn chung `env_file: .env` và biến `PORT=4000` từ backend đã override frontend. `docker-compose.prod.yml` hiện đã pin lại `api.PORT=4000` và `web.PORT=3000` ở từng service; sau khi cập nhật file này trên VPS, chạy lại `docker compose -f docker-compose.prod.yml up -d --force-recreate web nginx`.

### Lỗi Prisma `The datasource.url property is required` khi `migrate deploy`

Image API phải chứa `prisma.config.ts` ở thư mục làm việc của container (`/app`): Prisma 7 khai báo `datasource.url` qua `process.env.DATABASE_URL` trong file đó (schema `prisma/schema/*.prisma` không còn dòng `url`). Đảm bảo đã build image từ Dockerfile mới có bước `COPY ... prisma.config.ts`, và file `.env` trên VPS có `DATABASE_URL` (Compose dùng `env_file`).

### Lỗi Prisma `Can't write to ... @prisma/engines` (quyền ghi `node_modules`)

Xảy ra khi container chạy user **không phải root** nhưng thư mục `/app` (đặc biệt `node_modules`) vẫn thuộc **root** sau bước `COPY` trong Dockerfile — Prisma có thể cần ghi dưới `@prisma/engines`. Image API/Web hiện gọi `chown -R appuser:appgroup /app` trước `USER appuser`. Nếu gặp lỗi trên image cũ: build lại image từ `apps/api/Dockerfile` / `apps/web/Dockerfile` mới và deploy lại.

**Lưu ý:** Dòng log có prefix `err:` từ SSH action có thể chỉ là **stderr** của Docker (bình thường), không phải lỗi logic cho đến khi có exit code khác 0.
