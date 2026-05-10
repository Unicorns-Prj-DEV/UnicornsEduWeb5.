# Auth pages (Login / Register / Forgot / Reset / Setup Password / Verify Email)

## Tổng quan

- **Paths:** `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/setup-password`, `/verify-email`.
- **State layer:** TanStack Query (`useMutation`) cho toàn bộ submit flow auth.
- **Global providers:** `QueryClientProvider` + Sonner `Toaster` được mount tại `apps/web/app/providers.tsx`.
- **Auth gate:** `apps/web/app/providers.tsx` có `AuthPasswordSetupGate`; nếu user có session hợp lệ (`id` + `accountHandle`) và `requiresPasswordSetup=true` thì mọi route client sẽ bị đẩy về `/auth/setup-password`, kể cả khi `roleType` hiện tại vẫn là `guest`.
- **Auth API contract:** `GET /auth/session` là contract auth nhẹ dùng cho SSR, `proxy.ts`, bootstrap client và redirect sau login/setup-password. `GET /auth/profile` giữ backward compatibility nhưng delegate cùng session resolver. Cả hai trả về `id`, `email`, `emailVerified`, `canAccessRestrictedRoutes`, `accountHandle`, `roleType`, `requiresPasswordSetup`, `avatarUrl`, `staffRoles`, `hasStaffProfile`, `hasStudentProfile`.
- **Cookie policy:** backend set `access_token` và `refresh_token` với `secure=true` + `SameSite=Strict` khi `NODE_ENV=production`; ở `test` và các môi trường non-production thì dùng `secure=false` + `SameSite=Lax`.

## UI feedback chuẩn hoá

- Thay toàn bộ box thông báo inline lỗi/thành công trong 5 auth pages bằng toast của Sonner.
- Dùng `toast.error(...)` cho validation/mutation failure.
- Dùng `toast.success(...)` cho mutation success.
- Giữ nguyên redirect logic và fallback message hiện có.

## Redirect rules

- Login thành công:
  - nếu `canAccessRestrictedRoutes=false` (chưa verify email), frontend giữ user ở Home (`/`) và bật popup xác minh khi truy cập trang cá nhân/role routes
  - `admin -> /admin`
  - `staff -> /staff` chỉ khi session contract xác nhận `hasStaffProfile=true`; nếu chưa có profile thì fallback `/user-profile`
  - `student -> /student` chỉ khi session contract xác nhận `hasStudentProfile=true`; nếu chưa có profile thì fallback `/user-profile`
  - `guest -> /`
- Google OAuth thành công:
  - nếu user đã có `passwordHash`: backend set cookie và redirect về `FRONTEND_URL` như flow cũ
  - nếu user chưa có `passwordHash`: backend set cookie và redirect tới `/auth/setup-password?source=google`
  - trường hợp account mới vẫn có `roleType = guest` vẫn được coi là session hợp lệ để hoàn tất setup password, không bị đá về login chỉ vì role là `guest`
- Setup password thành công:
  - ưu tiên redirect về `next` hợp lệ nếu route đó bị gate chặn trước đó
  - nếu không có `next`, redirect theo role giống login thường
- Register thành công: toast success, delay 3s rồi redirect `/auth/login`.
- Reset password thành công: toast success, delay 2s rồi redirect `/auth/login`.
- Forgot password thành công: luôn trả generic success message, không redirect, không tiết lộ email có tồn tại hay chưa.
- Verify email thành công: `/verify-email?token=...` tự gọi backend `GET /auth/verify`, hiển thị success/error và CTA quay về login.
- Khi user đang đăng nhập nhưng chưa verify email:
  - chỉ được ở Home (`/`)
  - bấm avatar hoặc vào route cá nhân/role route sẽ mở popup “Vui lòng xác minh email”
  - popup hỗ trợ 2 case: chưa có email thì nhập email mới; đã có email thì hiển thị email masked và gửi lại mail xác minh; backend chấp nhận `refresh_token` session hợp lệ cho `POST /auth/resend-verification` để user không bị kẹt khi `access_token` đã hết hạn.

## Lấy user trong Server Component

Để lấy thông tin user hiện tại trong **Server Component**, Route Handler hoặc Server Action (không dùng React context):

