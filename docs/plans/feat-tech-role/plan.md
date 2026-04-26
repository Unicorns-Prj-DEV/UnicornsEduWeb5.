# Technical Role Implementation Plan

## Overview

Thêm role nhân sự `technical` theo mô hình vận hành gần với `communication`, nhưng có khác biệt quan trọng ở payroll:

- `technical` phải có route/detail page riêng trong admin shell và staff self-service.
- Thu nhập của role này tiếp tục đi theo mô hình `extra_allowance`, không đi qua `cost_extend`.
- Thuế vẫn tính theo role tax snapshot như các role extra allowance khác.
- `technical` không có khấu trừ vận hành; payroll của role này chỉ lấy gross trừ thuế.

Plan này chọn hướng triển khai tối thiểu nhưng nhất quán với codebase hiện tại: mở rộng nhánh `communication` thành một family self-service role gồm `communication` và `technical`, đồng thời tái sử dụng nguyên mô hình tax snapshot hiện có của `extra_allowances`.

## Current State Analysis

- `communication` đã được wire đầy đủ từ enum, form chọn role, route, sidebar, access gate, self-service API, admin detail page đến payroll aggregation.
- `communication` hiện là `extra_allowance`-backed role, không dùng `cost_extend`.
- `ExtraAllowance` hiện đã snapshot `taxDeductionRatePercent`; với `technical`, đây là field payroll cần dùng.
- Teacher operating deduction hiện phụ thuộc vào `classId + teacherId + effectiveDate` qua `class_teacher_operating_deduction_rates`, và nên tiếp tục tách biệt khỏi `technical`.
- `staff.service.ts` đã có hạ tầng tổng hợp net/gross/tax/operating theo bucket; nhánh extra allowance hiện đổ `operatingAmount = 0`, phù hợp với `technical`.
- FE có nhiều union/type hard-code role staff ở `user.dto`, `notification.dto`, `regulation.dto`, `deduction-settings.dto`, extra allowance presentation, sidebar, access gate và deep-link helpers.

## Desired End State

Sau khi hoàn tất:

- `technical` là một `StaffRole` chính thức ở BE và FE, có label, notification/regulation audience, route access, sidebar entry và admin/staff detail page riêng.
- Admin có thể quản lý extra allowance của `technical` qua role detail page giống `communication`.
- Staff có role `technical` có thể tự xem, tạo và sửa extra allowance của chính mình theo cùng UX với `communication`.
- Mỗi bản ghi `extra_allowances` của `technical` snapshot `taxDeductionRatePercent` như các role extra allowance khác.
- Income summary tính `technical` theo công thức:
  - `tax deduction = gross * tax rate`
  - `net = gross - tax deduction`
- Deductions workspace tiếp tục cấu hình tax rate cho `technical` qua cơ chế role-based hiện có; không thêm operating-deduction settings cho role này.

### Key Discoveries

- `StaffRole.communication` hiện là enum thật ở [apps/api/prisma/schema/enums.prisma](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/prisma/schema/enums.prisma:14) và được mirror ở FE labels tại [apps/web/lib/staff.constants.ts](/Users/sunny/workspace/UnicornsEduWeb5./apps/web/lib/staff.constants.ts:1).
- Self-service `communication` đang khóa cứng trong service/controller ở [apps/api/src/extra-allowance/extra-allowance.service.ts](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/src/extra-allowance/extra-allowance.service.ts:238) và [apps/api/src/user/user-profile.controller.ts](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/src/user/user-profile.controller.ts:383).
- Extra allowance chỉ snapshot thuế tại [apps/api/src/extra-allowance/extra-allowance.service.ts](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/src/extra-allowance/extra-allowance.service.ts:335), và điều này đã đúng với payroll mong muốn của `technical`.
- Resolver operating deduction hiện chỉ support teacher/class tại [apps/api/src/payroll/deduction-rates.ts](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/src/payroll/deduction-rates.ts:94), nên không cần lôi vào flow `technical`.
- `cost_extend` không có `staffId` hay `roleType`, nên không phù hợp để làm source of truth cho payroll role detail của `technical` tại [apps/api/prisma/schema/finance.prisma](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/prisma/schema/finance.prisma:127) và [apps/api/src/cost/cost.service.ts](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/src/cost/cost.service.ts:22).
- `staff.service.ts` đã có pattern `EXTRA_ALLOWANCE_BACKED_OTHER_ROLES` và bucket net calculation đủ gần để mở rộng cho `technical` tại [apps/api/src/staff/staff.service.ts](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/src/staff/staff.service.ts:126).

