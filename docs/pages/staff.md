# Staff Workspace – `/staff`

## Route and role

- **Paths:** `/staff`, `/staff/classes/[id]`, `/staff/customer-care-detail`, `/staff/assistant-detail`, `/staff/accountant-detail`, `/staff/communication-detail`, `/staff/lesson-plan-detail`
- **Runtime access hiện tại:**
  - `/staff`: tài khoản hiện tại phải có linked `staffInfo`; đây là self-profile page của chính staff đang đăng nhập
  - `/staff/classes/[id]`: `admin`, hoặc `roleType=staff` và `staffInfo.roles` có `teacher`
  - `/staff/customer-care-detail`: hồ sơ staff hiện tại có role `customer_care`
  - `/staff/assistant-detail`: hồ sơ staff hiện tại có role `assistant`
  - `/staff/accountant-detail`: hồ sơ staff hiện tại có role `accountant`
  - `/staff/communication-detail`: hồ sơ staff hiện tại có role `communication`
  - `/staff/lesson-plan-detail`: hồ sơ staff hiện tại có role `lesson_plan` hoặc `lesson_plan_head`
- **Scope hiện tại:** self-service hồ sơ staff, teacher workflow cho lớp học, cộng thêm self-service route cho CSKH

## Features

- `/staff`
  - là self-detail page của staff hiện tại và bám layout chính của `apps/web/app/admin/staffs/[id]/page.tsx`
  - dùng chung staff shell, có lại staff sidebar ở route gốc và giữ cùng nhịp bố cục với trang admin detail
  - header hiển thị avatar, trạng thái staff, staff roles và nút chỉnh sửa hồ sơ cơ bản
  - có popup tự sửa hồ sơ cơ bản bằng `PATCH /users/me/staff`
  - chỉ cho sửa: `full_name`, `birth_date`, `university`, `high_school`, `specialization`, `bank_account`, `bank_qr_link`
  - hiển thị QR thanh toán từ hồ sơ staff hiện tại và tái dùng popup self-edit để cập nhật
  - hiển thị đầy đủ các section cùng contract dữ liệu với admin detail:
    - `Thông tin cơ bản`
    - `QR thanh toán`
    - `Thống kê thu nhập` theo tháng với `MonthNav`
    - popup `Buổi cọc theo lớp`
    - `Lớp phụ trách`
    - `Thưởng` của chính mình, cho phép tự thêm khoản thưởng mới và điều chỉnh nội dung khoản thưởng hiện có trong tháng đang xem
    - `Công việc khác` với tổng trợ cấp theo từng role của chính mình
    - `Lịch sử buổi học` của chính mình, kèm điều hướng sang lớp phụ trách để tạo buổi học mới
  - popup thưởng trên `/staff` dùng cùng bố cục/form với popup add bonus ở admin staff detail: `loại công việc` dạng dropdown có search, `số tiền`, `trạng thái thanh toán` dạng chỉ đọc, `ghi chú`; ở self-service bản ghi tạo ra vẫn luôn được backend khóa về `pending` và khi chỉnh sửa cũng không được tự đổi `payment status`
  - từ section `Lớp phụ trách` trên `/staff`, teacher/admin đi vào `/staff/classes/[id]`; route chi tiết lớp là nơi mở `AddSessionPopup` để thêm buổi học
  - popup thêm buổi học chỉ còn nằm ở `/staff/classes/[id]`, tiếp tục dùng flow `staff-ops` với các field ngày học, giờ học, `coefficient`, ghi chú, điểm danh; các field tài chính còn lại như `allowanceAmount`, học phí override và mọi khả năng chỉnh `custom allowance` vẫn bị khóa
  - từ bảng `Lịch sử buổi học` trên `/staff`, staff có thể mở form chỉnh sửa buổi học để cập nhật lại ngày giờ, `coefficient`, ghi chú và điểm danh; popup này vẫn không cho chỉnh trợ cấp hay học phí
  - nếu actor có role `teacher` hoặc là `admin`, các dòng trong section `Lớp phụ trách` mở sang `/staff/classes/[id]`
  - nếu actor có role `customer_care`, dòng `customer_care` trong section `Công việc khác` mở sang `/staff/customer-care-detail`
  - các role `assistant`, `accountant`, `communication` mở sang self route read-only để xem chi tiết trợ cấp của chính mình
  - các role `lesson_plan`, `lesson_plan_head` mở sang self route read-only để xem lesson output của chính mình
