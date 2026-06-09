# Dual-role Assistant + CSKH (Self-managed exclusion) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ngăn nhân sự vừa `assistant` vừa `customer_care` nhận trợ cấp 3% từ chính portfolio CSKH của mình; đồng bộ validation, snapshot, payroll aggregate, dashboard và UI theo `CONTEXT.md`.

**Architecture:** Tạo một helper BE canonical (`isSelfManagedAssistantShare` + SQL fragment Prisma) dùng chung cho mọi aggregate/preview. Validation tại boundary `POST/PATCH /staff` chặn và normalize FK; session write path null hóa snapshot self-managed. FE ẩn field khi dual-role và tách dashboard thành hai khối CSKH. Không migration — legacy FK/snapshot được bảo vệ bởi runtime filter.

**Tech Stack:** NestJS + Prisma (API), Next.js 16 + TanStack Query (web), Jest (API unit tests).

**Source of truth:** `CONTEXT.md` (mục CSKH, Trợ lí quản lí CSKH, dual-role, lazy cleanup, snapshot, dashboard, helper copy).

---

## File map

| File | Responsibility |
|------|----------------|
| `apps/api/src/payroll/assistant-share.util.ts` | **Create** — canonical rules & Prisma.Sql fragment |
| `apps/api/src/staff/staff.service.ts` | Validation + normalize FK on create/update |
| `apps/api/src/session/session-create.service.ts` | Null snapshot when self-managed |
| `apps/api/src/session/session-update.service.ts` | Same on attendance refresh |
| `apps/api/src/assistant-commission/assistant-commission.service.ts` | Filter managed list + raw SQL |
| `apps/api/src/staff/staff.service.ts` (income/unpaid/payment) | Assistant share aggregates |
| `apps/api/src/dashboard/dashboard.service.ts` | Split assistant dashboard portfolios |
| `apps/api/src/dtos/dashboard.dto.ts` | New DTO fields |
| `apps/web/dtos/dashboard.dto.ts` | Mirror FE DTOs |
| `apps/web/components/admin/staff/EditStaffPopup.tsx` | Hide field dual-role; sanitize display |
| `apps/web/components/admin/staff/AddTutorPopup.tsx` | Hide field dual-role (no field today — defensive if added later) |
| `apps/web/app/staff/page.tsx` | Two CSKH blocks on assistant dashboard |
| `apps/web/app/admin/staffs/[id]/page.tsx` | Helper copy under Trợ lí row |
| `apps/web/app/staff/profile/page.tsx` | Same helper (reuse component if possible) |
| `docs/pages/admin.md`, `docs/pages/staff.md`, `docs/CHANGELOG.md` | Docs sync |

---

## Canonical rules (implement exactly)

```ts
// assistant-share.util.ts
export function isSelfManagedCustomerCareStaff(params: {
  staffId: string;
  customerCareManagedByStaffId: string | null | undefined;
}): boolean {
  return (
    params.customerCareManagedByStaffId != null &&
    params.customerCareManagedByStaffId === params.staffId
  );
}

export function isSelfManagedAssistantShareAttendance(params: {
  assistantManagerStaffId: string | null | undefined;
  customerCareStaffId: string | null | undefined;
}): boolean {
  return (
    params.assistantManagerStaffId != null &&
    params.customerCareStaffId != null &&
    params.assistantManagerStaffId === params.customerCareStaffId
  );
}

export function resolveAssistantManagerStaffIdForAttendance(params: {
  customerCareStaffId: string | null | undefined;
  customerCareManagedByStaffId: string | null | undefined;
}): string | null {
  const managerId = params.customerCareManagedByStaffId ?? null;
  if (!managerId || !params.customerCareStaffId) return null;
  if (managerId === params.customerCareStaffId) return null;
  return managerId;
}
```

SQL fragment for raw queries (append to WHERE):

```sql
AND (
  attendance.assistant_manager_staff_id IS NULL
  OR attendance.customer_care_staff_id IS NULL
  OR attendance.assistant_manager_staff_id <> attendance.customer_care_staff_id
)
```

Prisma equivalent for `findMany` filters where needed: `NOT { assistantManagerStaffId: { equals: prisma.raw('customer_care_staff_id') } }` — prefer raw SQL or post-filter for aggregate queries already using `$queryRaw`.

---

### Task 1: Shared payroll utility + unit tests

