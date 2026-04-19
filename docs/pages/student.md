# Student – `/student`

## Route and role

- **Path:** `/student`
- **Role:** `student` only (guard must block other roles).
- **Workplan owner:** Minh (Frontend – UX + Assistant/Student).

## Features

- **Sidebar (`StudentSidebar`):** như staff: chuông trong sidebar, **panel/popup thông báo portal** ra `document.body`, mobile full màn hình; realtime toast hiển thị dạng tóm tắt và bấm vào toast mở đúng popup chi tiết thông báo tương ứng.
- **Thông tin cá nhân:** Dùng cùng bố cục với `/admin/students/[id]`, nhưng chỉ hiển thị hồ sơ của chính học sinh đang đăng nhập và cho phép học sinh tự chỉnh sửa các thông tin cơ bản của mình.
- **Dữ liệu tài chính theo lớp:** Hiển thị học phí/buổi và gói học phí đang áp dụng cho từng lớp ở chế độ **chỉ xem** để học sinh theo dõi; không có control chỉnh học phí.
- **Ẩn dữ liệu nhạy cảm còn lại:** Không render customer care profit và các control quản trị lớp/hồ sơ.
- **Ví học viên:** Hiển thị số dư hiện tại, popup lịch sử ví authoritative, cho phép **nạp tiền** và **rút tiền** trên chính tài khoản của mình.
- **Ràng buộc rút tiền:** Backend chặn rút vượt số dư; self-service không được phép làm âm ví.
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

- **Backend domain:** `student_info`, `student_classes`, `wallet_transactions_history`.
- **API (real):**
  - `GET /users/me/student-detail`
  - `PATCH /users/me/student`
  - `GET /users/me/student-wallet-history?limit=`
  - `PATCH /users/me/student-account-balance` body `{ amount }`
  - `GET /users/me/student-exam-schedules`
  - `PUT /users/me/student-exam-schedules` body `{ items: [{ id?, examDate, note? }] }`
- **Self-edit scope:** Chỉ cho cập nhật thông tin cơ bản như họ tên, email liên hệ, trường, tỉnh/thành, năm sinh, liên hệ phụ huynh, giới tính, mục tiêu; không cho tự chỉnh học phí, trạng thái hoặc phân lớp.
- **Balance semantics:** `amount > 0` = nạp tiền, `amount < 0` = rút tiền; backend ghi `wallet_transactions_history` và tự chặn số dư âm ở self-service route.
- **Frontend data layer:** TanStack Query + `apps/web/lib/apis/auth.api.ts`; DTO student self-service nằm trong `apps/web/dtos/student.dto.ts`.
- **Exam schedule persistence:** Lịch thi ở `/student` lưu authoritative ở backend qua `student_exam_schedules`; admin/student cùng đọc một nguồn dữ liệu và calendar aggregate có thể render `exam` event trực tiếp từ đó.

## Runtime status

- Route `/student` đã có file runtime thật tại `apps/web/app/student/page.tsx`.
- Shell route dùng `apps/web/app/student/layout.tsx` + `StudentAccessGate` để khóa quyền theo role `student`.
- `StudentAccessGate` dùng `GET /users/me/full` và chỉ mở khi actor vừa có `roleType=student` vừa có linked `studentInfo`.
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