- `/staff/classes/[id]`
  - hiển thị thông tin lớp gần tương tự admin class detail
  - section `Gia sư phụ trách` là chỉ đọc; bấm vào từng gia sư không dẫn sang `/admin/staffs/:id`
  - cho phép chỉnh `khung giờ học`
  - cho phép thêm `session` với ngày học, giờ học, `coefficient`, note buổi học và điểm danh
  - cho phép chỉnh `session` gồm ngày học, giờ học, `coefficient`, note buổi học và điểm danh
  - form chỉnh `session` vẫn hiển thị tên gia sư phụ trách ở chế độ chỉ đọc khi self-service không được đổi gia sư
  - popup chỉnh `session` ở route này giữ cùng nhịp layout với form thêm buổi học: modal `wide`, phần cấu hình buổi học trải đều trước khi xuống block ghi chú và điểm danh
  - attendance `excused` và `absent` vẫn được lưu đầy đủ nhưng không tính học phí; chỉ `present` mới tạo charge ở backend
  - bảng lịch sử buổi học hiển thị `trạng thái thanh toán` của từng session ở dạng chỉ đọc
- `/staff/customer-care-detail`
  - tự động lấy `staffInfo.id` của user đang đăng nhập, không nhận `staffId` từ URL
  - dùng cùng dữ liệu với trang admin customer-care detail: 2 tab **Học sinh** và **Hoa hồng**
  - tab **Học sinh** hiển thị học sinh đang được giao chăm sóc (trạng thái, tên, số dư, tỉnh, lớp), sort theo số dư tăng dần
  - tab **Hoa hồng** hiển thị tổng hoa hồng 30 ngày qua theo học sinh; trên desktop, hàng danh sách dùng cột `Tên` và `Tổng tiền hoa hồng` cố định để giữ số liệu thẳng cột khi mở rộng từng học sinh xem commission theo buổi
  - khi mở rộng từng học sinh, mỗi buổi học hiển thị theo đúng một hàng, có badge trạng thái thanh toán CSKH lấy từ `customerCarePaymentStatus`, kèm lớp, học phí, hệ số CSKH và số tiền commission của buổi
- `/staff/assistant-detail`, `/staff/accountant-detail`, `/staff/communication-detail`
  - dùng self-service endpoint đọc trợ cấp của chính staff hiện tại theo đúng role tương ứng
  - layout giữ cùng visual language với admin extra allowance detail nhưng đã khóa toàn bộ create / bulk status / edit
  - chỉ hiển thị lịch sử trợ cấp, trạng thái thanh toán và số tiền của chính mình
- `/staff/lesson-plan-detail`
  - dùng self-service endpoint đọc thống kê lesson output của chính staff hiện tại trong 30 ngày gần nhất
  - layout bám màn admin lesson plan detail nhưng chỉ giữ chế độ chỉ đọc
  - vẫn cho copy link / mở link ngoài từ từng lesson output, nhưng không cho bulk payment status edit

## Permission boundaries

- Staff self page **được phép**
  - xem hồ sơ staff hiện tại
  - xem thống kê thu nhập, thưởng, ghi cọc, lịch sử buổi học và tổng trợ cấp theo role của chính mình
  - tự sửa thông tin cơ bản và thông tin nhận thanh toán cơ bản
  - tự thêm thưởng cho chính mình từ `/staff`; backend luôn tạo ở trạng thái `pending`
  - tự điều chỉnh `workType`, `month`, `amount`, `note` của thưởng chính mình từ `/staff`; trạng thái thanh toán vẫn do admin/quản trị xử lý
  - tự thêm và chỉnh sửa buổi học của lớp mình trực tiếp từ `/staff/classes/[id]`; backend vẫn tự áp dụng `customAllowance` hiện có của lớp, còn UI self-service chỉ được gửi `coefficient`
  - mở các link detail tự phục vụ đúng theo staff roles hiện tại khi route self-service tương ứng tồn tại
- Staff self role detail pages **được phép**
  - xem chi tiết trợ cấp `assistant`, `accountant`, `communication` của chính mình
  - xem chi tiết lesson output `lesson_plan` / `lesson_plan_head` của chính mình
  - xem chi tiết CSKH của chính mình khi có role `customer_care`
