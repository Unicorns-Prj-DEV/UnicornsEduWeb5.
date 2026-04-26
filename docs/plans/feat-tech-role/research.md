# Research: thêm role `technical` theo mô hình gần với `communication`

**Ngày research:** 2026-04-26  
**Branch:** `main`  
**Commit:** `7c16643`

## Bài toán cần map vào codebase hiện tại

Yêu cầu mới là thêm một role nhân sự `technical`.

Theo mô tả hiện tại:
- role này gần như là clone của `communication`
- có một trang chi phí riêng
- chi phí vẫn bị tính thuế như các role khác
- nhưng khi tính khấu trừ vận hành thì hành xử như `teacher`

Tài liệu này mô tả codebase **đang tồn tại hôm nay**, tập trung vào cách `communication` đang chạy, cách finance hiện được model, và những bề mặt code mà yêu cầu mới sẽ đi qua.

## Tóm tắt ngắn

- `communication` đã là một `StaffRole` chính thức trong Prisma enum tại `apps/api/prisma/schema/enums.prisma:14-23`.
- Về runtime, `communication` hiện **không** đi qua module `cost` để tạo thu nhập theo role. Role này đi qua nhánh `extra_allowance` ở cả backend và frontend.
- Trang riêng của `communication` hiện là:
  - admin: `apps/web/app/admin/communication_detail/page.tsx:6-14`
  - staff self-service: `apps/web/app/staff/communication-detail/page.tsx:9-28`
- Thuế cho `communication` hiện được snapshot theo `roleType` thông qua `extra_allowances.tax_deduction_rate_percent`, được resolve từ:
  - `role_tax_deduction_rates`
  - hoặc `staff_tax_deduction_overrides`
  tại `apps/api/src/payroll/deduction-rates.ts:58-92` và `apps/api/src/extra-allowance/extra-allowance.service.ts:335-355`.
- Khấu trừ vận hành hiện chỉ có nhánh thật sự cho `teacher`, dựa trên `class_teacher_operating_deduction_rates` và logic session/class, không có nhánh tương đương cho `communication` hoặc các role extra-allowance khác:
  - schema: `apps/api/prisma/schema/finance.prisma:47-62`
  - resolver: `apps/api/src/payroll/deduction-rates.ts:94-119`
  - class writer: `apps/api/src/class/class.service.ts:166-213`
  - teacher payroll aggregation: `apps/api/src/staff/staff.service.ts:1061+`, `3026+`

## 1. Role `communication` hiện được khai báo ở đâu

### Backend / schema

- `StaffRole.communication` nằm trong enum Prisma ở `apps/api/prisma/schema/enums.prisma:14-23`.
- `RegulationAudience.staff_communication` nằm ở `apps/api/prisma/schema/enums.prisma:88-99`.
- `StaffInfo.roles` là nơi một nhân sự mang nhiều role cùng lúc. Source of truth này nằm trong `people.prisma` và được nhắc trong schema docs (`docs/Database Schema.md`, mục `staff_info`).

### Frontend labels / options

- Nhãn hiển thị role nằm ở `apps/web/lib/staff.constants.ts:2-10`.
- Các form chọn role hiện đã có `communication`:
  - `apps/web/app/admin/users/page.tsx:35-44`
  - `apps/web/components/admin/staff/EditStaffPopup.tsx:24-33`
  - `apps/web/components/admin/staff/AddTutorPopup.tsx:37-45`
- Mapping deep-link sang trang chi tiết role nằm ở `apps/web/lib/admin-shell-paths.ts:17-68`.

## 2. `communication` đang hoạt động ra sao ở frontend

### Route và access

- Staff shell gate nhận biết `communication` tại `apps/web/components/staff/StaffAccessGate.tsx:31`.
- Route `/staff/communication-detail` được xác định tại:
  - matcher: `apps/web/components/staff/StaffAccessGate.tsx:56`
  - allow rule: `apps/web/components/staff/StaffAccessGate.tsx:107-109`
  - locked description: `apps/web/components/staff/StaffAccessGate.tsx:195-196`
