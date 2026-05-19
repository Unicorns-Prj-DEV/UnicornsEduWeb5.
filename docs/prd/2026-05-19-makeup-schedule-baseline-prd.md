# PRD: Lịch học bù dựa trên lịch học cố định của lớp

## Problem Statement

Admin, assistant và gia sư đang cần thêm, xóa, điều chỉnh lịch học bù cho một lớp, nhưng logic hiện tại chưa dùng lịch học cố định của lớp làm baseline. Form tạo lịch bù đang dùng giờ mặc định cứng, danh sách trong trang chi tiết lớp chỉ nhìn các lịch từ hôm nay trở đi, và một số thao tác như xóa note, validate thời gian, retry Google Calendar hoặc sửa/xóa lịch bù của chính gia sư chưa nhất quán.

Từ góc nhìn vận hành, lịch học bù phải là một biến thể có kiểm soát của lịch học cố định: biết nó bù cho slot nào, ngày gốc nào, gia sư nào chịu trách nhiệm, có đổi ngày/giờ/gia sư hay không, và trạng thái đồng bộ Google Calendar ra sao. Nếu không có baseline này, dữ liệu dễ lệch giữa class detail, calendar feed, Google Calendar và lịch sử buổi học.

## Solution

Xây dựng lại trải nghiệm lịch học bù theo mô hình "makeup event as an override of a fixed schedule occurrence".

Người dùng chọn một slot lịch học cố định hoặc một occurrence trong khoảng ngày đang xem, hệ thống prefill ngày, giờ, gia sư từ baseline đó, rồi cho phép đổi sang ngày/giờ bù và ghi rõ lý do/note. Backend lưu đủ thông tin liên kết về baseline, validate time range và teacher membership ở boundary, ghi audit trail, và đồng bộ Google Calendar theo trạng thái có thể retry.

Trang chi tiết lớp hiển thị lịch bù theo range/tháng đang chọn, hỗ trợ upcoming/history rõ ràng, cho phép sửa/xóa đúng quyền, và đảm bảo mọi mutation làm mới dữ liệu liên quan trong class detail và calendar views.

## User Stories

1. As an admin, I want to create a makeup event from a fixed schedule slot, so that the makeup inherits the class, tutor, start time, and end time from the official class schedule.
2. As an admin, I want to see which fixed schedule slot a makeup event belongs to, so that I can audit why the makeup exists.
3. As an admin, I want to choose the original date being made up, so that the makeup can be tied to the missed occurrence.
4. As an admin, I want the makeup form to prefill from the selected occurrence, so that I do not manually re-enter class schedule data.
5. As an admin, I want to adjust the makeup date, so that a missed class can be rescheduled.
6. As an admin, I want to adjust the makeup start and end time, so that the rescheduled class can use a different time window.
7. As an admin, I want to adjust the responsible tutor within the class teacher list, so that substitutions are explicit and validated.
8. As an admin, I want to add a note or reason for the makeup, so that staff understand why the event exists.
9. As an admin, I want to clear a note from a makeup event, so that stale or incorrect notes can be removed.
10. As an admin, I want to delete a makeup event, so that canceled makeup classes do not remain visible.
11. As an admin, I want delete to handle Google Calendar reliably, so that external calendar events do not become orphaned.
12. As an admin, I want failed calendar deletes to remain recoverable, so that support can retry instead of losing the event ID.
13. As an assistant, I want the same makeup schedule management flow as admin where allowed, so that class operations are consistent.
14. As an assistant, I want validation errors in Vietnamese, so that I can correct data without guessing.
15. As a teacher, I want to create a makeup event for a class I teach, so that I can schedule makeups without asking admin for every case.
16. As a teacher, I want the responsible tutor field locked to myself when using teacher self-service, so that I cannot accidentally create events under another tutor.
17. As a teacher, I want to edit my own makeup event if it has not been linked to a completed session, so that I can correct date, time, or note.
18. As a teacher, I want to delete my own makeup event if it was created by mistake and is still safe to remove, so that the schedule stays clean.
19. As a teacher, I want to see only makeup events relevant to my teaching scope in the staff workspace, so that unrelated class data is not exposed.
20. As customer care, I want to view makeup events for classes I can access, so that I can answer parent and student questions.
21. As operations, I want makeup events to be listed by the selected month or date range in class detail, so that past and future events are both reachable.
22. As operations, I want upcoming and historical makeup events to be visually distinct, so that current action items are easy to scan.
23. As operations, I want a makeup event linked to a future session when the session is created from it, so that class history and schedule planning stay connected.
24. As operations, I want linked makeup events protected from unsafe edits, so that completed or financial records are not silently invalidated.
25. As operations, I want backend validation to reject end time before or equal to start time, so that direct API calls cannot persist invalid schedules.
26. As operations, I want backend validation to reject a tutor outside the class teacher list, so that official class ownership remains consistent.
27. As operations, I want backend validation to reject a baseline schedule entry that does not belong to the class, so that makeup data cannot reference another class.
28. As operations, I want backend validation to preserve valid Google Calendar metadata across edits, so that updates modify the correct external event.
29. As operations, I want every create, update, delete, and resync action recorded in action history, so that schedule changes are auditable.
30. As operations, I want clear calendar sync status on makeup events, so that staff know whether the external calendar is current.
31. As operations, I want manual resync for a makeup event, so that failed Google Calendar writes can be retried.
32. As operations, I want calendar feed and class detail to normalize makeup event IDs the same way, so that edit/delete targets the correct record.
33. As a developer, I want a single backend validation path for makeup schedule mutations, so that admin, assistant, and staff routes behave consistently.
34. As a developer, I want a deep module for makeup schedule rules, so that baseline resolution, permissions, validation, and mutation decisions can be tested without UI.
35. As a developer, I want frontend DTOs to remain centralized, so that pages and components do not drift in payload shape.
36. As a developer, I want tests for external behavior rather than component internals, so that refactors do not break useful coverage.
37. As a developer, I want docs updated for schema, routes, and calendar behavior, so that future agents understand the intended model.

