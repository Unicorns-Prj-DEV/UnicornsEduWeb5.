# Mentor – `/mentor`

> Ghi chú runtime hiện tại: teacher workspace đang được phục vụ tạm qua `/staff` cho `staff.teacher`, gồm list lớp được assign và class detail cho sửa khung giờ + thao tác session không dính finance. `/mentor` vẫn là page plan cho workspace teacher chuyên biệt ở phase sau.

## Route and role

- **Path:** `/mentor`
- **Role:** `teacher` only (guard must block non-teachers).
- **Workplan owner:** Huy (Frontend – Product Flow).

## Features

- **Lớp phụ trách:** List classes assigned via `class_teachers`; only data for current teacher.
- **Sessions:** View and manage sessions per class; open/close as per product rules.
- **Điểm danh:** Record attendance (`present` / `excused` / `absent`); sync with backend state machine and financial impact.
- **Lesson notes:** Add and edit notes for sessions; persisted and retrievable.
- **Payroll / bonus (view):** Read-only view of own `payroll` and `bonuses`; no edit from this route (or per product rule).
- **Unified permission:** Single source of truth for teacher/mentor access; no conflicting redirects (per Workplan Tuần 3).

## UI-Schema tokens and components

- **Navbar / Sidebar:** `bg-surface` / `bg-secondary`, `text-primary` / `text-secondary`, `border-default`; item hover `bg-tertiary`; active `primary` + `text-inverse`.
- **Cards (class, session):** `bg-surface`, `text-primary`, `border-default`; hover `bg-elevated`, subtle `border-focus`.
- **Tables (attendance, payroll):** Header `bg-secondary`; rows `bg-surface`; `border-default`; row hover `bg-secondary`.
- **Buttons:** Primary = `primary` + `text-inverse`; Secondary = `secondary` + `border-default`.
- **Inputs and textareas:** `bg-surface`, `text-primary`, `border-default`; focus `border-focus`.
- **Badges (attendance):** Present = success; Excused = warning; Absent = error/danger; with icon/label.
- **Alerts:** Status tint; stable, readable.

## Data and API

- **Backend domain:** `lesson_plans`, `lesson_tasks`, `sessions`, `attendance`, `payroll`, `bonuses` (Workplan route-to-domain map).
- **Mock (Tuần 3–6):** Scenarios: class with no sessions, session locked, permission denied; flow and contract aligned for de-mock.
- **De-mock (Tuần 7):** Core data (class, session, attendance) from real API; optional mock only for endpoints not yet available.
- **API (real):** Lesson, session, attendance, payroll, bonuses endpoints.

## DoD and week

- **Tuần 3:** Teacher sees only assigned classes; attendance and lesson notes persist and reload correctly; payroll/bonus records with validation; frontend `/mentor` complete with mock and ready for API swap in Tuần 7.

## Accessibility

- Attendance and status not by color only; focus visible on interactive elements.
- Contrast AA for text and controls.

## Archived context (for implementation)

See [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) for full mapping.

- **Teacher home:** `archived/.../Layout.tsx` — teacher sees “Trang chủ” (path `/home`) instead of Dashboard; top nav only.
- **Classes (assigned):** Filter classes by current teacher via `class_teachers`; list/detail pattern from `pages/Classes.tsx` and `pages/ClassDetail.tsx`.
- **Sessions + attendance:** ClassDetail: month picker, create/edit/delete session; saveAttendanceForSession, fetchAttendanceBySession; AttendanceStatus present/excused/absent; useAttendance, useSessionFinancials.
- **Lesson notes:** Persisted in session or lesson context; add/edit in ClassDetail or equivalent mentor view.
- **Lesson plans:** `pages/LessonPlans.tsx`; lessonPlansService; visible if teacher has staff role `lesson_plan`.
- **Payroll/bonus (read-only):** Use payroll/bonuses endpoints; table/card pattern from archived if available.
- **Layout:** Non-admin top nav (tabs + theme + user card + logout); no sidebar.
