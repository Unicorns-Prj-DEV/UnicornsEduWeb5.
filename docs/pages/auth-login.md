# Auth Login Page (`/auth/login`)

## Mục tiêu

Cho phép người dùng đăng nhập bằng email/password hoặc Google OAuth, hiển thị feedback bằng Sonner toast.

## Hành vi chính

- Submit login gọi `authApi.logIn`.
- Backend set `access_token` + `refresh_token` qua HTTP-only cookies; frontend chỉ cập nhật auth state và gọi `authApi.getFullProfile()` để resolve redirect.
- Redirect theo role:
  - `admin` -> `/admin`
  - `staff` -> `/staff`
  - `student` -> `/student`
  - fallback -> `/`
- Trường hợp query `error=google_no_user`: hiển thị `toast.error`.
- Nếu user bấm Google OAuth và backend phát hiện tài khoản tương ứng chưa có `passwordHash`, flow sẽ bị chuyển sang `/auth/setup-password?source=google` thay vì cho vào app ngay.

## Feedback UI

- Error network/API: `toast.error(...)`.
- Success login: `toast.success("Đăng nhập thành công.")`.
- Nếu backend trả `429 Too Many Requests` do vượt rate limit (`20` lần / `5 phút` / IP), frontend vẫn hiển thị lỗi qua toast hiện có.
- Không render alert box inline trong form.

## Email vs account handle (login)

- Ô đăng nhập nhận **email** hoặc **account handle** (một trường duy nhất).
- Backend ưu tiên tìm theo `accountHandle` trùng, không có thì tìm theo `email`.
- Profile trả về `accountHandle` (hiển thị trên navbar, popup); với user đăng ký Google thì `accountHandle` = email.

## Ghi chú

- Giữ nguyên login contract và redirect flow.
- Google button dùng backend URL từ `NEXT_PUBLIC_BACKEND_URL` (fallback localhost:3001).
