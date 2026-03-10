# Admin – `/admin`

## Route and role

- **Path:** `/admin`
- **Role:** `admin` only (guard must block other roles).
- **Workplan owner:** Huy (Frontend – Product Flow).

## Features

- **Dashboard (sơ bộ):** Tổng quan lớp, nhân sự, doanh thu (data from `revenue`, `dashboard_cache`).
- **CRUD lớp:** List, create, edit, archive classes; fields aligned with `classes` + relations.
- **Gán học sinh / giáo viên:** Manage `class_teachers`, `student_classes`; prevent duplicate N-N rows.
- **Sessions và attendance:** Mở session, ghi nhận attendance (`present` / `excused` / `absent`) with financial impact per Workplan state machine.
- **Route registry:** This route documented with auth mode, allowed role(s), and backend endpoint contract.

## UI-Schema tokens and components

- **Navbar:** `bg-surface`, `text-primary`, bottom `border-default`; item hover `bg-secondary`; active item `primary` + `text-inverse`.
- **Sidebar:** `bg-secondary`, `text-secondary`, right `border-default`; item hover `bg-tertiary`; active `primary` + `text-inverse`.
- **Cards:** `bg-surface`, `text-primary`, `border-default`; hover `bg-elevated` and subtle `border-focus`.
- **Tables:** Header `bg-secondary`; row `bg-surface`; `border-default` row separators; row hover `bg-secondary`; selected row `secondary`.
- **Buttons:** Primary = `primary` / `text-inverse`; Secondary = `secondary` + `border-default`.
- **Inputs:** `bg-surface`, `text-primary`, `border-default`; focus `border-focus`.
- **Badges (status):** Status tint (success/warning/error/info) with 12–16% alpha; text and border per UI-Schema.
- **Alerts:** Status tint background; icon + label for accessibility.

## Data and API

- **Backend domain:** `users`, `classes`, `sessions`, `attendance`, `revenue`, `dashboard_cache` (Workplan route-to-domain map).
- **Mock (Tuần 2–6):** Mock contract pack for admin: class list (empty + many students), permission denied, validation errors.
- **De-mock (Tuần 7):** Replace mock with real API per endpoint; checklist per screen/endpoint.
- **API (real):** `users`, `classes`, `sessions`, `attendance`, `class_teachers`, `student_classes`, dashboard/revenue endpoints.
- **Users CRUD endpoints (dùng qua FE api hooks ở `apps/web/lib/apis/staff.api.ts` và `apps/web/lib/apis/student.api.ts`):**
  - `GET /users`
  - `GET /users/:id`
  - `POST /users`
  - `PATCH /users`
  - `DELETE /users/:id`
  - Các endpoint này đi qua global JWT guard (không `@Public`) và chỉ cho role `admin`.

## DoD and week

- **Tuần 2:** Admin can create class, assign teacher/student, open session, record attendance; N-N no duplicates; attendance idempotency test; frontend `/admin` complete with mock and de-mock checklist.

## Accessibility

- Tables with proper headers and scope; status not by color only.
- Focus visible (`border-focus`); contrast AA on text and controls.

## Archived context (for implementation)

See [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) for full mapping.

- **Dashboard:** `archived/UniEdu-Web-3.9/frontend/src/pages/Dashboard.tsx` — period filter (month/quarter/year), quick-view tabs (finance, operations, students), DualLineChart, fetchDashboardData / fetchQuickViewData; redirect teacher to /home.
- **Classes CRUD + sessions/attendance:** `pages/Classes.tsx` (list), `pages/ClassDetail.tsx` (detail: students, sessions, attendance, surveys, header tuition, bulk actions); classesService, sessionsService, attendanceService; useAttendance, useSessionFinancials.
- **Students CRUD + assign:** `pages/Students.tsx`, `pages/StudentDetail.tsx`; studentsService, classesService; filters (search, status, classId, province); N-N via student_classes.
- **Personnel:** `pages/Teachers.tsx`, `pages/Staff.tsx`, `pages/StaffDetail.tsx`, `pages/StaffCSKHDetail.tsx`; teachersService, staffService; staff roles (accountant, lesson_plan, etc.).
- **Costs / categories:** `pages/Costs.tsx`, `pages/Categories.tsx`; costsService, categoriesService.
- **Action history:** `pages/ActionHistory.tsx`; actionHistoryService; admin-only in sidebar.
- **Layout:** Admin uses sidebar only (`Layout.tsx`, `Sidebar.tsx`); menu items filtered by role and requireStaffRole.