- Teacher **được phép**
  - xem danh sách lớp của chính mình từ section `Lớp phụ trách` trong `/staff`
  - xem chi tiết lớp được assign
  - chỉnh khung giờ lớp được assign
  - thêm/sửa session trên lớp được assign
  - cập nhật attendance status và attendance notes
- **Admin**
  - vào được `/staff` nếu tài khoản admin cũng có linked `staffInfo`
  - vào được `/staff/classes/[id]`
  - xem teacher workspace trong cùng giới hạn finance như teacher workspace
- Staff `customer_care` **được phép**
  - vào `/staff`
  - vào `/staff/customer-care-detail`
  - chỉ xem dữ liệu CSKH của chính mình
- Staff `customer_care` **không được phép**
  - xem dữ liệu CSKH của staff khác qua route `/staff`
  - dùng `/staff/classes/[id]` nếu không đồng thời có role `teacher`
- Teacher **không được phép**
  - tạo class
  - đổi teacher phụ trách
  - thêm/xóa học sinh trong class
  - sửa `allowanceAmount`
  - sửa `teacherPaymentStatus`
  - sửa `attendance.tuitionFee`
  - sửa học phí hay trợ cấp ở cấp lớp
- Staff self page **không được phép**
  - sửa role staff, status staff hoặc quyền hệ thống
  - xóa thưởng đã có hoặc tự đổi trạng thái thanh toán thưởng
  - chuyển trạng thái thanh toán buổi học, bonus, lesson output hoặc extra allowance
  - chỉnh học phí, trợ cấp, `custom allowance` hoặc bất kỳ field finance nào khác ngoài `coefficient` buổi học
  - xem hoặc thao tác dữ liệu của staff khác qua route `/staff`

## Data and API

- **Frontend API client:** `apps/web/lib/apis/staff-ops.api.ts`
- **Frontend API client (customer care self-service):** `apps/web/lib/apis/customer-care.api.ts`
- **Frontend API client (self profile):** `apps/web/lib/apis/auth.api.ts`
- **Backend routes đang dùng**
  - `GET /users/me/full`
  - `PATCH /users/me/staff`
  - `GET /users/me/staff-detail`
  - `GET /users/me/staff-income-summary?month=&year=&days=`
  - `GET /users/me/staff-bonuses?page=&limit=&month=&status=`
  - `POST /users/me/staff-bonuses`
  - `PATCH /users/me/staff-bonuses`
  - `GET /users/me/staff-sessions?month=&year=`
  - `GET /users/me/staff-extra-allowances?page=&limit=&year=&month=&roleType=&status=`
  - `GET /users/me/staff-lesson-output-stats?days=`
  - `GET /staff-ops/classes`
  - `GET /staff-ops/classes/:id`
  - `PATCH /staff-ops/classes/:id/schedule`
  - `GET /staff-ops/classes/:classId/sessions?month=&year=`
  - `POST /staff-ops/classes/:classId/sessions`
  - `PUT /staff-ops/sessions/:id`
  - `GET /customer-care/staff/:staffId/students`
  - `GET /customer-care/staff/:staffId/commissions?days=30`
  - `GET /customer-care/staff/:staffId/students/:studentId/session-commissions?days=30`
    - response chi tiết buổi hiện có thêm `paymentStatus` (map từ `attendance.customer_care_payment_status`, mặc định `pending` nếu DB trả `null`)
- **Guard**
  - controller mở cho `UserRole.staff` và `UserRole.admin`
  - root `/staff` chỉ coi là hợp lệ khi actor có `staffInfo`
  - root `/staff` lấy `staffId` từ user đang đăng nhập, không nhận `id` từ URL
  - service layer filter theo `staff.teacher` khi actor là staff; admin được bypass filter role staff nhưng vẫn đi cùng contract UI
  - riêng customer-care endpoints: admin đọc được mọi `staffId`; `UserRole.staff` chỉ được đọc khi staff hiện tại có role `customer_care` và `staffId` trùng hồ sơ của chính họ

## UI notes

