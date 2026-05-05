---
date: "2026-05-04T12:00:00+07:00"
researcher: "cursor-research"
git_commit: "ae1ccf111c20360db999c9e321ef727ee57abe71"
branch: "fix/api-auth-multi-device-session"
repository: "UnicornsEduWeb5"
topic: "Admin staff/[id] — hiển thị và chỉnh tax_reduction_rate theo lớp (Lớp phụ trách)"
tags: [research, codebase, admin, staff, class-teacher, tax, payroll]
status: complete
last_updated: "2026-05-04"
last_updated_by: "cursor-research"
---

# Research: Admin `staffs/[id]` — `tax_reduction_rate` theo mối quan hệ nhân sự–lớp

**Date**: 2026-05-04 (Asia/Ho_Chi_Minh, approximate)  
**Researcher**: cursor-research  
**Git Commit**: `ae1ccf111c20360db999c9e321ef727ee57abe71`  
**Branch**: `fix/api-auth-multi-device-session` (working tree có thay đổi chưa commit)  
**Repository**: UnicornsEduWeb5  

**Ghi chú metadata**: Không có script `hack/spec_metadata.sh` trong repo; commit/branch lấy từ `git rev-parse` / `git branch` tại thời điểm nghiên cứu.

## Research Question

Trên giao diện **admin** tại `staff/[id]` (route thực tế: `/admin/staffs/[id]`), chỉ phạm vi admin: hiện trạng codebase có hỗ trợ hiển thị phần trăm `tax_reduction_rate` trong mối quan hệ nhân sự–lớp không, và có chỗ nào cho phép admin chỉnh trực tiếp trong card **Lớp phụ trách** không?

## Summary

- Chuỗi ký tự **`tax_reduction_rate`** không xuất hiện trong codebase.
- Card **Lớp phụ trách** trên `/admin/staffs/[id]` chỉ hiển thị **tên lớp** và ba số tiền **Tổng / Chưa nhận / Đã nhận** (từ `incomeSummary.classMonthlySummaries`); **không** có cột phần trăm khấu trừ thuế theo từng lớp và **không** có chỉnh sửa inline trong card đó.
- **Khấu trừ thuế (income tax deduction)** trong BE được resolve theo **nhân sự + role + ngày hiệu lực** (`staff_tax_deduction_overrides` / `role_tax_deduction_rates`), không theo từng `class_id`. Trên cùng trang admin có card riêng **Thống kê thuế theo role** với chế độ chỉnh sửa bulk theo role.
- **Khấu trừ vận hành (operating)** có thể khác theo cặp **lớp + giáo viên** qua bảng `class_teacher_operating_deduction_rates` (`ClassTeacherOperatingDeductionRate`) và hàm `resolveOperatingDeductionRate`; đây là % trên gross trước thuế, khác semantic với “thuế” nhưng là rate gắn quan hệ class–teacher.
- Snapshot **khấu trừ thuế từng buổi** nằm ở `sessions.teacher_tax_deduction_rate_percent` (Prisma: `teacherTaxDeductionRatePercent`), không phải field trên bảng `class_teachers`.

## Detailed Findings

### Route admin và card "Lớp phụ trách"

- Trang: `apps/web/app/admin/staffs/[id]/page.tsx`.
- `classMonthlySummaries` lấy từ `incomeSummary?.classMonthlySummaries` (khoảng dòng 508), nguồn là **TanStack Query** gọi API income summary của staff (xem `staff.controller.ts`: `GET :id/income-summary`).
- UI: `StaffCard title="Lớp phụ trách"` — bảng desktop cột Lớp / Tổng / Chưa nhận / Đã nhận; mobile là card stack; click row điều hướng sang chi tiết lớp (`buildAdminLikePath` + `classes/[id]`). Không có input hay cột % trong block này (khoảng 1438–1577 trong phiên bản đã đọc).

### Staff profile (không phải admin-only nhưng cùng pattern UI)

- `apps/web/app/staff/profile/page.tsx` có cùng cấu trúc **Lớp phụ trách** với `classMonthlySummaries`, không có cột tax theo lớp (khoảng 893+).

### API `GET /staff/:id` và `classAllowance`

- `apps/api/src/staff/staff.service.ts` — `getStaffById`: include `classTeachers` (chỉ `class.id`, `class.name`), chạy raw SQL `classAllowance` gom theo `class_id`, `teacher_payment_status`, `name`; **không** trả thêm cột phần trăm khấu trừ thuế theo lớp (khoảng 3421–3513).
- DTO FE `StaffClassAllowanceItem` trong `apps/web/dtos/staff.dto.ts`: `class_id`, `teacher_payment_status`, `total_allowance`, `name` — không có field rate.

### `getIncomeSummary` và `classMonthlySummaries`

- `staff.service.ts` — `getIncomeSummary`: load `classTeachers` chỉ để biết danh sách lớp gán; tổng hợp theo tháng/năm/query `days`; output có `classMonthlySummaries` (sắp xếp theo tên lớp, khoảng 3413–3415 trong đoạn return đã đọc). Các mảng này là **số tiền** (total / paid / unpaid theo class), không embed tỷ lệ thuế riêng từng lớp trong DTO đã trace.

