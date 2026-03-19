# Staff Workspace – `/staff`

## Route and role

- **Paths:** `/staff`, `/staff/classes/[id]`, `/staff/customer-care-detail`
- **Runtime access hiện tại:**
  - `/staff`, `/staff/classes/[id]`: `admin`, hoặc `roleType=staff` và `staffInfo.roles` có `teacher`
  - `/staff/customer-care-detail`: `roleType=staff` và `staffInfo.roles` có `customer_care`
- **Scope hiện tại:** teacher workflow cho lớp học, cộng thêm self-service route cho CSKH

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
  - bảng lịch sử buổi học hiển thị `trạng thái thanh toán` của từng session ở dạng chỉ đọc
- `/staff/customer-care-detail`
  - chỉ hiển thị qua sidebar khi staff hiện tại có role `customer_care`
  - tự động lấy `staffInfo.id` của user đang đăng nhập, không nhận `staffId` từ URL
  - dùng cùng dữ liệu với trang admin customer-care detail: 2 tab **Học sinh** và **Hoa hồng**
  - tab **Học sinh** hiển thị học sinh đang được giao chăm sóc (trạng thái, tên, số dư, tỉnh, lớp), sort theo số dư tăng dần
  - tab **Hoa hồng** hiển thị tổng hoa hồng 30 ngày qua theo học sinh; mở rộng từng học sinh để xem buổi học và commission từng buổi

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
- Staff `customer_care` **được phép**
  - vào `/staff/customer-care-detail`
  - chỉ xem dữ liệu CSKH của chính mình
- Staff `customer_care` **không được phép**
  - xem dữ liệu CSKH của staff khác qua route `/staff`
  - dùng `/staff` hoặc `/staff/classes/[id]` nếu không đồng thời có role `teacher`
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
- **Frontend API client (customer care self-service):** `apps/web/lib/apis/customer-care.api.ts`
- **Backend routes đang dùng**
  - `GET /staff-ops/classes`
  - `GET /staff-ops/classes/:id`
  - `PATCH /staff-ops/classes/:id/schedule`
  - `GET /staff-ops/classes/:classId/sessions?month=&year=`
  - `POST /staff-ops/classes/:classId/sessions`
  - `PUT /staff-ops/sessions/:id`
  - `GET /customer-care/staff/:staffId/students`
  - `GET /customer-care/staff/:staffId/commissions?days=30`
  - `GET /customer-care/staff/:staffId/students/:studentId/session-commissions?days=30`
- **Guard**
  - controller mở cho `UserRole.staff` và `UserRole.admin`
  - service layer filter theo `staff.teacher` khi actor là staff; admin được bypass filter role staff nhưng vẫn đi cùng contract UI
  - riêng customer-care endpoints: admin đọc được mọi `staffId`; `UserRole.staff` chỉ được đọc khi staff hiện tại có role `customer_care` và `staffId` trùng hồ sơ của chính họ

## UI notes

- Sidebar/menu của `/staff` dùng cùng shell với admin sidebar: mobile drawer, collapse desktop, footer avatar + logout
- Điều hướng hiển thị theo role của staff hiện tại:
  - `teacher` hoặc `admin`: mục `Lớp học`
  - `customer_care`: mục `CSKH của tôi`
  - staff có cả `teacher` và `customer_care`: thấy cả hai mục
- Class detail dùng cùng layout header + card grid với admin class detail; vẫn tái sử dụng shared admin components nhưng ẩn mọi thông tin/control liên quan tới finance hoặc thay teacher/student
- Session editor và add-session popup chạy ở chế độ:
  - `teacherMode="readOnly"`
  - `allowFinancialFields=false`
  - `allowTeacherSelection=false`
  - `allowPaymentStatusEdit=false`
  - `allowDeleteSession=false`
- Bảng lịch sử buổi học trên `/staff/classes/[id]` dùng badge trạng thái thanh toán của session thay cho badge tiến độ thời gian; teacher/admin chỉ xem, không sửa từ route này
- Customer-care detail tự dùng shared panel với admin route nhưng header đổi sang self-service copy, không có route param và không có back link riêng

## DoD

- `staff.teacher` vào được `/staff`
- `admin` vào được `/staff`
- `/staff` liệt kê lớp theo actor hiện tại: teacher thấy lớp của mình, admin thấy toàn bộ danh sách
- `/staff/classes/[id]` cho sửa khung giờ + thêm/sửa session
- `staff.customer_care` vào được `/staff/customer-care-detail`
- `/staff/customer-care-detail` chỉ hiển thị dữ liệu CSKH của user hiện tại
- sidebar staff chỉ hiện mục `CSKH của tôi` khi actor có role `customer_care`
- Teacher không thể đụng vào trợ cấp hay học phí học sinh từ route này
