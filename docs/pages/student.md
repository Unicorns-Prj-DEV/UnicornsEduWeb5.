# Student – `/student`

## Route and role

- **Path:** `/student`
- **Role:** `student` only (guard must block other roles).
- **Workspace/tenant:** `/student` là student workspace trong app single-tenant; scope khóa theo tài khoản hiện tại và linked `studentInfo`, không theo `tenant_id`/`workspace_id`.
- **Yêu cầu hồ sơ:** cần `roleType=student` và linked `studentInfo`; thiếu hồ sơ học sinh thì shell không mở.
- **Workplan owner:** Minh (Frontend – UX + Assistant/Student).

## Features

- **Sidebar (`StudentSidebar`):** như staff: chuông trong sidebar, **panel/popup thông báo portal** ra `document.body`, mobile full màn hình; realtime toast hiển thị dạng tóm tắt và bấm vào toast mở đúng popup chi tiết thông báo tương ứng.
- **Thông tin cá nhân:** Dùng cùng bố cục với `/admin/students/[id]`, nhưng chỉ hiển thị hồ sơ của chính học sinh đang đăng nhập và cho phép học sinh tự chỉnh sửa các thông tin cơ bản của mình.
- **Save/refetch UX:** form tự sửa hồ sơ và popup ví dùng fast-close UX: pass validate là thoát edit mode/đóng popup ngay, hiện `toast.loading`, rồi resolve success/error khi backend xong; lỗi chỉ hiện toast, không tự mở lại form. Khi self detail refetch mà đã có dữ liệu cũ, section giữ nguyên nội dung, dim nhẹ và hiện refresh strip nhỏ.
- **Dữ liệu tài chính theo lớp:** Hiển thị học phí/buổi và gói học phí đang áp dụng cho từng lớp ở chế độ **chỉ xem** để học sinh theo dõi; không có control chỉnh học phí.
- **Ẩn dữ liệu nhạy cảm còn lại:** Không render customer care profit và các control quản trị lớp/hồ sơ.
- **Ví học viên:** Hiển thị số dư hiện tại, popup lịch sử ví authoritative, cho phép **nạp tiền** và **rút tiền** trên chính tài khoản của mình. Ở popup **Nạp tiền**, có thể nhập **số âm** để giảm số dư (cùng hiệu lực với rút) thay vì bắt buộc dùng tab Rút.
- **Nạp tiền qua SePay (tùy cấu hình):** Khi `NEXT_PUBLIC_STUDENT_WALLET_SEPAY_TOPUP=1` trên web **và** API đã cấu hình `SEPAY_*`, học sinh nhập **số tiền dương ≥ 1.000 VND** rồi bấm **Tạo mã QR SePay** → frontend gọi `POST /users/me/student-wallet-sepay-topup-order` → hiển thị **QR do backend trả về** (`qr_code` hoặc `qr_code_url`). Mode `va_order` dùng SePay UserAPI VA order cho BIDV/Sacombank; mode `bank_transfer` dùng VietQR quick link với nội dung `NAPVI <orderCode>` cho ngân hàng không hỗ trợ VA orders như MBBank. API lưu đơn vào `student_wallet_sepay_orders`; webhook SePay cập nhật ví tự động sau khi ngân hàng xác nhận và gửi **email biên lai nạp ví** tới `parent_email` (ưu tiên email snapshot trên đơn, không thì `student_info.parent_email`) nếu có; mail gồm HTML biên lai (React Email, logo/con dấu nhúng inline bằng CID) + PDF đính kèm khi API sinh PDF được, cùng plain text tóm tắt (tên phụ huynh nếu có, học sinh, mã học viên `student_info.id`, số tiền, mã đơn, nội dung CK, tham chiếu ngân hàng, số dư ví sau nạp). **Số âm** / **rút** không qua SePay, vẫn `PATCH /users/me/student-account-balance`. Khi API đã cấu hình SePay theo mode, backend chặn self-service nạp dương qua `PATCH`, nên web cần bật cờ SePay để tránh bypass luồng QR.
- **Ràng buộc rút / giảm số dư:** Backend chặn làm âm ví khi self-service rút hoặc khi nạp số âm vượt số dư hiện có.
- **Lớp học:** Hiển thị danh sách lớp đang liên kết + học phí đang áp dụng + số buổi đã vào học; không có thao tác đổi lớp/gỡ lớp hoặc sửa học phí.
- **Lịch thi:** Reuse card `StudentExamCard` để xem và quản lý lịch thi authoritative theo đúng `studentId` qua popup form; mỗi bản ghi gồm 1 ngày thi và 1 ghi chú ngắn, có thể thêm, sửa hoặc xóa và dữ liệu được lưu ở backend.
- **Data scope:** All data scoped to current student; backend enforces by identity.

## UI-Schema tokens and components

