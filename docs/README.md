# Tài liệu dự án Unicorns Edu 5.0

Mục lục tài liệu trong `docs/`, cộng với snapshot ngắn về trạng thái codebase đã được đối chiếu với repo hiện tại.

## Cấu trúc monorepo (thực tế)

| Thư mục / file | Mô tả |
|----------------|--------|
| `apps/web` | Next.js 16, React 19, App Router. Frontend: `app/` (routes), `lib/` (API client). |
| `apps/api` | NestJS backend. `src/` (auth, prisma, mail, …), `prisma/schema/`, `generated/` (Prisma Client), `dtos/`. |
| `packages/` | Shared packages (hiện chỉ có `.gitkeep`, chưa có package con). |
| `archived/` | Bản lưu tham khảo (vd. `UniEdu-Web-3.9`). |
| Root | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `pnpm-lock.yaml`. |

**Không có** `apps/math-api` hay `apps/cp-api` — backend duy nhất là `apps/api`.

## Tài liệu trong `docs/`

| File | Nội dung |
|------|----------|
| [Cách làm việc.md](Cách%20làm%20việc.md) | Turborepo, pnpm, cài đặt, lệnh thường dùng, tech stack frontend, quy tắc. **Bắt đầu từ đây.** |
| [Workplan.md](Workplan.md) | Kế hoạch 8 tuần, phase, DoD, route-to-domain, risk, launch checklist. |
| [UI-Schema.md](UI-Schema.md) | Design tokens, theme (light/dark/pink), semantic naming, component mapping. |
| [Database Schema.md](Database%20Schema.md) | Prisma schema tại `apps/api/prisma/schema/`, bảng theo domain, quan hệ, source of truth. |
| **pages/** | Spec từng route frontend (admin, student, mentor, assistant, landing, auth). |
| [pages/README.md](pages/README.md) | Route index, workplan phase mapping, conventions. |
| [pages/ARCHIVED-UI-CONTEXT.md](pages/ARCHIVED-UI-CONTEXT.md) | Map UI archived (UniEdu-Web-3.9) sang 5.0, file tham khảo, services, pattern. |

## Route frontend (`apps/web/app/`)

- Đã có:
  - `/`
  - `/landing-page`
  - `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`
  - `/admin`, `/admin/home`, `/admin/dashboard`
  - `/admin/classes`, `/admin/classes/[id]`
  - `/admin/students`
  - `/admin/staffs`, `/admin/staffs/[id]`
  - `/admin/costs`, `/admin/categories`, `/admin/history`
  - `/admin/lesson-plans`, `/admin/lessons`, `/admin/notes-subject`
  - `/api/healthcheck`
- Chưa có route runtime riêng cho `/assistant`, `/mentor`, `/student`; các page plan tương ứng vẫn nằm trong `docs/pages/`.

## Health snapshot (2026-03-16)

- Đã kiểm tra:
  - `pnpm --filter web exec tsc --noEmit`: pass
  - `pnpm --filter api check-types`: pass
  - `pnpm --filter api test`: pass
- Cần xử lý tiếp:
  - `pnpm --filter web lint`: fail với `19` errors và `23` warnings
- Findings rủi ro cao từ review:
  - API chưa bật validation runtime toàn cục; riêng payload `sessions` còn dùng `interface`, nên request body không được `class-validator` bảo vệ.
  - Refresh token rotation đang lưu hash vào DB nhưng luồng `refresh` chưa đối chiếu token đang dùng với hash đã lưu.
  - `apps/web/app/admin/notes-subject/page.tsx` có `useEffect` đặt sau `return`, vi phạm Rules of Hooks.

## Dùng tài liệu khi implement

- **Backend / DB:** [Database Schema.md](Database%20Schema.md) + [Cách làm việc.md](Cách%20làm%20việc.md) (phần NestJS).
- **Frontend / UI:** [UI-Schema.md](UI-Schema.md) + [pages/](pages/) (file plan từng route) + [pages/ARCHIVED-UI-CONTEXT.md](pages/ARCHIVED-UI-CONTEXT.md).
- **Lệnh / cài đặt:** [Cách làm việc.md](Cách%20làm%20việc.md).
- **Tiến độ / scope:** [Workplan.md](Workplan.md).
