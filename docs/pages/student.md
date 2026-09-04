# Student – `/student`

## Route and role

- **Path:** `/student`
- **Role:** linked `studentInfo.status = active` hoặc role `student` self-service; actor có nhiều workspace vẫn mở `/student` nếu session resolve `access.student.canAccess=true`. Người dùng với role `student` lấy `/student` làm trang chủ mặc định thay vì `/user-profile`.
- **Workspace/tenant:** `/student` là student workspace trong app single-tenant; scope khóa theo tài khoản hiện tại và linked `studentInfo`, không theo `tenant_id`/`workspace_id`.
- **Yêu cầu hồ sơ:** người dùng có role `student` hoặc linked `studentInfo` trạng thái **Đang học** (`active`) được điều hướng về `/student`. Nếu hồ sơ đã **Nghỉ học** (`inactive`) hoặc chưa có workspace hợp lệ thì mới điều hướng về `/user-profile`.
- **Guest redirect:** guest mở `/student` được proxy đưa về `/auth/login?next=<path+query>` để sau login quay lại đúng student route nếu session có linked `studentInfo`.
- **Workplan owner:** Minh (Frontend – UX + Assistant/Student).

## Features

- **Loading:** `/student/loading.tsx` uses `StudentDashboardSkeleton`; this stays route-specific because `/student` is a single self-service dashboard rather than a broad segment with many child layouts.

- **Layout & Top Navigation (`StudentHeader`):** Giao diện dạng SPA không sidebar; trên đỉnh trang là `StudentHeader` gồm Brand lockup, các link điều hướng nhanh (`Học tập` `/student`, `Hồ sơ cá nhân` `/user-profile`), bộ chọn Theme (`SidebarThemePicker`), avatar và nút đăng xuất (học sinh không nhận thông báo hệ thống).
- **Trang chủ học sinh (`/student`):** Tinh gọn và tập trung vào trải nghiệm học tập:
  - **Tài khoản & Số dư:** Thẻ hiển thị số dư ví, nút **Nạp tiền** mở popup SePay static QR riêng của học sinh (hỗ trợ sao chép QR kèm thông tin học sinh), nút **Lịch sử ví** xem biến động số dư.
  - **Danh sách lớp học:** Hiển thị toàn bộ các lớp học sinh đang tham gia kèm trạng thái, học phí/buổi, gói học phí và số buổi đã vào học. Mỗi lớp có thể click trực tiếp để điều hướng sang trang chi tiết lớp `/student/classes/[id]`.
  - **UNIOJ:** Khối tiến độ giải bài trực tuyến UNIOJ.
  - **Thông tin cá nhân & Lịch thi:** Đã được chuyển về quản lý tập trung tại trang Hồ sơ `/user-profile` (bao gồm quản lý `StudentExamCard` và switch gửi biên lai nạp ví qua email).
- **Trang chi tiết lớp học sinh (`/student/classes/[id]`):** Gồm 2 tab:
  - **Tab Lịch sử:** Danh sách hợp nhất Buổi học & Khảo sát theo thứ tự thời gian mới nhất; bấm vào buổi học mở dialog chi tiết tập trung vào **Video recording YouTube bài giảng** và nhận xét/BTVN; bấm vào khảo sát mở dialog xem đánh giá kiến thức.
  - **Tab Chuyên đề:** Danh sách các bài học chuyên đề theo thứ tự gia sư sắp xếp; bấm vào từng dòng chuyên đề sẽ điều hướng sang trang chi tiết chuyên đề `/student/classes/[id]/topics/[topicId]`.
- **Trang chi tiết chuyên đề học sinh (`/student/classes/[id]/topics/[topicId]`):** Hiển thị chi tiết bài giảng chuyên đề bao gồm trình phát video bảo mật `YouTubeEmbed`, nội dung bài giảng WYSIWYG, tiêu đề, ngày đăng và nút quay lại danh sách chuyên đề.
- **Bảo mật Video YouTube (`YouTubeEmbed`):** Tích hợp đa tầng bảo vệ: vô hiệu hóa context menu, chặn phím tắt DevTools/xem mã nguồn (`F12`, `Ctrl+Shift+I/J/C`, `Cmd+Opt+I/J/C/U`), lớp màng chắn trong suốt che title & logo YouTube để chống bấm link ra ngoài, mã hóa/giải mã video ID runtime, và tự động phát hiện DevTools để làm mờ nội dung.

## UI-Schema tokens and components

- **Sidebar:** `bg-secondary`, `border-default`; active route `bg-primary` + `text-inverse`.
- **Cards (schedule, document, payment row):** `bg-surface`, `text-primary`, `border-default`; hover `bg-secondary` or `bg-elevated`.
- **Tables / lists:** Header `bg-secondary`; row `bg-surface`; `border-default`; row hover `bg-secondary`.
- **Buttons:** Primary = `primary` + `text-inverse`; Secondary = `secondary` + `border-default`.
- **Inputs (profile):** `bg-surface`, `text-primary`, `border-default`; focus `border-focus`.
- **Badges (payment status):** Same status tints as other routes; icon + label.
- **Tags (e.g. document type):** `bg-secondary`, `text-secondary`, `border-subtle`; selected `primary` + `text-inverse`.

## Data and API