**Files:**
- Create: `apps/api/src/payroll/assistant-share.util.ts`
- Create: `apps/api/src/payroll/assistant-share.util.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
describe('assistant-share.util', () => {
  it('detects self-managed staff FK', () => {
    expect(isSelfManagedCustomerCareStaff({ staffId: 'a', customerCareManagedByStaffId: 'a' })).toBe(true);
    expect(isSelfManagedCustomerCareStaff({ staffId: 'a', customerCareManagedByStaffId: 'b' })).toBe(false);
  });

  it('detects self-managed attendance snapshot', () => {
    expect(isSelfManagedAssistantShareAttendance({ assistantManagerStaffId: 'x', customerCareStaffId: 'x' })).toBe(true);
    expect(isSelfManagedAssistantShareAttendance({ assistantManagerStaffId: 'x', customerCareStaffId: 'y' })).toBe(false);
  });

  it('resolves null manager when self-managed', () => {
    expect(resolveAssistantManagerStaffIdForAttendance({
      customerCareStaffId: 'a',
      customerCareManagedByStaffId: 'a',
    })).toBeNull();
    expect(resolveAssistantManagerStaffIdForAttendance({
      customerCareStaffId: 'a',
      customerCareManagedByStaffId: 'b',
    })).toBe('b');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd apps/api && pnpm exec jest src/payroll/assistant-share.util.spec.ts --no-cache
```

- [ ] **Step 3: Implement util**

- [ ] **Step 4: Run test — expect PASS**

---

### Task 2: Staff create/update validation & normalization

**Files:**
- Modify: `apps/api/src/staff/staff.service.ts` (~L4736, ~L4803, ~L4955 create path)
- Modify: `apps/api/src/staff/staff.service.spec.ts`
- Modify: `apps/api/src/dtos/staff.dto.ts` (Swagger note if needed)

- [ ] **Step 1: Add private helper `normalizeCustomerCareManagedByForStaff`**

Logic:
1. Compute `nextRoles` from payload (`data.roles ?? existingStaff.roles`).
2. If `nextRoles` includes **both** `assistant` and `customer_care` → return `null` (ignore client value).
3. If `customer_care_managed_by_staff_id === data.id` (self-ref) → throw `BadRequestException('Trợ lí quản lí không được là chính nhân sự CSKH này.')`.
4. Else keep existing manager validation (assistant role, active).

Apply in:
- `updateStaff` transaction before write
- `createStaff` transaction before write

- [ ] **Step 2: Write failing tests**

Cases:
- `PATCH` dual-role → `customerCareManagedByStaffId` forced `null` even when client sends self id
- `PATCH` CSKH-only with `managed_by === own id` → 400
- `PATCH` CSKH-only with valid other assistant → OK
- `POST` create dual-role → `customerCareManagedByStaffId` null

- [ ] **Step 3: Implement + run tests**

```bash
cd apps/api && pnpm exec jest src/staff/staff.service.spec.ts -t "customerCareManagedBy" --no-cache
```

- [ ] **Step 4: Sanitize `getStaffById` response**

If `customerCareManagedByStaffId === staff.id`, return `customerCareManagedByStaffId: null` and `customerCareManagedBy: null` (form displays empty per decision A Q8).

---

### Task 3: Session snapshot write path

**Files:**
- Modify: `apps/api/src/session/session-create.service.ts` (~L311-345)
- Modify: `apps/api/src/session/session-update.service.ts` (~L785-797, ~L1115)
- Test: `apps/api/src/session/session-create.service.spec.ts` or integration test if exists

- [ ] **Step 1: Replace direct map lookup with `resolveAssistantManagerStaffIdForAttendance`**

In create:
```ts
const assistantId = resolveAssistantManagerStaffIdForAttendance({
  customerCareStaffId: attendanceItem.customerCareStaffId,
  customerCareManagedByStaffId: attendanceItem.customerCareStaffId
    ? assistantManagerByStaffId.get(attendanceItem.customerCareStaffId)
    : null,
});
```

- [ ] **Step 2: Mirror in update service** when refreshing `assistantManagerStaffId`

- [ ] **Step 3: Add test** — session create with self-managed CSKH FK → attendance `assistantManagerStaffId` is `null`

- [ ] **Step 4: Run session-related tests**

```bash
cd apps/api && pnpm exec jest src/session --no-cache
```

---

### Task 4: Payroll aggregates — income summary, unpaid, payment preview

**Files:**
- Modify: `apps/api/src/staff/staff.service.ts`
  - `getAssistantTuitionShareRowsByStatus` (~L1474)
  - Unpaid CTE (~L3771)
  - Payment preview assistant_share paths (~L1893, ~L2120, ~L3311)
- Modify: `apps/api/src/dashboard/dashboard.service.ts` (~L1314, ~L2495)

- [ ] **Step 1: Import SQL fragment / util**

Append self-managed exclusion to every raw SQL counting assistant 3% shares.

- [ ] **Step 2: Update `staff.service.spec.ts` income summary tests**

Add case: staff dual-role with legacy self-snapshot attendance → assistant share totals exclude those rows; CSKH commission still counts.

- [ ] **Step 3: Run staff service tests**

