# Tài liệu dự án Unicorns Edu 5.0

Mục lục tài liệu trong `docs/`, cộng với snapshot ngắn về trạng thái codebase đã được đối chiếu với repo hiện tại.

## Cấu trúc monorepo (thực tế)

| Thư mục / file | Mô tả                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web`     | Next.js 16, React 19, App Router. Frontend: `app/` (routes), `lib/` (API client).                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `apps/api`     | NestJS backend. `src/` (auth, `action-history/`, `cache/`, `notification/`, prisma, `session/` workflow services, `staff-ops/` access helpers, user/student/staff services, mail, …), `prisma/schema/`, `generated/` (Prisma Client), `dtos/`. Runtime hiện dùng bảng `dashboard_cache` của PostgreSQL cho dashboard read cache, auth identity cache in-memory TTL ngắn cho guard/profile lookups, global HTTP rate limiting qua `@nestjs/throttler`, và gateway `/notifications` để push realtime notification theo audience cho admin/staff/student. |
| `packages/`    | Shared packages (hiện chỉ có `.gitkeep`, chưa có package con).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `archived/`    | Bản lưu tham khảo (vd. `UniEdu-Web-3.9`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Root           | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `pnpm-lock.yaml`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**Không có** `apps/math-api` hay `apps/cp-api` — backend duy nhất là `apps/api`.

## Tài liệu trong `docs/`

| File                                                         | Nội dung                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [Cách làm việc.md](Cách%20làm%20việc.md)                     | Turborepo, pnpm, cài đặt, lệnh thường dùng, tech stack frontend, quy tắc. **Bắt đầu từ đây.** |
| [Workplan.md](Workplan.md)                                   | Kế hoạch 8 tuần, phase, DoD, route-to-domain, risk, launch checklist.                         |
| [UI-Schema.md](UI-Schema.md)                                 | Design tokens, theme (light/dark/pink), semantic naming, component mapping.                   |
| [Database Schema.md](Database%20Schema.md)                   | Prisma schema tại `apps/api/prisma/schema/`, bảng theo domain, quan hệ, source of truth.      |
| **pages/**                                                   | Spec từng route frontend (admin, student, mentor, assistant, landing, auth).                  |
| [pages/README.md](pages/README.md)                           | Route index, workplan phase mapping, conventions.                                             |
| [pages/ARCHIVED-UI-CONTEXT.md](pages/ARCHIVED-UI-CONTEXT.md) | Map UI archived (UniEdu-Web-3.9) sang 5.0, file tham khảo, services, pattern.                 |

## Route frontend (`apps/web/app/`)

- Đã có:
  - `/`
  - `/landing-page`
  - `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/setup-password`, `/verify-email`
  - `/student`
  - `/staff` (dashboard phân quyền theo role của staff hiện tại; mọi staff có `staffInfo` đều thấy thu nhập tháng, các khối còn lại bật theo role), `/staff/dashboard` (trợ lí: redirect về `/staff`), `/staff/profile`, `/staff/notification`
  - `/staff/users`, `/staff/staffs`, `/staff/staffs/[id]`, `/staff/classes`, `/staff/classes/[id]`, `/staff/students`, `/staff/students/[id]`, `/staff/costs`, `/staff/history`
  - `/staff/notes-subject`, `/staff/customer-care-detail`, `/staff/customer-care-detail/[staffId]`, `/staff/assistant-detail`, `/staff/accountant-detail`, `/staff/communication-detail`, `/staff/lesson-plan-detail`, `/staff/lesson-plan-detail/[staffId]`, `/staff/lesson_plan_detail`, `/staff/lesson_plan_detail/[staffId]`, `/staff/lesson-plan-tasks`, `/staff/lesson-plan-tasks/[taskId]`, `/staff/lesson-plan-manage-details`, `/staff/lesson-plans`, `/staff/lesson-plans/tasks/[taskId]`, `/staff/lesson-manage-details`
  - `/admin` (alias dashboard), `/admin/home`, `/admin/dashboard` (canonical dashboard route), `/admin/notification`
  - `/admin/classes`, `/admin/classes/[id]`
  - `/admin/students`
  - `/admin/users` (danh sách user, tạo account mới theo payload register + gửi mail xác thực + gán ngay role_type; nhánh tạo `student` hỗ trợ nhập hồ sơ học sinh đầy đủ + gán lớp ngay khi tạo qua endpoint chuyên biệt; phân quyền role_type + staff roles, auto-create staff/student profile khi cần)
  - `/admin/staffs`, `/admin/staffs/[id]`
  - `/admin/customer_care_detail/[staffId]` (chi tiết công việc CSKH: tab Học sinh, tab Hoa Hồng với trạng thái thanh toán theo buổi)
  - `/admin/lesson_plan_detail/[staffId]` (chi tiết lesson output theo staff: 3 card tổng hợp thanh toán + bảng bài đã làm theo layout tab Công việc)
  - `/admin/costs`, `/admin/accountant_detail`, `/admin/assistant_detail`, `/admin/communication_detail`, `/admin/categories`, `/admin/history`
  - `/admin/history` đã nối dữ liệu thật từ backend audit log (`/action-history` list + `/action-history/:id` detail)
  - `/admin/lesson-plans`, `/admin/lesson-plans/tasks/[taskId]`, `/admin/lesson-manage-details`, `/admin/lessons`, `/admin/notes-subject`
    - `/admin/lesson-plans` là workspace giáo án admin (dữ liệu thật), **cùng shell trang admin** với Lớp học: `bg-bg-primary` → khối `rounded-xl border bg-bg-surface`, hero gradient chỉ có tiêu đề **Giáo Án** (không mô tả phụ), thanh tab **pill** full width, ba nút chia đều (`Tổng quan` · `Công việc` · `Giáo Án`), không có dòng “Đang xem” và **không** có hàng card tổng kết ở tab Tổng quan / Công việc / Giáo Án — đi thẳng vào bảng / danh sách. Tab `Tổng quan`: hai bảng xếp dọc **Tài nguyên giáo án** và **Công việc giáo án** (pagination riêng); không có mô tả phụ dưới tiêu đề section; bảng tài nguyên chỉ các cột **Tài nguyên · Link · Tag** (+ thao tác), và với role quản lí có thể bấm trực tiếp vào card/dòng tài nguyên để mở popup chỉnh sửa; bảng công việc bấm dòng → chi tiết, không hiển thị mô tả dưới tiêu đề công việc; cột **Phụ trách** = người chịu trách nhiệm. Ở dải tablet, workspace ưu tiên card grid 2 cột trước khi chuyển sang desktop table để tránh nén nội dung trong admin shell.
    - Tab `Công việc`: **Bộ lọc nhanh** (form + URL `workSearch`…`workDateTo`, mặc định thu gọn) + **Thêm bài mới** (panel mặc định thu gọn, tái dùng shared `LessonOutputEditorForm` cùng form với task detail / popup nhanh nhưng chạy ở chế độ taskless: không chọn task, ẩn khối nhân sự, vẫn cho `POST /lesson-outputs` với `lessonTaskId=null`) + bảng **Bài giáo án đã làm** (`workYear`/`workMonth`/`workPage`); API `GET /lesson-work` hỗ trợ lọc bổ sung; TanStack Query `["lesson","work", …]`.
    - Tab `Giáo Án` (tab thứ 3): sidebar lọc **Level** (`exLevel`, `GET /lesson-work?level=…`) + bộ lọc nhanh (`exSearch`…`exDateTo`, mặc định thu gọn) + bảng **Giáo Án** (`exPage`, mặc định không lọc tháng); icon **phóng to** style outline mở route `/admin/lesson-manage-details` (bản quản lí chi tiết/phóng to của tab này); TanStack Query `["lesson","exercises", …]`.
    - Popup task hỗ trợ search nhân sự theo tên để chọn riêng `người chịu trách nhiệm` và `nhân sự thực hiện task`
    - `/admin/lesson-plans/tasks/[taskId]` là trang chi tiết lesson task, đọc dữ liệu thật từ backend, hiển thị đầy đủ outputs/resource của task; trang này tách rõ `người chịu trách nhiệm` và `nhân sự thực hiện task` (không còn card tổng hợp `nhân sự thực hiện output`; tên nhân sự từng output vẫn có thể xem trong dòng meta từng sản phẩm khi không ở chế độ participant), đồng thời cho phép mở popup chỉnh sửa, xóa hoặc tạo output mới ngay tại trang
    - `LessonOutput` không còn route detail riêng; các điểm chạm trong workspace admin mở popup chi tiết dùng chung ngay tại chỗ
  - `/admin/lessons` chỉ giữ vai trò alias và redirect về `/admin/lesson-plans`
  - `/api/healthcheck`
- Chưa có route runtime riêng cho `/assistant`, `/mentor`; các page plan tương ứng vẫn nằm trong `docs/pages/`.
- Route `/student` hiện là self-service page của chính học sinh đang đăng nhập, bám layout của `/admin/students/[id]`, cho phép tự cập nhật thông tin cơ bản; học phí/gói học phí theo lớp được mở ở chế độ chỉ đọc, còn các control tài chính nhạy cảm vẫn bị ẩn.
  - `/student` mở khi tài khoản có linked `studentInfo` hợp lệ và lấy dữ liệu qua `/users/me/student-detail`, `/users/me/student`, `/users/me/student-wallet-history`, `/users/me/student-account-balance`
  - từ `/student`, học sinh có thể tự cập nhật thông tin cơ bản của mình, xem liên hệ phụ huynh, lớp đang tham gia, mở popup để thêm/sửa/xóa lịch thi FE-local theo ngày + ghi chú và quản lý ví của chính mình
  - popup ví trên `/student` cho phép học sinh tự nạp tiền hoặc rút tiền; backend luôn khóa theo đúng hồ sơ hiện tại và chặn rút vượt số dư để không làm âm tài khoản
- Route `/staff` hiện có staff shell với sidebar theo role:
  - `/staff` là route gốc của staff shell: luôn hiển thị thẻ chung `Thu nhập tháng` từ self-service income summary, đồng thời bật các khối dashboard theo `staffInfo.roles` qua `GET /users/me/staff-dashboard`; `teacher` thấy lớp/cảnh báo lịch/lịch hôm nay, `lesson_plan` và `lesson_plan_head` thấy khối task giáo án, `assistant` thấy cảnh báo + summary vận hành + portfolio CSKH, `customer_care` thấy biến động học sinh và cảnh báo số dư, `accountant` thấy pending payroll + báo cáo tài chính rút gọn, còn `communication` hiện chưa có card riêng
  - `staff.assistant` có thêm cây route mirror trong staff shell: `/staff/dashboard`, `/staff/users`, `/staff/staffs`, `/staff/staffs/[id]`, `/staff/classes`, `/staff/students`, `/staff/students/[id]`, `/staff/costs`, `/staff/history`
  - `/staff/dashboard` (trợ lí) redirect về `/staff`; chi tiết nhân sự bản thân qua sidebar **Cá nhân** hoặc `/staff/staffs/:ownStaffId`
  - `/staff/profile` là **hồ sơ cá nhân** (nội dung cũ của `/staff`), bao gồm thống kê thu nhập, popup ghi cọc, lớp phụ trách, bonus, trợ cấp các role, lịch sử buổi học
  - thông báo: **chuông** trên sidebar staff (panel + URL `/staff/notification` cho trang feed đầy đủ); không còn mục menu riêng. Admin/staff/student khi online nhận toast Sonner realtime qua websocket `/notifications` nếu notification match audience hiện tại; toast chỉ tóm tắt và bấm vào sẽ mở popup chi tiết đúng thông báo trong panel
  - `/staff/notes-subject` với assistant sẽ mở full admin-like notes workspace ngay trong `/staff`; các staff role khác vẫn là bản chỉ đọc. Tab `Quy định` đã bỏ mock và đọc từ `GET /regulations`, backend tự lọc theo audience tag (`all`, `student`, hoặc từng staff role); tab `Tài liệu` tiếp tục dùng `GET /codeforces/*` và `GET /cf-problem-tutorial/:contestId/:problemIndex`. Mutation quản trị quy định (`POST/PATCH /regulations`) và tutorial vẫn giữ policy admin/assistant
  - Sidebar của assistant chuyển sang menu admin-like trong staff shell: **Dashboard**, **User**, **Nhân sự**, **Lớp học**, **Ghi chú môn học**, **Học sinh**, **Chi phí**, **Giáo Án**, **Lịch sử**
- `/staff/profile` mở khi tài khoản đang đăng nhập có linked `staffInfo` hợp lệ; trang này lấy dữ liệu qua các self-service endpoints `/users/me/full`, `/users/me/staff-detail`, `/users/me/staff-income-summary`, `/users/me/staff-bonuses`, `/users/me/staff-sessions`
- từ `/staff/profile` tên staff canonical được đọc từ `User` (`first_name` + `last_name`) và chỉ cập nhật qua `PATCH /users/me`; `staffInfo.fullName` chỉ còn là field derived để tương thích rollout. Popup self-edit trên trang này dùng `PATCH /users/me` cho tên hiển thị và `PATCH /users/me/staff` cho các field hồ sơ staff còn lại; ngoài ra staff có thể tự thêm thưởng cho chính mình qua `POST /users/me/staff-bonuses`, nhưng backend luôn khóa bản ghi mới ở trạng thái `pending`
  - các mutate nhạy cảm còn lại trên role, trạng thái, trợ cấp, học phí và thanh toán vẫn bị khóa
  - `staff.accountant` thấy thêm item `Lớp học` trong sidebar staff shell và có thể mở `/staff/classes`, `/staff/classes/[id]` theo admin-like class workspace; các action tạo mới/xóa vẫn bị ẩn giống policy accountant ở admin shell
  - `staff.accountant` thấy thêm item `Chi phí` trong sidebar staff shell và có thể mở `/staff/costs` theo admin-like cost workspace; các action tạo mới/xóa vẫn bị ẩn giống policy accountant ở admin shell
  - `staff.accountant` thấy thêm item `Giáo Án` trong sidebar staff shell và có thể mở `/staff/lesson-plans`; workspace bị ép về policy accountant: chỉ còn tab `Công việc`, cho sửa output hiện có và cập nhật trạng thái thanh toán, không cho tạo mới/xóa và không mở các route task/manage detail riêng
  - `/staff/classes/[id]` mở cho `staff.teacher`, `staff.customer_care`, `admin`, `staff.assistant`, và `staff.accountant`; assistant thấy class detail kiểu admin trong staff shell, accountant cũng dùng admin-like class detail khi không đồng thời có role `teacher`, còn teacher/admin giữ teacher workspace self-service để thêm/sửa session; customer-care dùng chế độ chỉ xem khi lớp có ít nhất một học sinh do chính họ phụ trách
  - từ class detail chỉ cho sửa khung giờ, tạo/chỉnh session và điểm danh; route này không cho thay đổi trợ cấp hoặc học phí học sinh
  - `/staff/customer-care-detail` mở khi hồ sơ staff hiện tại có role `customer_care`, luôn khóa theo đúng hồ sơ đó; nếu actor có role này, dòng `customer_care` ở section `Công việc khác` trên `/staff` sẽ mở sang màn self-service tương ứng
  - `/staff/customer-care-detail/[staffId]` mở cho `staff.assistant`, mirror admin customer-care detail nhưng giữ route-base trong staff shell
  - `/staff/assistant-detail`, `/staff/accountant-detail`, `/staff/communication-detail` vẫn là self-service theo role; riêng `communication` được thêm và chỉnh sửa khoản trợ cấp của chính mình nhưng không có quyền xóa, còn `staff.assistant` có thể mở các route này với query `staffId` để xem admin-like detail của staff khác ngay trong staff shell
  - `/staff/lesson_plan_detail` là self-detail canonical cho `lesson_plan` hoặc `lesson_plan_head`, mở từ bảng `Công việc khác` trên `/staff/profile` và dùng layout bám sát `/admin/lesson_plan_detail/[staffId]` nhưng giữ read-only self-service; alias `/staff/lesson-plan-detail` tiếp tục trỏ về cùng màn này, còn `staff.assistant` dùng `/staff/lesson_plan_detail/[staffId]` hoặc alias `/staff/lesson-plan-detail/[staffId]` để xem admin-like detail trong staff shell
  - `/staff/lesson-plans` là entrypoint lesson workspace dùng chung trong staff shell: `lesson_plan_head` thấy 3 tab `Tổng quan / Công việc / Giáo Án`, `lesson_plan` thấy `Tổng quan / Công việc`, `accountant` chỉ thấy tab `Công việc`; với staff có nhiều role trong module này, từng endpoint sẽ lấy quyền cao nhất mà endpoint đó cho phép nên case `lesson_plan + accountant` vẫn giữ tab `Tổng quan` nhưng tab `Công việc` dùng accountant scope để xem toàn bộ lesson output
  - `/staff/lesson-plans/tasks/[taskId]` mở cho `lesson_plan`, `lesson_plan_head`, `staff.assistant`; với `lesson_plan` route này chạy theo participant mode nên chỉ cho thao tác output/resource trong task mình tham gia, còn accountant không mở route này
  - `/staff/lesson-manage-details` chỉ mở cho `lesson_plan_head` và `staff.assistant`; các route legacy `/staff/lesson-plan-tasks*` và `/staff/lesson-plan-manage-details` chỉ còn redirect về `/staff/lesson-plans*`

### Phân quyền mở rộng (RBAC)

- **Nhân sự không có quyền xóa**: Mọi role staff đều bị chặn quyền xóa, ngoại trừ `assistant` khi đang dùng admin shell. Backend lesson DELETE endpoints (`lesson-resources`, `lesson-outputs`, `lesson-tasks`) cho phép `admin` và `staff.assistant`; các staff role khác vẫn bị chặn. Frontend ẩn nút xóa khi `workspacePolicy !== "admin"`.
- **AdminAccessGate** mở rộng: `assistant` có full access `/admin/**`; `accountant` truy cập `/admin/dashboard`, `/admin/classes`, `/admin/classes/[id]`, `/admin/staffs`, `/admin/staffs/[id]`, `/admin/costs`, `/admin/lesson-plans`, `/admin/accountant_detail`, `/admin/assistant_detail`, `/admin/communication_detail`, `/admin/customer_care_detail/[staffId]`, `/admin/lesson_plan_detail/[staffId]`; `lesson_plan_head` truy cập `/admin/lesson-plans/**`.
- **AdminAccessGate** giữ `/admin/notification` là route strict-admin: assistant bị redirect sang `/staff/notification`, còn các staff role khác bị chặn như route admin-only thông thường.
- **AdminSidebar** lọc menu items theo role: admin thấy thêm mục `Thông báo`; assistant không thấy link này dù vẫn giữ quyền ở các module admin khác; accountant thấy Dashboard, Nhân sự, Lớp học, Chi phí, Giáo Án; lesson_plan_head chỉ thấy Giáo Án. Các item của accountant đều trỏ vào trang đang được mở quyền thật, không surfacing link sang route bị chặn.
- **Admin Dashboard**: assistant không được gọi dashboard aggregate API. Khi vào `/admin` hoặc `/admin/dashboard`, FE chuyển assistant sang `/admin/staffs/:ownStaffId`; item `Dashboard` trong sidebar cũng trỏ về staff detail của chính họ.
- **Lesson Workspace Policy** (`workspacePolicy` prop trên `AdminLessonPlansWorkspace`):
  - `admin`: 3 tab, tạo/sửa/xóa tự do
  - `lesson_plan_head`: 3 tab, tạo/sửa nhưng không xóa
  - `lesson_plan`: tab `Tổng quan` + `Công việc`, giữ participant route UX; nếu staff chỉ có role này thì dữ liệu scope theo assignment thật của chính staff, không có tab `Giáo Án`
  - `accountant`: chỉ tab Công việc, có quyền sửa output hiện có và cập nhật trạng thái thanh toán, không tạo/xóa
  - với staff role kép trong lesson module, FE giữ route UX theo policy cao nhất phù hợp với tab cần mở, còn backend resolve quyền theo từng endpoint để chọn access mode rộng nhất mà endpoint đó cho phép
- **Accountant trên các màn admin**: accountant thấy sidebar `Nhân sự`, `Lớp học`, `Chi phí`, `Giáo Án`; có thể mở danh sách và trang chi tiết lớp/nhân sự, xem các detail page theo role (`assistant`/`accountant`/`communication`/`customer_care`/`lesson_plan`) và chỉnh sửa dữ liệu hiện có. FE ẩn toàn bộ action tạo mới/xóa ở `classes`, `staffs`, `costs`, bonus/thưởng nhân sự, và extra allowance detail; backend vẫn là nguồn chặn cuối cùng cho create/delete.
- **CSKH deep links**: `CustomerCareDetailPanels` dùng route-base-aware deep link. Trong admin workspace nó mở `/admin/students?search=...` và `/admin/classes/[id]`; trong assistant mirror dưới `/staff` nó mở `/staff/students?search=...` và `/staff/classes/[id]`; ở self-service `/staff/customer-care-detail`, tên học sinh mở `/staff/students/[id]` và tên lớp mở `/staff/classes/[id]`. Hai route này ở staff shell đều chạy theo policy read-only cho `customer_care` và backend tiếp tục khóa theo đúng học sinh/lớp thuộc hồ sơ CSKH hiện tại.

## Health snapshot (2026-04-13)

- Đã kiểm tra:
  - `pnpm --filter web exec tsc --noEmit`: pass
  - `pnpm --filter api check-types`: pass
  - `pnpm --filter api test`: pass
  - `pnpm --filter web lint`: pass với warning còn lại về `react-hooks/incompatible-library` và vài `@next/next/no-img-element`
- Backend audit coverage hiện tại:
  - `action_history` đã phủ các mutate flow ở `session`, `class`, `cost`, `bonus`, `extra_allowance`, `cf_problem_tutorial`, `user`, `student`, `staff`
  - auth flow có thay đổi `user` cũng đã ghi audit: `register`, `verify email`, `reset password`, `change password`, `setup password` cho tài khoản OAuth chưa có mật khẩu, và Google OAuth khi tạo/xác thực user
- Findings còn theo dõi:
  - API đã bật `ValidationPipe` toàn cục trong `apps/api/src/main.ts` (`transform: true`, `whitelist: true`) để dùng chung class-validator/class-transformer cho mọi route; các DTO vẫn nên được rà soát đủ decorator `@Allow()` / `@Type()` theo từng endpoint.
  - Web lint còn warning về `react-hooks/incompatible-library` tại popup tutorial và một số chỗ còn dùng `<img>` thay vì `next/image`.

## Dùng tài liệu khi implement

- **Backend / DB:** [Database Schema.md](Database%20Schema.md) + [Cách làm việc.md](Cách%20làm%20việc.md) (phần NestJS).
- **Frontend / UI:** [UI-Schema.md](UI-Schema.md) + [pages/](pages/) (file plan từng route) + [pages/ARCHIVED-UI-CONTEXT.md](pages/ARCHIVED-UI-CONTEXT.md).
- **Lệnh / cài đặt:** [Cách làm việc.md](Cách%20làm%20việc.md).
- **Tiến độ / scope:** [Workplan.md](Workplan.md).
