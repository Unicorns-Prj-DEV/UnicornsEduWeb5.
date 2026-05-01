---
date: 2026-04-29T01:10:39+07:00
researcher: sunny
git_commit: 5052469298776fb293c59c5653e265bf86480925
branch: main
repository: UnicornsEduWeb5.
topic: "Behavior hiện tại của max_allowance trong mối quan hệ teacher-class khi tính học phí/allowance"
tags: [research, codebase, class, session, allowance, max-allowance]
status: complete
last_updated: 2026-04-29
last_updated_by: sunny
---

# Research: Behavior hiện tại của `max_allowance`

**Date**: 2026-04-29T01:10:39+07:00  
**Researcher**: sunny  
**Git Commit**: `5052469298776fb293c59c5653e265bf86480925`  
**Branch**: `main`  
**Repository**: `UnicornsEduWeb5.`

## Research Question
Hiện tại behavior của trường `max_allowance` trong quan hệ teacher-class khi tính học phí/allowance là gì, đặc biệt với case lớp không có `max_allowance`.

## Summary
`max_allowance_per_session` hiện được lưu ở cấp `Class` và là field nullable. Trong backend, công thức aggregate allowance đang dùng mẫu `LEAST(COALESCE(max_allowance_per_session, base), base)`, nên khi `max_allowance_per_session = null` thì hệ thống coi như **không giới hạn trần** (kết quả bằng `base`).  

Tuy nhiên ở frontend, một số form class đang dùng sentinel `100_000_000` để biểu diễn "không giới hạn", và logic preview ở popup tạo session chỉ cap khi `maxAllowancePerSession > 0`. Điều này tạo behavior hiện tại là backend authoritative cho tính lương/học phí aggregate, còn UI có thêm convention "unlimited sentinel".

## Implementation Decisions
- Chuẩn hóa semantics "không giới hạn max allowance" về `null` end-to-end (frontend không còn dùng sentinel `100_000_000`).
- Giữ nguyên behavior aggregate historical hiện tại: `max_allowance_per_session` tiếp tục được đọc động từ `classes` khi query, không snapshot thêm vào `sessions`.

## Detailed Findings

### 1) Nơi lưu dữ liệu `max_allowance`
- Schema Prisma định nghĩa `Class.maxAllowancePerSession` là `Int?` map vào cột `max_allowance_per_session` (`apps/api/prisma/schema/learning.prisma`).
- DTO backend nhận `max_allowance_per_session` optional và `@Min(0)` (`apps/api/src/dtos/class.dto.ts`).
- Class service chỉ ghi đè khi field được gửi lên (`!== undefined`) trong flow update basic info (`apps/api/src/class/class.service.ts`).

### 2) Quan hệ với teacher-class allowance
- Quan hệ teacher-class lưu tại `class_teachers.custom_allowance` (allowance theo giáo viên cho lớp), fallback từ `classes.allowance_per_session_per_student` khi update danh sách giáo viên (`apps/api/src/class/class.service.ts`).
- Khi tạo/cập nhật session, nếu payload có `allowanceAmount` thì dùng giá trị đó; nếu không thì backend tính `computeDefaultSessionAllowanceAmountVnd` (per-student × sĩ số present/excused + `classes.scale_amount`) (`session-allowance.util.ts`, `session-create.service.ts`, `session-update.service.ts` khi đổi lớp/gia sư).

### 3) Nơi `max_allowance_per_session` được áp vào công thức
- `max_allowance_per_session` không phải field snapshot trên session; nó được join từ bảng `classes` trong các truy vấn aggregate/report.
- `sessions.allowance_amount` lưu **gốc đã gồm scale lớp** (per-student × present/excused + `scale_amount`); SQL **không** cộng `classes.scale_amount` thêm lần nữa.
- `SessionReportingService` / `StaffService` (CTE `teacher_session_gross`) / `DashboardService` áp dụng:
  - `base = coefficient * allowance_amount`
  - `gross = LEAST(COALESCE(NULLIF(max_allowance_per_session, 0), base), base)` (0 và `null` đều không cap)
  - sau đó trừ khấu trừ vận hành/tax snapshot để ra total theo truy vấn.

### 4) Behavior hiện tại theo từng giá trị `max_allowance_per_session`
- **`undefined` (request không gửi field)**:
  - Backend giữ nguyên giá trị hiện tại, vì update basic info chỉ set khi `!== undefined` (`apps/api/src/class/class.service.ts`).
- **`null` (DB không có max_allowance)**:
  - Công thức SQL `COALESCE(max_allowance_per_session, base)` trả về `base`.
  - `LEAST(base, base)` => không cap.
  - Nghĩa là lớp không có `max_allowance` hiện tại được hiểu là **không có giới hạn max allowance**.
- **`0`**:
  - Được coi như **không giới hạn** giống `null`: aggregate SQL dùng `NULLIF(max_allowance_per_session, 0)` trước `COALESCE`; API chuẩn hóa `0` → `null` khi tạo/cập nhật lớp.

### 5) Frontend behavior liên quan
- Form lớp map input trống hoặc `0` → `null` (helpers trong `apps/web/lib/class.helpers.ts`).
- `AddSessionPopup` / `SessionHistoryTable`: preview gross dùng `apps/web/lib/session-allowance.helpers.ts`; chỉ áp trần khi `maxAllowancePerSession > 0`.

## Code References
- `apps/api/prisma/schema/learning.prisma` - định nghĩa `maxAllowancePerSession Int?` và mapping cột DB.
- `apps/api/src/class/class.service.ts` - update class basic info (`dto.max_allowance_per_session !== undefined`) và fallback `customAllowance`.
- `apps/api/src/session/session-allowance.util.ts` - công thức default allowance snapshot.
- `apps/api/src/session/session-create.service.ts` / `session-update.service.ts` - ghi `allowance_amount` từ payload hoặc util.
- `apps/api/src/session/session-reporting.service.ts` - SQL aggregate dùng `LEAST(COALESCE(max_allowance_per_session, base), base)`.
- `apps/api/src/staff/staff.service.ts` - CTE `teacher_session_gross` dùng cùng công thức cap.
- `apps/api/src/dashboard/dashboard.service.ts` - dashboard teacher cost/profit dùng cùng công thức cap.
- `apps/web/lib/class.helpers.ts` - `parseMaxAllowancePerSessionInput` / `maxAllowanceInputInitialFromServer`.
- `apps/web/lib/session-allowance.helpers.ts` - gốc lưu buổi + preview gross (hệ số + trần).
- `apps/web/components/admin/class/AddSessionPopup.tsx` - form tạo buổi + preview.

## Architecture Documentation
- Nguồn dữ liệu lớp/teacher-class: `classes` + `class_teachers`.
- Session lưu snapshot `allowance_amount` + deduction rates theo thời điểm tạo/cập nhật.
- `max_allowance_per_session` được đọc động từ `classes` khi aggregate/report (staff income, unpaid summaries, dashboard), thay vì snapshot ngay trên session.
- Backend SQL là nguồn authoritative cho kết quả payroll/income summary.

## Historical Context (from thoughts/)
- Không tìm thấy tài liệu liên quan trong `thoughts/` hoặc `thoughts/searchable/` trong workspace hiện tại.

## Related Research
- Chưa ghi nhận tài liệu research liên quan khác trong workspace hiện tại.

## Open Questions
- Không có open question bổ sung trong phạm vi mô tả codebase hiện tại.
