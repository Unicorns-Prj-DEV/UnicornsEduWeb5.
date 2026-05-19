# PRD: Điều chỉnh trạng thái học sinh và nhân sự

## Problem Statement

Admin cần một cách rõ ràng, an toàn và nhất quán để chuyển học sinh giữa trạng thái **đang học** và **nghỉ học**, cũng như chuyển staff giữa **hoạt động** và **ngừng hoạt động**. Codebase hiện đã có nền tảng dữ liệu và một phần UI chỉnh sửa trạng thái, nhưng semantics vận hành chưa đủ chặt: danh sách chưa có bộ lọc/trạng thái thao tác nhanh đầy đủ, các picker phân công vẫn có nguy cơ đưa hồ sơ inactive vào luồng mới, và quyền truy cập workspace hiện dựa vào trạng thái tài khoản user chứ chưa dựa vào trạng thái hồ sơ học sinh/staff.

Kết quả là trạng thái inactive có thể chỉ là nhãn hiển thị, chưa chắc ngăn được phân công mới, roster lớp, lesson task, CSKH assignment, hoặc workspace access. Với dữ liệu học tập và vận hành nhân sự, trạng thái cần là một rule backend-first, không chỉ là field UI.

## Solution

Tạo một luồng quản trị trạng thái thống nhất:

- Học sinh có hai trạng thái hiển thị: **Đang học** và **Nghỉ học**.
- Staff có hai trạng thái hiển thị: **Hoạt động** và **Ngừng hoạt động**.
- Backend là nguồn sự thật cho mọi rule nghiệp vụ liên quan đến trạng thái.
- Khi học sinh chuyển sang nghỉ học, backend đóng các membership lớp đang active để học sinh không còn nằm trong roster vận hành chính.
- Khi học sinh chuyển lại đang học, backend chỉ mở lại hồ sơ; admin phải gán lại lớp nếu học sinh quay lại học lớp cụ thể.
- Khi staff chuyển sang ngừng hoạt động, staff không còn được chọn cho phân công mới như gia sư lớp, CSKH, trợ lí quản lý, lesson task, extra allowance assignee.
- Các assignment lịch sử vẫn được giữ để đối soát, thanh toán, báo cáo và audit.
- Workspace access dùng trạng thái hồ sơ: inactive staff không mở staff/admin-through-staff workspace; inactive student không mở student workspace. Trạng thái tài khoản user vẫn là lớp khóa đăng nhập toàn cục riêng.
- UI danh sách và chi tiết hiển thị trạng thái bằng label rõ ràng, có filter trạng thái, thao tác chuyển trạng thái có xác nhận, toast Sonner và invalidation React Query đúng scope.

## User Stories

