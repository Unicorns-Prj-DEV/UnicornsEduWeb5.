# Max Allowance Behavior Implementation Plan

## Overview

Chuẩn hóa semantics "không giới hạn max allowance" về `null` xuyên suốt frontend/backend input-output, đồng thời **giữ nguyên** behavior aggregate hiện tại (backend tiếp tục join `classes.max_allowance_per_session`, không snapshot thêm vào `sessions`).

## Current State Analysis

`max_allowance_per_session` hiện là nullable ở schema/backend nhưng frontend đang dùng sentinel `100_000_000` để đại diện unlimited trong một số popup và preview logic. Kết quả là có độ lệch semantics giữa FE và BE: BE coi `null` là unlimited tự nhiên, còn FE encode unlimited thành một giá trị số lớn.

Ngoài ra, công thức allowance aggregate hiện đã lặp ở nhiều service SQL (`staff`, `dashboard`, `session-reporting`) và đều phụ thuộc `classes.max_allowance_per_session` tại thời điểm query, nên thay đổi class có thể ảnh hưởng số liệu historical (behavior này cần giữ nguyên theo quyết định hiện tại).

## Desired End State

- FE gửi/nhận `max_allowance_per_session` theo semantics chuẩn:
  - `null`/empty/`0` = không giới hạn (`0` được lưu thành `null` ở API)
  - số nguyên dương = cap hữu hạn
- BE aggregate:
  - gross = `LEAST(COALESCE(NULLIF(max_allowance_per_session, 0), base), base)`
  - không thêm snapshot `max_allowance_per_session` vào `sessions`
- Không còn sentinel `100_000_000` trong code path class/session liên quan.
- Docs mô tả rõ semantics `null` và behavior historical.

### Key Discoveries:
- `Class.maxAllowancePerSession` đã là nullable ở schema (`apps/api/prisma/schema/learning.prisma`), phù hợp semantics unlimited bằng `null`.
- DTO class backend hiện cho phép optional + `@Min(0)` (`apps/api/src/dtos/class.dto.ts`), không chặn `null/undefined` tại boundary update.
- Aggregate SQL ở `apps/api/src/staff/staff.service.ts`, `apps/api/src/dashboard/dashboard.service.ts`, `apps/api/src/session/session-reporting.service.ts` dùng `NULLIF(max_allowance_per_session, 0)` trong nhánh cap để `0` đồng nghĩa không giới hạn.
- FE còn sentinel trong `apps/web/components/admin/class/EditClassBasicInfoPopup.tsx` và `apps/web/components/admin/class/AddSessionPopup.tsx`.

## What We're NOT Doing

- Không thay đổi công thức payroll/allowance aggregate hiện tại ở backend.
- Không thêm cột snapshot `max_allowance_per_session` vào `sessions`.
- Không backfill hoặc migrate data cũ để đổi mọi sentinel value trong DB (trừ khi phát sinh requirement mới).
- Không redesign UI/UX ngoài phạm vi field `max_allowance_per_session`.

## Implementation Approach

Ưu tiên chỉnh semantics tại FE boundary và API payload normalization để thống nhất về `null` cho unlimited, giữ nguyên nguồn authoritative ở backend. Các chỉnh sửa theo hướng backward-compatible, minimal diff, có test coverage tập trung vào edge case `null/0/positive`.

## Phase 1: Normalize Frontend Unlimited Semantics

### Overview
Loại bỏ sentinel ở FE và chuẩn hóa submit/display logic của `max_allowance_per_session` sang nullable semantics.

### Changes Required:

#### 1. Class Edit Popup & Shared Class Form Logic
**File**: `apps/web/components/admin/class/EditClassBasicInfoPopup.tsx`  
**Changes**:
- Bỏ constant sentinel `UNLIMITED_MAX_ALLOWANCE_VND`.
- Input trống của "Trợ cấp tối đa / buổi" map sang `null` (hoặc omit theo contract API), không map sang số lớn.
- Khi load dữ liệu, hiển thị trống nếu `maxAllowancePerSession == null`.
- Giữ validation cho số >= 0, không tự ép unlimited sang numeric value.

```tsx
const parsedMaxAllowance = parseOptionalInt(maxAllowancePerSessionInput);
payload.max_allowance_per_session =
  maxAllowancePerSessionInput.trim() === "" ? null : parsedMaxAllowance;
```

#### 2. Session Allowance Preview Logic
**File**: `apps/web/components/admin/class/AddSessionPopup.tsx`  
**Changes**:
- Bỏ helper nhận diện sentinel unlimited.
- Cap chỉ khi `maxAllowancePerSession` là số hữu hạn >= 0; `null` nghĩa là không cap.
- Cập nhật text formula hiển thị để phản ánh đúng semantics nullable.

```tsx
const hasCap = maxAllowancePerSession != null;
return hasCap ? Math.min(floored, maxAllowancePerSession) : floored;
```

### Success Criteria:

#### Automated Verification:
- [x] Typecheck web pass: `pnpm --filter web exec tsc --noEmit`
- [ ] Lint web pass: `pnpm --filter web lint`
- [x] Không còn tham chiếu sentinel `100_000_000` trong max allowance flow: `rg "UNLIMITED_MAX_ALLOWANCE_VND|100_000_000" apps/web/components/admin/class`

#### Manual Verification:
- [ ] Edit class: để trống max allowance, save và reload vẫn hiển thị trống.
- [ ] Edit class: nhập `0`, save thành công và hiển thị trống (unlimited), DB `null`.
- [ ] Add session popup: preview allowance không cap khi class max allowance là `null`.
- [ ] Add session popup: preview allowance cap đúng khi max allowance là số hữu hạn.

