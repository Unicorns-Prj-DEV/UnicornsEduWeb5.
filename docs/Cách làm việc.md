# Cách làm việc với Turborepo, Next.js và NestJS

## Tổng quan

Dự án sử dụng **Turborepo** để quản lý monorepo, kết hợp **pnpm workspaces** để quản lý dependencies. Trong monorepo có các ứng dụng:

| Ứng dụng | Đường dẫn | Framework | Mô tả |
|-----------|-----------|-----------|-------|
| `web` | `apps/web` | Next.js | Giao diện người dùng (Frontend) |
| `math-api` | `apps/math-api` | NestJS | API toán học (Backend) |
| `cp-api` | `apps/cp-api` | NestJS | API lập trình thi đấu (Backend) |

## Cấu trúc thư mục

```
UnicornsEduWeb5./
├── apps/
│   ├── web/              # Next.js frontend
│   ├── math-api/         # NestJS backend
│   └── cp-api/           # NestJS backend
├── packages/             # Shared libraries / configs
├── package.json          # Root package.json (scripts + turbo)
├── pnpm-workspace.yaml   # Khai báo workspaces
├── turbo.json            # Cấu hình pipeline của Turborepo
└── pnpm-lock.yaml        # Lockfile
```

## Yêu cầu hệ thống

- **Node.js** >= 20
- **pnpm** >= 10 (dự án dùng `pnpm@10.27.0`)

## Cài đặt

```bash
# Clone repo
git clone <repo-url>
cd UnicornsEduWeb5.

# Cài đặt tất cả dependencies
pnpm install
```

> Nếu gặp cảnh báo về build scripts bị bỏ qua, chạy `pnpm approve-builds` để cho phép.

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

# Chỉ chạy math-api (NestJS)
pnpm dev --filter=math-api

# Chỉ chạy cp-api (NestJS)
pnpm dev --filter=cp-api

# Build chỉ một app
pnpm build --filter=web
```

### Thêm dependency cho một app

```bash
# Thêm dependency vào web
pnpm add <package> --filter=web

# Thêm devDependency vào math-api
pnpm add -D <package> --filter=math-api

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

```bash
# Chạy dev server (mặc định port 3000)
pnpm dev --filter=web

# Build production
pnpm build --filter=web

# Chạy production server
pnpm exec turbo run start --filter=web
```

Cấu trúc Next.js chuẩn: pages/app router, components, styles nằm trong `apps/web/src/`.

## Làm việc với NestJS (`apps/math-api`, `apps/cp-api`)

```bash
# Chạy dev server với hot-reload
pnpm dev --filter=math-api

# Build
pnpm build --filter=math-api

# Chạy tests
pnpm exec turbo run test --filter=math-api

# Chạy e2e tests
pnpm exec turbo run test:e2e --filter=math-api
```

Các NestJS app sử dụng cấu trúc chuẩn: modules, controllers, services, guards, pipes nằm trong `apps/<app-name>/src/`.

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

1. **Luôn chạy lệnh từ thư mục root** — Không `cd` vào từng app rồi chạy `pnpm install`.
2. **Dùng `--filter`** — Khi chỉ cần làm việc với một app cụ thể.
3. **Không commit `node_modules`** — Đã có trong `.gitignore`.
4. **Không chỉnh sửa `pnpm-lock.yaml` bằng tay** — File này được tự động tạo bởi pnpm.
5. **Kiểm tra types trước khi commit** — Chạy `pnpm check-types` để đảm bảo không có lỗi TypeScript.
