# Auth Login Page (`/auth/login`)

## Mục tiêu

Cho phép người dùng đăng nhập bằng email/password hoặc Google OAuth, hiển thị feedback bằng Sonner toast.

## Hành vi chính

- Submit login gọi `authApi.logIn`.
- Backend set `access_token` + `refresh_token` qua HTTP-only cookies; frontend chỉ cập nhật auth state và gọi `authApi.getFullProfile()` để resolve redirect.
- Tài khoản **chưa xác minh email** vẫn đăng nhập thành công (nếu đúng mật khẩu + handle/email) để tạo cảm giác đã đăng nhập.
- Nếu session trả về `canAccessRestrictedRoutes=false`, frontend giữ user ở `/` (Home-only mode).
- Redirect theo role:
  - `admin` -> `/admin`
  - `staff` -> `/staff`
  - `student` -> `/student`
  - fallback -> `/`
- Trường hợp query `error=google_no_user`: hiển thị `toast.error`.
- Nếu user bấm Google OAuth và backend phát hiện tài khoản tương ứng chưa có `passwordHash`, flow sẽ bị chuyển sang `/auth/setup-password?source=google` thay vì cho vào app ngay.

## Feedback UI

- Error network/API: `toast.error(...)`.
- Login fail thông thường: `toast.error("Đăng nhập thất bại.")`.
- Nếu backend trả `429 Too Many Requests`, màn login ưu tiên hiện toast rate-limit thay vì toast thất bại chung.
- Success login: `toast.success("Đăng nhập thành công.")`.
- Không render alert box inline trong form.

## Email vs account handle (login)

- Ô đăng nhập nhận **email** hoặc **account handle** (một trường duy nhất).
- Backend ưu tiên tìm theo `accountHandle` trùng, không có thì tìm theo `email`.
- Profile trả về `accountHandle` (hiển thị trên navbar, popup); với user đăng ký Google thì `accountHandle` = email.

## Ghi chú

- Session contract hiện bao gồm thêm: `email`, `emailVerified`, `canAccessRestrictedRoutes`.
- Khi user chưa verify, mọi attempt mở route cá nhân/role route sẽ bị chặn về Home và bật popup xác minh email.
- Google button dùng backend URL từ `NEXT_PUBLIC_BACKEND_URL` (fallback localhost:3001).
