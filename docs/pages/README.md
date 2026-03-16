# Unicorns Edu 5.0 – Page Plans

Page-level specs for `apps/web`, aligned with [Workplan](../Workplan.md) and [UI-Schema](../UI-Schema.md).

**Cấu trúc frontend hiện tại:** App Router trong `apps/web/app/`. Đã có route runtime cho `/`, `/landing-page`, `/auth/*`, và nhóm `/admin/*`. Các route `/assistant`, `/mentor`, `/student` mới đang ở mức page plan, chưa có file route thật trong `apps/web/app/`.

**Archived UI context:** [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) maps the archived app (`archived/UniEdu-Web-3.9/frontend/`) to 5.0 routes and lists concrete files, services, and patterns to reuse for better model results when implementing each page.

## Route index

| Route | Status | Role | Owner (Workplan) | Plan file |
| --- | --- | --- | --- | --- |
| `/admin` | Implemented | Admin | Huy | [admin.md](admin.md) |
| `/landing-page` | Implemented | Public | Minh | [landing.md](landing.md) |
| Auth (login/logout) | Partial | All authenticated | Huy/Minh | [auth.md](auth.md) |
| `/auth/login` | Implemented | Public | Huy/Minh | [auth-login.md](auth-login.md) |
| `/auth/register` | Implemented | Public | Huy/Minh | [auth-register.md](auth-register.md) |
| `/auth/forgot-password` | Implemented | Public | Huy/Minh | [auth-forgot-password.md](auth-forgot-password.md) |
| `/auth/reset-password` | Implemented | Public | Huy/Minh | [auth-reset-password.md](auth-reset-password.md) |
| `/assistant` | Planned | Assistant | Minh | [assistant.md](assistant.md) |
| `/mentor` | Planned | Teacher | Huy | [mentor.md](mentor.md) |
| `/student` | Planned | Student | Minh | [student.md](student.md) |

## Workplan phase mapping

- **Tuần 1:** Auth, layout, mock layer; landing wireframe.
- **Tuần 2:** `/admin` (dashboard, CRUD lớp, gán teacher/student).
- **Tuần 3:** `/mentor` (lớp, session, điểm danh, lesson notes, payroll/bonus view).
- **Tuần 4:** `/assistant` (thu phí, status, tasks).
- **Tuần 5:** `/student` (lịch học, tài liệu, payment read-only, profile).
- **Tuần 6:** `/landing-page` polish (UI hierarchy + micro-animation + reduced-motion), migration rehearsal.
- **Tuần 7:** De-mock all routes; integration and UAT.
- **Tuần 8:** Launch checklist; no new page scope.

## Conventions

- All pages use **semantic tokens only** (see UI-Schema 3.2, 3.3).
- **Mock:** Tuần 1–6; **De-mock:** Tuần 7; **Production:** API-only from Tuần 8.
- Each plan lists: route/role, features, tokens & components, API/mock, DoD, accessibility.
