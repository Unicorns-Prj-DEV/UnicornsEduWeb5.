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
| `PATCH /class/:id/students` (thêm/bớt học sinh, #273) | sửa | sửa | 403 | 403 |
| `PATCH /class/:id/pricing-mode`, `.../teacher-compensation`, lịch | sửa | 403 | 403 | 403 |

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

## Thêm/bớt học sinh (#273)

Chỉ **Admin** và **Trưởng phòng Sale & CSKH** thêm hoặc bớt học sinh trong lớp. Quản lý lớp, Trưởng ban Đào tạo, Kế toán thu/chi, CSKH, gia sư: `403` (route admin đóng mặc định, không có route staff-ops nào ghi roster).

| Đường ghi roster | Admin | Trưởng phòng | Role khác |
|---|---|---|---|
| `PATCH /class/:id/students` | ✓ | ✓ | 403 |
| `PATCH /student/:id/classes` | ✓ | ✓ | 403 |
| `POST /class` (`student_ids`), `PATCH /class` (`student_ids`) | ✓ | 403 | 403 |
| `POST /users/student` (`class_ids`) | ✓ | ✓ | CSKH vào được route nhưng không được xếp lớp (403) |

Kết thúc lớp (`POST /class/:id/end`) và chuyển học sinh sang nghỉ là vòng đời, không phải thao tác roster, không đổi.

### Học phí lớp trước học sinh đầu tiên

Lớp **chưa có học sinh đang học** (`student_classes.status` = `active` hoặc `null`) nhận học sinh đầu tiên khi đã có **Học phí lớp** theo cách thu đang chọn; ngược lại `400`:

> Lớp chưa có học phí. Hãy điền Học phí lớp trước khi thêm học sinh đầu tiên.

(Thêm nhiều lớp cùng lúc qua `PATCH /student/:id/classes` / `POST /users/student`: `Lớp «A», «B» chưa có học phí. …`)

| Cách thu (`pricing_mode`) | Tính là đã có học phí |
|---|---|
| Theo buổi (`per_session`, mặc định) | `student_tuition_per_session` có số, hoặc gói suy ra được học phí / buổi (`tuition_package_total` + `tuition_package_session > 0`, hoặc gói `0đ`) |
| Theo gói buổi | như theo buổi (gói lớp là nguồn của học phí / buổi) |
| Theo 30 phút (`per_block`) | `student_tuition_per_block` có số, hoặc chuỗi theo buổi ở trên (charge fallback) |
| Trọn gói (`one_time`) | `tuition_package_total` có số |

- `0đ` = đã điền (lớp miễn phí); `null`/trống = chưa điền.
- Học phí riêng của học sinh (`custom_*`) **không** thay Học phí lớp — vẫn `400`.
- Lớp đã có học sinh đang học: không áp. Bớt học sinh: không áp.
- Kiểm ở service (`apps/api/src/common/class-first-student-tuition.ts`), áp cho `updateClassStudents`, `updateClass`, `createClass`, `StudentService.updateStudentClasses` (thêm mới + kích hoạt lại), `UserService.createStudentUser`. Với `POST /class` / `PATCH /class`, kiểm **sau** khi ghi dòng lớp trong cùng transaction nên học phí gửi cùng payload được tính.
- Web `/admin/classes/:id`: bấm **Chỉnh sửa** danh sách học sinh khi lớp trống chưa có học phí → toast + mở popup **Học phí lớp** (nút «Lưu và thêm học sinh», lưu khi chưa điền gì → toast lỗi); lưu xong mới mở popup thêm học sinh. Các màn khác (sửa lớp của học sinh, thêm lớp, tạo học sinh) hiện lỗi `400` qua toast Sonner.
