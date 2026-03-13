# Auth Register Page (`/auth/register`)

## Mục tiêu

Tạo tài khoản mới bằng email/password, hiển thị toàn bộ feedback bằng Sonner toast.

## Hành vi chính

- Form gồm: firstName, lastName, accountHandle, phone, email, password, confirmPassword, province.
- `accountHandle`: định danh đăng nhập (username), **unique**; có thể dùng email hoặc tên tùy chọn. Backend từ chối nếu accountHandle đã thuộc user khác (khác email).
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

- Giữ nguyên endpoint `POST /auth/register`; payload gồm `email`, `accountHandle`, `password`, `first_name`, `last_name`, `phone`, `province`.
- Lỗi 400: email đã tồn tại (đã verify) hoặc accountHandle đã được user khác sử dụng; message từ API hiển thị qua toast.
- Không thay đổi redirect timing/route.
