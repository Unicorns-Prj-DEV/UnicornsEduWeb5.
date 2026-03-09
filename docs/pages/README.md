# Unicorns Edu 5.0 – Page Plans

Page-level specs for `apps/web`, aligned with [Workplan](../Workplan.md) and [UI-Schema](../UI-Schema.md).

**Cấu trúc frontend hiện tại:** App Router trong `apps/web/app/`. Đã có: `app/admin/` (dashboard, classes, students, costs, categories, coding, lessons), `app/student/`, `app/staff/`. Các route theo kế hoạch: `/assistant`, `/mentor`, `/landing-page` (và auth) — xem từng file plan bên dưới.

**Archived UI context:** [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) maps the archived app (`archived/UniEdu-Web-3.9/frontend/`) to 5.0 routes and lists concrete files, services, and patterns to reuse for better model results when implementing each page.

## Route index

| Route | Role | Owner (Workplan) | Plan file |
| --- | --- | --- | --- |
| `/admin` | Admin | Huy | [admin.md](admin.md) |
| `/assistant` | Assistant | Minh | [assistant.md](assistant.md) |
| `/mentor` | Teacher | Huy | [mentor.md](mentor.md) |
| `/student` | Student | Minh | [student.md](student.md) |
| `/landing-page` | Public | Minh | [landing.md](landing.md) |
| Auth (login/logout) | All authenticated | Huy/Minh | [auth.md](auth.md) |

## Workplan phase mapping

- **Tuần 1:** Auth, layout, mock layer; landing wireframe.
- **Tuần 2:** `/admin` (dashboard, CRUD lớp, gán teacher/student).
- **Tuần 3:** `/mentor` (lớp, session, điểm danh, lesson notes, payroll/bonus view).
- **Tuần 4:** `/assistant` (thu phí, status, tasks).
- **Tuần 5:** `/student` (lịch học, tài liệu, payment read-only, profile).
- **Tuần 6:** `/landing-page` polish, migration rehearsal.
- **Tuần 7:** De-mock all routes; integration and UAT.
- **Tuần 8:** Launch checklist; no new page scope.

## Conventions

- All pages use **semantic tokens only** (see UI-Schema 3.2, 3.3).
- **Mock:** Tuần 1–6; **De-mock:** Tuần 7; **Production:** API-only from Tuần 8.
- Each plan lists: route/role, features, tokens & components, API/mock, DoD, accessibility.
