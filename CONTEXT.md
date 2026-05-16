# Domain Context

## Ví học sinh

- **Yêu cầu nạp thẳng**: thao tác do CSKH, kế toán hoặc trợ lí tạo khi cần ghi nhận tiền vào ví học sinh ngoài luồng QR/webhook. Yêu cầu này không làm đổi số dư ngay.
- Mỗi yêu cầu nạp thẳng gồm `student_id`, số tiền VND nguyên dương và lý do đối soát. Backend gửi email React Email tới `ADMIN_EMAIL`; `ADMIN_EMAIL` phải là mailbox thật, và production `FRONTEND_URL` phải là origin public HTTPS để tạo link duyệt.
- Admin mở link trong email để xem trang xác nhận public. Link dùng token chỉ lưu dạng hash trong DB, hết hạn sau 14 ngày và chỉ cộng ví sau khi admin bấm nút xác nhận cuối cùng trên trang.
- Khi duyệt thành công, hệ thống tạo `wallet_transactions_history` loại `topup`, tăng `student_info.account_balance`, liên kết request với transaction và ghi action history cho hồ sơ học sinh.
