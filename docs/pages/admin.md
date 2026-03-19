# Admin – `/admin`

## Route and role

- **Path:** `/admin`
- **Role:** `admin` only (guard must block other roles).
- **Workplan owner:** Huy (Frontend – Product Flow).

## Features

- **Dashboard (sơ bộ):** Tổng quan lớp, nhân sự, doanh thu (data from `revenue`, `dashboard_cache`).
- **CRUD lớp:** List, create, edit, archive classes; fields aligned with `classes` + relations.
- **Gán học sinh / giáo viên:** Manage `class_teachers`, `student_classes`; prevent duplicate N-N rows.
- **Sessions và attendance:** Mở session, ghi nhận attendance (`present` / `excused` / `absent`) with financial impact per Workplan state machine.
- **Route registry:** This route documented with auth mode, allowed role(s), and backend endpoint contract.

## UI-Schema tokens and components

- **Navbar:** `bg-surface`, `text-primary`, bottom `border-default`; item hover `bg-secondary`; active item `primary` + `text-inverse`.
- **Sidebar:** `bg-secondary`, `text-secondary`, right `border-default`; item hover `bg-tertiary`; active `primary` + `text-inverse`.
- **Cards:** `bg-surface`, `text-primary`, `border-default`; hover `bg-elevated` and subtle `border-focus`.
- **Tables:** Header `bg-secondary`; row `bg-surface`; `border-default` row separators; row hover `bg-secondary`; selected row `secondary`.
- **Buttons:** Primary = `primary` / `text-inverse`; Secondary = `secondary` + `border-default`.
- **Inputs:** `bg-surface`, `text-primary`, `border-default`; focus `border-focus`.
- **Badges (status):** Status tint (success/warning/error/info) with 12–16% alpha; text and border per UI-Schema.
- **Alerts:** Status tint background; icon + label for accessibility.
- **Reusable components (staff admin):** Tách các phần UI dùng lại vào `apps/web/components/admin/staff` (ví dụ: `StaffListTableSkeleton`, `StaffCard`, `StaffDetailRow`) để giữ page gọn và dễ bảo trì.
- **Reusable components (session history):** Dùng chung `SessionHistoryTable` + `SessionHistoryTableSkeleton` cho `/admin/classes/:id` và `/admin/staff/:id`; cột thực thể được điều khiển bởi `entityMode` (`teacher` | `class` | `none`).

## Data and API

- **Backend domain:** `users`, `classes`, `sessions`, `attendance`, `revenue`, `dashboard_cache` (Workplan route-to-domain map).
- **Mock (Tuần 2–6):** Mock contract pack for admin: class list (empty + many students), permission denied, validation errors.
- **De-mock (Tuần 7):** Replace mock with real API per endpoint; checklist per screen/endpoint.
- **API (real):** `users`, `classes`, `sessions`, `attendance`, `class_teachers`, `student_classes`, dashboard/revenue endpoints.
- **Sessions endpoints (admin-only):**
  - `POST /sessions` tạo session kèm danh sách attendance.
  - `PUT /sessions/:id` cập nhật session; attendance được đồng bộ theo payload (upsert bản ghi có trong payload, xóa bản ghi cũ không còn trong payload).
  - `DELETE /sessions/:id` xóa session theo id.
  - `GET /sessions/class/:classId?month=&year=` và `GET /sessions/staff/:staffId?month=&year=` lọc theo tháng/năm, validate month/year ở backend.
  - `GET /sessions/staff/:staffId/unpaid?days=<number>` trả tổng phụ cấp session `teacher_payment_status = unpaid` theo từng lớp trong `N` ngày gần nhất; `days` mặc định `14`.
- **Users/Student/Staff endpoints (dùng qua FE api hooks ở `apps/web/lib/apis/staff.api.ts` và `apps/web/lib/apis/student.api.ts`):**
  - `GET /users?page=<number>&limit=<number>`
  - `GET /users/:id`
  - `POST /users`
  - `PATCH /users`
  - `DELETE /users/:id`
  - Các endpoint này đi qua global JWT guard (không `@Public`) và chỉ cho role `admin`.