- Import và gọi `getUser()` từ `@/lib/auth-server`.
- Hàm đọc cookie auth từ request, gọi backend `GET /auth/session`, và trả về `UserInfoDto` gồm `id`, `accountHandle`, `roleType`, `requiresPasswordSetup`, `avatarUrl`, `staffRoles`, `hasStaffProfile`, `hasStudentProfile`; nếu lỗi thì fallback guest user.

**Ví dụ (trang server component):**

```tsx
// app/some-page/page.tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth-server";

export default async function SomePage() {
  const user = await getUser();
  if (user.roleType === "guest") {
    redirect("/auth/login");
  }
  return <div>Hello, {user.accountHandle}</div>;
}
```

**Lưu ý:** `getUser()` chỉ chạy được ở môi trường server (Server Components, Route Handlers, Server Actions). Ở Client Component vẫn dùng `useAuth()` từ `AuthContext`.

## Email vs accountHandle (model)

- **email**: địa chỉ email, unique, dùng để gửi xác thực / quên mật khẩu.
- **accountHandle**: định danh đăng nhập (username), unique, dùng trong JWT và hiển thị (navbar, profile).
- Login chấp nhận một chuỗi: backend coi là accountHandle trước, không có thì coi là email.
- User đăng ký Google: `accountHandle` được set = email. User đăng ký form: nhập email và accountHandle riêng (có thể trùng hoặc khác).
- Nếu user đăng nhập Google mà tài khoản tương ứng vẫn chưa có `passwordHash`, backend sẽ giữ session nhưng đánh dấu `requiresPasswordSetup=true` cho tới khi hoàn tất `POST /auth/setup-password`.

## API endpoints đang dùng

- **API (real only):** login, logout, me (profile + role + `requiresPasswordSetup`), register, verify email, forgot password, reset password, setup password đầu tiên cho user OAuth.
- **Backend Auth endpoints hiện có:**
  - `POST /auth/login` body: `{ accountHandle, password, rememberMe? }`
    - Validation: `password` tối thiểu **6 ký tự** (`@MinLength(6)`). Nếu không đạt, API trả **400** (trước khi kiểm tra credentials); sai mật khẩu hợp lệ về độ dài thì **401**.
    - `accountHandle`: có thể là **email** hoặc **account handle** (username); backend tìm user theo accountHandle trước, không có thì theo email.
    - refresh token policy: mặc định 7 ngày, nếu `rememberMe=true` thì 30 ngày.
    - rate limit: `20` request / `5 phút` / IP.
  - `POST /auth/register` body: `{ email, accountHandle, password, ... }`
    - `accountHandle` phải unique; nếu trùng với user khác (khác email) sẽ trả 400.
    - rate limit: `10` request / `1 giờ` / IP.
  - `POST /auth/refresh` dùng `refresh_token` cookie
    - backend verify chữ ký refresh JWT **và** đối chiếu hash token đang trình bày với `user.refreshToken` đã lưu; refresh token cũ/đã rotate sẽ bị từ chối.
    - rate limit: `120` request / `1 phút` / IP.
- `GET /auth/session` — contract auth nhẹ cho frontend/server (`id`, `email`, `emailVerified`, `canAccessRestrictedRoutes`, `accountHandle`, `roleType`, `requiresPasswordSetup`, `avatarUrl`, `staffRoles`, `hasStaffProfile`, `hasStudentProfile`); guest trả về object cùng shape với default rỗng.
  - `GET /auth/profile` — backward-compatible alias của session resolver.
  - `GET /auth/me` — thông tin auth hiện tại từ DB theo `access_token`, trả cùng session shape.