- Sidebar staff chỉ hiện menu `Truyền thông` nếu user có role này:
  - item: `apps/web/components/staff/StaffSidebar.tsx:123-129`
  - visibility source: `apps/web/components/staff/StaffSidebar.tsx:416-429`

### Trang chi tiết role

- Admin wrapper:
  - `apps/web/app/admin/communication_detail/page.tsx:6-14`
  - luôn mount `ExtraAllowanceRoleDetailPage` với `roleType="communication"`
- Staff wrapper:
  - `apps/web/app/staff/communication-detail/page.tsx:9-28`
  - nếu viewer là `assistant` và có `staffId` trên query string thì dùng admin-style page cho staff được chọn
  - ngược lại dùng self-service page `StaffSelfExtraAllowanceRoleDetailPage`

### Shared UI component

- Admin/shared role detail page nằm ở `apps/web/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage.tsx:198-974`
- Component này chỉ support 3 role-type cố định:
  - `assistant`
  - `communication`
  - `accountant`
  tại `apps/web/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage.tsx:42-45`
- Theme/presentation cho communication nằm ở:
  - `apps/web/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage.tsx:71-82`
  - `apps/web/components/admin/extra-allowance/extraAllowancePresentation.tsx:70-75`
  - role options ở `apps/web/components/admin/extra-allowance/extraAllowancePresentation.tsx:138-167`

### Self-service behavior

- Self-service component nằm ở `apps/web/components/staff/StaffSelfExtraAllowanceRoleDetailPage.tsx:157-707`
- `communication` là role duy nhất trong file này được bật:
  - tự tạo record: `canSelfCreateAllowance` tại `:168`
  - tự sửa record của chính mình: `canSelfEditAllowance` tại `:169`
- Các action self-service hiện dùng:
  - `GET /users/me/staff-extra-allowances` tại `:281-295`
  - `POST /users/me/staff-extra-allowances` tại `:229-248`
  - `PATCH /users/me/staff-extra-allowances` tại `:250-273`

### Dashboard / profile

- Dashboard staff hiện không có card riêng cho `communication`.
- `hasExtraSections` chỉ check:
  - `teacher`
  - `lesson_plan`
  - `lesson_plan_head`
  - `assistant`
  - `customer_care`
  - `accountant`
  tại `apps/web/app/staff/page.tsx:1002-1010`
- Vì vậy nếu staff chỉ có `communication`, dashboard rơi về fallback “Chỉ thu nhập tháng” ở `apps/web/app/staff/page.tsx:1133-1139`.
- Trong profile self-service, dòng `otherRoleSummaries` của `communication` deep-link sang `/staff/communication-detail` tại `apps/web/app/staff/profile/page.tsx:113-128`.

## 3. `communication` đang hoạt động ra sao ở backend

### Self-service endpoints

`communication` hiện có nhánh self-service riêng dưới `/users/me`:

- list own allowances:
  - `apps/api/src/user/user-profile.controller.ts:383-455`
- create own communication allowance:
  - `apps/api/src/user/user-profile.controller.ts:457-486`
- update own communication allowance:
  - `apps/api/src/user/user-profile.controller.ts:488-520`

### Service enforcement

Logic enforcement nằm trong `apps/api/src/extra-allowance/extra-allowance.service.ts`:

- `createMyCommunicationExtraAllowance(...)`: `:242-283`
  - chỉ cho `UserRole.staff`
  - resolve linked `staffInfo`
  - bắt buộc staff có `StaffRole.communication`
  - force `status = pending`
  - force `roleType = StaffRole.communication`
- `updateMyCommunicationExtraAllowance(...)`: `:285-333`
  - re-check linked staff
  - re-check role `communication`
  - chỉ cho sửa allowance của chính staff đó
  - chỉ chạm `month`, `amount`, `note`

### Generic admin API

Generic admin-like extra allowance API nằm ở:

- controller: `apps/api/src/extra-allowance/extra-allowance.controller.ts:36-239`
- dto: `apps/api/src/dtos/extra-allowance.dto.ts:20-140`

API này cho phép:
- filter theo `roleType`, `status`, `staffId`: `extra-allowance.controller.ts:82-100`
- create generic allowance: `:137-158`
- bulk update payment status: `:183-218`