```bash
cd apps/api && pnpm exec jest src/staff/staff.service.spec.ts --no-cache
```

- [ ] **Step 4: Run dashboard tests if present**

```bash
cd apps/api && pnpm exec jest src/dashboard --no-cache
```

---

### Task 5: Assistant commission module

**Files:**
- Modify: `apps/api/src/assistant-commission/assistant-commission.service.ts`
- Modify: `apps/api/src/assistant-commission/assistant-commission.service.spec.ts`

- [ ] **Step 1: Filter `getManagedCustomerCare` staff list**

```ts
where: {
  customerCareManagedByStaffId: accessibleAssistantStaffId,
  roles: { has: StaffRole.customer_care },
  id: { not: accessibleAssistantStaffId }, // exclude self from managed list
}
```

- [ ] **Step 2: Add SQL exclusion fragment** to all `$queryRaw` aggregations in this service

- [ ] **Step 3: Add test** — when assistant manages self (legacy FK), managed list does not include self; aggregates exclude self-share rows

- [ ] **Step 4: Run tests**

```bash
cd apps/api && pnpm exec jest src/assistant-commission/assistant-commission.service.spec.ts --no-cache
```

---

### Task 6: Dashboard API — split assistant CSKH blocks

**Files:**
- Modify: `apps/api/src/dashboard/dashboard.service.ts` (`getAssistantSection`, `getCustomerCarePortfolios`)
- Modify: `apps/api/src/dtos/dashboard.dto.ts`
- Modify: `apps/web/dtos/dashboard.dto.ts`

- [ ] **Step 1: Extend DTO**

```ts
export interface StaffDashboardAssistantSectionDto {
  // existing...
  myCustomerCarePortfolio: StaffDashboardCustomerCarePortfolioItemDto | null;
  managedCustomerCarePortfolios: StaffDashboardCustomerCarePortfolioItemDto[];
}
```

- [ ] **Step 2: Implement `getManagedCustomerCarePortfolios(assistantStaffId)`**

Reuse portfolio builder; `where: { customerCareManagedByStaffId: assistantStaffId, id: { not: assistantStaffId }, roles: { has: customer_care }, status: active }`.

- [ ] **Step 3: Implement `getMyCustomerCarePortfolio(staffId)`**

Single portfolio for logged-in CSKH (existing `getCustomerCarePortfolios([staffId])` → first item or null).

- [ ] **Step 4: Update `getAssistantSection`**

- If requester has `customer_care`: populate `myCustomerCarePortfolio`
- Always populate `managedCustomerCarePortfolios` for assistant scope
- **Deprecate** flat `customerCarePortfolios` OR keep as alias to `managedCustomerCarePortfolios` for backward compat (prefer explicit split; update FE in same PR)

- [ ] **Step 5: Wire staff dashboard controller** to pass requesting staff id + roles

Check `apps/api/src/dashboard/dashboard.controller.ts` staff dashboard endpoint.

---

### Task 7: Frontend — EditStaffPopup

**Files:**
- Modify: `apps/web/components/admin/staff/EditStaffPopup.tsx`

- [ ] **Step 1: Compute flags**

```ts
const hasAssistantRole = selectedRoles.has("assistant");
const isDualRole = hasCustomerCareRole && hasAssistantRole;
const showManagedByField = hasCustomerCareRole && !isDualRole;
```

- [ ] **Step 2: Hide field when `!showManagedByField`**

- [ ] **Step 3: Initialize `managedByStaffId`** — if `staff.customerCareManagedByStaffId === staff.id`, use `null` for display

- [ ] **Step 4: Submit payload**

```ts
customer_care_managed_by_staff_id: showManagedByField ? (managedByStaffId || null) : null,
```

- [ ] **Step 5: Filter dropdown** — exclude `staff.id` from assistant options (CSKH thuần)

- [ ] **Optional:** Replace native `<select>` with `UpgradedSelect` while touching file (workspace rule) — only if low risk in same PR

---

### Task 8: Frontend — AddTutorPopup (defensive)

**Files:**
- Modify: `apps/web/components/admin/staff/AddTutorPopup.tsx`

- [ ] **Step 1:** Add same `isDualRole` guard — if later field is added, it's hidden; on submit never send `customer_care_managed_by_staff_id` when dual-role

- [ ] **Step 2:** Document in code comment referencing CONTEXT rule (minimal)

*Note:* Create flow today has no managed-by UI; backend Task 2 still protects `POST /staff`.

---

### Task 9: Frontend — Assistant dashboard two blocks

**Files:**
- Modify: `apps/web/app/staff/page.tsx` (`AssistantSection` ~L600-676)
- Modify: `apps/web/dtos/dashboard.dto.ts`

- [ ] **Step 1: Update TanStack Query consumer** for new DTO shape

