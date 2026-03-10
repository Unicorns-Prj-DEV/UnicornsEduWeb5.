# Auth pages (Login / Register / Forgot / Reset)

## Tổng quan

- **Paths:** `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`.
- **State layer:** TanStack Query (`useMutation`) cho toàn bộ submit flow auth.
- **Global providers:** `QueryClientProvider` + Sonner `Toaster` được mount tại `apps/web/app/providers.tsx`.
- **Auth API contract:** Giữ nguyên theo `apps/web/lib/apis/auth.api` (không đổi request/response contract).

## UI feedback chuẩn hoá

- Thay toàn bộ box thông báo inline lỗi/thành công trong 4 auth pages bằng toast của Sonner.
- Dùng `toast.error(...)` cho validation/mutation failure.
- Dùng `toast.success(...)` cho mutation success.
- Giữ nguyên redirect logic và fallback message hiện có.

## Redirect rules

- Login thành công: redirect theo role (`admin -> /admin`, `staff -> /mentor`, `student -> /student`, `guest -> /`).
- Register thành công: toast success, delay 3s rồi redirect `/auth/login`.
- Reset password thành công: toast success, delay 2s rồi redirect `/auth/login`.
- Forgot password thành công: toast success, không redirect.

## API endpoints đang dùng

- **API (real only):** login, logout, me (profile + role), register, verify email, forgot password, reset password.
- **Backend Auth endpoints hiện có:**
  - `POST /auth/login` body: `{ email, password, rememberMe? }`
    - refresh token policy: mặc định 7 ngày, nếu `rememberMe=true` thì 30 ngày.
  - `POST /auth/register` body: `{ email, password }`
  - `POST /auth/refresh` dùng `refresh_token` cookie
  - `GET /auth/profile`
  - `GET /auth/verify?token=...`
  - `POST /auth/forgot-password` body: `{ email }`
  - `POST /auth/reset-password` body: `{ token, password }`
- **Contract:** Auth DTO và role enum aligned với backend.
- **Mock:** Not used for auth; mock layer chỉ dùng cho nội dung sau đăng nhập.

## Tài liệu chi tiết theo trang

- [auth-login.md](./auth-login.md)
- [auth-register.md](./auth-register.md)
- [auth-forgot-password.md](./auth-forgot-password.md)
- [auth-reset-password.md](./auth-reset-password.md)