1. As an admin, I want to see whether each student is đang học or nghỉ học, so that I can understand who is operationally active.
2. As an admin, I want to filter the student list by đang học or nghỉ học, so that I can quickly review active and inactive student records.
3. As an admin, I want to switch a student from đang học to nghỉ học from the student detail flow, so that the system stops treating them as an active learner.
4. As an admin, I want a confirmation before marking a student nghỉ học, so that I do not accidentally remove them from active operations.
5. As an admin, I want the confirmation to explain that active class memberships will be closed, so that I understand the operational impact.
6. As an admin, I want a student marked nghỉ học to disappear from active class rosters, so that attendance and session workflows do not include them.
7. As an admin, I want historical class membership records to remain visible after a student nghỉ học, so that tuition and audit history stays intact.
8. As an admin, I want to reactivate a student as đang học without automatically rejoining old classes, so that re-enrollment is explicit.
9. As an admin, I want to assign classes to a reactivated student, so that returning students can resume learning in the correct class.
10. As an admin, I want inactive students excluded from new class student pickers by default, so that inactive records are not accidentally enrolled.
11. As an admin, I want inactive students searchable through explicit filters, so that old records remain recoverable.
12. As an admin, I want status changes to be audited, so that every transition has actor, before value, and after value.
13. As an assistant, I want to view student status and filter students by status if I have student read access, so that I can support operations without changing status.
14. As an accountant, I want inactive students to remain visible in payment and wallet history, so that finance reconciliation remains complete.
15. As a student whose profile is nghỉ học, I should not access the student workspace, so that inactive profiles cannot use active learner workflows.
16. As an admin, I want to see whether each staff member is hoạt động or ngừng hoạt động, so that I can manage staffing capacity.
17. As an admin, I want to filter the staff list by hoạt động or ngừng hoạt động, so that I can separate active staff from historical staff.
18. As an admin, I want to switch staff from hoạt động to ngừng hoạt động with confirmation, so that staff deactivation is deliberate.
19. As an admin, I want the confirmation to explain that inactive staff cannot receive new assignments, so that I understand the downstream effect.
20. As an admin, I want inactive staff to remain visible in historical class, session, payment and bonus records, so that past work remains auditable.
21. As an admin, I want inactive staff excluded from class teacher pickers, so that new or edited classes are staffed only by active staff.
22. As an admin, I want inactive staff excluded from CSKH staff pickers, so that new student care assignments use active CSKH staff.
23. As an admin, I want inactive staff excluded from assistant manager pickers, so that customer-care management cannot be assigned to inactive assistants.
24. As an admin, I want inactive staff excluded from lesson task and extra allowance assignee pickers, so that new work does not route to inactive people.
25. As an admin, I want existing active class assignments for an inactive staff member to be highlighted, so that I can clean them up manually.
26. As a staff member marked ngừng hoạt động, I should not access staff workspace features, so that inactive staff cannot operate in the system.
27. As a staff-admin marked ngừng hoạt động, I should not retain admin access through staff roles, so that status changes immediately affect delegated admin access.
28. As an admin, I want status changes to invalidate auth/session cache, so that access changes take effect without waiting for stale cache expiry.
29. As an admin, I want status changes to invalidate list/detail/query caches, so that UI reflects the new status immediately.
30. As a developer, I want status semantics centralized in a backend policy module, so that future features reuse the same rules instead of duplicating ad hoc filters.
31. As a developer, I want tests around status transitions, assignment eligibility and auth access, so that future changes cannot accidentally reintroduce inactive records into active workflows.
32. As a developer, I want docs updated with the status semantics, so that agents and humans know the difference between user account status, staff/student profile status, and class membership status.

## Implementation Decisions

- Reuse existing `active` and `inactive` enum values for both student profile status and staff profile status.
- Standardize Vietnamese labels in UI: student `active` = **Đang học**, student `inactive` = **Nghỉ học**; staff `active` = **Hoạt động**, staff `inactive` = **Ngừng hoạt động**.
- Treat profile status as an operational eligibility flag, not as a destructive delete.
- Keep user account status separate. User account inactive means login/session blocked globally. Student/staff profile inactive means that workspace/profile is not operationally active.
- Introduce or centralize a backend status policy module with a small interface for:
  - checking whether a student profile can be used in active learning workflows,
  - checking whether a staff profile can be assigned new work,
  - mapping status transitions to side effects,
  - producing stable labels/reasons for errors.
- Add explicit status transition commands for student and staff profiles. These commands should be the preferred write surface for status changes instead of relying on generic edit forms.
- Restrict student/staff status transitions to the full admin tier. Read/filter remains available to existing read roles.
- When a student transitions to nghỉ học, deactivate all active class memberships in the same transaction and write audit history.
- When a student transitions to đang học, update the profile only; do not automatically reactivate old class memberships.
- When a staff profile transitions to ngừng hoạt động, keep historical assignments intact but prevent new active assignments.
- Do not auto-delete staff from existing class teachers, schedules, lesson tasks, payments or bonus records during deactivation. Instead, expose warnings where the inactive staff remains attached to active work.
- Update auth access resolution so inactive staff profile does not produce staff workspace access or staff-derived admin access, and inactive student profile does not produce student workspace access.
- Invalidate auth identity/access cache after any student/staff profile status transition.
- Update list APIs to support first-class status filtering and define default behavior explicitly. Admin list views can show all by default, but assignment/search option endpoints should default to active-only.
- Update staff option endpoints so customer-care, assistant, class teacher, lesson task and extra allowance assignment options only return active staff unless an explicit historical lookup is needed.
- Update student option endpoints used for class assignment so they only return active students unless an explicit historical lookup is needed.
- Update class roster and scheduling guards to reject inactive student or staff IDs on new assignments even if the frontend sends them.
- Keep detail pages capable of opening inactive records for audit, finance and historical review.
- Add status filters to student and staff list pages and include status in React Query keys.
- Add a clear status chip and quick action on detail pages. List-row quick actions are optional; if included, they must use confirmation and not fight row navigation.
- Use existing shared UI conventions: React Query for server state, Axios client, Sonner toasts, `UpgradedSelect` for simple status filters/selects, and existing modal styles.
- Update route docs and database docs in the implementation task because this changes workspace access semantics and status behavior.

