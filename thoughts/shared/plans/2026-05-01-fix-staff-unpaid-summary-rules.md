# Fix Staff Unpaid Summary Rules Implementation Plan

## Overview

Chuẩn hoá lại toàn bộ logic `Chưa nhận` để phản ánh đúng nghiệp vụ đã chốt:
- không tính cọc vào unpaid,
- phần buổi dạy chỉ lấy unpaid trong 14 ngày gần nhất,
- các nguồn còn lại lấy toàn bộ pending/unpaid,
- dùng số **trước thuế** cho headline unpaid,
- đồng bộ cùng một công thức cho staff profile và staff list (`unpaidAmountTotal`).

## Current State Analysis

Hiện tại logic unpaid đang phân tán và không đồng nhất theo ngữ nghĩa:
- `monthlyIncomeTotals.unpaid` trong income summary đang bị chi phối bởi tổng hợp tháng theo nhiều nguồn, không khớp với snapshot unpaid mong muốn.
- `classMonthlySummaries[].unpaid` đang được build từ `recentUnpaidSessionRows`, nhưng phần tổng headline và staff list chưa dùng cùng công thức.
- `getUnpaidTotalsByStaffIds` đang dùng CTE aggregate theo net/tax bucket cho nhiều nguồn, chưa phản ánh rule mới (gross pre-tax + 14-day chỉ cho session + exclude deposit).

### Key Discoveries:
- `buildRecentWindow(days)` đã có sẵn logic cửa sổ 14 ngày tại `apps/api/src/staff/staff.service.ts:299`.
- `classMonthlySummaries` đang tách flow `monthlySessionRows` và `recentUnpaidSessionRows` tại `apps/api/src/staff/staff.service.ts:3235` và `apps/api/src/staff/staff.service.ts:3264`.
- `getUnpaidTotalsByStaffIds` hiện aggregate unpaid cho staff list tại `apps/api/src/staff/staff.service.ts:2769`.
- FE self profile đang luôn gọi summary với `days=14` tại `apps/web/app/staff/profile/page.tsx:83` và render `monthlyIncomeTotals.unpaid` tại `apps/web/app/staff/profile/page.tsx:835`.
- Contract summary DTO hiện chỉ có `monthlyIncomeTotals`/`classMonthlySummaries` và `recentUnpaidDays` tại `apps/web/dtos/staff.dto.ts:144`.

## Desired End State

Sau khi hoàn tất:
1. `Chưa nhận` trên staff profile dùng đúng snapshot rule đã chốt:
   - Session teacher: unpaid, không deposit, chỉ trong 14 ngày gần nhất theo `sessions.date`.
   - Nguồn khác: full unpaid/pending toàn bộ dữ liệu (không lọc 14 ngày).
   - Giá trị headline unpaid dùng **pre-tax/gross semantics** theo từng nguồn.
2. `classMonthlySummaries[].unpaid` phản ánh đúng unpaid session theo 14 ngày + exclude deposit + gross semantics.
3. `unpaidAmountTotal` trong staff list dùng cùng công thức snapshot (single source of truth).
4. Docs staff/changelog cập nhật đúng semantics mới.

### Verification of End State
- So sánh cùng một staff giữa:
  - `/users/me/staff-income-summary` (headline unpaid),
  - `/staff` list (`unpaidAmountTotal`),
  - breakdown theo lớp (`classMonthlySummaries`) cho phần session.
- Kết quả phải nhất quán theo cùng rule.

## What We're NOT Doing

- Không thay đổi logic thanh toán thực tế của pay-all/payment-preview endpoints.
- Không đổi các semantics `Đã nhận`/`Thực nhận tháng` hiện có (ngoại trừ phần unpaid snapshot cần fix).
- Không thêm migration DB, không đổi schema Prisma cho task này.
- Không mở rộng UI mới lớn; chỉ cập nhật copy/label tối thiểu nếu cần để tránh hiểu nhầm.

## Implementation Approach

Tách riêng một lớp tính toán unpaid snapshot trong `StaffService` và tái sử dụng cho:
- income summary (self/admin detail),
- staff list aggregate.

Chiến lược là gom về một pipeline tính unpaid gross authoritative theo source type, sau đó map vào output hiện có thay vì để mỗi màn tự suy luận khác nhau.

