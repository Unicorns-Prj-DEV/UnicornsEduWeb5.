# Unicorns Edu 5.0 – Page Plans

Page-level specs for `apps/web`, aligned with [Workplan](../Workplan.md) and [UI-Schema](../UI-Schema.md).

**Cấu trúc frontend hiện tại:** App Router trong `apps/web/app/`. Đã có route runtime cho `/`, `/landing-page`, `/auth/*`, `/student`, nhóm `/admin/*`, và nhóm `/staff/*`. Các route `/assistant`, `/mentor` vẫn đang ở mức page plan, chưa có file route thật trong `apps/web/app/`.

**Archived UI context:** [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) maps the archived app (`archived/UniEdu-Web-3.9/frontend/`) to 5.0 routes and lists concrete files, services, and patterns to reuse for better model results when implementing each page.

## Route index

| Route | Status | Role | Owner (Workplan) | Plan file |
| --- | --- | --- | --- | --- |
| `/admin` | Implemented | `admin`, `staff.assistant` | Huy | [admin.md](admin.md) |
| `/admin/users` | Implemented | Admin | — | Danh sách user, thêm account mới theo register + mail verify + gán role ngay, phân quyền (role_type: nhân sự/học sinh; staff roles chi tiết, auto-create profile liên kết) |
| `/staff` | Implemented | linked `staffInfo`, `admin` | Huy | [staff.md](staff.md) |
| `/staff/dashboard` | Implemented | `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/users` | Implemented | `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/staffs` | Implemented | `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/classes` | Implemented | `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/students` | Implemented | `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/costs` | Implemented | `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/history` | Implemented | `staff.assistant` | Huy | [staff.md](staff.md) |
| `/staff/customer-care-detail` | Implemented | `staff.customer_care` | Huy | [staff.md](staff.md) |
| `/staff/lesson-plan-tasks` | Implemented | `staff.lesson_plan` | Huy | [staff.md](staff.md) |
| `/staff/lesson-plans` | Implemented | `staff.lesson_plan_head`, `staff.assistant`, Admin | Huy | [staff.md](staff.md) |
| `/landing-page` | Implemented | Public | Minh | [landing.md](landing.md) |
| Auth (login/logout) | Partial | All authenticated | Huy/Minh | [auth.md](auth.md) |
| `/auth/login` | Implemented | Public | Huy/Minh | [auth-login.md](auth-login.md) |
| `/auth/register` | Implemented | Public | Huy/Minh | [auth-register.md](auth-register.md) |
| `/auth/forgot-password` | Implemented | Public | Huy/Minh | [auth-forgot-password.md](auth-forgot-password.md) |
| `/auth/reset-password` | Implemented | Public | Huy/Minh | [auth-reset-password.md](auth-reset-password.md) |
| `/auth/setup-password` | Implemented | Public route, auth-gated | Huy/Minh | [auth-setup-password.md](auth-setup-password.md) |
| `/assistant` | Planned | Assistant | Minh | [assistant.md](assistant.md) |
| `/mentor` | Planned | Teacher | Huy | [mentor.md](mentor.md) |
| `/student` | Implemented | Student | Minh | [student.md](student.md) |

## Workplan phase mapping

- **Tuần 1:** Auth, layout, mock layer; landing wireframe.
- **Tuần 2:** `/admin` (dashboard, CRUD lớp, gán teacher/student).
- **Runtime bổ sung:** `/staff` hiện phục vụ 5 flow: assistant admin-mirror workspace (`/staff/dashboard`, `/staff/users`, `/staff/staffs*`, `/staff/classes`, `/staff/students*`, `/staff/costs`, `/staff/history`), teacher workspace cho `staff.teacher` (admin có thể vào để theo dõi/hỗ trợ), self-service customer-care detail tại `/staff/customer-care-detail` cho `staff.customer_care`, participant lesson workspace tại `/staff/lesson-plan-tasks*` + `/staff/lesson-plan-manage-details` cho `staff.lesson_plan`, và lesson management workspace tại `/staff/lesson-plans*` cho `staff.lesson_plan_head` hoặc `staff.assistant`.
- **Tuần 3:** `/mentor` (lớp, session, điểm danh, lesson notes, payroll/bonus view).
- **Tuần 4:** `/assistant` (thu phí, status, tasks).
- **Tuần 5:** `/student` (hồ sơ cá nhân, ví tự phục vụ, lớp đang học, lịch thi; dữ liệu luôn khóa theo tài khoản hiện tại).
- **Tuần 6:** `/landing-page` polish (UI hierarchy + micro-animation + reduced-motion), migration rehearsal.
- **Tuần 7:** De-mock all routes; integration and UAT.
- **Tuần 8:** Launch checklist; no new page scope.

## Conventions

- All pages use **semantic tokens only** (see UI-Schema 3.2, 3.3).
- **Mock:** Tuần 1–6; **De-mock:** Tuần 7; **Production:** API-only from Tuần 8.
- Each plan lists: route/role, features, tokens & components, API/mock, DoD, accessibility.
