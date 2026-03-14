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

## Data and API

- **Backend domain:** `users`, `classes`, `sessions`, `attendance`, `revenue`, `dashboard_cache` (Workplan route-to-domain map).
- **Mock (Tuần 2–6):** Mock contract pack for admin: class list (empty + many students), permission denied, validation errors.
- **De-mock (Tuần 7):** Replace mock with real API per endpoint; checklist per screen/endpoint.
- **API (real):** `users`, `classes`, `sessions`, `attendance`, `class_teachers`, `student_classes`, dashboard/revenue endpoints.
- **Users/Student/Staff endpoints (dùng qua FE api hooks ở `apps/web/lib/apis/staff.api.ts` và `apps/web/lib/apis/student.api.ts`):**
  - `GET /users?page=<number>&limit=<number>`
  - `GET /users/:id`
  - `POST /users`
  - `PATCH /users`
  - `DELETE /users/:id`
  - Các endpoint này đi qua global JWT guard (không `@Public`) và chỉ cho role `admin`.
- **Staff endpoints & frontend data fetching:**
  - `GET /staff?page=<number>&limit=<number>&search=<text>&status=<active|inactive>&classId=<class-id>&province=<text>`.
  - `page` mặc định `1`, `limit` mặc định `20`, `limit` tối đa `100`.
  - `GET /staff` trả response dạng `{ data, meta }` với `meta = { total, page, limit }`.
  - Search và status filtering đã được chuyển xuống BE (`staff.service`) thay vì filter client-side.
  - `classId` lọc staff có dạy lớp tương ứng (match theo class ID qua `classTeachers`).
  - `province` lọc theo `user.province` bằng `contains`, không phân biệt hoa/thường.
  - FE `/admin/staff` dùng TanStack Query `useQuery` với query params (`page`, `limit`, `search`, `status`), và chỉ giữ pagination UI theo dữ liệu BE trả về.
  - Xóa staff dùng TanStack Query `useMutation`; khi thành công sẽ invalidate query danh sách và hiển thị Sonner toast.
  - FE `/admin/staff/:id` dùng TanStack Query `useQuery` với `enabled: !!id` cho trang chi tiết. Layout: hàng 1 [Thông tin cơ bản | Ô QR] (QR: chưa link = mờ + icon upload, click mở popup nhập link; có link = hiển thị hình QR, click mở link); hàng 2 Thống kê thu nhập; hàng 3 [Lớp phụ trách | Thưởng] (Thưởng: cấu trúc backup – Tổng tháng/Đã nhận/Chưa nhận, bảng bonus, nút Thêm thưởng); hàng 4 Công việc khác. QR link và Thưởng dùng mock data khi chưa kết nối BE.
  - Các endpoint này đi qua global JWT guard (không `@Public`); `users` và `student` yêu cầu role `admin`, `staff` giữ nguyên behavior auth hiện tại của module.