## What We're NOT Doing

- Không chuyển `technical` sang dùng `cost_extend` hoặc route `/costs` như source dữ liệu payroll.
- Không tái sử dụng bảng `class_teacher_operating_deduction_rates` cho `technical`.
- Không thêm `operatingDeductionRatePercent` vào `extra_allowances` hay tạo bảng operating-deduction mới cho `technical`.
- Không thay đổi teacher payroll flow hiện có.
- Không redesign staff dashboard để thêm card riêng cho `communication`/`technical`; chỉ đảm bảo route/detail và payroll summary đúng.
- Không gom toàn bộ role self-service khác vào một framework generic lớn hơn mức cần thiết cho `communication` + `technical`.

## Implementation Approach

### Decision 1: `technical` là extra-allowance-backed role

Điều này bám sát pattern đang chạy thật của `communication`, giảm rủi ro phá payroll hiện có và tận dụng được admin/self-service pages đã tồn tại.

### Decision 2: `technical` tái sử dụng tax snapshot hiện có của `extra_allowances`

`technical` chỉ cần `taxDeductionRatePercent`, vốn đã được snapshot khi tạo/cập nhật extra allowance. Không cần thêm schema hay resolver mới cho operating deduction.

### Decision 3: tax settings của `technical` đi theo cơ chế role-based hiện có

Không mở rộng deductions workspace theo hướng operating-deduction cho `technical`. Nếu màn hình cấu hình thuế đang whitelist role, chỉ cần thêm `technical` vào danh sách đó.

## Phase 1: Mở rộng role surface cho `technical`

### Overview

Khai báo role mới xuyên suốt schema, FE unions và các bề mặt access/label để hệ thống nhận diện được `technical` như một staff role hợp lệ.

### Changes Required

#### 1. Prisma enums và schema docs
**Files**:
- `apps/api/prisma/schema/enums.prisma`
- `docs/Database Schema.md`

**Changes**:
- Thêm `technical` vào `StaffRole`.
- Thêm `staff_technical` vào `RegulationAudience`.
- Cập nhật schema docs để mô tả role mới và audience mới.

```prisma
enum StaffRole {
  admin
  teacher
  lesson_plan
  lesson_plan_head
  accountant
  communication
  technical
  customer_care
  assistant
}
```

#### 2. Frontend DTO unions và constants
**Files**:
- `apps/web/dtos/user.dto.ts`
- `apps/web/dtos/extra-allowance.dto.ts`
- `apps/web/dtos/deduction-settings.dto.ts`
- `apps/web/dtos/notification.dto.ts`
- `apps/web/dtos/regulation.dto.ts`
- `apps/web/lib/staff.constants.ts`
- `apps/web/lib/regulation.constants.ts`

**Changes**:
- Thêm `"technical"` vào các staff-role union type.
- Thêm `"staff_technical"` vào regulation audience union.
- Khai báo label hiển thị, đề xuất `"Kỹ thuật"`.

#### 3. Notification / regulation audience mapping
**Files**:
- `apps/api/src/regulation/regulation.service.ts`
- `apps/web/app/admin/notification/page.tsx`

**Changes**:
- Map `technical -> staff_technical`.
- Thêm target option `@technical` trong notification composer.

### Success Criteria

#### Automated Verification:
- [x] Prisma client generate được sau khi thêm enum: `pnpm --filter api db:generate`
- [x] API typecheck pass: `pnpm --filter api check-types`
- [x] Web typecheck pass: `pnpm --filter web exec tsc --noEmit`

#### Manual Verification:
- [ ] Admin UI hiển thị role `Kỹ thuật` đúng label ở các dropdown/chip liên quan.
- [ ] Notification/regulation audience picker có thể chọn `technical`.
- [ ] Không còn route/type crash khi account mang role `technical`.

**Implementation Note**: Sau phase này, dừng lại để xác nhận role surface đã hiển thị đúng trước khi nối sang flow nghiệp vụ.

---

## Phase 2: Tạo route và self-service/admin flow cho `technical`

### Overview

Clone pattern `communication` thành một nhánh mới cho `technical`, nhưng refactor vừa đủ để tránh duplicate logic cứng tên role.

### Changes Required

