Labels: ready-for-agent

# PRD: Role Đào Tạo kiểm tra lịch toàn bộ lớp

## Problem Statement

Đội Đào Tạo cần một quyền vận hành riêng để mở trang lịch, nhìn lịch của tất cả lớp đang có trong hệ thống, và vào link Google Meet của một buổi học đang diễn ra để kiểm tra ngẫu nhiên. Hiện tại `/staff/calendar` chủ yếu phục vụ gia sư: lịch và filter lớp bị scope theo role `teacher`; các staff role không phải teacher bị chặn hoặc không có dữ liệu lịch toàn hệ thống. Nếu dùng admin shell thì quyền quá rộng so với nhu cầu kiểm tra lớp.

Đào Tạo cần workflow nhanh, rõ, không làm thay đổi dữ liệu lớp/buổi học, và không lộ thông tin học sinh không cần thiết.

## Solution

Thêm staff role first-class `training` với nhãn hiển thị **Đào Tạo**.

Nhân sự Đào Tạo dùng staff shell, vào `/staff/calendar`, thấy lịch toàn bộ lớp giống loại feed staff hiện tại: lịch cố định, lịch bù, và lịch thi. Khi bấm một event, popup lịch hiển thị thông tin cần cho kiểm tra lớp như lớp, thời gian, gia sư, trạng thái link Google Meet; không hiển thị tên/id học sinh cho Đào Tạo.

Trang lịch có nút bốc ngẫu nhiên từ các buổi học đang chạy. “Đang chạy” nghĩa là thời điểm hiện tại nằm trong `startTime`-`endTime` theo Asia/Ho_Chi_Minh. Random chỉ chọn sự kiện học có link Meet, không chọn lịch thi. Kết quả mở popup event; người dùng tự bấm **Vào Google Meet**.

Dashboard staff có section Đào Tạo với 4 metric: lớp có lịch hôm nay, sự kiện hôm nay, tổng lớp đang chạy, tổng khung lịch cố định. Section có CTA vào `/staff/calendar`.

## User Stories

1. As an admin, I want to assign the Đào Tạo role to a staff profile, so that staff can access training operations without becoming an admin.
2. As an admin, I want Đào Tạo to appear in every staff role picker, so that role assignment is consistent across the product.
3. As an admin, I want Đào Tạo to appear in role-based configuration surfaces, so that the role is treated as first-class.
4. As an admin, I want Đào Tạo to appear in audience/target selectors, so that communications and regulations can target this role when those surfaces support staff-role targeting.
5. As an Đào Tạo staff member, I want to see my Đào Tạo role label, so that I know I am in the correct workspace.
6. As an Đào Tạo staff member, I want to enter the staff shell, so that I can do my work without admin access.
7. As an Đào Tạo staff member, I want a sidebar entry for the class calendar, so that I can reach the checking workflow quickly.
8. As an Đào Tạo staff member, I want the calendar menu label to read as class calendar rather than teaching calendar, so that the UI matches my job.
9. As an Đào Tạo staff member, I want to view all running classes on `/staff/calendar`, so that I can pick any class for quality checking.
10. As an Đào Tạo staff member, I want to filter the calendar by class, so that I can focus on a specific class if needed.
11. As an Đào Tạo staff member, I want the class filter to include all running classes, so that the filter does not behave like a teacher-only list.
12. As an Đào Tạo staff member, I want to see lịch cố định, so that I can check regular class sessions.
13. As an Đào Tạo staff member, I want to see lịch bù, so that I can check one-off makeup classes too.
14. As an Đào Tạo staff member, I want to see lịch thi events in the same feed, so that the feed remains consistent with the existing staff calendar.
15. As an Đào Tạo staff member, I want event popups to show class name, time, and responsible teacher, so that I can verify I am opening the right class.
16. As an Đào Tạo staff member, I want event popups to show a Google Meet action when available, so that I can enter the class check quickly.
17. As an Đào Tạo staff member, I want event popups to show when there is no Google Meet link, so that I understand why I cannot enter a class.
18. As an Đào Tạo staff member, I want event popups not to show student names or student IDs, so that I only see data required for training checks.
19. As an Đào Tạo staff member, I want a random-check action, so that I can avoid manually choosing a class when I need spot checks.
20. As an Đào Tạo staff member, I want the random-check action to choose only currently running classes, so that the selected Meet link is useful immediately.
21. As an Đào Tạo staff member, I want random-check to skip events without Meet links, so that random selection does not land on an unusable event.
22. As an Đào Tạo staff member, I want random-check to skip exam events, so that I only enter live learning sessions.
23. As an Đào Tạo staff member, I want random-check to open the event popup, so that I can confirm the class before entering Meet.
24. As an Đào Tạo staff member, I want a clear empty state when no class is currently running, so that I know the button is not broken.
25. As an Đào Tạo staff member, I want the dashboard to show classes scheduled today, so that I understand today’s checking volume.
26. As an Đào Tạo staff member, I want the dashboard to show today’s event count, so that I know how many calendar items exist today.
27. As an Đào Tạo staff member, I want the dashboard to show total running classes, so that I understand the size of the active class base.
28. As an Đào Tạo staff member, I want the dashboard to show total fixed schedule slots, so that I understand recurring class coverage.
29. As an Đào Tạo staff member, I want a dashboard CTA to the calendar, so that the dashboard is useful as an entry point.
30. As a teacher, I want my staff calendar to remain scoped to my own classes, so that this new role does not broaden teacher access.
31. As a non-teacher, non-training staff member, I want calendar access rules to remain restrictive, so that staff do not accidentally get broad class visibility.
32. As an accountant staff member, I want my existing class/sidebar access to remain unchanged, so that the new role does not alter finance workflows.
33. As an assistant staff member, I want my existing admin-like staff shell access to remain unchanged, so that the new role does not regress operations.
34. As a developer, I want the Đào Tạo all-class calendar scope enforced by the backend, so that frontend filters cannot become an authorization boundary.
35. As a developer, I want student redaction handled at the backend payload boundary for Đào Tạo, so that sensitive data is not shipped to the browser unnecessarily.
36. As a developer, I want the random-running-class selection isolated in a testable module, so that time-window behavior can be validated without rendering the page.
37. As a developer, I want dashboard metrics generated by a backend section, so that the frontend only presents authoritative values.
38. As a maintainer, I want docs updated with the new workspace access matrix, so that future agents understand Đào Tạo permissions.
39. As a maintainer, I want the glossary to define Nhân sự Đào Tạo, so that the role name is consistent across docs and implementation.
40. As a maintainer, I want no audit logging in v1, so that the initial feature stays focused on access and checking workflow.

