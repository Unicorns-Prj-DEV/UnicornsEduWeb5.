# Domain Context

## Giáo án

- **Nhân sự thực hiện giáo án**: một hoặc nhiều staff được giao thực hiện một `lesson_task`. Đây là ngôn ngữ nghiệp vụ duy nhất cho điều phối nhân sự ở cấp task.
- **Nhân sự nhận thanh toán output**: staff đứng tên chi phí/thanh toán cho một `lesson_output`; không phải nhóm điều phối task.
- Các cách gọi cũ như `người chịu trách nhiệm`, `nhân sự thực hiện task`, `nhân sự thực hiện output` không còn là ba nhóm phân công độc lập ở cấp task. Khi đọc data cũ, UI/API gộp các staff legacy này vào danh sách `Nhân sự thực hiện`; khi sửa task, backend ghi lại về `staff_lesson_task` và xóa `lesson_task.created_by`.

## Ví học sinh

- **Yêu cầu nạp thẳng**: thao tác do CSKH, kế toán hoặc trợ lí tạo khi cần ghi nhận tiền vào ví học sinh ngoài luồng QR/webhook. Yêu cầu này không làm đổi số dư ngay.
- Mỗi yêu cầu nạp thẳng gồm `student_id`, số tiền VND nguyên dương và lý do đối soát. Backend gửi email React Email tới `ADMIN_EMAIL`; `ADMIN_EMAIL` phải là mailbox thật, và production `FRONTEND_URL` phải là origin public HTTPS để tạo link duyệt.
- Admin mở link trong email để xem trang xác nhận public. Link dùng token chỉ lưu dạng hash trong DB, hết hạn sau 14 ngày và chỉ cộng ví sau khi admin bấm nút xác nhận cuối cùng trên trang.
- Khi duyệt thành công, hệ thống tạo `wallet_transactions_history` loại `topup`, tăng `student_info.account_balance`, liên kết request với transaction và ghi action history cho hồ sơ học sinh.