#### 1. Admin/staff route wrappers và deep-link helpers
**Files**:
- `apps/web/app/admin/technical_detail/page.tsx`
- `apps/web/app/staff/technical-detail/page.tsx`
- `apps/web/lib/admin-shell-paths.ts`
- `apps/web/lib/admin-shell-access.ts`
- `apps/web/components/staff/StaffAccessGate.tsx`
- `apps/web/components/staff/StaffSidebar.tsx`
- `apps/web/app/staff/profile/page.tsx`

**Changes**:
- Thêm route detail riêng cho `technical`.
- Thêm deep-link mapping từ role summary/profile sang `/staff/technical-detail` và `/admin/technical_detail`.
- Cập nhật access gate, sidebar visibility và locked-state descriptions.

#### 2. Mở rộng admin/shared extra allowance pages
**Files**:
- `apps/web/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage.tsx`
- `apps/web/components/admin/extra-allowance/extraAllowancePresentation.tsx`

**Changes**:
- Thêm `technical` vào `SupportedRoleType`.
- Thêm theme/presentation/chip metadata cho `technical`.
- Giữ admin page tiếp tục dùng generic extra allowance APIs.

#### 3. Generalize self-service extra allowance từ communication-only sang role-aware
**Files**:
- `apps/web/components/staff/StaffSelfExtraAllowanceRoleDetailPage.tsx`
- `apps/web/lib/apis/auth.api.ts`
- `apps/web/dtos/extra-allowance.dto.ts`
- `apps/api/src/user/user-profile.controller.ts`
- `apps/api/src/extra-allowance/extra-allowance.service.ts`
- `apps/api/src/dtos/extra-allowance.dto.ts`

**Changes**:
- Refactor POST/PATCH `/users/me/staff-extra-allowances` thành self-service flow chung cho các role được phép tự thao tác.
- Bổ sung `roleType` vào payload self-service, giới hạn tạm thời ở `communication | technical`.
- Đổi service từ `createMyCommunicationExtraAllowance` / `updateMyCommunicationExtraAllowance` sang helper role-aware, vẫn giữ rule:
  - chỉ `UserRole.staff`
  - chỉ record của chính staff
  - force `status = pending` khi create
  - chỉ cho sửa `month`, `amount`, `note`

```ts
const SELF_MANAGED_EXTRA_ALLOWANCE_ROLES = new Set<StaffRole>([
  StaffRole.communication,
  StaffRole.technical,
]);
```

### Success Criteria

#### Automated Verification:
- [x] API tests cho extra allowance service pass: `pnpm --filter api test -- extra-allowance.service.spec.ts`
- [x] API typecheck pass: `pnpm --filter api check-types`
- [x] Web typecheck pass: `pnpm --filter web exec tsc --noEmit`
- [ ] Web lint pass: `pnpm --filter web lint`

#### Manual Verification:
- [ ] Staff có role `technical` thấy menu riêng trong sidebar và mở được `/staff/technical-detail`.
- [ ] Admin/assistant mở được `/admin/technical_detail?staffId=...` hoặc mirror route tương ứng.
- [ ] Staff `technical` tự tạo được extra allowance pending của chính mình.
- [ ] Staff `technical` chỉ sửa được record của chính mình; không sửa được payment status.

**Implementation Note**: Sau phase này, xác nhận end-to-end route + create/edit self-service đã chạy đúng trước khi nối payroll summary.

---

## Phase 3: Nối `technical` vào payroll summary theo công thức tax-only

### Overview

Đây là bước hoàn tất nghiệp vụ payroll cho `technical`: dùng chính extra allowance tax snapshot hiện có để tính net, đồng thời giữ `operatingAmount = 0`.

### Changes Required

#### 1. Giữ snapshot của extra allowance ở tax-only
**Files**:
- `apps/api/src/extra-allowance/extra-allowance.service.ts`

**Changes**:
- Xác nhận flow create/update của `technical` tiếp tục snapshot `taxDeductionRatePercent` giống `communication`.
- Nếu service hiện đang hard-code assumptions theo `communication`, refactor ở phase trước phải giữ nguyên logic snapshot thuế cho `technical`, không thêm nhánh operating.

#### 2. Update extra allowance aggregation trong staff income summary
**Files**:
- `apps/api/src/staff/staff.service.ts`
- `apps/api/src/staff/staff.service.spec.ts`

**Changes**:
- Thêm `StaffRole.technical` vào `STAFF_ROLE_LABELS` và `EXTRA_ALLOWANCE_BACKED_OTHER_ROLES`.
- Mở rộng `getExtraAllowanceRowsByRoleAndStatus()` để aggregate `technical` như một extra-allowance-backed role thông thường.
- Group bucket theo `roleType + status + taxRate`.
- Với mỗi bucket của `technical`:
  - `operatingAmount = 0`
  - `taxAmount = gross * taxRate`
  - `netAmount = gross - taxAmount`