## Implementation Decisions

- Model a makeup event as an override of a fixed schedule occurrence.
- Add persistent baseline metadata to makeup schedule events: the fixed schedule entry identifier, the original occurrence date, and optional baseline start/end/tutor snapshot if needed for audit stability.
- Keep the class fixed schedule JSON as the source of truth for recurring weekly patterns.
- Keep makeup events as one-off records, not recurring schedule entries.
- Add a backend makeup schedule rules module with a narrow interface for resolving baseline, validating time ranges, validating class teacher membership, deciding edit/delete safety, and preparing persistence payloads.
- Use the same backend rules module from admin calendar routes, class-scoped admin routes, and staff-ops routes.
- Treat `startTime < endTime` as a backend invariant, not only a frontend convenience.
- Treat "responsible tutor belongs to class teachers" as a backend invariant.
- Allow note clearing by distinguishing omitted fields from explicit empty values in update payloads.
- Keep Google Calendar event ID recoverable when external delete fails; do not silently lose the only retry handle.
- Add explicit mutation audit records for makeup create, update, delete, and Google Calendar resync.
- Align teacher self-service rules: if teachers can create their own makeup events, they should be able to edit/delete their own safe, unlinked makeup events under the same ownership rules.
- Keep class detail makeup lists range-scoped, preferably tied to the selected month with pagination or explicit upcoming/history tabs.
- Keep class detail and calendar views using the same normalized source event identifier for makeup edit/delete actions.
- Keep frontend server state in TanStack Query and shared API clients.
- Keep frontend DTOs and enums centralized in the DTO layer.
- Update calendar and class route docs after implementation.

## Testing Decisions

- Good tests should cover externally visible behavior: accepted/rejected payloads, persisted state, returned DTOs, permissions, audit side effects, and Google Calendar sync outcomes. Do not test private implementation details or DOM structure that does not affect behavior.
- Backend unit tests should cover the makeup schedule rules module: baseline resolution, invalid baseline, teacher not in class, missing teacher, invalid time range, explicit note clearing, linked-session edit/delete restrictions, and safe delete behavior.
- Backend service tests should cover create, update, delete, list, and resync through the public service/controller behavior.
- Backend permission tests should cover admin, assistant, teacher self-service, and non-teacher staff access.
- Calendar sync tests should cover create/update success, stale Google event recreation, external delete failure, and retryable sync status.
- Frontend component tests should cover creating from a baseline schedule occurrence, editing date/time/note, clearing note, delete confirmation, disabled states, and query invalidation behavior.
- API client tests should cover normalization of makeup event identifiers from both class-scoped and calendar feed responses.
- Existing class schedule tests are useful prior art because they already validate schedule entry IDs, teacher membership, and Google Calendar preservation semantics.

## Out of Scope

- Reworking the fixed class schedule editor itself.
- Reworking session attendance, tuition, allowance, or teacher payment calculations.
- Automatically generating sessions from all makeup events.
- Migrating historical makeup records to perfect baseline links when the original fixed schedule entry cannot be inferred.
- Changing the general Google Calendar integration for recurring class schedules beyond what makeup events need.
- Creating a new calendar UI from scratch.

## Further Notes

- Existing records without baseline metadata should remain readable and editable with a legacy fallback, but new records should be created with baseline metadata whenever possible.
- If historical migration is desired later, handle it as a separate data cleanup task with explicit acceptance criteria.
- The implementation should keep route parity between admin and staff workspaces where the domain behavior is shared.
