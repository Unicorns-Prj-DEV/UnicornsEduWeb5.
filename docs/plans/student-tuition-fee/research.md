# Research: Tính học phí học sinh theo lớp (custom tuition)

**Ngày:** 2026-04-29  
**Repository:** UnicornsEduWeb5  
**Chủ đề:** Luồng học phí hiện tại khi có override trên `student_classes` và vì sao `custom = 0` khiến mọi giá trị hiệu lực về 0.

## Câu hỏi nghiên cứu

Làm rõ codebase đang tính học phí mặc định / hiệu lực cho học sinh trong lớp như thế nào, và điểm nào khiến `0` không fallback về cấu hình lớp.

## Tóm tắt

- Học phí hiệu lực mỗi buổi được suy ra bằng chuỗi `??` trong TypeScript: custom per-session → per-session của lớp → suy ra từ gói (tổng/số buổi) sau khi đã gộp gói custom với gói lớp.
- Hàm `normalizeNullableMoney` làm tròn xuống số nguyên và **giữ `0` là giá trị hợp lệ**, không đổi thành `null`.
- Toán tử `??` chỉ nhảy sang toán hạng sau khi bên trái là `null` hoặc `undefined`, **không** khi bên trái là `0`. Do đó `customTuitionPerSession === 0` chặn toàn bộ fallback về lớp và kéo `effectiveTuitionPerSession`, tổng buổi trên lớp (`sessionTuitionTotal`), v.v. về 0.
- `hasCustomTuitionOverride` cũng dùng `!= null` sau normalize, nên `0` bị coi là “đã override” dù không phải mức học phí thực.
- SQL dashboard (cảnh báo sắp hết tiền / nợ) dùng `COALESCE(student_classes.custom_*, classes.*)` — nếu cột custom là `0`, `COALESCE` chọn `0` và không lấy giá trị lớp.

## Chi tiết theo vùng code

### Module dùng chung (sau chỉnh sửa)

- `apps/api/src/common/student-class-tuition.util.ts` — `normalizeStudentClassCustomTuitionMoney`, `resolveEffectiveTuitionPerSession`, `hasCustomTuitionOverride`.

### Class / học sinh (API response)

- `apps/api/src/class/class.service.ts` — map `student_classes` + `classes` → `effectiveTuitionPerSession`, `tuitionPackageSource`, `sessionTuitionTotal`.
- `apps/api/src/student/student.service.ts` — `serializeStudentClass` cho chi tiết học sinh (self / admin).

### Buổi học / điểm danh

- `apps/api/src/session/session-validation.service.ts` — `resolveDefaultStudentTuitionPerSession` cho học phí mặc định khi không có override từng dòng attendance.
- `apps/api/src/session/session-create.service.ts`, `session-update.service.ts` — gọi validation service với `customStudentTuitionPerSession` từ DB.

### Dashboard

- `apps/api/src/dashboard/dashboard.service.ts` — các CTE `student_financials` tính `referenceTuition` từ `student_classes` và `classes` (4 biến thể query: global + theo CSKH).

### Ghi danh sách học sinh lớp

- `apps/api/src/class/class.service.ts` — `updateClassStudents` ghi `student_classes` từ DTO; trước đây có thể persist `0` trực tiếp nếu client gửi 0.

## Tham chiếu schema

- `apps/api/prisma/schema/learning.prisma` — model `StudentClass` với các cột `custom_*` nullable int.
- `docs/Database Schema.md` — mục `student_classes` (semantics `0` = inherit).

## Phạm vi không khảo sát sâu

- Không đánh giá đúng/sai nghiệp vụ “học phí 0 đồng có chủ đích”; chỉ mô tả hành vi kỹ thuật trước khi chuẩn hóa.