## 4. Thuế của `communication` hiện được tính như thế nào

### Bảng dữ liệu

Schema finance hiện có 3 nhóm rate liên quan:

- `role_tax_deduction_rates`: `apps/api/prisma/schema/finance.prisma:18-29`
- `staff_tax_deduction_overrides`: `apps/api/prisma/schema/finance.prisma:31-45`
- `class_teacher_operating_deduction_rates`: `apps/api/prisma/schema/finance.prisma:47-62`

### Resolver

Resolver tax mặc định:
- `apps/api/src/payroll/deduction-rates.ts:58-92`
- thứ tự resolve:
  1. staff override theo `staffId + roleType + effectiveDate`
  2. role default theo `roleType + effectiveDate`

### Snapshot trên extra allowance

`ExtraAllowance` có field `taxDeductionRatePercent` tại `apps/api/prisma/schema/finance.prisma:141-157`.

Khi create/update extra allowance:
- `createExtraAllowance(...)`: `apps/api/src/extra-allowance/extra-allowance.service.ts:335-387`
- `updateExtraAllowance(...)`: `apps/api/src/extra-allowance/extra-allowance.service.ts:390-460`

service sẽ:
- parse `month` thành effective date: `:64-70`
- resolve tax rate theo `staffId + roleType + month`: `:340-344`, `:421-425`
- snapshot vào `taxDeductionRatePercent`: `:354`, `:421-426`

### Tác động lên income summary

`getIncomeSummary(...)` trong `apps/api/src/staff/staff.service.ts:3026-3515` lấy extra allowance rows theo role/status/tax bucket từ:
- `getExtraAllowanceRowsByRoleAndStatus(...)`: `:1310-1350`

Từ đó:
- gross extra allowance: `:3283-3286`
- tax extra allowance: `:3286`
- merge vào `monthlyIncomeTotals`: `:3304-3311`
- merge vào `monthlyGrossTotals`: `:3313-3320`
- merge vào `monthlyTaxTotals`: `:3322-3328`
- merge year totals: `:3342-3383`

## 5. `communication` hiện được tổng hợp vào payroll như thế nào

### Role summary

`staff.service.ts` định nghĩa:

- nhãn role tại `:115-124`
- set `EXTRA_ALLOWANCE_BACKED_OTHER_ROLES` tại `:126-130`

Set này hiện gồm:
- `assistant`
- `accountant`
- `communication`

Khi build `otherRoleSummaries`:
- init summary map: `apps/api/src/staff/staff.service.ts:3393-3402`
- bơm extra allowance-backed roles: `:3404-3415`
- flatten ra response: `:3444-3454`

Điều đó có nghĩa là `communication` hiện là một role được tổng hợp vào `otherRoleSummaries` bằng **extra allowance**, không phải bằng `bonus`, `cost_extend`, hay session.

### Test coverage hiện có

Các test đang mô tả behavior của `communication`:

- communication được đưa vào `otherRoleSummaries`:
  - `apps/api/src/staff/staff.service.spec.ts:325+`
- communication dùng `extraAllowance` chứ không dùng `bonus workType` cho role summary:
  - `apps/api/src/staff/staff.service.spec.ts:441+`

Đây là bằng chứng quan trọng cho thấy design hiện tại của repo coi `communication` là role payroll dựa trên `extra_allowance`.

## 6. `cost` module hiện đứng ở đâu so với `communication`

### Cost module hiện tại

Backend:
- DTO: `apps/api/src/dtos/cost.dto.ts:16-75`
- controller: `apps/api/src/cost/cost.controller.ts:36-204`
- service: `apps/api/src/cost/cost.service.ts:22-269`

Frontend:
- admin page: `apps/web/app/admin/costs/page.tsx:54-939`
- staff page chỉ re-export admin page: `apps/web/app/staff/costs/page.tsx:1`
- API client: `apps/web/lib/apis/cost.api.ts:11-66`
- DTO: `apps/web/dtos/cost.dto.ts:1-57`

### Access policy

