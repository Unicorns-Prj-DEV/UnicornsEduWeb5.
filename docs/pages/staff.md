# Staff Teacher Workspace – `/staff`

## Route and role

- **Paths:** `/staff`, `/staff/classes/[id]`
- **Runtime access hiện tại:** `admin`, hoặc `roleType=staff` và `staffInfo.roles` có `teacher`
- **Scope hiện tại:** teacher workflow là chính; admin truy cập để xem hoặc hỗ trợ cùng flow

## Features

- `/staff`
  - chỉ có một tab `Lớp học`
  - hiển thị danh sách lớp được assign cho teacher hiện tại qua `class_teachers`
  - có filter theo tên lớp, loại lớp, trạng thái
- `/staff/classes/[id]`
  - hiển thị thông tin lớp gần tương tự admin class detail
  - cho phép chỉnh `khung giờ học`
  - cho phép thêm `session`
  - cho phép chỉnh `session` gồm ngày học, giờ học, note buổi học, điểm danh

## Permission boundaries

- Teacher **được phép**
  - xem danh sách lớp của chính mình
  - xem chi tiết lớp được assign
  - chỉnh khung giờ lớp được assign
  - thêm/sửa session trên lớp được assign
  - cập nhật attendance status và attendance notes
- **Admin**
  - vào được `/staff` và `/staff/classes/[id]`
  - xem tất cả lớp trong teacher workspace
  - sửa khung giờ và thao tác session trong cùng giới hạn finance như teacher workspace
- Teacher **không được phép**
  - tạo class
  - đổi teacher phụ trách
  - thêm/xóa học sinh trong class
  - sửa `allowanceAmount`
  - sửa `coefficient`
  - sửa `teacherPaymentStatus`
  - sửa `attendance.tuitionFee`
  - sửa học phí hay trợ cấp ở cấp lớp

## Data and API

- **Frontend API client:** `apps/web/lib/apis/staff-ops.api.ts`
- **Backend routes đang dùng**
  - `GET /staff-ops/classes`
  - `GET /staff-ops/classes/:id`
  - `PATCH /staff-ops/classes/:id/schedule`
  - `GET /staff-ops/classes/:classId/sessions?month=&year=`
  - `POST /staff-ops/classes/:classId/sessions`
  - `PUT /staff-ops/sessions/:id`
- **Guard**
  - controller mở cho `UserRole.staff` và `UserRole.admin`
  - service layer filter theo `staff.teacher` khi actor là staff; admin được bypass filter role staff nhưng vẫn đi cùng contract UI

## UI notes

- Sidebar/menu của `/staff` dùng cùng shell với admin sidebar: mobile drawer, collapse desktop, footer avatar + logout; danh sách điều hướng hiện chỉ còn mục `Lớp học`
- Class detail dùng cùng layout header + card grid với admin class detail; vẫn tái sử dụng shared admin components nhưng ẩn mọi thông tin/control liên quan tới finance hoặc thay teacher/student
- Session editor và add-session popup chạy ở chế độ:
  - `teacherMode="readOnly"`
  - `allowFinancialFields=false`
  - `allowTeacherSelection=false`
  - `allowPaymentStatusEdit=false`
  - `allowDeleteSession=false`

## DoD

- `staff.teacher` vào được `/staff`
- `admin` vào được `/staff`
- `/staff` liệt kê lớp theo actor hiện tại: teacher thấy lớp của mình, admin thấy toàn bộ danh sách
- `/staff/classes/[id]` cho sửa khung giờ + thêm/sửa session
- Teacher không thể đụng vào trợ cấp hay học phí học sinh từ route này