## Phase 1: Backend Authoritative Unpaid Snapshot

### Overview
Xây logic nguồn sự thật cho unpaid snapshot theo đúng rule đã chốt.

### Changes Required:

#### 1. Introduce dedicated unpaid snapshot builders
**File**: `apps/api/src/staff/staff.service.ts`  
**Changes**:
- Thêm helper/query layer tách riêng:
  - teacher session unpaid within recent window (exclude deposit status),
  - other sources full pending/unpaid (bonus, customer care, lesson output, assistant share, extra allowance).
- Chuẩn hóa pre-tax/gross aggregation per source.
- Expose hàm private trả:
  - total snapshot unpaid by staff id,
  - teacher-session snapshot unpaid by class for class summary.

```ts
// pseudo-shape
type StaffUnpaidSnapshot = {
  totalGrossUnpaid: number;
  teacherRecentUnpaidByClass: Array<{ classId: string; className: string; grossUnpaid: number }>;
};
```

#### 2. Rewire staff list unpaid aggregate to new snapshot
**File**: `apps/api/src/staff/staff.service.ts`  
**Changes**:
- Refactor `getUnpaidTotalsByStaffIds` to call the new authoritative snapshot query instead of the current CTE net/tax mix.
- Ensure `unpaidAmountTotal` output remains backward-compatible in shape, but semantics follow new snapshot rules.

#### 3. Rewire income summary unpaid fields
**File**: `apps/api/src/staff/staff.service.ts`  
**Changes**:
- Trong `getIncomeSummary`, thay cách tính `monthlyIncomeTotals.unpaid` để lấy từ authoritative snapshot total.
- Điều chỉnh `classMonthlySummaries[].unpaid` dùng teacher recent unpaid by class (14-day window + exclude deposit + gross semantics).
- Giữ các field khác (`paid`, `total`, gross/tax/deduction breakdowns) theo contract hiện hành trừ khi cần chỉnh rất cục bộ để nhất quán dữ liệu.

### Success Criteria:

#### Automated Verification:
- [ ] API typecheck pass: `pnpm --filter api check-types`
- [ ] Staff service tests pass: `pnpm --filter api test -- src/staff/staff.service.spec.ts`
- [ ] Không lỗi lint cho file đã sửa: `pnpm --filter api lint`

#### Manual Verification:
- [ ] Staff có session `deposit` + `unpaid` kiểm chứng `Chưa nhận` không tính deposit.
- [ ] Session unpaid ngoài 14 ngày không còn nằm trong headline/class unpaid.
- [ ] Bonus/extra allowance pending cũ (ngoài 14 ngày) vẫn được cộng vào headline unpaid.
- [ ] Staff list `unpaidAmountTotal` khớp headline unpaid ở staff detail/profile cho cùng một thời điểm.

**Implementation Note**: Sau khi xong phase này và pass verify tự động, dừng để đối chiếu nghiệp vụ với người dùng trước khi tiếp tục tinh chỉnh FE copy/docs.

---

## Phase 2: Test Coverage Alignment

### Overview
Bổ sung/điều chỉnh unit test để khóa chặt semantics mới, tránh regressions.

### Changes Required:

#### 1. Update existing staff unpaid tests
**File**: `apps/api/src/staff/staff.service.spec.ts`  
**Changes**:
- Điều chỉnh các expectation liên quan `unpaid` và `unpaidAmountTotal` theo rule mới.
- Tách rõ test:
  - exclude deposit from unpaid,
  - teacher unpaid uses recent 14-day window,
  - non-session pending sources are full-scope unpaid,
  - staff list and income summary share same unpaid semantics.

#### 2. Add edge-case tests for mixed status/time sources
**File**: `apps/api/src/staff/staff.service.spec.ts`  
**Changes**:
- Case có session deposit + unpaid + paid xen kẽ.
- Case có bonus/extra allowance pending từ tháng cũ.
- Case không có class assignment nhưng có unpaid from non-session sources.

### Success Criteria:

#### Automated Verification:
- [ ] New/updated unit tests pass: `pnpm --filter api test -- src/staff/staff.service.spec.ts`
- [ ] Full API test suite pass (nếu cần): `pnpm --filter api test`