- [ ] **Step 2: Render block A — "CSKH của tôi"**

Only when `fullProfile.staffRoles.includes('customer_care')` AND `myCustomerCarePortfolio != null`

Link → `/staff/customer-care-detail`

Show same metrics: active students, learned tuition, topup

- [ ] **Step 3: Render block B — "CSKH tôi quản lí"**

Use `managedCustomerCarePortfolios`; links → `/staff/customer-care-detail/[staffId]`

Empty state: "Chưa có CSKH nào thuộc phạm vi quản lí."

- [ ] **Step 4: Remove/replace old single `customerCarePortfolios` block**

- [ ] **Step 5: Mobile-first** — stack blocks vertically; keep card pattern from existing `SurfaceCard`

---

### Task 10: Frontend — Helper copy on Công việc khác

**Files:**
- Create: `apps/web/components/admin/staff/AssistantDualRoleIncomeHelper.tsx` (small reusable)
- Modify: `apps/web/app/admin/staffs/[id]/page.tsx` (~L2237)
- Modify: `apps/web/app/staff/profile/page.tsx` (equivalent section)

- [ ] **Step 1: Create helper component**

```tsx
export function AssistantDualRoleIncomeHelper({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <p className="text-xs text-text-muted">
      Trợ cấp 3% chỉ tính từ CSKH khác do bạn quản lí, không tính trên học sinh thuộc portfolio CSKH của chính bạn.
    </p>
  );
}
```

- [ ] **Step 2: Show under `Trợ lí` row when `staff.roles` includes both `assistant` and `customer_care`**

---

### Task 11: Documentation sync

**Files:**
- Modify: `docs/pages/admin.md` — staff PATCH rules, assistant commission scope, EditStaffPopup behavior
- Modify: `docs/pages/staff.md` — assistant dashboard two blocks, dual-role helper
- Modify: `docs/CHANGELOG.md` — entry under Unreleased

- [ ] **Step 1: Update admin.md**

Document:
- Self-reference forbidden on `customer_care_managed_by_staff_id`
- Dual-role hides field; lazy FK cleanup on PATCH
- Assistant commission / dashboard managed scope excludes self

- [ ] **Step 2: Update staff.md**

Document two dashboard blocks and helper copy

- [ ] **Step 3: CHANGELOG entry**

---

### Task 12: Verification (mandatory before done)

- [ ] **API unit tests**

```bash
cd apps/api && pnpm exec jest \
  src/payroll/assistant-share.util.spec.ts \
  src/staff/staff.service.spec.ts \
  src/assistant-commission/assistant-commission.service.spec.ts \
  --no-cache
```

- [ ] **Typecheck**

```bash
pnpm check-types
pnpm --filter web exec tsc --noEmit
```

- [ ] **Lint touched apps**

```bash
pnpm --filter api lint
pnpm --filter web lint
```

- [ ] **Manual QA matrix**

| Actor | Action | Expected |
|-------|--------|----------|
| Admin | Edit dual-role staff | No "Trợ lí quản lí" field; save clears FK |
| Admin | Edit CSKH-only, pick self as manager | 400 error |
| Admin | Edit CSKH-only, pick other assistant | OK |
| Dual-role legacy self-FK | View income summary | CSKH row has commission; assistant 3% excludes self sessions |
| Dual-role + customer_care | `/staff` dashboard | Two blocks: mine + managed (no self in managed) |
| Assistant | Tab Hoa hồng on assistant detail | No self in managed CSKH list |
| Session create | Student under self-managed CSKH | `assistant_manager_staff_id` null on new attendance |

---

## Implementation order (recommended)

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6
                              ↓
                    Task 7 → Task 8 → Task 9 → Task 10 → Task 11 → Task 12
```

Backend Tasks 1–6 can ship before FE, but deploy FE+BE together to avoid DTO mismatch on dashboard.

---

## Out of scope (explicit)

- Migration / backfill attendance legacy snapshots
- ADR file (decisions captured in `CONTEXT.md`)
- Admin dashboard global CSKH overview (unchanged)
- Changing CSKH commission formula or 3% rate

---

## Risk notes

1. **Missed SQL site** — grep `0.03` and `assistant_manager_staff_id` after implementation; every aggregate must use exclusion fragment.
2. **DTO breaking change** on `customerCarePortfolios` — coordinate FE in same PR or keep deprecated alias one release.
3. **Payment already pending** with self-snapshot — runtime exclusion means those rows won't appear in preview; acceptable per spec (no backfill).

---

## Estimated effort

| Area | ~Hours |
|------|--------|
| BE util + staff validation | 2h |
| BE session + aggregates | 3h |
| BE dashboard DTO | 1.5h |
| FE forms + dashboard + helper | 2.5h |
| Tests + docs + QA | 2h |
| **Total** | **~11h** |