### Schema: quan hệ `ClassTeacher` và thuế / khấu trừ

- File: `apps/api/prisma/schema/learning.prisma`.
- `ClassTeacher`: `operatingDeductionRatePercent` map DB `tax_rate_percent` — semantic trong docs là **khấu trừ vận hành** trên quan hệ class–teacher; **không** có cột `teacher_tax_deduction_rate_percent` trên `class_teachers`.
- `Session`: có `teacherOperatingDeductionRatePercent` và `teacherTaxDeductionRatePercent` (snapshot theo buổi).

### Resolve tỷ lệ khấu trừ thuế (không theo lớp)

- File: `apps/api/src/payroll/deduction-rates.ts`.
- `resolveTaxDeductionRate(prisma, { staffId, roleType, effectiveDate })`: ưu tiên `staffTaxDeductionOverride`, fallback `roleTaxDeductionRate` — **không** nhận `classId`.

### Resolve tỷ lệ khấu trừ vận hành (theo lớp + giáo viên)

- Cùng file: `resolveOperatingDeductionRate(prisma, { classId, teacherId, effectiveDate })` đọc `classTeacherOperatingDeductionRate` (`finance.prisma`).

### Admin: chỉnh % thuế hiện có ở đâu

- Cùng `apps/web/app/admin/staffs/[id]/page.tsx`: card **Thống kê thuế theo role** (`StaffCard title="Thống kê thuế theo role"`), dùng `deductionSettingsApi`, state `taxBulkDrafts`, mutation lưu bulk theo role (khoảng 1773–1931). Đây là **theo role**, không phải theo từng dòng lớp trong **Lớp phụ trách**.

### Tài liệu nội bộ

- `docs/pages/admin.md` mô tả `classAllowance` và semantics số tiền sau vận hành / trước thuế; không mô tả cột `tax_reduction_rate` theo lớp trên card Lớp phụ trách.
- `docs/Database Schema.md` có mô tả `teacher_tax_deduction_rate_percent` trên session.

## Code References

- `apps/web/app/admin/staffs/[id]/page.tsx` (~508, ~1438–1577) — `classMonthlySummaries`, card Lớp phụ trách, bảng 4 cột.
- `apps/api/src/staff/staff.service.ts` (~2918–2948, ~3413–3513) — `getIncomeSummary` select `classTeachers`; `getStaffById` + `classAllowance` raw query.
- `apps/api/prisma/schema/learning.prisma` (~26–40, ~63–69) — `ClassTeacher`, `Session` tax/operating fields.
- `apps/api/prisma/schema/finance.prisma` (~19–62) — `RoleTaxDeductionRate`, `StaffTaxDeductionOverride`, `ClassTeacherOperatingDeductionRate`.
- `apps/api/src/payroll/deduction-rates.ts` (~58–92, ~118–142) — `resolveTaxDeductionRate`, `resolveOperatingDeductionRate`.
- `apps/web/dtos/staff.dto.ts` (~46–51, ~60–92) — `StaffClassAllowanceItem`, `StaffDetail`.

## Architecture Documentation (hiện trạng)

- **Thuế (deduction) cho dạy học**: mặc định theo role + override theo staff + `effectiveFrom`; áp dụng khi tạo/cập nhật thanh toán/session (snapshot vào `sessions.teacher_tax_deduction_rate_percent`). Không có model “tax reduction % chỉ cho staff X + class Y” tách biệt ngoài luồng trên.
- **Vận hành theo class+teacher**: bảng time-series `class_teacher_operating_deduction_rates` + legacy column trên `class_teachers`.

## Historical Context (from thoughts/)

- Không rà soát thêm thư mục `thoughts/` ngoài file nghiên cứu này cho ticket cụ thể.

## Related Research

- `thoughts/shared/research/2026-05-04-crud-loading-skeleton-and-fast-close-ux.md` — cùng ngày, chủ đề UX khác.

## Open Questions

- Product có ý định **khấu trừ thuế** (giống `resolveTaxDeductionRate`) hay **khấu trừ vận hành** (giống `ClassTeacherOperatingDeductionRate`) khi nói “tax_reduction_rate” theo từng lớp? Trong schema hiện tại hai khái niệm tách bạch.
- Nếu cần % **theo cặp staff–class** cho thuế thu nhập: hiện **chưa** có cột/API/UI tương ứng; cần mở rộng mô hình dữ liệu và luồng snapshot khi thanh toán.

## Plan update (2026-05-04)

- PRD đã chuyển hướng: **không** thêm bảng tỷ lệ tax riêng; tận dụng **`class_teachers.tax_rate_percent`** (Prisma: `operatingDeductionRatePercent`). Chi tiết và phân tách semantic với thuế thu nhập: `docs/prd/2026-05-04-admin-staff-class-teacher-tax-deduction.md`.