- **Staff endpoints & frontend data fetching:**
  - `GET /staff?page=<number>&limit=<number>&search=<text>&status=<active|inactive>&classId=<class-id>&className=<text>&province=<text>&university=<text>&highSchool=<text>&role=<staff-role>`.
  - `GET /staff/assignable-users?email=<text>` tìm user theo email để gán vào hồ sơ gia sư; response trả thêm cờ `isEligible`, `hasStaffProfile`, `ineligibleReason`.
  - `GET /staff/:id/income-summary?month=<01-12>&year=<YYYY>&days=<number>` trả summary thu nhập authoritative từ BE cho card tổng tháng/tổng năm, `Ghi cọc` theo năm + danh sách buổi cọc theo lớp, theo lớp phụ trách, thưởng và công việc khác.
  - Session allowance trong `income-summary` được tính ở DB layer theo công thức `min(max_allowance_per_session, (allowance_amount * attended_students + scale_amount) * coefficient)`, trong đó `attended_students` chỉ đếm attendance `present | excused`.
  - `POST /staff` dùng để tạo hồ sơ nhân sự từ `user_id`; với luồng thêm gia sư từ admin page, FE gửi `roles=["teacher"]`.
  - `page` mặc định `1`, `limit` mặc định `20`, `limit` tối đa `100`.
  - `GET /staff` trả response dạng `{ data, meta }` với `meta = { total, page, limit }`.
  - `GET /staff/:id` trả thêm `classAllowance` (tổng hợp theo `class_id` + `teacher_payment_status`) để FE render cột `Tổng nhận / Chưa nhận / Đã nhận` theo lớp phụ trách.
  - `PATCH /staff` (update staff) hỗ trợ cập nhật thêm `status` (`active|inactive`) từ form “Chỉnh sửa thông tin nhân sự”.
  - Search và status filtering đã được chuyển xuống BE (`staff.service`) thay vì filter client-side.
  - Search, status, `role`, `className`, `province`, `university`, `highSchool` đều được filter trực tiếp ở BE; FE `/admin/staffs` render đúng dữ liệu/pagination server trả về, không re-filter danh sách ở client.
  - `classId` lọc staff có dạy lớp tương ứng (match theo class ID qua `classTeachers`).
  - `province` lọc theo `user.province` bằng `contains`, không phân biệt hoa/thường.
  - FE `/admin/staff` dùng TanStack Query `useQuery` với query params (`page`, `limit`, `search`, `status`), và chỉ giữ pagination UI theo dữ liệu BE trả về.
  - FE `/admin/staffs` có nút ở góc trên bên phải để thêm gia sư từ user đã tồn tại: popup tìm kiếm user bằng email, chỉ cho chọn user hợp lệ, sau đó tạo `staff_info` với role `teacher`.
  - Khi admin tạo hồ sơ gia sư thành công, backend sẽ cập nhật `users.role_type` của user được gán sang `staff` để tài khoản đó dùng được các luồng staff/teacher.
  - Xóa staff dùng TanStack Query `useMutation`; khi thành công sẽ invalidate query danh sách và hiển thị Sonner toast.
  - FE `/admin/staff/:id` dùng TanStack Query `useQuery` với `enabled: !!id` cho trang chi tiết. Layout: hàng 1 [Thông tin cơ bản | Ô QR]; hàng 2 Thống kê thu nhập; hàng 3 Lịch sử buổi học + [Lớp phụ trách | Thưởng]; hàng 4 Công việc khác. QR link hiện vẫn chỉnh chủ yếu ở FE popup, còn phần Thưởng đã kết nối API `/bonus` cho list/create/update/delete theo tháng.
  - FE `/admin/staff/:id` đã kết nối lịch sử buổi học thật từ API `GET /sessions/staff/:staffId?month=&year=` (TanStack Query); có điều hướng tháng (prev/next) cho bảng lịch sử buổi học.
  - FE `/admin/staff/:id` thêm card riêng "Lịch sử buổi học" ở cuối trang để hiển thị bảng session theo tháng.
  - FE `/admin/staff/:id` phần Thống kê thu nhập dùng dữ liệu authoritative từ `GET /staff/:id/income-summary`; các số `Tổng tháng / Chưa nhận / Đã nhận` lấy từ field tổng hợp backend đã cộng cả session và thưởng tháng, FE không tự cộng thêm ở client.
  - FE `/admin/staff/:id` thêm cột **Ghi cọc** cạnh **Tổng năm**. Giá trị và popup chi tiết lấy trực tiếp từ `GET /staff/:id/income-summary` qua `depositYearTotal` và `depositYearByClass`; tổng cọc và từng buổi cọc đều dùng cùng công thức trợ cấp authoritative từ BE, không lấy raw `sessions.allowance_amount`.
  - FE `/admin/staff/:id` bảng **Công việc khác**: khi role là CSKH hoặc Trưởng CSKH (`customer_care` / `customer_care_head`), bấm vào dòng (desktop) hoặc thẻ (mobile) sẽ chuyển sang `/admin/customer_care_detail/:id` (cùng staff id).