- `POST /auth/resend-verification` (cần session đăng nhập qua `access_token` hoặc `refresh_token`)
  - body optional: `{ email?: string }`
  - không truyền email: gửi lại email xác minh tới email hiện tại
  - có truyền email: cập nhật email tài khoản hiện tại, reset `emailVerified=false`, rồi gửi mail xác minh tới email mới
  - endpoint này là `@Public()` ở lớp global JWT guard nhưng tự xác thực cookie trong controller; nếu không có session hợp lệ vẫn trả `401`.
  - nếu SMTP chưa cấu hình hoặc provider từ chối đăng nhập SMTP, backend trả `503` với thông báo cấu hình thay vì `500`. Với Gmail, `SMTP_PASS` phải là App Password 16 ký tự, không phải mật khẩu đăng nhập Google thường; backend chấp nhận cả dạng Google hiển thị có khoảng trắng (`abcd efgh ijkl mnop`) và sẽ bỏ khoảng trắng trước khi gửi qua SMTP.
  - `GET /auth/verify?token=...`
    - rate limit: `30` request / `1 giờ` / IP.
  - `POST /auth/forgot-password` body: `{ email }`
    - response luôn generic success; chỉ account tồn tại và đã verify mới được gửi mail reset thật.
    - rate limit: `5` request / `1 giờ` / IP.
  - `POST /auth/reset-password` body: `{ token, password }`
    - rate limit: `10` request / `1 giờ` / IP.
  - `POST /auth/setup-password` body: `{ password }`
    - chỉ dùng cho user đã đăng nhập nhưng chưa có `passwordHash`
    - backend sẽ hash mật khẩu, ghi audit, rotate lại cookies auth hiện tại
    - rate limit: `10` request / `30 phút` / IP.
  - `POST /auth/change-password`
    - chỉ dùng khi tài khoản đã có mật khẩu và cần truyền `currentPassword`
    - rate limit: `10` request / `30 phút` / IP.
- **Global rate limit:** các endpoint HTTP khác của API dùng limit mặc định `300` request / `60s` / endpoint / IP; health check `GET /` được `@SkipThrottle()`.
- **Phản hồi khi vượt ngưỡng:** backend trả `429 Too Many Requests`; frontend nên surface message này qua Sonner toast như các lỗi auth khác.
- **Contract:** Auth DTO và role enum aligned với backend.
- **Mock:** Not used for auth; mock layer chỉ dùng cho nội dung sau đăng nhập.

## Hồ sơ cá nhân (User module)

Các endpoint xem/sửa hồ sơ hiện tại nằm trong **user module** (không phải auth):

- `GET /users/me/full` — hồ sơ đầy đủ: user + `staffInfo` + `studentInfo` (nếu có). Yêu cầu cookie `access_token`.
- Trong rollout hiện tại, tên staff canonical nằm ở `User` (`first_name`, `last_name`; frontend có thể nhận thêm `fullName` nếu backend expose). `staffInfo.fullName` vẫn có thể xuất hiện trong response nhưng chỉ là giá trị derived để tương thích ngược.
- `PATCH /users/me` — cập nhật thông tin tài khoản (first_name, last_name, email, phone, province, accountHandle). Body: `UpdateMyProfileDto`. Nếu đổi email, backend tự reset `emailVerified=false` để bắt buộc xác minh lại email mới. Trả về full profile.
- `PATCH /users/me/staff` — cập nhật hồ sơ nhân sự (`cccd_*`, `birth_date`, `university`, `high_school`, `specialization`, `bank_account`, `bank_qr_link`). Body: `UpdateMyStaffProfileDto`. Không dùng endpoint này để đổi tên staff canonical. `bank_qr_link` chỉ chấp nhận URL `http/https` (được trim trước khi lưu). 400 nếu user không có staff.
- `PATCH /users/me/student` — cập nhật hồ sơ học viên (full_name, email, school, …). Body: `UpdateMyStudentProfileDto` (self-service không cho cập nhật `status`). 400 nếu user không có student.
- `POST /users/me/avatar` — upload ảnh đại diện, chỉ nhận JPEG/PNG/WEBP, tối đa 5MB (controller-level filter + service-level validation).
- `POST /users/me/staff/cccd-images` — upload ảnh CCCD mặt trước/sau, chỉ nhận JPEG/PNG/WEBP, tối đa 5MB mỗi file (controller-level filter + service-level validation).
- `GET /users/me/student-detail` — hồ sơ self-service của học sinh hiện tại, chỉ trả về field an toàn cho student UI (không có gói học phí / field admin-only).
- `GET /users/me/student-wallet-history?limit=` — lịch sử ví của học sinh hiện tại từ `wallet_transactions_history`.
- `PATCH /users/me/student-account-balance` — nạp/rút tiền trên ví của chính học sinh hiện tại. Body: `{ amount }`; `amount > 0` là nạp, `amount < 0` là rút. FE popup “Nạp” có thể gửi `amount` âm (cùng semantics). Backend chặn làm âm ví khi giảm số dư vượt số dư hiện có.

