---
date: 2026-05-10T00:00:00+07:00
researcher: agent
git_commit: 2f1bee851ea4aa39a8acf251ded73a0bb7141319
branch: main
repository: UnicornsEduWeb5
topic: "Nạp tiền học sinh (codebase) và quy hoạch tích hợp SePay"
tags: [research, codebase, student, wallet, topup, sepay]
status: complete
last_updated: 2026-05-10
last_updated_by: agent
---

# Research: Nạp tiền học sinh & quy hoạch SePay

**Git Commit**: `2f1bee851ea4aa39a8acf251ded73a0bb7141319`  
**Branch**: `main`  
**Repository**: UnicornsEduWeb5  

Permalinks (GitHub): `https://github.com/Hanguy21/UnicornsEduWeb5/blob/2f1bee851ea4aa39a8acf251ded73a0bb7141319/`

## Research Question

Mô tả tính năng nạp tiền cho học sinh trong codebase hiện tại; nền tảng để lên kế hoạch tích hợp SePay vào luồng nạp tiền.

## Summary

- **Dữ liệu:** `student_info.account_balance` là số dư; mọi thay đổi ghi vào `wallet_transactions_history` với `WalletTransactionType` (`topup` khi tăng, `loan` khi giảm trong luồng điều chỉnh có dấu).
- **Học sinh (self-service):** `PATCH /users/me/student-account-balance` với `{ amount }`; `amount > 0` nạp, `amount < 0` rút/giảm; **không** cho số dư âm (`allowNegativeBalance: false`). Ghi chú giao dịch có prefix cố định cho audit.
- **Admin/staff:** `PATCH /student/update-student-account-balance` với `student_id` + `amount`; cho phép số dư âm sau điều chỉnh.
- **UI:** `StudentBalancePopup` + `StudentWalletHistoryPopup` trên `/student` và `/admin/students/[id]`; TanStack Query + `auth.api` / `student.api`.
- **Báo cáo:** Dashboard aggregate dùng `wallet_transactions_history` loại `topup` (ví dụ `GET /dashboard/topup-history`).
- **SePay (tài liệu Context7):** Có REST tạo đơn (`POST /api/orders`), cổng form redirect (`POST https://pgapi.sepay.vn/v1/checkout/init`), và nhiều kiểu webhook (Bank Hub, OAuth2 merchant API). Tích hợp thực tế cần chọn sản phẩm SePay (VA/QR vs cổng) và luồng xác thực webhook phù hợp.

## Detailed Findings

### Schema & enum

- `WalletTransactionsHistory` trong `apps/api/prisma/schema/finance.prisma`: `studentId`, `type`, `amount`, `note`, `date`, `createdAt`; quan hệ tới `StudentInfo` và tùy chọn tới `Attendance`.
- `WalletTransactionType` trong `enums.prisma`: `topup`, `loan`, `repayment`, `extend`.

### Logic nghiệp vụ số dư

- `StudentService.applyStudentAccountBalanceChange`: làm tròn `amount`, kiểm tra non-zero; trong transaction: đọc `accountBalance`, tính `balanceAfter`, chặn âm nếu `!allowNegativeBalance`; tạo `walletTransactionsHistory` với `topup` hoặc `loan` và `amount` luôn dương (abs); `increment` `accountBalance`; optional `action_history`.

### Self-service API

- `UserProfileController`: `GET .../student-wallet-history`, `PATCH .../student-account-balance` → `updateMyStudentAccountBalance` (note prefix: học sinh tự nạp/rút).

### Admin API

- `StudentController`: `PATCH .../update-student-account-balance` → `updateStudentAccountBalance` (allow negative balance, note prefix thủ công từ trang chi tiết).

### Frontend học sinh

- `apps/web/app/student/page.tsx`: `StudentBalancePopup` với `submitBalanceChange` → `updateMyStudentAccountBalance`, `allowNegativeBalance={false}`, copy tiếng Việt cho nạp/rút.

### Tài liệu dự án

- `docs/pages/student.md`, `docs/pages/auth.md`, `docs/README.md` mô tả API và semantics nạp/rút.

## Code References

- `apps/api/prisma/schema/finance.prisma` — model ví lịch sử
- `apps/api/src/student/student.service.ts` — `applyStudentAccountBalanceChange`, `updateMyStudentAccountBalance`, `updateStudentAccountBalance`
- `apps/api/src/user/user-profile.controller.ts` — route self-service ví
- `apps/api/src/student/student.controller.ts` — route admin cập nhật số dư
- `apps/web/components/admin/student/StudentBalancePopup.tsx` — popup nạp/rút
- `apps/web/app/student/page.tsx` — wiring học sinh
- `apps/web/lib/apis/auth.api.ts` — client self-service ví

## SePay (Context7 / developer.sepay.vn)

- **Tạo đơn API:** `POST /api/orders` với `order_code`, `amount` (VND int), tùy chọn `bank_code`, `with_qrcode`, thông tin khách; response có VA, QR base64/URL, `expired_at`.
- **Cổng thanh toán:** Form POST `https://pgapi.sepay.vn/v1/checkout/init` với `merchant`, `order_amount`, `signature` (HMAC-SHA256), redirect khách.
- **Webhook:** Nhiều endpoint cấu hình webhook (Bank Hub sandbox `bankhub-api-sandbox.sepay.vn`, merchant `my.sepay.vn/api/v1/webhooks`); xác thực có thể qua `Authorization: Apikey ...`, `X-Secret-Key`, hoặc OAuth2 tùy cấu hình.

## Historical Context (thoughts/)

- Không có research trước đó chuyên đề ví/SePay trong `thoughts/shared/research/`; các file gần đây khác chủ đề (skeleton, tax, fetching).

## Related Research

- `thoughts/shared/research/2026-05-04-admin-staff-class-tax-reduction-rate.md` (không trực tiếp ví)

## Open Questions (cho phase triển khai SePay)

- Chọn chính xác sản phẩm SePay: chỉ VA/QR qua API đơn hàng, hay redirect cổng, hay Bank Hub webhook theo biến động tài khoản.
- Quy ước `order_code` / nội dung chuyển khoản để khớp học sinh và chống trùng.
- Idempotency khi webhook gọi nhiều lần; mapping trạng thái SePay → ghi `wallet_transactions_history` + tăng `account_balance` (có thể tách loại giao dịch hoặc mở rộng note/metadata).
- Sandbox vs production URL và biến môi trường bảo mật (API key, secret webhook, HMAC).