- **Customer-care detail (FE `/admin/customer_care_detail/[staffId]`):**
  - Route dùng khi xem chi tiết công việc CSKH từ trang chi tiết nhân sự (bấm dòng CSKH trong bảng Công việc khác).
  - Hai tab: **Học sinh** (danh sách học sinh chăm sóc: icon trạng thái, tên, số dư, tỉnh, lớp; sắp xếp theo số dư tăng dần); **Hoa Hồng** (danh sách học sinh kèm tổng hoa hồng 30 ngày qua; bấm vào học sinh hiển thị các buổi học trong 30 ngày qua và hoa hồng từng buổi).
  - API customer-care (admin-only, JWT): `GET /customer-care/staff/:staffId/students` (học sinh trong `customer_care_service`, sort theo `accountBalance` tăng dần); `GET /customer-care/staff/:staffId/commissions?days=30` (học sinh + tổng hoa hồng từ attendance có `customerCareStaffId`, session trong N ngày); `GET /customer-care/staff/:staffId/students/:studentId/session-commissions?days=30` (chi tiết buổi + hoa hồng từng buổi). FE dùng TanStack Query và `apps/web/lib/apis/customer-care.api.ts`, DTO trong `apps/web/dtos/customer-care.dto.ts`. Các endpoint customer-care đi qua global JWT guard và yêu cầu role `admin`.
  - FE `/admin/staff/:id` thêm card riêng "Lịch sử buổi học" ở cuối trang để hiển thị bảng session theo tháng; popup chỉnh sửa buổi học tại đây dùng layout `wide` giống trang chi tiết lớp để giữ cùng cấu trúc 6 cột cho phần cấu hình.
  - FE `/admin/staff/:id` không còn tổng hợp tài chính nặng ở client. Các card `Thống kê thu nhập`, `Lớp phụ trách`, `Thưởng`, `Công việc khác` lấy trực tiếp từ `GET /staff/:id/income-summary`; FE chỉ render summary và invalidate query này sau khi sửa session/bonus.
  - Các endpoint này đi qua global JWT guard (không `@Public`); `users` và `student` yêu cầu role `admin`, `staff` giữ nguyên behavior auth hiện tại của module.