- **Backend domain:** `student_info`, `student_classes`, `wallet_transactions_history`, `student_wallet_sepay_orders`, `topics`.
- **API (real):**
  - `GET /users/me/student-detail`
  - `PATCH /users/me/student`
  - `GET /users/me/student-classes`
  - `GET /users/me/student-classes/:classId/sessions`
  - `GET /users/me/student-classes/:classId/surveys`
  - `GET /users/me/student-classes/:classId/topics`
  - `GET /users/me/student-classes/:classId/topics/:topicId`
  - `GET /users/me/student-wallet-history?limit=`
  - `GET /users/me/student-wallet-sepay-static-qr` (SePay QR tĩnh, nội dung `[SEPAY_TRANSFER_NOTE_PREFIX] UNIST-[0-9a-f]{10}`, không chứa số tiền/class id/tên lớp; response vẫn trả thêm `classIds` để tương thích)
  - `POST /users/me/student-wallet-sepay-topup-order` body `{ amount }` — legacy/dynamic order endpoint còn tồn tại để tương thích, UI chính không gọi.
  - `PATCH /users/me/student-account-balance` body `{ amount }` — legacy endpoint còn tồn tại để tương thích route cũ nhưng backend luôn trả 400 và yêu cầu dùng SePay QR.
  - `POST /webhook/sepay` — SePay gọi khi có giao dịch ngân hàng; API xác thực HMAC `X-SePay-Signature` + `X-SePay-Timestamp` bằng `SEPAY_WEBHOOK_SECRET` trên chuỗi `{timestamp}.{raw_body}` (raw body đúng byte SePay gửi, không serialize lại từ `req.body`), từ chối timestamp quá `SEPAY_WEBHOOK_SIGNATURE_TOLERANCE_SECONDS` giây (mặc định `300`), chỉ nhận fallback `X-Secret-Key` khi `SEPAY_WEBHOOK_ALLOW_LEGACY_SECRET_KEY=1`, reconcile theo mã đơn/nội dung CK, khóa QR tĩnh theo `SEPAY_TRANSFER_ACCOUNT_NUMBER`, nhận diện student token trực tiếp, format cũ có marker `NAPVI`/`NAP VI`, và token ngân hàng đã strip dấu như `UNIST<10hex>`/`UNICL<10hex>`, trả `{ "success": true }` khi nhận hợp lệ.
  - `GET /users/me/student-exam-schedules`
  - `PUT /users/me/student-exam-schedules` body `{ items: [{ id?, examDate, note? }] }`
  - `GET /unioj/report?name=&days=` — JSON tiến độ học tập UNIOJ.
  - `GET /unioj/report/pdf?name=&days=` — backend proxy PDF; UI học sinh gọi endpoint này bằng Axios `responseType: "blob"`, sau đó preview/download bằng object URL nội bộ.
- **Self-edit scope:** Chỉ cho cập nhật thông tin cơ bản như họ tên, email liên hệ, trường, tỉnh/thành, năm sinh, liên hệ phụ huynh (`parent_name`, `parent_phone`, `parent_email`, `parent_receipt_email_enabled`), giới tính, mục tiêu; không cho tự chỉnh học phí, trạng thái hoặc phân lớp.
- **Balance semantics:** self-service chỉ hiển thị QR tĩnh, sau đó webhook mới cộng ví và ghi `wallet_transactions_history`. Học sinh không được gửi `amount` dương hoặc âm qua `PATCH /users/me/student-account-balance` để thay đổi số dư trực tiếp.
- **Frontend data layer:** TanStack Query + `apps/web/lib/apis/auth.api.ts`; DTO student self-service nằm trong `apps/web/dtos/student.dto.ts`.
- **Exam schedule persistence:** Lịch thi ở `/student` lưu authoritative ở backend qua `student_exam_schedules`; admin/student cùng đọc một nguồn dữ liệu và calendar aggregate có thể render `exam` event trực tiếp từ đó.

## Runtime status

- Route `/student` đã có file runtime thật tại `apps/web/app/student/page.tsx`.
- Shell route dùng `apps/web/app/student/layout.tsx` + `StudentAccessGate`; proxy cũng chặn `/student/**` bằng session nhẹ trước khi vào shell.
- `StudentAccessGate` dùng `GET /auth/session` qua `useAuth()` và chỉ mở khi actor có `access.student.canAccess` từ linked `studentInfo.status = active`; không phụ thuộc duy nhất vào `users.role_type`.
- Layout: `StudentSidebar` + vùng main (`#student-main-content`), skip link “Bỏ qua điều hướng”; không còn `Navbar` trong shell học sinh.
- Nội dung trang bám admin student detail nhưng đổi CTA và copy về hướng self-service.

## Mobile responsive notes

- Student shell uses sidebar + main content like other protected workspaces; mobile controls should maintain at least 44px touch targets.
- Student class cards wrap long class/package names and stack label/value rows below narrow-phone width.
- The current runtime includes self-profile, wallet, linked classes, and exam schedule data. A full student timetable/session schedule remains a planned surface and should reuse existing class/session/calendar data instead of calculating authoritative facts in the frontend.
- `StudentSidebar` still links account management to shared `/user-profile`; if a dedicated `/student/profile` route is introduced, keep nav context inside the student shell.

## DoD and week

- **Tuần 5:** Student sees only own data; basic self-profile editing and SePay QR wallet top-up available for own account only; tuition on linked classes is visible in read-only mode; frontend `/student` connected to real API.

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