#### Manual Verification:
- [ ] Đọc test names là hiểu rõ business rules đã chốt.
- [ ] Không còn ambiguity giữa "monthly unpaid" và "snapshot unpaid".

**Implementation Note**: Sau phase 2, pause để human review test semantics trước khi chốt docs/update copy.

---

## Phase 3: FE Contract Confirmation and Documentation Sync

### Overview
Giữ FE hiển thị đúng dữ liệu authoritative, đồng thời cập nhật tài liệu để tránh hiểu nhầm semantics.

### Changes Required:

#### 1. FE copy/label sanity check
**File**: `apps/web/app/staff/profile/page.tsx`  
**Changes**:
- Xác nhận hiển thị `monthlyIncomeTotals.unpaid` vẫn đúng ý nghĩa mới (snapshot unpaid gross).
- Nếu cần, bổ sung copy ngắn giúp người dùng hiểu "Chưa nhận" đang là snapshot rule (không phụ thuộc MonthNav).

#### 2. Documentation updates (mandatory sync)
**Files**:
- `docs/pages/staff.md`
- `docs/CHANGELOG.md`

**Changes**:
- Cập nhật semantics của:
  - staff income summary unpaid headline,
  - class summary unpaid,
  - staff list `unpaidAmountTotal`.
- Ghi changelog phần Fixed/Changed theo format repo.

### Success Criteria:

#### Automated Verification:
- [ ] FE typecheck pass: `pnpm --filter web exec tsc --noEmit`
- [ ] FE lint pass cho phạm vi thay đổi: `pnpm --filter web lint`

#### Manual Verification:
- [ ] `/staff/profile`: `Chưa nhận` phản ánh đúng rule mới.
- [ ] `/admin/staffs` hoặc màn list staff mirror: unpaid total không lệch với detail của cùng staff.
- [ ] Docs mô tả đúng hành vi runtime sau chỉnh sửa.

**Implementation Note**: Sau phase 3, thực hiện nghiệm thu business với các dữ liệu thực tế có cọc + pending cũ + unpaid mới.

---

## Testing Strategy

### Unit Tests:
- Snapshot unpaid aggregator theo từng source.
- Mapping summary totals vào DTO output.
- Exclusion logic cho deposit statuses (`deposit/deposite/coc/cọc`).
- Time-window filter chỉ áp dụng cho teacher sessions.

### Integration Tests:
- Gọi `GET /users/me/staff-income-summary` với dữ liệu seed hỗn hợp.
- Gọi list staff endpoint và đối chiếu `unpaidAmountTotal`.

### Manual Testing Steps:
1. Tạo/seed staff có:
   - session unpaid trong 14 ngày,
   - session unpaid ngoài 14 ngày,
   - session deposit,
   - bonus pending cũ.
2. Mở `/staff/profile` staff đó, ghi lại `Chưa nhận` headline + class rows.
3. Mở list staff, đối chiếu `unpaidAmountTotal`.
4. Đổi `teacherPaymentStatus` từ deposit/unpaid/paid và xác nhận số cập nhật đúng.

## Performance Considerations

- Ưu tiên tái sử dụng CTE và aggregate theo `staffIds` batch để tránh N+1 query.
- Tránh query tách quá nhiều lần cho mỗi source khi render list lớn.
- Nếu query phức tạp, cân nhắc index usage check ở các cột status/date chính (`sessions.date`, payment status columns).

## Migration Notes

- Không yêu cầu migration DB.
- Đây là thay đổi semantics tính toán backend; cần rollout kèm note rõ trong changelog và docs để đội vận hành hiểu chênh lệch số.

## References

- Related code:
  - `apps/api/src/staff/staff.service.ts:299`
  - `apps/api/src/staff/staff.service.ts:2769`
  - `apps/api/src/staff/staff.service.ts:3235`
  - `apps/api/src/staff/staff.service.ts:3264`
  - `apps/api/src/staff/staff.service.ts:3314`
  - `apps/web/app/staff/profile/page.tsx:83`
  - `apps/web/app/staff/profile/page.tsx:835`
  - `apps/web/dtos/staff.dto.ts:144`
- Existing tests:
  - `apps/api/src/staff/staff.service.spec.ts`
