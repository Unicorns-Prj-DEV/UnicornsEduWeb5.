# Tài liệu dự án Unicorns Edu 5.0

Mục lục tài liệu trong `docs/`, cộng với snapshot ngắn về trạng thái codebase đã được đối chiếu với repo hiện tại.

## Cấu trúc monorepo (thực tế)

| Thư mục / file | Mô tả |
|----------------|--------|
| `apps/web` | Next.js 16, React 19, App Router. Frontend: `app/` (routes), `lib/` (API client). |
| `apps/api` | NestJS backend. `src/` (auth, `action-history/`, prisma, `session/` workflow services, `staff-ops/` access helpers, user/student/staff services, mail, …), `prisma/schema/`, `generated/` (Prisma Client), `dtos/`. |
| `packages/` | Shared packages (hiện chỉ có `.gitkeep`, chưa có package con). |
| `archived/` | Bản lưu tham khảo (vd. `UniEdu-Web-3.9`). |
| Root | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `pnpm-lock.yaml`. |

**Không có** `apps/math-api` hay `apps/cp-api` — backend duy nhất là `apps/api`.

## Tài liệu trong `docs/`

| File | Nội dung |
|------|----------|
| [Cách làm việc.md](Cách%20làm%20việc.md) | Turborepo, pnpm, cài đặt, lệnh thường dùng, tech stack frontend, quy tắc. **Bắt đầu từ đây.** |
| [Workplan.md](Workplan.md) | Kế hoạch 8 tuần, phase, DoD, route-to-domain, risk, launch checklist. |
| [UI-Schema.md](UI-Schema.md) | Design tokens, theme (light/dark/pink), semantic naming, component mapping. |
| [Database Schema.md](Database%20Schema.md) | Prisma schema tại `apps/api/prisma/schema/`, bảng theo domain, quan hệ, source of truth. |
| **pages/** | Spec từng route frontend (admin, student, mentor, assistant, landing, auth). |
| [pages/README.md](pages/README.md) | Route index, workplan phase mapping, conventions. |
| [pages/ARCHIVED-UI-CONTEXT.md](pages/ARCHIVED-UI-CONTEXT.md) | Map UI archived (UniEdu-Web-3.9) sang 5.0, file tham khảo, services, pattern. |

## Route frontend (`apps/web/app/`)

- Đã có:
  - `/`
  - `/landing-page`
  - `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`
  - `/student`
  - `/staff`, `/staff/classes/[id]`, `/staff/customer-care-detail`, `/staff/assistant-detail`, `/staff/accountant-detail`, `/staff/communication-detail`, `/staff/lesson-plan-detail`, `/staff/lesson-plan-tasks`, `/staff/lesson-plan-tasks/[taskId]`, `/staff/lesson-plan-manage-details`, `/staff/lesson-plans`, `/staff/lesson-plans/tasks/[taskId]`, `/staff/lesson-manage-details`
  - `/admin`, `/admin/home`, `/admin/dashboard`
  - `/admin/classes`, `/admin/classes/[id]`
  - `/admin/students`
  - `/admin/users` (danh sách user, phân quyền role_type + staff roles, auto-create staff/student profile khi cần)
  - `/admin/staffs`, `/admin/staffs/[id]`
  - `/admin/customer_care_detail/[staffId]` (chi tiết công việc CSKH: tab Học sinh, tab Hoa Hồng với trạng thái thanh toán theo buổi)
  - `/admin/lesson_plan_detail/[staffId]` (chi tiết lesson output theo staff: 3 card tổng hợp thanh toán + bảng bài đã làm theo layout tab Công việc)
  - `/admin/costs`, `/admin/accountant_detail`, `/admin/assistant_detail`, `/admin/communication_detail`, `/admin/categories`, `/admin/history`
  - `/admin/history` đã nối dữ liệu thật từ backend audit log (`/action-history` list + `/action-history/:id` detail)
  - `/admin/lesson-plans`, `/admin/lesson-plans/tasks/[taskId]`, `/admin/lesson-manage-details`, `/admin/lessons`, `/admin/notes-subject`
    - `/admin/lesson-plans` là workspace giáo án admin (dữ liệu thật), **cùng shell trang admin** với Lớp học: `bg-bg-primary` → khối `rounded-xl border bg-bg-surface`, hero gradient chỉ có tiêu đề **Giáo Án** (không mô tả phụ), thanh tab **pill** full width, ba nút chia đều (`Tổng quan` · `Công việc` · `Giáo Án`), không có dòng “Đang xem” và **không** có hàng card tổng kết ở tab Tổng quan / Công việc / Giáo Án — đi thẳng vào bảng / danh sách. Tab `Tổng quan`: hai bảng xếp dọc **Tài nguyên giáo án** và **Công việc giáo án** (pagination riêng); không có mô tả phụ dưới tiêu đề section; bảng tài nguyên chỉ các cột **Tài nguyên · Link · Tag** (+ thao tác); bảng công việc bấm dòng → chi tiết, không hiển thị mô tả dưới tiêu đề công việc; cột **Phụ trách** = người chịu trách nhiệm.
    - Tab `Công việc`: **Bộ lọc nhanh** (form + URL `workSearch`…`workDateTo`, mặc định thu gọn) + **Thêm bài mới** (panel mặc định thu gọn, tái dùng shared `LessonOutputEditorForm` cùng form với task detail / popup nhanh nhưng chạy ở chế độ taskless: không chọn task, ẩn khối nhân sự, vẫn cho `POST /lesson-outputs` với `lessonTaskId=null`) + bảng **Bài giáo án đã làm** (`workYear`/`workMonth`/`workPage`); API `GET /lesson-work` hỗ trợ lọc bổ sung; TanStack Query `["lesson","work", …]`.
    - Tab `Giáo Án` (tab thứ 3): sidebar lọc **Level** (`exLevel`, `GET /lesson-work?level=…`) + bộ lọc nhanh (`exSearch`…`exDateTo`, mặc định thu gọn) + bảng **Giáo Án** (`exPage`, mặc định không lọc tháng); icon **phóng to** style outline mở route `/admin/lesson-manage-details` (bản quản lí chi tiết/phóng to của tab này); TanStack Query `["lesson","exercises", …]`.
    - Popup task hỗ trợ search nhân sự theo tên để chọn riêng `người chịu trách nhiệm` và `nhân sự thực hiện task`; khối `nhân sự thực hiện output` là read-only, lấy từ các output con và không còn ghi đè assignment của task
    - `/admin/lesson-plans/tasks/[taskId]` là trang chi tiết lesson task, đọc dữ liệu thật từ backend, hiển thị đầy đủ outputs/resource của task; trang này tách rõ `người chịu trách nhiệm`, `nhân sự thực hiện task`, và `nhân sự thực hiện output`, đồng thời cho phép mở popup chỉnh sửa, xóa hoặc tạo output mới ngay tại trang
    - `LessonOutput` không còn route detail riêng; các điểm chạm trong workspace admin mở popup chi tiết dùng chung ngay tại chỗ
  - `/admin/lessons` chỉ giữ vai trò alias và redirect về `/admin/lesson-plans`
  - `/api/healthcheck`
- Chưa có route runtime riêng cho `/assistant`, `/mentor`; các page plan tương ứng vẫn nằm trong `docs/pages/`.
- Route `/student` hiện là self-service page của chính học sinh đang đăng nhập, bám layout của `/admin/students/[id]` nhưng chỉ hiển thị thông tin bản thân và ẩn các field nhạy cảm như học phí/gói thu tiền.
  - `/student` mở khi tài khoản có linked `studentInfo` hợp lệ và lấy dữ liệu qua `/users/me/student-detail`, `/users/me/student-wallet-history`, `/users/me/student-account-balance`
  - từ `/student`, học sinh có thể xem hồ sơ cá nhân, liên hệ phụ huynh, lớp đang tham gia, lịch thi FE-local và ví của chính mình
  - popup ví trên `/student` cho phép học sinh tự nạp tiền hoặc rút tiền; backend luôn khóa theo đúng hồ sơ hiện tại và chặn rút vượt số dư để không làm âm tài khoản
- Route `/staff` hiện có 2 nhánh runtime thật:
  - `/staff` là self-detail page của chính nhân sự hiện tại, dùng cùng staff shell/sidebar và bám layout của `/admin/staffs/[id]`
  - `/staff` mở khi tài khoản đang đăng nhập có linked `staffInfo` hợp lệ; trang này lấy dữ liệu qua các self-service endpoints `/users/me/full`, `/users/me/staff-detail`, `/users/me/staff-income-summary`, `/users/me/staff-bonuses`, `/users/me/staff-sessions`
  - từ `/staff` staff chỉ được sửa thông tin cơ bản, ngân hàng và QR qua `PATCH /users/me/staff`; ngoài ra staff có thể tự thêm thưởng cho chính mình qua `POST /users/me/staff-bonuses`, nhưng backend luôn khóa bản ghi mới ở trạng thái `pending`
  - các mutate nhạy cảm còn lại trên role, trạng thái, trợ cấp, học phí và thanh toán vẫn bị khóa
  - `/staff` vẫn hiển thị đầy đủ các khối giống staff admin detail: thống kê thu nhập theo tháng, popup ghi cọc, tổng hợp lớp phụ trách, bonus của chính mình ở chế độ chỉ đọc, tổng hợp trợ cấp các role của chính mình và lịch sử buổi học; từ đây teacher/admin có thể thêm hoặc chỉnh buổi học cho lớp phụ trách, nhưng UI chỉ mở riêng `coefficient` còn các field tài chính tùy chỉnh khác vẫn bị khóa
  - từ section `Công việc khác` trên `/staff`, staff có role `assistant`, `accountant`, `communication`, `customer_care` sẽ mở self route tương ứng để xem chi tiết công việc của chính mình ở chế độ chỉ đọc; role `lesson_plan` sẽ mở workspace task giáo án tại `/staff/lesson-plan-tasks`, còn `lesson_plan_head` sẽ mở workspace quản lí giáo án tại `/staff/lesson-plans`
  - `/staff/classes/[id]` mở cho `staff.teacher` và `admin`; teacher chỉ thấy lớp được phân công, admin có thể truy cập để xem hoặc hỗ trợ cùng flow này
  - từ class detail chỉ cho sửa khung giờ, tạo/chỉnh session và điểm danh; route này không cho thay đổi trợ cấp hoặc học phí học sinh
  - `/staff/customer-care-detail` mở khi hồ sơ staff hiện tại có role `customer_care`, luôn khóa theo đúng hồ sơ đó; nếu actor có role này, dòng `customer_care` ở section `Công việc khác` trên `/staff` sẽ mở sang màn self-service tương ứng
  - `/staff/assistant-detail`, `/staff/accountant-detail`, `/staff/communication-detail` mở cho đúng role tương ứng và chỉ đọc dữ liệu trợ cấp của chính staff hiện tại
  - `/staff/lesson-plan-detail` mở cho `lesson_plan` hoặc `lesson_plan_head`, chỉ đọc lesson output của chính staff hiện tại; nếu là `lesson_plan_head`, trang này có CTA mở workspace quản lí
  - `/staff/lesson-plan-tasks`, `/staff/lesson-plan-tasks/[taskId]`, `/staff/lesson-plan-manage-details` mở cho `staff.lesson_plan`: dùng cùng shared workspace/layout với trưởng giáo án, nhưng dữ liệu bị khóa theo task staff hiện tại đang tham gia; tab Tổng quan chỉ hiện task + resource của các task đó, tab Công việc và route task detail đều cho mở popup chi tiết output để sửa nội dung phi tài chính, còn các quyền quản trị task/resource/payment và chỉnh `cost` vẫn bị khóa
  - `/staff/lesson-plans`, `/staff/lesson-plans/tasks/[taskId]`, `/staff/lesson-manage-details` mở cho `lesson_plan_head` (và `admin` nếu vào qua staff shell), tái dùng toàn bộ CRUD và flow quản lí giáo án như admin nhưng giữ URL trong nhóm `/staff`

## Health snapshot (2026-03-20)

- Đã kiểm tra:
  - `pnpm --filter web exec tsc --noEmit`: pass
  - `pnpm --filter api check-types`: pass
  - `pnpm --filter api test`: pass
- Backend audit coverage hiện tại:
  - `action_history` đã phủ các mutate flow ở `session`, `class`, `cost`, `bonus`, `extra_allowance`, `cf_problem_tutorial`, `user`, `student`, `staff`
  - auth flow có thay đổi `user` cũng đã ghi audit: `register`, `verify email`, `reset password`, `change password`, và Google OAuth khi tạo/xác thực user
- Cần xử lý tiếp:
  - `pnpm --filter web lint`: fail với `19` errors và `23` warnings
- Findings rủi ro cao từ review:
  - API chưa bật validation runtime toàn cục; riêng payload `sessions` đã chuyển sang DTO `class` + `ValidationPipe`, nhưng các controller khác vẫn cần được rà soát tương tự.
  - Refresh token rotation đang lưu hash vào DB nhưng luồng `refresh` chưa đối chiếu token đang dùng với hash đã lưu.
  - `apps/web/app/admin/notes-subject/page.tsx` có `useEffect` đặt sau `return`, vi phạm Rules of Hooks.

## Dùng tài liệu khi implement

- **Backend / DB:** [Database Schema.md](Database%20Schema.md) + [Cách làm việc.md](Cách%20làm%20việc.md) (phần NestJS).
- **Frontend / UI:** [UI-Schema.md](UI-Schema.md) + [pages/](pages/) (file plan từng route) + [pages/ARCHIVED-UI-CONTEXT.md](pages/ARCHIVED-UI-CONTEXT.md).
- **Lệnh / cài đặt:** [Cách làm việc.md](Cách%20làm%20việc.md).
- **Tiến độ / scope:** [Workplan.md](Workplan.md).
