# Auth Register Page (`/auth/register`)

## Mục tiêu

Tạo tài khoản mới bằng email/password, hiển thị toàn bộ feedback bằng Sonner toast.

## Hành vi chính

- Form gồm: fullName, phoneNumber, email, password, confirmPassword.
- Validation client-side:
  - Password và confirmPassword phải khớp.
  - Password tối thiểu 6 ký tự.
- Submit gọi `authApi.register`.
- Thành công: `toast.success(...)`, chờ 3s rồi redirect `/auth/login`.

## Feedback UI

- Validation fail: `toast.error(...)`.
- API fail: `toast.error(...)` với fallback message hiện có.
- Không còn alert box inline error/success trong form.

## Ghi chú

- Giữ nguyên endpoint `POST /auth/register`; frontend map `fullName`/`phoneNumber` sang payload backend `name`/`phone`.
- Không thay đổi redirect timing/route.
