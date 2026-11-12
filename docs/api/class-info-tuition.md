# Lớp: Thông tin lớp / Học phí lớp (#272)

Lớp chia thành hai phần sửa riêng:

- **Thông tin lớp**: tên, khoá, trạng thái, sĩ số tối đa, không điểm danh, hạn truy cập nội dung, lương gia sư mặc định của lớp.
- **Học phí lớp**: tổng gói (`tuition_package_total`), số buổi (`tuition_package_session`), học phí / buổi (`student_tuition_per_session`), học phí / 30 phút (`student_tuition_per_block`, lớp theo block).

## Quyền theo route

| Route | Admin | Trưởng phòng Sale & CSKH | Kế toán thu | Kế toán chi |
|---|---|---|---|---|
| `GET /class`, `GET /class/:id`, `GET /class/:id/students`, `GET /class/:id/makeup-events` | đọc | đọc | đọc | đọc |
| `PATCH /class/:id/basic-info` (Thông tin lớp) | sửa | 403 | 403 | 403 |
| `PATCH /class` (cập nhật tổng quát) | sửa | 403 | 403 | 403 |
| `PATCH /class/:id/tuition` (Học phí lớp) | sửa | sửa | 403 | 403 |
| `PATCH /class/:id/student-tuition` (học phí riêng học sinh) | sửa | sửa | sửa | 403 |
| `PATCH /class/:id/pricing-mode`, `.../teacher-compensation`, roster, lịch | sửa | 403 | 403 | 403 |

`basic-info` bỏ qua các trường học phí; `tuition` bỏ qua mọi trường khác học phí (ValidationPipe `whitelist` + lọc ở service). Lịch sử thay đổi ghi riêng: `Cập nhật thông tin cơ bản lớp học` / `Cập nhật học phí lớp`.

## Lọc response (`resolveAdminClassFinanceView`)

Áp cho mọi route trên (cả response của route sửa):

| Người xem | Góc nhìn | Bị ẩn |
|---|---|---|
| Admin | `full` | — |
| Trưởng phòng Sale & CSKH | `income` | lương gia sư: `allowancePerSessionPerStudent`, `allowancePerBlockPerStudent`, `maxAllowancePerSession`, `maxAllowancePerBlock`, `scaleAmount`, `trainingManagerRatePercent`, `teachers[].customAllowance*`, `customScaleAmount`, `operatingDeductionRatePercent`, `taxRatePercent` |
| Kế toán thu | `income` | như trên |
| Kế toán chi | `expense` | học phí lớp + học phí riêng học sinh |
| Trưởng phòng kiêm Kế toán chi | `full` | — (hợp quyền) |

Route staff-ops (gia sư / quản lý lớp) vẫn dùng `resolveAccountantFinanceView`, không đổi.