## Implementation Decisions

- Add `training` to the staff role enum and regenerate workspace-local Prisma artifacts. `training` is the canonical technical value; **Đào Tạo** is the UI label.
- Treat `training` as a first-class staff role wherever the product enumerates valid staff roles: profile roles, role labels, role pickers, role-targeted content/audience surfaces, and role-based settings.
- Do not create a new `UserRole`. Đào Tạo is a `StaffRole` because access is tied to staff operations, not account identity class.
- Use `/staff/calendar` for Đào Tạo. Do not create a new calendar route and do not route Đào Tạo through admin shell.
- Staff shell access allows `training` into `/staff` and `/staff/calendar`, but does not allow class detail routes, class mutation routes, session mutation routes, or admin routes.
- Calendar class filters must be backend-authoritative. Teacher staff remain scoped to classes they teach; training staff receive all running classes; unrelated staff remain rejected.
- Calendar events for training staff use the existing all-class calendar feed shape but with student fields redacted. Redaction should happen server-side before the response returns.
- The calendar event popup can be reused, but it must not render student information when the active viewer is Đào Tạo.
- Random-check behavior should be extracted into a small deep module that takes events, `now`, and timezone assumptions, then returns one eligible event or `null`.
- Random-check eligibility:
  - event is a learning session, not an exam;
  - event has a non-empty Meet link;
  - current local time is between event start and end;
  - if class filters are active in the visible calendar, random should respect the currently visible pool.
- Random-check action opens the event popup; it does not directly open Meet.
- Dashboard adds a `training` section to the staff dashboard contract with four values:
  - `todayClassCount`;
  - `todayEventCount`;
  - `runningClassCount`;
  - `fixedScheduleSlotCount`.
- Dashboard metrics should be computed by the backend and returned in the staff dashboard response only for staff with `training`.
- No audit log is required for random selection or opening Meet in v1.
- Documentation must be updated in the same implementation task because this changes role gates, staff shell access, page specs, and database schema.

## Testing Decisions

- Good tests should assert externally visible behavior: role access, API response scope, redaction, dashboard contract, random eligibility, and UI affordances. Avoid tests that pin internal helper names or component structure.
- Backend calendar controller/service tests:
  - `training` can fetch all-class calendar events.
  - `training` can fetch all running class filter options.
  - `teacher` remains scoped to their own class filters/events.
  - non-teacher, non-training staff remain forbidden where they are currently forbidden.
  - training calendar event payload redacts student identifiers and names.
- Backend dashboard tests:
  - staff with `training` receives the training dashboard section.
  - staff without `training` does not receive it.
  - the four metrics count today/running/fixed schedule data correctly.
- Frontend RBAC tests:
  - training staff can access `/staff` and `/staff/calendar`.
  - training staff cannot access `/staff/classes/[id]`.
  - existing teacher/accountant/assistant route expectations remain unchanged.
- Frontend random-selection tests:
  - selects only events where now is within start/end.
  - excludes exams.
  - excludes events without Meet links.
  - returns null when no eligible event exists.
- Frontend rendering tests:
  - Đào Tạo sidebar shows the calendar entry with class-calendar wording.
  - event popup for Đào Tạo does not show student names.
  - random-check opens the event popup rather than opening Meet directly.
- Prior art:
  - RBAC behavior should follow the existing staff/admin route access tests.
  - Calendar role behavior should follow existing calendar controller tests for teacher-scoped and admin-unscoped behavior.
  - Dashboard behavior should follow existing staff dashboard section tests and DTO contracts.

## Out of Scope

- No new admin shell for Đào Tạo.
- No access to class detail pages for Đào Tạo.
- No create/update/delete access for classes, lịch cố định, lịch bù, sessions, attendance, or Google Calendar sync.
- No audit log or tracking of random checks in v1.
- No direct Meet auto-open from the random-check button.
- No new scheduling business rules.
- No change to teacher calendar scoping.
- No change to Google Calendar as a bản chiếu; the lịch học hệ thống remains the source of truth.

## Further Notes

- The domain glossary should gain **Nhân sự Đào Tạo** as the canonical term for staff whose job is checking live classes from the all-class calendar.
- The implementation should preserve backend-first authorization. Frontend filters and route guards improve UX but must not be the only enforcement.
- If implementation discovers existing role-list constants that intentionally exclude some role-based settings, update the PRD-linked issue or docs rather than silently omitting `training`.
- Because this touches Prisma enum values, use workspace-local generate/build commands only.