- Không đổi cách tính operating totals toàn hệ thống; `technical` không đóng góp khoản operating nào.

```ts
const taxAmount = calculatePercentageAmount(grossAmount, taxDeductionRatePercent);
const operatingAmount = makeAmountSummary();
const netAmount = subtractAmountSummary(grossAmount, taxAmount);
```

#### 3. Expose `technical` trong tax settings hiện có nếu đang whitelist role
**Files**:
- `apps/api/src/deduction-settings/deduction-settings.controller.ts`
- `apps/api/src/deduction-settings/deduction-settings.service.ts`
- `apps/api/src/dtos/deduction-settings.dto.ts`
- `apps/web/lib/apis/deduction-settings.api.ts`
- `apps/web/dtos/deduction-settings.dto.ts`
- `apps/web/app/admin/deductions/page.tsx`

**Changes**:
- Đảm bảo `technical` xuất hiện trong danh sách role có thể cấu hình tax rate.
- Không thêm section, endpoint hay DTO nào cho operating deduction của `technical`.

### Success Criteria

#### Automated Verification:
- [x] API typecheck pass: `pnpm --filter api check-types`
- [x] Staff service tests pass: `pnpm --filter api test -- staff.service.spec.ts`
- [x] Extra allowance service tests pass: `pnpm --filter api test -- extra-allowance.service.spec.ts`
- [x] Web typecheck pass: `pnpm --filter web exec tsc --noEmit`
- [ ] Web lint pass: `pnpm --filter web lint`

#### Manual Verification:
- [ ] Tạo mới allowance `technical` sẽ snapshot tax rate đúng theo effective date.
- [ ] Income summary của staff `technical` hiển thị `net = gross - tax`, không có operating deduction.
- [ ] Deductions workspace tạo/sửa được tax rate cho `technical`.
- [ ] Allowance `communication` cũ và mới vẫn giữ behavior payroll như trước.

**Implementation Note**: Sau phase này, nghiệp vụ payroll của `technical` phải được chốt là tax-only trước khi cập nhật docs/changelog.

---

## Phase 4: Hoàn thiện docs, route parity và regression coverage

### Overview

Khóa lại các tài liệu, route docs và regression checks để đảm bảo `technical` không làm lệch behavior của `communication` hay teacher payroll.

### Changes Required

#### 1. Hoàn thiện route/profile parity và docs
**Files**:
- `docs/README.md`
- `docs/pages/` nếu route specs tương ứng đã được maintain
- `docs/CHANGELOG.md` khi chuẩn bị commit

**Changes**:
- Ghi nhận route mới `/admin/technical_detail` và `/staff/technical-detail`.
- Sync docs route/payroll/schema liên quan, nhấn mạnh `technical` là tax-only payroll role.

#### 2. Bổ sung regression coverage cho behavior liên quan
**Files**:
- `apps/api/src/staff/staff.service.spec.ts`
- `apps/api/src/extra-allowance/extra-allowance.service.spec.ts`
- các test web/API khác nếu hiện có coverage cho role detail flow

**Changes**:
- Chốt test cho `technical` net calculation.
- Chốt test rằng `communication` vẫn không phát sinh operating deduction mới.
- Chốt test rằng teacher operating deduction totals không bị ảnh hưởng bởi extra allowance của `technical`.

### Success Criteria

#### Automated Verification:
- [ ] Full API tests pass: `pnpm --filter api test`
- [x] API typecheck pass: `pnpm --filter api check-types`
- [x] Web typecheck pass: `pnpm --filter web exec tsc --noEmit`
- [ ] Web lint pass: `pnpm --filter web lint`

#### Manual Verification:
- [ ] `otherRoleSummaries` của staff `technical` deep-link đúng sang route technical detail.
- [ ] Các flow `communication` cũ vẫn cho ra payroll như trước.
- [ ] Teacher income summary không đổi operating totals sau khi thêm allowance cho `technical`.

**Implementation Note**: Chỉ kết thúc feature sau khi manual verification chứng minh `technical` là tax-only role và không làm regress `communication`/teacher payroll.

---

## Testing Strategy

### Unit Tests

- `extra-allowance.service.spec.ts`
  - self-service create/update cho `technical`
  - reject khi staff không có role `technical`
  - recompute tax snapshot đúng khi update month/role/staff
