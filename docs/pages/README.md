# Unicorns Edu 5.0 – Page Plans

Page-level specs for `apps/web`, aligned with [Workplan](../Workplan.md) and [UI-Schema](../UI-Schema.md).

**Cấu trúc frontend hiện tại:** App Router trong `apps/web/app/`. Đã có route runtime cho `/`, `/landing-page`, `/auth/*`, `/verify-email`, `/student`, nhóm `/admin/*`, và nhóm `/staff/*`. Các route `/assistant`, `/mentor` vẫn đang ở mức page plan, chưa có file route thật trong `apps/web/app/`.

**Archived UI context:** [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) maps the archived app (`archived/UniEdu-Web-3.9/frontend/`) to 5.0 routes and lists concrete files, services, and patterns to reuse for better model results when implementing each page.

## Ma trận workspace/tenant access

> **Tenant hiện tại:** Prisma schema chưa có `tenant_id`/`workspace_id`; app đang single-tenant. Trong docs page, `workspace` nghĩa là phạm vi shell theo `roleType`, linked profile, và `staffInfo.roles`, không phải tenant dữ liệu.

| Shell | Baseline quyền | Yêu cầu hồ sơ | Ngoại lệ staff role |
| --- | --- | --- | --- |
| Admin `/admin/**` | Admin là baseline cho hành vi quản trị. `roleType=admin` và `roleType=staff` có `staff.admin` là admin đầy đủ theo admin shell/guards. | `roleType=admin` không phụ thuộc `staffInfo`; admin qua staff đọc quyền từ linked `staffInfo.roles`. | `/admin/notification` chỉ admin đầy đủ; `/admin/deductions` mở thêm `staff.assistant` và `staff.accountant` theo policy admin shell. |
| Staff `/staff/**` | Staff workspace là shell phân quyền theo staff hiện tại; các mirror route không tạo tenant riêng. | Cần linked `staffInfo`; proxy chặn staff thiếu hồ sơ bắt buộc trước khi vào `/staff/**`. `personal_achievement_link` là tùy chọn. | `assistant` mở admin-mirror routes; `accountant` mở finance/lesson scope và quyền xem danh sách/chi tiết nhân sự + học sinh; `assistant`/`accountant` chỉ tạo QR SePay khi nạp ví học sinh, không chỉnh thẳng số dư; `customer_care` chỉ mở route chuyên trách và tạo QR SePay cho học sinh được giao; `teacher`, `lesson_plan`, `lesson_plan_head` chỉ mở route chuyên trách tương ứng. |
| Student `/student` | Student workspace chỉ hiển thị dữ liệu của học sinh đang đăng nhập. | Cần `roleType=student` và linked `studentInfo`. | Không có staff exception; staff/admin dùng route admin/staff để xem dữ liệu học sinh theo quyền. |

**Nguồn sự thật:** `docs/Database Schema.md` + Prisma schema là chuẩn cho single-tenant schema; `admin.md` là baseline UX/quyền admin; `staff.md` và `student.md` chỉ ghi các route mirror hoặc self-service khác baseline.

## Route index