- backend controller cho `assistant` và `accountant` vào admin routes: `apps/api/src/cost/cost.controller.ts:39-40`
- create/delete chỉ mở cho `assistant`: `:113`, `:189`
- staff shell access gate mở `/staff/costs` cho `assistant` và `accountant`: `apps/web/components/staff/StaffAccessGate.tsx:93-95`, `185-186`
- staff sidebar chỉ show `Chi phí` cho `accountant` trong default menu, hoặc assistant trong admin-like mirror menu:
  - default accountant item: `apps/web/components/staff/StaffSidebar.tsx:97-103`
  - assistant mirror item: `apps/web/components/staff/StaffSidebar.tsx:206-212`

### Quan hệ với `communication`

Trong code hiện tại, `communication` **không có nhánh riêng** trong module `cost`.

Role-specific logic của `communication` đang tập trung ở:
- `extra-allowance`
- `staff income summary`
- `staff/admin role detail page`

Nói cách khác, trang `communication_detail` hiện là trang **trợ cấp / extra allowance**, không phải trang `cost_extend`.

## 7. Khấu trừ vận hành hiện chỉ tồn tại cho `teacher`

### Dữ liệu

- table `class_teacher_operating_deduction_rates`: `apps/api/prisma/schema/finance.prisma:47-62`
- helper resolve operating rate: `apps/api/src/payroll/deduction-rates.ts:94-119`
- class service append history rows: `apps/api/src/class/class.service.ts:166-213`

### Teacher session calculation

Teacher pay hiện được tính từ nhánh session/class trong `apps/api/src/staff/staff.service.ts`.

Sub-agent finance xác định teacher pay đi qua SQL CTE tại khoảng `apps/api/src/staff/staff.service.ts:1061+`, còn income summary dùng:
- teacher monthly buckets: `:3081-3090`
- operating totals: `:3221-3224`
- monthly operating deduction merge: `:3330-3336`
- yearly operating deduction total: `:3360-3383`

Test hiện có cũng khẳng định teacher tax được tính trên phần **sau operating deduction**:
- `apps/api/src/staff/staff.service.spec.ts:874-925`

### Phạm vi hiện tại của operating deduction

Theo code hôm nay, operating deduction đang gắn với:
- `class`
- `teacherId`
- `session`
- `teacher session allowance`

Tôi không thấy nhánh nào áp `operatingDeductionRate` lên:
- `extra_allowance`
- `bonus`
- `cost_extend`
- `communication`
- `assistant`
- `accountant`
- `customer_care`
- `lesson_output`

## 8. Điều yêu cầu `technical` sẽ chạm vào trong codebase hiện tại

Nếu giữ đúng mô tả “clone communication nhưng chịu operating deduction như teacher”, thì requirement mới sẽ cắt qua **hai hệ thống hiện đang tách rời**:

### A. Nhánh clone `communication`

Đây là phần đang có sẵn pattern:

- enum / labels / role options
  - `apps/api/prisma/schema/enums.prisma`
  - `apps/web/lib/staff.constants.ts`
  - `apps/web/app/admin/users/page.tsx`
  - `apps/web/components/admin/staff/EditStaffPopup.tsx`
  - `apps/web/components/admin/staff/AddTutorPopup.tsx`
- route + sidebar + access gate
  - `apps/web/components/staff/StaffAccessGate.tsx`
  - `apps/web/components/staff/StaffSidebar.tsx`
  - `apps/web/lib/admin-shell-paths.ts`
  - `apps/web/app/staff/communication-detail/page.tsx`
  - `apps/web/app/admin/communication_detail/page.tsx`
- self-service + admin role detail page
  - `apps/web/components/staff/StaffSelfExtraAllowanceRoleDetailPage.tsx`
  - `apps/web/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage.tsx`
  - `apps/web/components/admin/extra-allowance/extraAllowancePresentation.tsx`
- backend self-service endpoints + service
  - `apps/api/src/user/user-profile.controller.ts`
  - `apps/api/src/extra-allowance/extra-allowance.service.ts`
  - `apps/api/src/dtos/extra-allowance.dto.ts`
- salary aggregation
  - `apps/api/src/staff/staff.service.ts`
  - `apps/api/src/staff/staff.service.spec.ts`

