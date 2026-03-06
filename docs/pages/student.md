# Student – `/student`

## Route and role

- **Path:** `/student`
- **Role:** `student` only (guard must block other roles).
- **Workplan owner:** Minh (Frontend – UX + Assistant/Student).

## Features

- **Lịch học:** Timetable from `student_classes` and sessions; read-only.
- **Tài liệu:** Access `documents` (Content) for own classes/courses.
- **Lịch sử đóng tiền:** Read-only list of payments; no create/update from this route.
- **Profile:** View and update own profile (allowed fields per product); no access to other students’ data.
- **Data scope:** All data scoped to current student; backend enforces by identity.

## UI-Schema tokens and components

- **Navbar / Sidebar:** `bg-surface` / `bg-secondary`, `text-primary` / `text-secondary`, `border-default`; hover and active per component mapping.
- **Cards (schedule, document, payment row):** `bg-surface`, `text-primary`, `border-default`; hover `bg-secondary` or `bg-elevated`.
- **Tables / lists:** Header `bg-secondary`; row `bg-surface`; `border-default`; row hover `bg-secondary`.
- **Buttons:** Primary = `primary` + `text-inverse`; Secondary = `secondary` + `border-default`.
- **Inputs (profile):** `bg-surface`, `text-primary`, `border-default`; focus `border-focus`.
- **Badges (payment status):** Same status tints as other routes; icon + label.
- **Tags (e.g. document type):** `bg-secondary`, `text-secondary`, `border-subtle`; selected `primary` + `text-inverse`.

## Data and API

- **Backend domain:** `student_classes`, `documents`, `payments` (read-only for payments) (Workplan route-to-domain map).
- **Mock (Tuần 5–6):** Full flow with mock; contract locked for profile, timetable, payment history, documents.
- **De-mock (Tuần 7):** All main flows use real API; mock only for skeleton/loading regression if needed.
- **API (real):** Student profile, timetable, payment history (read), documents.

## DoD and week

- **Tuần 5:** Student sees only own data; payment data read-only; profile update allowed within scope; frontend `/student` complete with mock and contract locked for Tuần 7 integration.

## Accessibility

- Tables/lists with clear structure; status and links not by color only.
- Focus and contrast AA per UI-Schema.

## Archived context (for implementation)

See [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) for full mapping.

- **Own profile / read-only scope:** `archived/.../pages/StudentDetail.tsx` — when viewer is student and `user.linkId === id`: profile view/edit, no admin actions (canManageStudentRecord false, canTopUp false); accountIconMode `'self'` for login info.
- **Timetable / schedule:** `pages/Schedule.tsx` — weekly calendar, fetchSessions by date range; in 5.0 scope to current student’s classes/sessions only.
- **Payment history (read-only):** Reuse list/table pattern from `pages/Payments.tsx` but no create/update/delete; fetchPayments or equivalent filtered by current student.
- **Documents:** If present in archived (documentsService), reuse for “tài liệu” under student scope.
- **Layout:** Student uses top nav (no sidebar); same Layout pattern as teacher in archived.