**Implementation Note**: Sau khi hoàn thành Phase 1 và pass verify tự động, dừng để xác nhận manual test trước khi qua Phase 2.

---

## Phase 2: Backend Contract & Safety Checks (No Formula Change)

### Overview
Đảm bảo backend contract chấp nhận nullable semantics rõ ràng, giữ nguyên aggregate behavior hiện tại, và dọn rủi ro kỹ thuật liên quan.

### Changes Required:

#### 1. DTO/Service Consistency for Nullable Max Allowance
**File**: `apps/api/src/dtos/class.dto.ts`  
**Changes**:
- Rà soát để chắc chắn `max_allowance_per_session` được mô tả rõ trong Swagger là optional/nullable semantics.
- Giữ `@Min(0)` cho numeric path, đồng thời đảm bảo flow update không vô tình ép `null` thành số mặc định.

**File**: `apps/api/src/class/class.service.ts`  
**Changes**:
- Xác nhận update basic info giữ nguyên pattern `!== undefined`.
- Nếu payload gửi explicit `null`, backend persist `null` cho `maxAllowancePerSession`.

#### 2. Staff Service Cleanup (Non-functional)
**File**: `apps/api/src/staff/staff.service.ts`  
**Changes**:
- Xóa debug `console.log('TOI BI NGU', ...)` để tránh noise/log leak.
- Không thay đổi công thức aggregate.

```ts
// remove debug log block, keep existing query path only
```

### Success Criteria:

#### Automated Verification:
- [ ] Typecheck api pass: `pnpm --filter api check-types`
- [ ] Unit tests api pass: `pnpm --filter api test`
- [ ] Build api pass: `pnpm --filter api build`

#### Manual Verification:
- [ ] Gọi API update class basic-info với `max_allowance_per_session: null` -> DB lưu `null`.
- [ ] Staff income summary và dashboard không thay đổi logic/công thức sau refactor cleanup.
- [ ] Case `max_allowance_per_session = 0` (DB hoặc payload) được xử lý như không giới hạn, đồng bộ SQL `NULLIF` và API normalize.

**Implementation Note**: Sau khi hoàn thành Phase 2 và pass verify tự động, dừng để xác nhận manual test trước khi qua Phase 3.

---

## Phase 3: Documentation Sync

### Overview
Cập nhật tài liệu để phản ánh semantics mới (unlimited = `null`) và quyết định giữ historical aggregate behavior hiện tại.

### Changes Required:

#### 1. Update Database & Behavior Documentation
**File**: `docs/Database Schema.md`  
**Changes**:
- Làm rõ `classes.max_allowance_per_session` nullable semantics.
- Ghi chú rõ aggregate logic đọc từ `classes` (không snapshot trên session) và tác động historical.

#### 2. Update Plan/Research Documentation
**File**: `docs/plans/max-allowance-behavior/research.md`  
**Changes**:
- Bổ sung phần "decision" để phản ánh quyết định implementation:
  - Unlimited chuẩn hóa về `null`.
  - Giữ behavior aggregate historical hiện tại.

### Success Criteria:

#### Automated Verification:
- [x] Không có mismatch docs-schema cho `max_allowance_per_session`.
- [x] `rg "max_allowance_per_session|không giới hạn|null" docs/Database\\ Schema.md docs/plans/max-allowance-behavior/research.md` trả về nội dung đồng nhất.

#### Manual Verification:
- [ ] Reviewer có thể đọc docs và hiểu ngay semantics `null = unlimited`.
- [ ] Reviewer hiểu rõ phạm vi: không snapshot max allowance theo session.

**Implementation Note**: Sau khi hoàn thành Phase 3, xác nhận lại checklist docs sync trước khi merge.

---

## Testing Strategy

### Unit Tests:
- Backend class update tests cho `max_allowance_per_session` với 3 case: `null`, `0`, positive.
- Nếu có test cho staff/session aggregate: thêm case `max_allowance_per_session = null` (no cap) và `0` (hard cap).

### Integration Tests:
- API update class basic-info + đọc lại class detail để xác nhận persistence nullable.
- Staff income summary/dashboard smoke scenario với class không có max allowance.

### Manual Testing Steps:
1. Trên admin class detail, mở popup basic info và set max allowance trống -> lưu -> reload kiểm tra.
2. Set max allowance = 0 -> tạo session attendance present/excused -> kiểm tra summary.
3. Set max allowance = finite value -> tạo session với base vượt cap -> kiểm tra preview + aggregate.
4. So sánh staff/dashboard trước-sau deploy cho 1 lớp mẫu để đảm bảo không regression ngoài semantics FE.

## Performance Considerations

- Thay đổi chủ yếu ở FE mapping và small backend cleanup, không thêm query nặng mới.
- Giữ nguyên SQL aggregate hiện có để tránh rủi ro perf từ việc thay đổi strategy.

## Migration Notes

- Không cần migration schema.
- Không cần data migration bắt buộc nếu DB đã có `null` đúng semantics.
- Nếu DB tồn tại giá trị sentinel từ FE cũ, có thể cân nhắc script cleanup riêng sau (ngoài scope plan này).

## References

- Related research: `docs/plans/max-allowance-behavior/research.md`
- Similar implementation points:
  - `apps/api/src/session/session-reporting.service.ts`
  - `apps/api/src/staff/staff.service.ts`
  - `apps/api/src/dashboard/dashboard.service.ts`
  - `apps/web/components/admin/class/EditClassBasicInfoPopup.tsx`
  - `apps/web/components/admin/class/AddSessionPopup.tsx`
