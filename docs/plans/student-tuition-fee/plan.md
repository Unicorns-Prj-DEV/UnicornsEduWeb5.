# Plan: Chuẩn hóa học phí custom học sinh–lớp (`0` = kế thừa lớp)

## Overview

Khi các trường override học phí trên `student_classes` bằng `0`, hệ thống phải xử lý giống **chưa override** (kế thừa `classes`), thay vì coi `0` là mức học phí thật và chặn fallback (`??` trong TS và `COALESCE` trong SQL).

## Current State Analysis

- `normalizeNullableMoney` giữ `0`, nên `resolveEffectiveTuitionPerSession` và `hasCustomTuitionOverride` diễn giải sai.
- Dashboard raw SQL ưu tiên cột `student_classes` trong `COALESCE` nên `0` thắng giá trị lớp.
- `updateClassStudents` có thể lưu `0` vào DB từ payload.

## Desired End State

- Một helper rõ ràng: **`normalizeStudentClassCustomTuitionMoney`**: sau khi làm tròn số nguyên, **`0` → `null`** chỉ cho các cột override trên `student_classes`.
- Mọi chỗ tính `effective*`, `tuitionPackageSource`, học phí buổi mặc định cho session dùng helper này cho ba trường custom.
- `updateClassStudents`: chuẩn hóa DTO trước khi `createMany` (và derived per-session) để không persist `0` nếu ý định là inherit.
- SQL dashboard: bọc `NULLIF(student_classes.custom_*, 0)` trong các nhánh tương ứng.
- Docs: `docs/Database Schema.md` + ghi chú ngắn trong `docs/pages/admin.md` về cảnh báo dashboard.

## What We're NOT Doing

- Không đổi semantics học phí **của lớp** (`classes.*`): chỉ các cột **custom** trên `student_classes`.
- Không migration dữ liệu bắt buộc: đọc-path + SQL đã xử lý `0` legacy; ghi path dần chuẩn hóa về `null` khi admin lưu lại danh sách lớp.

## Implementation Phases

### Phase 1: Shared util + service wiring

- Thêm `apps/api/src/common/student-class-tuition.util.ts`.
- Refactor `class.service.ts`, `student.service.ts`, `session-validation.service.ts` để import và bỏ duplicate helpers.

### Phase 2: Dashboard SQL

- Cập nhật 4 khối query trong `dashboard.service.ts` (expiring/debt × global/CSKH).

### Phase 3: Tests + docs

- Unit test util + một case `session-validation`.
- Cập nhật `docs/Database Schema.md`, `docs/pages/admin.md`, thư mục `docs/plans/student-tuition-fee/`.

### Success Criteria

**Automated**

- [x] `pnpm --filter api exec tsc --noEmit`
- [x] Jest: `student-class-tuition.util.spec.ts`, `session-validation.service.spec.ts`

**Manual**

- [ ] Lớp có học phí lớp > 0; học sinh có custom per-session = 0 (hoặc gói 0) → UI/API hiển thị effective = học phí lớp, không còn toàn 0.
- [ ] Tạo/sửa session: học phí mặc định attendance khớp effective sau chỉnh.

---

**Status:** Implemented. `student.service.spec.ts` có một test create-student fail sẵn do mock thiếu `examSchedules` (không liên quan thay đổi học phí).
