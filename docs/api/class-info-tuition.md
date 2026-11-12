# Lớp: Thông tin lớp / Học phí lớp (#272, #274)

Lớp chia thành hai phần sửa riêng:

- **Thông tin lớp**: tên, khoá, trạng thái, sĩ số tối đa, không điểm danh, hạn truy cập nội dung, lương gia sư mặc định của lớp.
- **Học phí lớp**: tổng gói (`tuition_package_total`), số buổi (`tuition_package_session`), học phí / buổi (`student_tuition_per_session`), học phí / 30 phút (`student_tuition_per_block`, lớp theo block).

## Quyền theo route

| Route | Admin | Trưởng ban Đào tạo | Trưởng phòng Sale & CSKH | Kế toán thu | Kế toán chi |
|---|---|---|---|---|---|
| `GET /class`, `GET /class/:id`, `GET /class/:id/students`, `GET /class/:id/makeup-events` | đọc | đọc (#274) | đọc | đọc | đọc |
| `POST /class` (tạo lớp, #274) | mọi trường | theo phần (xem dưới) | theo phần (xem dưới) | 403 | 403 |
| `PATCH /class/:id/basic-info` (Thông tin lớp) | sửa | tên, khoá, sĩ số (#274) | tên, khoá, sĩ số (#274) | 403 | 403 |
| `PATCH /class` (cập nhật tổng quát) | sửa | 403 | 403 | 403 | 403 |
| `PATCH /class/:id/tuition` (Học phí lớp) | sửa | 403 | sửa | 403 | 403 |
| `PATCH /class/:id/student-tuition` (học phí riêng học sinh) | sửa | 403 | sửa | sửa | 403 |
| `PATCH /class/:id/students` (thêm/bớt học sinh, #273) | sửa | 403 | sửa | 403 | 403 |
| `PATCH /class/:id/pricing-mode`, `.../teacher-compensation`, lịch | sửa | 403 | 403 | 403 | 403 |
| `POST /class/:id/end` (kết thúc lớp), `DELETE /class/:id` (xoá lớp) | ✓ | 403 | 403 | 403 | 403 |
| `GET /staff/options` (tìm gia sư khi tạo lớp) | ✓ | ✓ (#274) | 403 | 403 | ✓ |

## Tạo lớp và sửa Thông tin lớp theo role (#274)

Policy: `apps/api/src/class/class-write-field-policy.ts` (`assertCreateClassAllowed`, `assertUpdateClassBasicInfoAllowed`), gọi trong `ClassService.createClass` / `updateClassBasicInfo` — áp cả đường staff-ops `POST /staff-ops/classes`.

| Phần form | Trường | Admin | Trưởng ban Đào tạo | Trưởng phòng |
|---|---|---|---|---|
| Thông tin lớp | `name`, `course_id` (môn/loại lớp), `max_students` | ✓ | ✓ | ✓ |
| Gia sư + Quản lý lớp + lương gia sư | `teacher_ids`, `teachers[]` (trợ cấp riêng, scale riêng, % vận hành), `allowance_per_session_per_student`, `max_allowance_per_session`, `scale_amount`, `training_manager_staff_id` | ✓ | ✓ | 403 |
| Học phí + học sinh | `student_tuition_per_session`, `student_tuition_per_block`, `tuition_package_total`, `tuition_package_session`, `student_ids` | ✓ | 403 | ✓ |
| Chỉ Admin | `schedule`, `pricing_mode`, `no_attendance: true`, `status` khác `running` | ✓ | 403 | 403 |

- Người mang cả hai role trưởng được **hợp** hai tập trường.
- Gửi trường ngoài quyền → `403` liệt kê tên tiếng Việt, vd «Bạn không có quyền tạo lớp với các trường: Học phí, Học sinh.». `undefined`, `null`, mảng rỗng và `no_attendance: false` coi như không gửi.
- Role khác (Đào tạo/Quản lý lớp, Kế toán, CSKH, gia sư) → `403` «Chỉ Admin, Trưởng ban Đào tạo hoặc Trưởng phòng Sale & CSKH được tạo lớp.».
- Luật #265: Trưởng ban không tự gán mình làm gia sư (`teacher_ids` / `teachers[].teacher_id`) → `403`. Tự làm Quản lý lớp được (% trợ cấp quản lý lớp vẫn chỉ Admin sửa).
- `training_manager_staff_id` (mới, chỉ `POST /class`): nhân sự Đào tạo/Trưởng ban/gia sư đang hoạt động (`404` không tồn tại, `400` không hợp lệ); gia sư được gán thì tự cấp role `training` như `PATCH /training-manager/classes/:id`.
- `PATCH /class/:id/basic-info` cho role trưởng: chỉ `name`, `course_id`, `max_students`; gửi `status`, `no_attendance`, trợ cấp/scale, `content_access_expires_at` → `403`. Cách thu học phí, lịch, Meet: route riêng, chỉ Admin.
- Response tạo lớp / basic-info lọc theo người xem như các route đọc.
- Hạn chế: Trưởng ban Đào tạo không tạo được lớp thuộc khoá trọn gói (`one_time`) vì khoá đó bắt buộc học phí, mà học phí ngoài quyền.

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
| Trưởng ban Đào tạo (#274) | `expense` | học phí lớp + học phí riêng học sinh (trợ cấp từng buổi: #277) |
| Trưởng ban Đào tạo kiêm Trưởng phòng / Kế toán thu | `full` | — (hợp quyền) |

Route staff-ops (gia sư / quản lý lớp) vẫn dùng `resolveAccountantFinanceView`. Riêng `GET /staff-ops/classes/:id` (#276): **Quản lý lớp** của lớp — thuần hoặc kiêm gia sư lớp — không nhận học phí lớp (`studentTuitionPerSession`, `studentTuitionPerBlock`, `tuitionPackageTotal`, `tuitionPackageSession`, `sessionTuitionTotal`) và học phí riêng / số dư của học sinh (`redactClassForTrainingManagerView`). Gia sư thuần, CSKH, Admin, Kế toán giữ nguyên.

## % trợ cấp quản lý lớp và lương gia sư theo lớp (#276)

| Route | Admin | Quản lý lớp (lớp mình) | Trưởng ban Đào tạo | Trưởng phòng | Kế toán thu/chi |
|---|---|---|---|---|---|
| `PATCH /class/:id/training-manager` — đổi `%` | sửa | 403 | 403 | 403 | 403 |
| `PATCH /class/:id/training-manager` — giao / gỡ Quản lý lớp | sửa | 403 | 403 (#277 mở) | 403 | 403 |
| `PATCH /training-manager/staff/:staffId/sessions/:sessionId/rate` | sửa | 403 | 403 | 403 | 403 |
| `PATCH /staff-ops/classes/:id/teacher-pay`, thêm / cho nghỉ gia sư | sửa | sửa, trừ phần của mình | 403 nếu không quản lý lớp (#277 mở) | 403 | 403 |

- Gửi lại `%` hiện tại (không đổi) không bị chặn — kiểm theo giá trị thật sự đổi.
- «Phần của mình» với Quản lý lớp kiêm gia sư đang dạy lớp: dòng `teachers[]` của mình; `allowance_per_session_per_student` khi không có trợ cấp riêng; `scale_amount` khi không có scale riêng; `max_allowance_per_session` luôn → `403`.
- Điểm mở rộng #277: `canManageClassTeachersAndPay` (`staff-ops/staff-operations-access.service.ts`) và `canAssignClassManager` (`training-manager/class-manager-allowance-policy.ts`). `canEditClassManagerAllowanceRate` giữ chỉ Admin.

## Thêm/bớt học sinh (#273)

Chỉ **Admin** và **Trưởng phòng Sale & CSKH** thêm hoặc bớt học sinh trong lớp (kể cả khi tạo lớp, #274). Quản lý lớp, Trưởng ban Đào tạo, Kế toán thu/chi, CSKH, gia sư: `403` (route admin đóng mặc định, không có route staff-ops nào ghi roster).

| Đường ghi roster | Admin | Trưởng phòng | Role khác |
|---|---|---|---|
| `PATCH /class/:id/students` | ✓ | ✓ | 403 |
| `PATCH /student/:id/classes` | ✓ | ✓ | 403 |
| `POST /class` (`student_ids`, tạo lớp) | ✓ | ✓ (#274) | 403 |
| `PATCH /class` (`student_ids`) | ✓ | 403 | 403 |
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
