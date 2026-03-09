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
│   │   │   ├── student/        # /student
│   │   │   ├── staff/          # /staff
│   │   │   ├── api/            # Route handlers API (vd. healthcheck)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── lib/                # API client, utils
│   └── api/                    # NestJS backend
│       ├── src/                # modules, controllers, services
│       │   ├── auth/
│       │   ├── prisma/
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
| **Data fetching / API** | TanStack React Query v5, Axios | React Query cho server state; Axios instance trong `lib/client.ts` (baseURL từ env, withCredentials, xử lý refresh token). |
| **Validation / Transform** | class-validator, class-transformer | Dùng cho DTO/forms khi cần validate hoặc transform dữ liệu từ API. |
| **TypeScript** | TS 5.x | Path alias `@/*` → `./*` (tsconfig.json). Target ES2017, moduleResolution bundler, strict. |
| **API base URL** | Biến môi trường | `NEXT_PUBLIC_BACKEND_URL` (mặc định `http://localhost:3001`); dùng trong `lib/client.ts`. |

**Cấu trúc thư mục frontend:** `apps/web/app/` (routes, layout, page), `apps/web/lib/` (API client, utils). Component và style theo cấu trúc Next.js App Router; tokens và theme đã định nghĩa sẵn trong `globals.css`.

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
pnpm dev --filter=web

# Chỉ chạy api (NestJS)
pnpm dev --filter=api

# Build chỉ một app
pnpm build --filter=web
```

### Thêm dependency cho một app

```bash
# Thêm dependency vào web
pnpm add <package> --filter=web

# Thêm devDependency vào api
pnpm add -D <package> --filter=api

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
pnpm dev --filter=web

# Build production
pnpm build --filter=web

# Chạy production server
pnpm exec turbo run start --filter=web
```

Cấu trúc Next.js: App Router trong `apps/web/app/` (layout, page, route segments); components và styles trong `app/` hoặc thư mục con; shared logic trong `apps/web/lib/`.

## Làm việc với NestJS (`apps/api`)

```bash
# Từ root
pnpm dev --filter=api
pnpm build --filter=api
pnpm exec turbo run test --filter=api
pnpm exec turbo run test:e2e --filter=api

# Hoặc trong thư mục app
cd apps/api
pnpm dev
pnpm build
pnpm test
pnpm run test:e2e
```

Cấu trúc NestJS: modules, controllers, services, guards, pipes trong `apps/api/src/`; Prisma schema trong `apps/api/prisma/schema/`; Prisma Client generate ra `apps/api/generated/`.

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
pnpm add @unicorns/shared --filter=web --workspace
```

## Quy tắc làm việc

1. **Cài đặt:** Có thể chạy `pnpm i` từ root (cả monorepo) hoặc `cd` vào từng app rồi chạy `pnpm i` trong app đó.
2. **Chạy / build:** Từ root dùng `pnpm dev --filter=web` (hoặc filter khác); hoặc `cd apps/web` rồi chạy `pnpm dev` / `pnpm build` trực tiếp trong app.
3. **Dùng `--filter`** — Khi ở root, dùng `--filter=<app>` để chỉ chạy task cho một app.
4. **Không commit `node_modules`** — Đã có trong `.gitignore`.
5. **Không chỉnh sửa `pnpm-lock.yaml` bằng tay** — File này được tự động tạo bởi pnpm.
6. **Kiểm tra types trước khi commit** — Từ root: `pnpm check-types`; trong từng app có thể chạy `pnpm exec tsc --noEmit` (nếu app có cấu hình TypeScript).