- `staff.service.spec.ts`
  - `technical` được aggregate vào `otherRoleSummaries`
  - tax của `technical` tính trực tiếp trên `gross`
  - `technical` có `operatingAmount = 0`
  - `communication` vẫn không có operating deduction
  - teacher/session operating totals không bị ảnh hưởng bởi `technical`
- `deduction-settings.service.spec.ts` nếu service đang whitelist role
  - `technical` xuất hiện trong tax-setting flows hiện có
  - duplicate effective date bị chặn đúng

### Integration Tests

- API self-service `POST/PATCH /users/me/staff-extra-allowances` với `roleType=technical`
- Admin extra allowance list filter `roleType=technical`
- Deductions settings CRUD cho tax rates của `technical`

### Manual Testing Steps

1. Tạo một staff có role `technical`, đăng nhập bằng staff account đó, xác nhận sidebar có menu `Kỹ thuật`.
2. Tại `/staff/technical-detail`, tạo một allowance pending cho tháng hiện tại.
3. Trong deductions settings, tạo tax rate cho `technical`, sau đó tạo allowance tháng mới để xác nhận snapshot áp dụng đúng effective date.
4. Mở admin staff detail của cùng nhân sự, kiểm tra `otherRoleSummaries`, monthly gross/tax/net totals; `operating` phải vẫn bằng `0` cho phần `technical`.
5. Hồi quy `communication`: tạo/sửa allowance communication và xác nhận net không bị trừ operating deduction.

## Performance Considerations

- Extra allowance aggregation chỉ cần group theo `roleType + status + taxRate`, nên cardinality không thay đổi đáng kể so với `communication`.
- Tái sử dụng tax snapshot hiện có giúp payroll summary không cần join thêm bảng cấu hình nào ngoài flow đang tồn tại.
- FE không cần query rộng hơn; chủ yếu chỉ thêm role type mới vào các flow/settings hiện có.

## Migration Notes

- Tạo migration commit cho enum/audience mới trong `apps/api/prisma/schema/migrations/`; không chạy `prisma migrate dev` trên shared DB.
- Không có thay đổi schema finance riêng cho payroll `technical`; không cần field snapshot hay bảng deduction mới.
- Trước khi rollout API code phụ thuộc enum mới, cần apply migration bằng `pnpm --filter api db:deploy` trên môi trường đích.

## Risks And Mitigations

- **Risk**: over-generalize self-service flow và vô tình mở edit/create cho role không mong muốn.
  - **Mitigation**: giới hạn bằng `SELF_MANAGED_EXTRA_ALLOWANCE_ROLES` hard-coded, test negative paths rõ ràng.
- **Risk**: implementer vô thức copy công thức teacher-like và trừ thêm operating deduction cho `technical`.
  - **Mitigation**: viết test bucket-level khẳng định `technical` có `operatingAmount = 0` và `net = gross - tax`.
- **Risk**: deductions workspace bị hiểu sai scope và bị mở rộng sang operating settings không cần thiết.
  - **Mitigation**: plan này chốt rõ chỉ dùng tax settings hiện có; mọi operating-related change cho `technical` là out of scope.
- **Risk**: user kỳ vọng `technical` dùng `/costs`.
  - **Mitigation**: plan này cố ý giữ `technical` là payroll-detail page riêng, không dùng `cost_extend`; cần giữ naming/docs nhất quán để tránh hiểu nhầm.

## References

- Research source: `docs/plans/feat-tech-role/research.md`
- Role enums: [apps/api/prisma/schema/enums.prisma](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/prisma/schema/enums.prisma:14)
- Extra allowance snapshots: [apps/api/src/extra-allowance/extra-allowance.service.ts](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/src/extra-allowance/extra-allowance.service.ts:335)
- Extra allowance payroll aggregation: [apps/api/src/staff/staff.service.ts](/Users/sunny/workspace/UnicornsEduWeb5./apps/api/src/staff/staff.service.ts:1310)
- Communication self-service UI: [apps/web/components/staff/StaffSelfExtraAllowanceRoleDetailPage.tsx](/Users/sunny/workspace/UnicornsEduWeb5./apps/web/components/staff/StaffSelfExtraAllowanceRoleDetailPage.tsx:157)
- Admin role detail UI: [apps/web/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage.tsx](/Users/sunny/workspace/UnicornsEduWeb5./apps/web/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage.tsx:42)