- **Class list (FE `/admin/classes`):** Hiển thị 3 cột: Tên lớp, Loại lớp, Gia sư; dấu chấm trạng thái ở đầu mỗi dòng (running = warning, ended = muted). Dùng TanStack Query gọi `GET /class` qua `apps/web/lib/apis/class.api.ts`; filter search + type đi qua query params backend. Click dòng → `/admin/classes/:id`. Nút "Thêm lớp học" mở popup form thêm lớp (Thông tin cơ bản, Gia sư phụ trách, Học phí, Khung giờ học); submit qua mutation `POST /class`, success sẽ toast + đóng popup + invalidate `['class','list']`. Danh sách hỗ trợ phân trang theo `page` (URL query), điều hướng Trước/Sau, đồng bộ `page` theo `meta.page` từ backend và hiển thị phạm vi bản ghi hiện tại. Hành động xóa lớp dùng popup confirm nội bộ của app thay vì browser confirm/window popup.
- **Class endpoints (CRUD + pagination):**
  - `GET /class?page=<number>&limit=<number>&search=<text>&status=<running|ended>&type=<vip|basic|advance|hardcore>`.
  - `GET /class/:id`.
  - `POST /class` (không yêu cầu `id` trong payload, backend tự sinh UUID).
  - `PATCH /class` (payload bắt buộc `id`; vẫn hỗ trợ cập nhật toàn bộ, có thể deprecated dần).
  - `PATCH /class/:id/basic-info` — cập nhật thông tin cơ bản + học phí (name, type, status, max_students, allowance_per_session_per_student, …). Khi gửi `allowance_per_session_per_student`, backend đồng bộ toàn bộ `class_teachers.customAllowance` của lớp về giá trị này.
  - `PATCH /class/:id/teachers` — thay thế danh sách gia sư (body: `{ teachers: [{ teacher_id, custom_allowance? }] }`).
  - `PATCH /class/:id/schedule` — thay thế khung giờ học (body: `{ schedule: [{ from, to }] }`, HH:mm:ss).
  - `PATCH /class/:id/students` — thay thế danh sách học sinh (body: `{ students: [{ id, custom_tuition_per_session?, custom_tuition_package_total?, custom_tuition_package_session? }] }`); backend là nơi derive `customStudentTuitionPerSession` từ package override nếu cần.
  - `DELETE /class/:id`.
  - `page` mặc định `1`, `limit` mặc định `20`, `limit` tối đa `100`.
  - `GET /class` trả response dạng `{ data, meta }` với `meta = { total, page, limit }`.
  - Filter hỗ trợ `search` theo tên lớp (contains, không phân biệt hoa/thường), `status`, `type`.
  - FE `/admin/classes/:id` bố cục: header (tên lớp, edit icon) → hàng 1: Gia sư phụ trách (trái) | Khung giờ học (phải) → Danh sách học sinh → Lịch sử buổi học và khảo sát (2 tab: Lịch sử, Khảo sát). Chỉnh sửa tách thành 4 form/popup: icon header mở form thông tin cơ bản (`PATCH /class/:id/basic-info`); mỗi card có nút "Chỉnh sửa" mở form tương ứng (gia sư → `PATCH /class/:id/teachers`, khung giờ → `PATCH /class/:id/schedule`, học sinh → `PATCH /class/:id/students`).
- FE `/admin/classes/:id` hỗ trợ điều hướng nhanh: bấm vào **dòng gia sư phụ trách** → `/admin/staffs/:id`, bấm vào **dòng học sinh** → `/admin/students/:id`.
  - FE `/admin/classes/:id` hiển thị `Gia sư phụ trách` bằng `TutorCard` (trái), lấy từ `teachers` của `GET /class/:id`; nếu chưa phân công sẽ hiện empty state `Chưa phân công gia sư phụ trách.`
  - API `GET /class/:id` trả thêm `students` với `customTuition*`, `effectiveTuition*`, `tuitionPackageSource`, `totalAttendedSession`, cùng `sessionTuitionTotal` ở level lớp để FE render authoritative tuition/package info và popup session mà không tự suy diễn.
  - FE `/admin/classes/:id` đã kết nối lịch sử buổi học thật từ API `GET /sessions/class/:classId?month=&year=` (TanStack Query), đồng thời dùng reusable component `SessionHistoryTable` để hiển thị bảng.
  - FE `/admin/classes/:id` loading state của trang và bảng session đã chuyển sang skeleton (`SessionHistoryTableSkeleton`) thay cho text loading.
  - Tab Lịch sử: nút "Thêm buổi học" mở popup form (ngày học, gia sư phụ trách, giờ bắt đầu/kết thúc, ghi chú buổi học rich text, bảng điểm danh học sinh theo `students` thật); nếu lớp đang có đúng `1` gia sư phụ trách thì popup khóa luôn gia sư hiện tại của lớp, còn nhiều gia sư thì vẫn cho chọn. Submit gọi `POST /sessions`, success đóng popup + invalidate query sessions theo class.
  - **Ghi chú buổi học (session notes):** Hỗ trợ rich text (HTML từ TipTap). Hiển thị trong bảng lịch sử buổi học (khi `entityMode="teacher"`) được sanitize bằng DOMPurify trước khi render. Popup thêm buổi học dùng `RichTextEditor` (TipTap) thay cho textarea.
  - **Chỉnh sửa buổi học:** Khi truyền `onSessionUpdated`, bảng lịch sử buổi học có cột "Thao tác" với nút "Sửa". Click mở dialog chỉnh sửa đầy đủ: ngày học, gia sư phụ trách, giờ bắt đầu/kết thúc, ghi chú (rich text), trạng thái thanh toán, **điểm danh học sinh** (khi có `getClassStudents`). Danh sách gia sư: từ trang lớp truyền `teachers`; từ trang gia sư truyền `getTeachersForClass(classId)`. Danh sách học sinh để điểm danh: truyền `getClassStudents(classId)` (trang lớp trả từ `classDetail.students`, trang gia sư gọi `GET /class/:id` lấy students). API list session (`GET /sessions/class/:id`, `GET /sessions/staff/:id`) trả thêm `attendance` cho mỗi session. Gọi `PUT /sessions/:id` với `date`, `teacherId`, `startTime`, `endTime`, `notes`, `teacherPaymentStatus`, `attendance`; sau khi thành công invalidate query sessions. **Xóa buổi học:** cùng cột Thao tác có nút xóa (icon thùng rác), bấm vào mở popup xác nhận nội bộ; xác nhận thì gọi `DELETE /sessions/:id`, thành công thì toast và invalidate query sessions.
  - Tab Lịch sử: hỗ trợ chuyển tháng (prev/next) để lọc theo tháng.
  - Tab Khảo sát: nút "Thêm khảo sát", chuyển tháng (prev/next) để lọc theo tháng.
  - `Schedule` hỗ trợ nhiều khung giờ `from -> to` theo định dạng `HH:mm:ss`; FE `/admin/classes/:id` hiển thị bằng Time Card, popup chỉnh sửa khung giờ gọi `PATCH /class/:id/schedule` với body `{ schedule: [{ from, to }] }`.
  - Các endpoint đi qua global JWT guard (không `@Public`) theo behavior auth hiện tại của backend module.