DTO: `apps/web/dtos/profile.dto.ts` và `apps/api/src/dtos/profile.dto.ts`.

## Trang hồ sơ cá nhân (`/user-profile`)

- **Path:** `/user-profile`.
- **Mục đích:** Hiển thị và cho phép chỉnh sửa thông tin user, staff (nếu có), student (nếu có).
- **UI/UX:** Bố cục hai cột từ `lg` (`max-w-5xl`): **cột trái** (~1/4) — avatar tròn, tên, nút pill «Đặt lại mật khẩu» (`/auth/forgot-password`), upload/xoá ảnh đại diện; **cột phải** — các khối «Thông tin chung», «Nhân sự», «Học viên» với danh sách **nhãn căn phải / giá trị căn trái** (`DetailRows`), phân nhóm bằng `hr`. Điều hướng mục bằng dòng link + %; gợi ý bổ sung (nếu có) phía trên lưới.
- **Tên staff canonical:** hiển thị và chỉnh ở khối «Thông tin chung» vì nguồn chuẩn nằm trên `User`; khối «Nhân sự» cho sửa các field staff-specific (CCCD, học vấn, ngân hàng, minh chứng thành tích, upload ảnh CCCD).
- **Nhân sự (staff):** form gồm CCCD, ngày/nơi cấp, ngày sinh, học vấn, chuyên ngành (`specialization` là textarea nhiều dòng, lưu newline thật để render Markdown), tài khoản/QR ngân hàng, **minh chứng thành tích** (`personal_achievement_link`), upload ảnh CCCD; `updateMyStaffProfile` + `POST /users/me/staff/cccd-images`. Có thể chỉnh tương đương qua `/staff/profile` (popup self-edit).
- **Data:** `useQuery` với `getFullProfile()` (GET /users/me/full). Cập nhật qua `updateMyProfile`, `updateMyStaffProfile`, `updateMyStudentProfile` với TanStack Query mutation; riêng tên staff canonical ở `/user-profile` đi qua `updateMyProfile`, không đi qua `updateMyStaffProfile`; toast Sonner cho thành công/lỗi.
- **Xác minh email:** Dòng Email (tài khoản) hiển thị icon + nhãn **Đã xác minh** / **Chưa xác minh** theo `emailVerified` từ `GET /users/me/full` (`EmailVerificationInline`). Khi **chưa** xác minh: nút «Xác minh email →→» gọi `POST /auth/resend-verification` (`authApi.resendVerificationEmail`). Mock `apps/web/mocks/user-profile-verification.mock.ts`: mặc định `forceEmailUnverifiedForTest: false` để hiển thị đúng API; có thể bật tạm khi test UI. `emailVerifiedWhenApiMissing` khi API thiếu field. Email trên hồ sơ **học viên** khác email đăng nhập: hiển thị ghi chú không áp dụng trạng thái xác minh tài khoản; nếu trùng email đăng nhập thì trạng thái trùng với tài khoản.
- **Bảo vệ:** Nếu 401 (chưa đăng nhập), trang gợi ý đăng nhập và link tới `/auth/login`.
- **Role gates:** `AdminAccessGate`, `StudentAccessGate` và `StaffAccessGate` dùng lightweight auth session (`useAuth()` bootstrap từ `GET /auth/session`) để kiểm tra `roleType`, `staffRoles`, `hasStaffProfile`, `hasStudentProfile`; không cần refetch `GET /users/me/full` chỉ để gate shell access.
- **Email verification gate:** Với session `canAccessRestrictedRoutes=false`, frontend chặn các route cá nhân/role routes bằng popup xác minh và giữ user ở Home; backend tiếp tục chặn `users/me/*` bằng guard để tránh lộ dữ liệu cá nhân qua API trực tiếp.

## Tài liệu chi tiết theo trang

- [auth-login.md](./auth-login.md)
- [auth-register.md](./auth-register.md)
- [auth-forgot-password.md](./auth-forgot-password.md)
- [auth-reset-password.md](./auth-reset-password.md)
- [auth-setup-password.md](./auth-setup-password.md)