- **Sidebar:** `bg-secondary`, `border-default`; active route `bg-primary` + `text-inverse`. Panel thông báo: `bg-surface`, `border-default`, badge unread `bg-red-600`.
- **Cards (schedule, document, payment row):** `bg-surface`, `text-primary`, `border-default`; hover `bg-secondary` or `bg-elevated`.
- **Tables / lists:** Header `bg-secondary`; row `bg-surface`; `border-default`; row hover `bg-secondary`.
- **Buttons:** Primary = `primary` + `text-inverse`; Secondary = `secondary` + `border-default`.
- **Inputs (profile):** `bg-surface`, `text-primary`, `border-default`; focus `border-focus`.
- **Badges (payment status):** Same status tints as other routes; icon + label.
- **Tags (e.g. document type):** `bg-secondary`, `text-secondary`, `border-subtle`; selected `primary` + `text-inverse`.

## Data and API

- **Backend domain:** `student_info`, `student_classes`, `wallet_transactions_history`, `student_wallet_sepay_orders`.
- **API (real):**
  - `GET /users/me/student-detail`
  - `PATCH /users/me/student`
  - `GET /users/me/student-wallet-history?limit=`
  - `POST /users/me/student-wallet-sepay-topup-order` body `{ amount }` (SePay QR, số nguyên ≥ 1.000 VND, tuỳ cấu hình)
  - `PATCH /users/me/student-account-balance` body `{ amount }`
  - `POST /webhook/sepay` — SePay gọi khi có giao dịch ngân hàng; API xác thực HMAC `X-SePay-Signature` + `X-SePay-Timestamp` bằng `SEPAY_WEBHOOK_SECRET` trên chuỗi `{timestamp}.{raw_body}` (raw body đúng byte SePay gửi, không serialize lại từ `req.body`), từ chối timestamp quá `SEPAY_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS` giây (mặc định `300`), chỉ nhận fallback `X-Secret-Key` khi `SEPAY_WEBHOOK_ALLOW_LEGACY_SECRET_KEY=1`, reconcile theo mã đơn/nội dung CK, trả `{ "success": true }` khi nhận hợp lệ.
  - `GET /users/me/student-exam-schedules`
  - `PUT /users/me/student-exam-schedules` body `{ items: [{ id?, examDate, note? }] }`
- **Self-edit scope:** Chỉ cho cập nhật thông tin cơ bản như họ tên, email liên hệ, trường, tỉnh/thành, năm sinh, liên hệ phụ huynh (`parent_name`, `parent_phone`, `parent_email` – email phụ huynh nhận biên lai nạp ví), giới tính, mục tiêu; không cho tự chỉnh học phí, trạng thái hoặc phân lớp.
- **Balance semantics:** `amount > 0` = nạp tiền, `amount < 0` = rút tiền; backend ghi `wallet_transactions_history` và tự chặn số dư âm ở self-service route. Khi bật SePay trên UI, **nạp dương** tạo đơn + QR trước, sau đó webhook mới cộng ví; chỉ **số âm** / **rút** gọi `PATCH` điều chỉnh số dư trực tiếp.
- **Frontend data layer:** TanStack Query + `apps/web/lib/apis/auth.api.ts`; DTO student self-service nằm trong `apps/web/dtos/student.dto.ts`.
- **Exam schedule persistence:** Lịch thi ở `/student` lưu authoritative ở backend qua `student_exam_schedules`; admin/student cùng đọc một nguồn dữ liệu và calendar aggregate có thể render `exam` event trực tiếp từ đó.

## Runtime status

- Route `/student` đã có file runtime thật tại `apps/web/app/student/page.tsx`.
- Shell route dùng `apps/web/app/student/layout.tsx` + `StudentAccessGate`; proxy cũng chặn `/student/**` bằng session nhẹ trước khi vào shell.
- `StudentAccessGate` dùng `GET /auth/session` qua `useAuth()` và chỉ mở khi actor vừa có `roleType=student` vừa có linked `studentInfo`.
- Layout: `StudentSidebar` + vùng main (`#student-main-content`), skip link “Bỏ qua điều hướng”; không còn `Navbar` trong shell học sinh.
- Nội dung trang bám admin student detail nhưng đổi CTA và copy về hướng self-service.

## DoD and week

- **Tuần 5:** Student sees only own data; basic self-profile editing and wallet self-service available for own account only; tuition on linked classes is visible in read-only mode; frontend `/student` connected to real API.

## Accessibility

- Tables/lists with clear structure; status and links not by color only.
- Focus and contrast AA per UI-Schema.

## Archived context (for implementation)

See [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) for full mapping.

- **Own profile / read-only scope:** `archived/.../pages/StudentDetail.tsx` — when viewer is student and `user.linkId === id`: profile view/edit, no admin actions (canManageStudentRecord false, canTopUp false); accountIconMode `'self'` for login info.
- **Timetable / schedule:** `pages/Schedule.tsx` — weekly calendar, fetchSessions by date range; in 5.0 scope to current student’s classes/sessions only.
- **Payment history (read-only):** Reuse list/table pattern from `pages/Payments.tsx` but no create/update/delete; fetchPayments or equivalent filtered by current student.
- **Documents:** If present in archived (documentsService), reuse for “tài liệu” under student scope.
- **Layout:** Student uses top nav (no sidebar); same Layout pattern as teacher in archived.