- `/staff`, `/staff/classes/[id]` và `/staff/customer-care-detail` cùng dùng staff shell: mobile drawer, collapse desktop, footer avatar + logout
- các route `/staff/assistant-detail`, `/staff/accountant-detail`, `/staff/communication-detail`, `/staff/lesson-plan-detail` cũng đi chung staff shell
- Điều hướng của staff sidebar vẫn hiển thị theo role của staff hiện tại:
  - `teacher` hoặc `admin`: mục `Lớp học`
  - `customer_care`: mục `CSKH của tôi`
  - staff có cả `teacher` và `customer_care`: thấy cả hai mục
- `/staff` tái sử dụng shared staff detail components của admin (`StaffCard`, `StaffDetailRow`, `StaffQrCard`, `StaffBonusCard`, `SessionHistoryTable`, `MonthNav`) để giữ layout gần như trùng admin detail
- popup self-edit thay cho `EditStaffPopup`; bonus card trên `/staff` dùng `canManage=true`, giữ CTA thêm thưởng và truyền callback sửa để bấm từng dòng mở popup điều chỉnh, nhưng vẫn không có callback xóa
- `/staff` không còn CTA thêm buổi học; teacher/admin phải vào từng route `/staff/classes/[id]` từ section `Lớp phụ trách` để tạo buổi học
- popup chỉnh sửa session trong bảng `Lịch sử buổi học` trên `/staff` chạy với `allowFinancialEdits=false` và `allowCoefficientEdit=true`, nên chỉ mở riêng field hệ số
- các route trợ cấp role phụ và lesson-plan dùng cùng visual language với admin, nhưng mọi CTA mutate đều bị bỏ khỏi UI
- Class detail dùng cùng layout header + card grid với admin class detail; vẫn tái sử dụng shared admin components nhưng ẩn mọi thông tin/control liên quan tới finance hoặc thay teacher/student
- Session editor và add-session popup chạy ở chế độ:
  - `teacherMode="readOnly"`
  - `allowFinancialFields=false`
  - `allowTeacherSelection=false`
  - `allowPaymentStatusEdit=false`
  - `allowDeleteSession=false`
- Bảng lịch sử buổi học trên `/staff/classes/[id]` dùng badge trạng thái thanh toán của session thay cho badge tiến độ thời gian; teacher/admin có thể sửa session từ route này nhưng vẫn không được chỉnh các field tài chính
- Customer-care detail tự dùng shared panel với admin route nhưng header đổi sang self-service copy, không có route param và không có back link riêng

## DoD

- tài khoản có linked `staffInfo` vào được `/staff`
- `/staff` hiển thị self-detail của staff hiện tại với layout chính bám admin staff detail
- `/staff` chỉ cho chỉnh thông tin cơ bản, ngân hàng và QR
- `/staff` hiển thị thống kê thu nhập, popup ghi cọc, khối thưởng self-service, công việc khác và lịch sử buổi học
- `/staff` cho thêm và điều chỉnh thưởng của chính mình; bản ghi mới vẫn ở trạng thái `pending`, còn `payment status` hiện có chỉ hiển thị để xem
- `/staff` chỉ cho chỉnh sửa buổi học từ bảng lịch sử qua `staff-ops`, cho phép đổi `coefficient` nhưng không cho chỉnh `allowanceAmount`, học phí override hay `custom allowance`
- các dòng role trong `Công việc khác` mở được self route tương ứng nếu actor có role đó
- `staff.teacher` thấy section lớp của mình trên `/staff`
- `admin` có linked `staffInfo` vào được `/staff`
- `/staff/classes/[id]` là nơi tạo buổi học mới và cho sửa khung giờ + thêm/sửa session
- hồ sơ staff có role `customer_care` vào được `/staff/customer-care-detail`
- hồ sơ staff có role `assistant` vào được `/staff/assistant-detail`
- hồ sơ staff có role `accountant` vào được `/staff/accountant-detail`
- hồ sơ staff có role `communication` vào được `/staff/communication-detail`
- hồ sơ staff có role `lesson_plan` hoặc `lesson_plan_head` vào được `/staff/lesson-plan-detail`
- `/staff/customer-care-detail` chỉ hiển thị dữ liệu CSKH của user hiện tại
- sidebar staff chỉ hiện mục `CSKH của tôi` khi actor có role `customer_care`
- `/staff` route gốc render staff sidebar như các route staff khác
- Teacher không thể đụng vào trợ cấp hay học phí học sinh từ route này