- **Student detail / membership:**
  - `PATCH /student/:id/classes` thay thế toàn bộ membership lớp của học sinh trong một mutation BE duy nhất; FE không còn tự fetch từng lớp rồi patch vòng lặp.
  - `GET /student/:id` trả luôn `effectiveTuition*`, `customTuition*`, `tuitionPackageSource`, `totalAttendedSession` và `class.status` cho từng `studentClasses` để FE `/admin/students/:id` render package label + số buổi + trạng thái lớp trực tiếp, không N+1 `GET /class/:id`.
- **Cost endpoints (CRUD + pagination):**
  - `GET /cost?page=<number>&limit=<number>&search=<text>`.
  - `GET /cost/:id`.
  - `POST /cost` (payload bắt buộc `id` dạng UUID).
  - `PATCH /cost` (payload bắt buộc `id`).
  - `DELETE /cost/:id`.
  - `page` mặc định `1`, `limit` mặc định `20`, `limit` tối đa `100`.
  - `GET /cost` trả response dạng `{ data, meta }` với `meta = { total, page, limit }`.
  - Filter hỗ trợ `search` theo `category` bằng `contains`, không phân biệt hoa/thường.
  - FE `/admin/costs` dùng TanStack Query `useQuery` với query params (`page`, `limit`, `search`) và đồng bộ URL query (`page`, `search`).
  - FE `/admin/costs` debounce search 1s, reset `page=1` khi đổi search, và sync lại `page` theo `meta.page` từ server khi cần.
  - FE `/admin/costs` có reusable popup `CostFormPopup` cho cả create/edit; bấm **Thêm chi phí** mở mode create, bấm vào row mở mode edit (nút xóa hoạt động độc lập).
  - Create/update cost ở FE dùng TanStack Query `useMutation`; khi thành công sẽ invalidate `queryKey: ["cost", "list"]`, hiện Sonner toast success và đóng popup.
  - Khi tạo cost mới, FE sinh `id` bằng `crypto.randomUUID()` trước khi gọi `POST /cost`; nếu không sinh được UUID thì chặn submit và hiện toast error.
  - Xóa cost ở FE `/admin/costs` dùng TanStack Query `useMutation`; khi thành công invalidate query danh sách và hiển thị Sonner toast success/error.
  - Các endpoint đi qua global JWT guard (không `@Public`) và yêu cầu role `admin`.