## Testing Decisions

- Good tests should verify externally visible behavior: returned API data, rejected assignments, status transition side effects, auth access output, and UI state after user actions. Avoid testing internal implementation details like private helper call order.
- Add backend unit tests for the status policy module. Cover active/inactive student and staff eligibility, transition side effects, and error reasons.
- Add student service tests for:
  - filtering by status,
  - marking a student nghỉ học,
  - deactivating active class memberships during nghỉ học,
  - reactivating profile without restoring class memberships,
  - invalidating auth cache for linked user,
  - rejecting inactive students in new class assignments.
- Add staff service tests for:
  - filtering by status,
  - marking staff ngừng hoạt động,
  - preserving historical assignments,
  - excluding inactive staff from active option endpoints,
  - rejecting inactive staff in new class, CSKH, assistant, lesson task and extra allowance assignments,
  - invalidating auth cache for linked user.
- Add auth access tests for:
  - inactive staff profile removes staff workspace access,
  - inactive staff profile removes staff-derived admin access,
  - inactive student profile removes student workspace access,
  - inactive user account still blocks JWT validation globally.
- Extend existing RBAC metadata tests so status transition endpoints require full admin tier.
- Add frontend tests if the project has the relevant test harness available; otherwise rely on typecheck/lint plus manual browser verification for:
  - student status filter,
  - staff status filter,
  - status transition confirmation,
  - success/error toast,
  - list/detail query invalidation.
- Prior art exists in current backend service specs for student, staff, user, auth access, RBAC metadata, class membership updates and lesson task assignee validation.

## Out of Scope

- Deleting student or staff records.
- Automatically settling unpaid tuition, wallet balances, staff payments or bonuses when status changes.
- Automatically removing inactive staff from all historical classes, sessions, schedules, lesson outputs or payment records.
- Designing a leave-of-absence workflow with start/end dates, reasons and approval states beyond the existing binary active/inactive status.
- Bulk status changes for many students or staff in one action.
- Replacing the existing user account status system.
- Changing Prisma enum names away from `active` and `inactive`.
- Migrating historical data beyond any required backfill for null or inconsistent status values.

## Further Notes

Current codebase review found these important starting points:

- Student and staff profile tables already have status fields with active defaults.
- Backend DTOs and generic update APIs already accept status for student and staff profiles.
- Student and staff detail edit popups already include status selects and send status in update payloads.
- Student and staff list pages currently display status indicators, but do not expose complete status filters or quick transition flows.
- Student and staff frontend API wrappers already support status query params, but list pages are not consistently wiring them into URL state and query keys.
- Staff update is already protected more tightly than broad read/list routes; student status transitions need a clearer full-admin-only command surface.
- Auth access currently uses user status and profile existence; profile status is not yet part of workspace access resolution.
- Class, lesson and assignment workflows need backend guards so inactive profiles cannot be reintroduced by stale UI or direct API calls.
- Existing docs mention class membership active/inactive semantics, but profile-level student/staff status semantics need to be documented during implementation.

Suggested implementation order:

1. Define status semantics and backend policy module.
2. Add explicit status transition endpoints and full-admin permission tests.
3. Add student transition side effects, especially closing active class memberships on nghỉ học.
4. Add staff assignment eligibility restrictions and active-only option endpoints.
5. Update auth access and cache invalidation.
6. Update frontend filters, labels and confirmation flows.
7. Update route/database docs.
8. Run backend specs, frontend typecheck/lint, and browser smoke checks for admin and staff route parity.