| Route | Status | Role | Owner (Workplan) | Plan file |
| --- | --- | --- | --- | --- |
| `/admin` | Implemented | `admin`, `staff.admin` | Huy | [admin.md](admin.md) |
| `/admin/calendar` | Implemented | `admin`, `staff.admin`, `staff.assistant` | Huy | [admin.md](admin.md) |
| `/admin/notification` | Implemented | `admin` | Huy | [admin.md](admin.md) |
| `/admin/users` | Implemented | Admin | — | Danh sách user, thêm account mới theo register + mail verify + gán role ngay; nhánh `student` hỗ trợ điền hồ sơ học sinh đầy đủ + gán lớp tại lúc tạo, staff roles chi tiết, auto-create profile liên kết |
| `/staff` | Implemented | linked `staffInfo`, `admin` | Huy | [staff.md](staff.md) |
| `/staff/calendar` | Implemented | `staff.teacher`, `admin`, `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/notification` | Implemented | linked `staffInfo` | Huy | [staff.md](staff.md) |
| `/staff/dashboard` | Implemented | `staff.assistant` (redirect → `/staff`) | Huy | [staff.md](staff.md) |
| `/staff/users` | Implemented | `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/staffs` | Implemented | `staff.assistant`, `staff.accountant` | Huy | [staff.md](staff.md) |
| `/staff/classes` | Implemented | `staff.assistant`, `staff.accountant` | Huy | [staff.md](staff.md) |
| `/staff/students` | Implemented | `staff.assistant`, `staff.accountant` | Huy | [staff.md](staff.md) |
| `/staff/costs` | Implemented | `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/history` | Implemented | `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/customer-care-detail` | Implemented | `staff.customer_care` | Huy | [staff.md](staff.md) |
| `/staff/lesson_plan_detail` | Implemented | `staff.lesson_plan`, `staff.lesson_plan_head` | Huy | [staff.md](staff.md) |
| `/staff/lesson-plan-tasks` | Legacy redirect | alias → `/staff/lesson-plans` | Huy | [staff.md](staff.md) |
| `/staff/lesson-plans` | Implemented | `staff.lesson_plan`, `staff.lesson_plan_head`, `staff.accountant`, `staff.assistant`, Admin | Huy | [staff.md](staff.md) |
| `/landing-page` | Implemented | Public | Minh | [landing.md](landing.md) |
| Auth (login/logout/session) | Implemented | All authenticated | Huy/Minh | [auth.md](auth.md) |
| `/auth/login` | Implemented | Public | Huy/Minh | [auth-login.md](auth-login.md) |
| `/auth/register` | Implemented | Public | Huy/Minh | [auth-register.md](auth-register.md) |
| `/auth/forgot-password` | Implemented | Public | Huy/Minh | [auth-forgot-password.md](auth-forgot-password.md) |
| `/auth/reset-password` | Implemented | Public | Huy/Minh | [auth-reset-password.md](auth-reset-password.md) |
| `/auth/setup-password` | Implemented | Public route, auth-gated | Huy/Minh | [auth-setup-password.md](auth-setup-password.md) |
| `/verify-email` | Implemented | Public | Huy/Minh | [auth.md](auth.md) |
| `/assistant` | Planned | Assistant | Minh | [assistant.md](assistant.md) |
| `/mentor` | Planned | Teacher | Huy | [mentor.md](mentor.md) |
| `/student` | Implemented | Student | Minh | [student.md](student.md) |

## Workplan phase mapping

- **Tuần 1:** Auth, layout, mock layer; landing wireframe.
- **Tuần 2:** `/admin` (dashboard, CRUD lớp, gán teacher/student).
- **Runtime bổ sung:** `/staff` hiện phục vụ 5 flow: assistant admin-mirror workspace (`/staff/users`, `/staff/staffs*`, `/staff/classes`, `/staff/students*`, `/staff/costs`, `/staff/history`; dashboard gốc `/staff` chung mọi staff; `/staff/dashboard` redirect `/staff`; **Cá nhân** trợ lí → `/staff/staffs/:ownStaffId`), accountant finance workspace có thêm quyền xem `/staff/staffs*`, `/staff/classes*` và `/staff/students*` để mở link từ các màn chi tiết, teacher workspace cho `staff.teacher` (admin có thể vào để theo dõi/hỗ trợ), self-service customer-care detail tại `/staff/customer-care-detail` cho `staff.customer_care`, lesson workspace dùng chung tại `/staff/lesson-plans*` cho `staff.lesson_plan`, `staff.lesson_plan_head`, `staff.accountant`, `staff.assistant` và `admin`, cùng các route legacy `/staff/lesson-plan-tasks*` chỉ còn redirect về workspace mới.
- **Tuần 3:** `/mentor` (lớp, session, điểm danh, lesson notes, payroll/bonus view).
- **Tuần 4:** `/assistant` (thu phí, status, tasks).
- **Tuần 5:** `/student` (hồ sơ cá nhân, ví tự phục vụ, lớp đang học, lịch thi authoritative; dữ liệu luôn khóa theo tài khoản hiện tại).
- **Tuần 6:** `/landing-page` polish (UI hierarchy + micro-animation + reduced-motion), migration rehearsal.
- **Tuần 7:** De-mock all routes; integration and UAT.
- **Tuần 8:** Launch checklist; no new page scope.

## Conventions

- All pages use **semantic tokens only** (see UI-Schema 3.2, 3.3).
- **Mock:** Tuần 1–6; **De-mock:** Tuần 7; **Production:** API-only from Tuần 8.
- Each plan lists: route/role, features, tokens & components, API/mock, DoD, accessibility.
