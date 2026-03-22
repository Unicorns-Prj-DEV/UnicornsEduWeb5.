# Tài liệu dự án Unicorns Edu 5.0

Mục lục tài liệu trong `docs/`, cộng với snapshot ngắn về trạng thái codebase đã được đối chiếu với repo hiện tại.

## Cấu trúc monorepo (thực tế)

| Thư mục / file | Mô tả |
|----------------|--------|
| `apps/web` | Next.js 16, React 19, App Router. Frontend: `app/` (routes), `lib/` (API client). |
| `apps/api` | NestJS backend. `src/` (auth, `action-history/`, prisma, `session/` workflow services, `staff-ops/` access helpers, user/student/staff services, mail, …), `prisma/schema/`, `generated/` (Prisma Client), `dtos/`. |
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
  - `/staff`, `/staff/classes/[id]`, `/staff/customer-care-detail`
  - `/admin`, `/admin/home`, `/admin/dashboard`
  - `/admin/classes`, `/admin/classes/[id]`
  - `/admin/students`
  - `/admin/users` (danh sách user, phân quyền role_type + staff roles)
  - `/admin/staffs`, `/admin/staffs/[id]`
  - `/admin/customer_care_detail/[staffId]` (chi tiết công việc CSKH: tab Học sinh, tab Hoa Hồng)
  - `/admin/costs`, `/admin/categories`, `/admin/history`
  - `/admin/history` đã nối dữ liệu thật từ backend audit log (`/action-history` list + `/action-history/:id` detail)
  - `/admin/lesson-plans`, `/admin/lesson-plans/tasks/[taskId]`, `/admin/lesson-plans/outputs/[outputId]`, `/admin/lessons`, `/admin/notes-subject`
    - `/admin/lesson-plans` là workspace giáo án admin (dữ liệu thật), **cùng shell trang admin** với Lớp học: `bg-bg-primary` → khối `rounded-xl border bg-bg-surface`, hero gradient chỉ có tiêu đề **Giáo Án** (không mô tả phụ), thanh tab **pill** full width, ba nút chia đều (`Tổng quan` · `Công việc` · `Bài tập`), không có dòng “Đang xem” và **không** có hàng card tổng kết ở tab Tổng quan / Công việc / Bài tập — đi thẳng vào bảng / danh sách. Tab `Tổng quan`: hai bảng xếp dọc **Tài nguyên giáo án** và **Công việc giáo án** (pagination riêng); không có mô tả phụ dưới tiêu đề section; bảng tài nguyên chỉ các cột **Tài nguyên · Link · Tag** (+ thao tác); bảng công việc bấm dòng → chi tiết, không hiển thị mô tả dưới tiêu đề công việc; cột **Phụ trách** = người chịu trách nhiệm.
    - Tab `Công việc`: **Bộ lọc nhanh** (form + URL `workSearch`…`workDateTo`) + **Thêm bài mới** (`LessonWorkAddLessonForm`: 4 khối THÔNG TIN BÀI / PHÂN LOẠI / THỜI GIAN & THANH TOÁN / BỔ SUNG; không chọn task/nhân sự; `POST /lesson-outputs` có thể không gắn task) + bảng **Bài giáo án đã làm** (`workYear`/`workMonth`/`workPage`); API `GET /lesson-work` hỗ trợ lọc bổ sung; TanStack Query `["lesson","work", …]`.
    - Tab `Bài tập`: sidebar lọc **Level** (`exLevel`, `GET /lesson-work?level=…`) + bộ lọc nhanh (`exSearch`…`exDateTo`) + bảng **Các bài đã làm** (`exPage`, mặc định không lọc tháng); nút **+** chuyển sang tab **Công việc** để dùng form Thêm bài mới; cột Tag · Tên bài · Link; TanStack Query `["lesson","exercises", …]`.
    - Popup task hỗ trợ search nhân sự theo tên, gắn tối đa 3 người thực hiện và cho phép chỉnh trực tiếp `người chịu trách nhiệm`
    - `/admin/lesson-plans/tasks/[taskId]` là trang chi tiết lesson task, đọc dữ liệu thật từ backend, hiển thị đầy đủ outputs/resource của task và cho phép mở popup chỉnh sửa hoặc tạo output mới ngay tại trang
    - `/admin/lesson-plans/outputs/[outputId]` là trang chi tiết lesson output, hiển thị đầy đủ metadata và cho phép chỉnh sửa / xóa record tại chỗ
    - `/admin/lessons` chỉ giữ vai trò alias và redirect về `/admin/lesson-plans`
  - `/api/healthcheck`
- Chưa có route runtime riêng cho `/assistant`, `/mentor`, `/student`; các page plan tương ứng vẫn nằm trong `docs/pages/`.
- Route `/staff` hiện có 2 nhánh runtime thật:
  - `/staff`, `/staff/classes/[id]` mở cho `staff.teacher` và `admin`
  - teacher chỉ thấy lớp được phân công; admin có thể truy cập để xem hoặc hỗ trợ cùng flow này
  - từ class detail chỉ cho sửa khung giờ, tạo/chỉnh session và điểm danh; route này không cho thay đổi trợ cấp hoặc học phí học sinh
  - `/staff/customer-care-detail` mở cho `staff.customer_care`, chỉ hiện trong staff sidebar và luôn khóa theo hồ sơ staff hiện tại

## Health snapshot (2026-03-20)

- Đã kiểm tra:
  - `pnpm --filter web exec tsc --noEmit`: pass
  - `pnpm --filter api check-types`: pass
  - `pnpm --filter api test`: pass
- Backend audit coverage hiện tại:
  - `action_history` đã phủ các mutate flow ở `session`, `class`, `cost`, `bonus`, `cf_problem_tutorial`, `user`, `student`, `staff`
  - auth flow có thay đổi `user` cũng đã ghi audit: `register`, `verify email`, `reset password`, `change password`, và Google OAuth khi tạo/xác thực user
- Cần xử lý tiếp:
  - `pnpm --filter web lint`: fail với `19` errors và `23` warnings
- Findings rủi ro cao từ review:
  - API chưa bật validation runtime toàn cục; riêng payload `sessions` đã chuyển sang DTO `class` + `ValidationPipe`, nhưng các controller khác vẫn cần được rà soát tương tự.
  - Refresh token rotation đang lưu hash vào DB nhưng luồng `refresh` chưa đối chiếu token đang dùng với hash đã lưu.
  - `apps/web/app/admin/notes-subject/page.tsx` có `useEffect` đặt sau `return`, vi phạm Rules of Hooks.

## Dùng tài liệu khi implement

- **Backend / DB:** [Database Schema.md](Database%20Schema.md) + [Cách làm việc.md](Cách%20làm%20việc.md) (phần NestJS).
- **Frontend / UI:** [UI-Schema.md](UI-Schema.md) + [pages/](pages/) (file plan từng route) + [pages/ARCHIVED-UI-CONTEXT.md](pages/ARCHIVED-UI-CONTEXT.md).
- **Lệnh / cài đặt:** [Cách làm việc.md](Cách%20làm%20việc.md).
- **Tiến độ / scope:** [Workplan.md](Workplan.md).