- **Class list (FE `/admin/classes`):** Hiển thị 3 cột: Tên lớp, Loại lớp, Gia sư; dấu chấm trạng thái ở đầu mỗi dòng (running = warning, ended = muted). Dùng TanStack Query gọi `GET /class` qua `apps/web/lib/apis/class.api.ts`; filter search + type đi qua query params backend. Click dòng → `/admin/classes/:id`. Nút "Thêm lớp học" mở popup form thêm lớp (Thông tin cơ bản, Gia sư phụ trách, Học phí, Khung giờ học); submit qua mutation `POST /class`, success sẽ toast + đóng popup + invalidate `['class','list']`.
- **Class endpoints (CRUD + pagination):**
  - `GET /class?page=<number>&limit=<number>&search=<text>&status=<running|ended>&type=<vip|basic|advance|hardcore>`.
  - `GET /class/:id`.
  - `POST /class` (không yêu cầu `id` trong payload, backend tự sinh UUID).
  - `PATCH /class` (payload bắt buộc `id`).
  - `DELETE /class/:id`.
  - `page` mặc định `1`, `limit` mặc định `20`, `limit` tối đa `100`.
  - `GET /class` trả response dạng `{ data, meta }` với `meta = { total, page, limit }`.
  - Filter hỗ trợ `search` theo tên lớp (contains, không phân biệt hoa/thường), `status`, `type`.
  - FE `/admin/classes/:id` bố cục: header (tên lớp, edit icon) → hàng 1: Gia sư phụ trách (trái) | Khung giờ học (phải) → Danh sách học sinh → Lịch sử buổi học và khảo sát (2 tab: Lịch sử, Khảo sát). Icon chỉnh sửa mở popup form đầy đủ.
  - FE `/admin/classes/:id` hiển thị `Gia sư phụ trách` bằng `TutorCard` (trái), lấy từ `teachers` của `GET /class/:id`; nếu chưa phân công sẽ hiện empty state `Chưa phân công gia sư phụ trách.`
  - Danh sách học sinh, Lịch sử buổi học, Khảo sát: vẫn giữ mock data trong page ở giai đoạn hiện tại; sẽ kết nối API ở phase sau.
  - Tab Lịch sử: nút "Thêm buổi học", chuyển tháng (prev/next) để lọc theo tháng.
  - Tab Khảo sát: nút "Thêm khảo sát", chuyển tháng (prev/next) để lọc theo tháng.
  - `Schedule` hỗ trợ nhiều khung giờ `from -> to` theo định dạng `HH:mm:ss`; FE `/admin/classes/:id` hiển thị bằng Time Card, popup chỉnh sửa dùng input time-only và submit mảng `[{ from, to }]` chỉ gồm giờ-phút-giây khi gọi `PATCH /class`.
  - Các endpoint đi qua global JWT guard (không `@Public`) theo behavior auth hiện tại của backend module.
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
  - Tab Tài liệu: chọn nhóm tài liệu (Luyện tập, Khảo sát, Thực chiến) → hiển thị list contest; bấm contest để mở rộng xem list bài (theo thứ tự Codeforces); bấm vào bài để chỉnh sửa tutorial. Dữ liệu từ API Codeforces qua BE proxy.
  - UI: Shadcn-style (Card, Form, Button), React Hook Form + Input Shadcn, TipTap (NotesSubjectRichEditor) cho nội dung rich text.

## DoD and week

- **Tuần 2:** Admin can create class, assign teacher/student, open session, record attendance; N-N no duplicates; attendance idempotency test; frontend `/admin` complete with mock and de-mock checklist.

## Accessibility

- Tables with proper headers and scope; status not by color only.
- Focus visible (`border-focus`); contrast AA on text and controls.

## Archived context (for implementation)

See [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) for full mapping.

- **Dashboard:** `archived/UniEdu-Web-3.9/frontend/src/pages/Dashboard.tsx` — period filter (month/quarter/year), quick-view tabs (finance, operations, students), DualLineChart, fetchDashboardData / fetchQuickViewData; redirect teacher to /home.
- **Classes CRUD + sessions/attendance:** `pages/Classes.tsx` (list), `pages/ClassDetail.tsx` (detail: students, sessions, attendance, surveys, header tuition, bulk actions); classesService, sessionsService, attendanceService; useAttendance, useSessionFinancials.
- **Students CRUD + assign:** `pages/Students.tsx`, `pages/StudentDetail.tsx`; studentsService, classesService; filters (search, status, classId, province); N-N via student_classes.
- **Personnel:** `pages/Teachers.tsx`, `pages/Staff.tsx`, `pages/StaffDetail.tsx`, `pages/StaffCSKHDetail.tsx`; teachersService, staffService; staff roles (accountant, lesson_plan, etc.).
- **Costs / categories:** `pages/Costs.tsx`, `pages/Categories.tsx`; costsService, categoriesService.
- **Action history:** `pages/ActionHistory.tsx`; actionHistoryService; admin-only in sidebar.
- **Layout:** Admin uses sidebar only (`Layout.tsx`, `Sidebar.tsx`); menu items filtered by role and requireStaffRole.
