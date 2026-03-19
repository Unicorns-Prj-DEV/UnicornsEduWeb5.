# Auth Login Page (`/auth/login`)

## Mục tiêu

Cho phép người dùng đăng nhập bằng email/password hoặc Google OAuth, hiển thị feedback bằng Sonner toast.

## Hành vi chính

- Submit login gọi `authApi.logIn`.
- Nếu nhận `accessToken` + `refreshToken`, set cookie client-side rồi gọi `authApi.getProfile` để lấy role.
- Redirect theo role:
  - `admin` -> `/admin`
  - `staff` -> `/staff`
  - `student` -> `/student`
  - fallback -> `/`
- Trường hợp query `error=google_no_user`: hiển thị `toast.error`.

## Feedback UI

- Error network/API: `toast.error(...)`.
- Success login: `toast.success("Đăng nhập thành công.")`.
- Không render alert box inline trong form.

## Email vs account handle (login)

- Ô đăng nhập nhận **email** hoặc **account handle** (một trường duy nhất).
- Backend ưu tiên tìm theo `accountHandle` trùng, không có thì tìm theo `email`.
- Profile trả về `accountHandle` (hiển thị trên navbar, popup); với user đăng ký Google thì `accountHandle` = email.

## Ghi chú

- Giữ nguyên login contract và redirect flow.
- Google button dùng backend URL từ `NEXT_PUBLIC_BACKEND_URL` (fallback localhost:3001).