### B. Nhánh operating deduction kiểu `teacher`

Đây là phần hiện chỉ sống ở teacher/session:

- rate tables and resolvers
  - `apps/api/prisma/schema/finance.prisma`
  - `apps/api/src/payroll/deduction-rates.ts`
- class-level operating history writer
  - `apps/api/src/class/class.service.ts`
- teacher session snapshotting
  - `apps/api/src/session/session-create.service.ts`
  - `apps/api/src/session/session-update.service.ts`
- teacher payroll aggregation
  - `apps/api/src/staff/staff.service.ts`
  - `apps/api/src/staff/staff.service.spec.ts`

### C. Điểm giao cắt hiện chưa có sẵn

Từ code hiện tại, chưa có sẵn một path nào mà:
- role extra-allowance-backed như `communication`
- nhưng lại đồng thời dùng `operating deduction` kiểu teacher

Hiện tại:
- `communication` có tax snapshot theo role
- `teacher` có tax + operating deduction theo session/class

Repo chưa có một role non-teacher nào vừa đi qua `extra_allowance` vừa có operating deduction snapshot riêng.

## 9. Các file hiện là trọng tâm nhất cho feature này

### Role definition

- `apps/api/prisma/schema/enums.prisma:14-23`
- `apps/web/lib/staff.constants.ts:2-10`
- `apps/web/app/admin/users/page.tsx:35-44`
- `apps/web/components/admin/staff/EditStaffPopup.tsx:24-33`
- `apps/web/components/admin/staff/AddTutorPopup.tsx:37-45`

### Communication-style page flow

- `apps/web/app/staff/communication-detail/page.tsx:9-28`
- `apps/web/app/admin/communication_detail/page.tsx:6-14`
- `apps/web/components/staff/StaffSelfExtraAllowanceRoleDetailPage.tsx:157-707`
- `apps/web/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage.tsx:198-974`
- `apps/web/components/admin/extra-allowance/extraAllowancePresentation.tsx:33-167`

### Self-service backend

- `apps/api/src/user/user-profile.controller.ts:383-520`
- `apps/api/src/extra-allowance/extra-allowance.service.ts:238-460`
- `apps/api/src/dtos/extra-allowance.dto.ts:104-140`

### Payroll / tax / operating

- `apps/api/src/payroll/deduction-rates.ts:58-140`
- `apps/api/prisma/schema/finance.prisma:18-62`
- `apps/api/src/staff/staff.service.ts:1310-1350`
- `apps/api/src/staff/staff.service.ts:1634-1859`
- `apps/api/src/staff/staff.service.ts:3026-3515`
- `apps/api/src/staff/staff.service.spec.ts:325+`
- `apps/api/src/staff/staff.service.spec.ts:441+`
- `apps/api/src/staff/staff.service.spec.ts:874-925`

### Cost workspace

- `apps/api/src/cost/cost.controller.ts:36-204`
- `apps/api/src/cost/cost.service.ts:22-269`
- `apps/web/app/admin/costs/page.tsx:54-939`
- `apps/web/app/staff/costs/page.tsx:1`
- `apps/web/lib/apis/cost.api.ts:11-66`
- `apps/web/dtos/cost.dto.ts:1-57`

## 10. Kết luận research

Codebase hiện tại cho thấy:

1. `communication` là một role đã được wire đầy đủ từ enum, route, sidebar, access gate, self-service API, admin API, tới salary aggregation.
2. Pattern hiện tại của `communication` là **extra allowance-backed role**, không phải `cost`-backed role.
3. Thuế của `communication` đang được tính bằng role tax snapshot trên `extra_allowance`.
4. Khấu trừ vận hành hiện là nhánh riêng của `teacher`, gắn với `class/session`, không phải nhánh chung cho mọi role.
5. Yêu cầu `technical` theo mô tả sẽ phải ghép hai mô hình hiện đang riêng nhau:
   - mô hình role page / self-service / tax snapshot của `communication`
   - mô hình operating deduction của `teacher`

Đây là trạng thái thực tế của repo tại thời điểm research này.