- **Ghi chú môn học (FE `/admin/notes-subject`):**
  - 2 tab: Quy định, Tài liệu.
  - Tab Quy định: danh sách bài post quy định; nút "Thêm bài quy định" mở popup form (tiêu đề, mô tả, nội dung TipTap); submit thêm vào mock list ngay trong page; hiện tại dùng mock data trong page, không gọi BE.
  - Tab Tài liệu: chọn nhóm tài liệu (Luyện tập, Khảo sát, Thực chiến) → hiển thị list contest; bấm contest để mở rộng xem list bài (theo thứ tự Codeforces); bấm vào bài để xem tutorial, bấm nút `Chỉnh sửa` để vào mode chỉnh sửa tutorial. Dữ liệu từ API Codeforces qua BE proxy.
  - UI: Shadcn-style (Card, Form, Button), React Hook Form + Input Shadcn, TipTap (NotesSubjectRichEditor) cho nội dung rich text.

## DoD and week

- **Tuần 2:** Admin can create class, assign teacher/student, open session, record attendance; N-N no duplicates; attendance idempotency test; frontend `/admin` complete with mock and de-mock checklist.

## Accessibility

- Tables with proper headers and scope; status not by color only.
- Focus visible (`border-focus`); contrast AA on text and controls.

## Codebase review snapshot (2026-03-14)

- Type-check:
  - `pnpm --filter api exec tsc --noEmit`: pass.
  - `pnpm --filter web exec tsc --noEmit`: pass.
- ESLint toàn repo (để audit chất lượng hiện trạng):
  - API: `344` errors, `8` warnings (đa số là formatting `prettier/prettier` và một phần `@typescript-eslint/no-unsafe-*`).
  - Web: `8` errors, `22` warnings (trong đó có nhóm `react-hooks/set-state-in-effect`).
- Ghi chú: đây là nợ kỹ thuật hiện hữu toàn repo khi quét rộng, không phải chỉ do các file thay đổi trong đợt này.

## Archived context (for implementation)

See [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) for full mapping.

- **Dashboard:** `archived/UniEdu-Web-3.9/frontend/src/pages/Dashboard.tsx` — period filter (month/quarter/year), quick-view tabs (finance, operations, students), DualLineChart, fetchDashboardData / fetchQuickViewData; redirect teacher to /home.
- **Classes CRUD + sessions/attendance:** `pages/Classes.tsx` (list), `pages/ClassDetail.tsx` (detail: students, sessions, attendance, surveys, header tuition, bulk actions); classesService, sessionsService, attendanceService; useAttendance, useSessionFinancials.
- **Students CRUD + assign:** `pages/Students.tsx`, `pages/StudentDetail.tsx`; studentsService, classesService; filters (search, status, classId, province); N-N via student_classes.
  - FE `/admin/students/:id` tối giản thẻ **Tài khoản hiện tại**: chỉ còn số dư + 2 nút Nạp/Rút. Thêm icon ví để mở popup **Lịch sử giao dịch** (lưu FE-only bằng `localStorage`). Thêm thẻ **Lịch thi** ngay dưới thẻ tài khoản (ngày thi + ghi chú, FE-only).
  - FE `/admin/students/:id` mục **Danh sách lớp học**: click vào dòng lớp → `/admin/classes/:id`. Bảng hiển thị `(•) Lớp | Gói học phí | Số buổi đã vào học`, nút điều chỉnh lớp dùng icon `+`, và có icon gỡ lớp ở cuối dòng (chỉ hiện khi hover/focus).
- **Personnel:** `pages/Teachers.tsx`, `pages/Staff.tsx`, `pages/StaffDetail.tsx`, `pages/StaffCSKHDetail.tsx`; teachersService, staffService; staff roles (accountant, lesson_plan, etc.).
- **Costs / categories:** `pages/Costs.tsx`, `pages/Categories.tsx`; costsService, categoriesService.
- **Action history:** `pages/ActionHistory.tsx`; actionHistoryService; admin-only in sidebar.
- **Layout:** Admin uses sidebar only (`Layout.tsx`, `Sidebar.tsx`); menu items filtered by role and requireStaffRole.
