# Loading Skeleton Parity Audit - 2026-05-20

## Scope

Read-only review of `apps/web` loading states and skeletons. Six focused sub-agents audited admin overview/entity routes, admin operations routes, staff overview/entity routes, staff operations routes, student/auth/public routes, and shared skeleton infrastructure.

Local inventory:

- 71 `page.tsx` routes under `apps/web/app`.
- 3 segment-level loading files: `apps/web/app/admin/loading.tsx`, `apps/web/app/staff/loading.tsx`, `apps/web/app/student/loading.tsx`.
- 33 skeleton/loading-like components or ad-hoc blocks in `apps/web/components`.
- No P0 crash/blocker found. Main risk is visual/layout drift and misleading empty/blank states during initial load.

## Executive Summary

The codebase has loading coverage, but much of it is stale or too generic. Admin/staff segment `loading.tsx` files present a 5-column table shell for many routes that are dashboards, detail pages, calendars, tab workspaces, forms, or card grids. Several reusable table skeletons no longer match live tables after product changes. Some pages render `null`, centered text/spinners, or empty states while data is still loading.

Highest-impact fixes:

1. Sync shared list/table skeletons used by admin and staff re-export routes: staff, student, class, session history, cost, extra allowance.
2. Replace generic route-level loading with neutral shell or route-specific skeletons for admin/staff/student.
3. Replace text-only, spinner-only, `null`, and empty-before-load states in customer care, calendar, deductions, lesson plans, notification, profile, and auth.
4. Standardize a small skeleton contract: initial load preserves loaded layout shape; background refetch uses `QueryRefreshStrip`; empty states only render after loading completes.

## Cross-Cutting Findings

| Priority | Area | Evidence | Problem | Target |
| --- | --- | --- | --- | --- |
| P1 | Admin/staff segment fallback | `apps/web/app/admin/loading.tsx:3`, `apps/web/app/staff/loading.tsx:3` | Both are near-copy generic header/filter/table skeletons. They flash wrong layout for dashboards, detail pages, calendars, workspaces, and forms. | Use neutral app-shell skeleton or add route-specific `loading.tsx` for high-traffic routes. |
| P1 | Student segment fallback | `apps/web/app/student/loading.tsx:5` vs `apps/web/app/student/page.tsx:467` | Segment skeleton looks like dashboard cards/activity feed. Loaded page is student profile/detail/wallet/class list. | Student profile skeleton with avatar/header chips, detail cards, wallet, mobile cards, desktop table. |
| P1 | Shared table skeletons stale | `StaffListTableSkeleton`, `StudentListTableSkeleton`, `ClassListTableSkeleton`, `SessionHistoryTableSkeleton` | Column count, widths, row count, action columns, and mobile/desktop variants diverged from loaded tables. | Drive skeleton columns from same column model or update in lockstep with loaded tables. |
| P2 | Primitive inconsistency | `apps/web/components/ui/skeleton.tsx:4`, many raw `animate-pulse` spans | Mixed `bg-bg-secondary`, `bg-bg-tertiary`, opacity variants, arbitrary radii. | Use `Skeleton` primitive for bars/shapes; reserve surface colors for containers. |
| P2 | Sidebar loading semantics | `apps/web/components/admin/AdminSidebar.tsx:223`, `apps/web/components/staff/StaffSidebar.tsx:635` | Empty menu renders loading pulse, so error/no-access can look like perpetual loading. | Separate explicit loading from empty/no-access. |
| P2 | Refresh feedback | `apps/web/components/ui/query-refresh-strip.tsx:10`, `apps/web/app/student/page.tsx:462`, `apps/web/app/admin/students/page.tsx:544` | `QueryRefreshStrip` activation differs by page and can disappear for empty states. | Initial load = skeleton; background refetch = strip, consistently across lists/details. |

## Admin Overview and Entity Routes

| Priority | Route/component | Evidence | Mismatch |
| --- | --- | --- | --- |
| P1 | Staff list | `apps/web/components/admin/staff/StaffListTableSkeleton.tsx:37`, `apps/web/app/admin/staffs/page.tsx:743` | Skeleton misses `Thành tích`, has stale action/delete behavior and widths. |
| P1 | Student list | `apps/web/components/admin/student/StudentListTableSkeleton.tsx:44`, `apps/web/app/admin/students/page.tsx:683` | Skeleton still has `Giới tính`, `Trường`; real table has `QR`, `Số dư`, `Tiền vào`, `Tỉnh`, `Lớp`, `Xóa`. |
| P1 | Class list | `apps/web/components/admin/class/ClassListTableSkeleton.tsx:4`, `apps/web/app/admin/classes/page.tsx:379` | Skeleton `min-w-[400px]`, wrong columns; real table `min-w-[620px]` and action column. |
| P1 | Session history | `apps/web/components/admin/session/SessionHistoryTableSkeleton.tsx:61`, `apps/web/components/admin/session/SessionHistoryTable.tsx:1834` | Skeleton does not model optional bulk-select column used by class/staff details. |
| P2 | Users | `apps/web/app/admin/users/page.tsx:277`, `apps/web/app/admin/users/page.tsx:1056` | Loading is five generic blocks, not mobile cards or desktop table columns. |
| P2 | Dashboard | `apps/web/app/admin/dashboard/page.tsx:439`, `apps/web/app/admin/dashboard/page.tsx:964` | Loading has 5 KPI + 2 panels; loaded state has 6 KPI, filters, finance cards/table, alert groups, quick-view cards. |
| P2 | Wallet direct top-up | `apps/web/app/admin/wallet-direct-topup-requests/page.tsx:345` | Desktop loading uses one `colSpan={7}` bar instead of 7 cell skeletons. |
| P2 | Notification | `apps/web/app/admin/notification/page.tsx:1080` | Skeleton is 3 large blocks; loaded state has grouped `Bản nháp` / `Đã phát` sections with badges. |
| P2 | History | `apps/web/app/admin/history/page.tsx:421`, `apps/web/app/admin/history/page.tsx:962` | Skeleton lacks result count strip before timeline. |

## Admin Operations and Finance Routes

| Priority | Route/component | Evidence | Mismatch |
| --- | --- | --- | --- |
| P1 | Extra allowance role detail | `apps/web/components/admin/extra-allowance/ExtraAllowanceRoleDetailPage.tsx:504`, `:573`, `:763` | Loading uses summary blocks + generic desktop block. Loaded UI has header/action/create/bulk/table with 6 columns. |
| P1 | Costs | `apps/web/components/admin/cost/CostListTableSkeleton.tsx:7`, `apps/web/app/admin/costs/page.tsx:524`, `:617`, `:720` | Skeleton lacks checkbox/action columns, mobile-card shape, and pagination footer. |
| P1 | Deductions | `apps/web/app/admin/deductions/page.tsx:117`, `:208`, `:350` | Settings query does not expose `isLoading`; default `[]` can show empty history before data loads. |
| P1 | Lesson plan detail | `apps/web/app/admin/lesson_plan_detail/[staffId]/page.tsx:320`, `:401`, `:602` | Skeleton has extra meta cards and generic block; loaded UI has summary cards, action/bulk bar, mobile cards, desktop 7-column table. |
| P1 | Lesson plans workspace | `apps/web/components/admin/lesson-plans/LessonOverviewSkeleton.tsx:12`, `apps/web/components/admin/lesson-plans/AdminLessonPlansWorkspace.tsx:286`, `:1363` | Overview and task tab skeletons are generic; task table needs 6 columns/actions. |
| P1 | Lesson plan task detail | `apps/web/app/admin/lesson-plans/tasks/[taskId]/page.tsx:400`, `:445` | Skeleton only hero + 3 cards; loaded state is `lg:grid-cols-3` with outputs/resources/sidebar actions. |
| P1 | Customer care panels | `apps/web/components/customer-care/CustomerCareDetailPanels.tsx:619`, `:844`, `:981`, `:1037` | Text-only “Đang tải…” for students/top-up/commission/session; loaded UI is cards/tables/grids. |
| P1 | Calendar | `apps/web/app/admin/calendar/page.tsx:206`, `:300` | Loading is centered spinner/text; loaded UI is calendar grid or schedule list. |
| P2 | Notes subject regulations | `apps/web/components/admin/notes-subject/RegulationsTabPanel.tsx:66`, `:121` | Skeleton rows do not preserve 5-column table shape. |

## Staff Routes

| Priority | Route/component | Evidence | Mismatch |
| --- | --- | --- | --- |
| P1 | Staff segment fallback | `apps/web/app/staff/loading.tsx:6`, `:20` | Generic filter/table fallback for role dashboards and operations routes. |
| P1 | Re-exported entity routes | `apps/web/app/admin/students/page.tsx:550`, `apps/web/app/admin/staffs/page.tsx:593`, `apps/web/app/admin/classes/page.tsx:283` | `/staff/students`, `/staff/staffs`, `/staff/classes` inherit stale admin list skeletons and wrong row counts. |
| P1 | Staff calendar | `apps/web/app/staff/calendar/page.tsx:178`, `:245` | Spinner/text loading; no calendar board or schedule-list geometry. |
| P1 | Staff class detail | `apps/web/app/staff/classes/[id]/page.tsx:437`, `:474`, `:699`, `:877`, `:902` | Skeleton only covers a small part of real detail page; missing student list, makeup schedule, survey/session regions. |
| P1 | Role/detail branch loading | `apps/web/app/staff/accountant-detail/page.tsx:12`, `:23` and similar role routes | `isAssistant` defaults false while profile loads, so route can briefly show wrong self/admin branch. |
| P1 | Staff lesson plans wrappers | `apps/web/app/staff/lesson-plans/page.tsx:9`, `:22`; `apps/web/app/staff/lesson-plans/tasks/[taskId]/page.tsx:9`, `:18` | Profile/workspace policy loading returns `null`, causing blank initial state. |
| P2 | Staff root | `apps/web/app/staff/page.tsx:946` | Loading fixed to 3 metric blocks + 3 cards; loaded role sections vary by role. |
| P2 | Staff profile | `apps/web/app/staff/profile/page.tsx:534`, `:906`, `:1091`, `:1106` | Initial skeleton under-represents real card count; nested loads use text. |
| P2 | Staff notification | `apps/web/app/staff/notification/page.tsx:85`, `:120`, `:156` | Counts default to `0` while loading; only list body skeleton exists. |
| P2 | Legacy staff aliases | `apps/web/app/staff/lesson-plan-detail/page.tsx:1`, `apps/web/app/staff/lesson-plan-tasks/page.tsx:4` | Re-export aliases inherit target mismatches; redirect aliases intentionally blank but should be documented or given redirect shell. |

## Student, Auth, and Public Routes

| Priority | Route/component | Evidence | Mismatch |
| --- | --- | --- | --- |
| P1 | Student segment loading | `apps/web/app/student/loading.tsx:5`, `apps/web/app/student/page.tsx:467`, `:539`, `:798` | Dashboard skeleton does not match student profile/wallet/class-list UI. |
| P1 | Student inline query loading | `apps/web/app/student/page.tsx:269`, `:462`, `:810`, `:931` | Inline skeleton is generic and differs from route loading; missing refresh strip parity, actions, wallet, class list/table. |
| P1 | Auth login Suspense | `apps/web/app/auth/login/page.tsx:265`, `:133`, `:205` | `fallback={null}` can produce blank auth page while search params suspend. |
| P2 | Reset/setup password Suspense | `apps/web/app/auth/reset-password/page.tsx:168`, `apps/web/app/auth/setup-password/page.tsx:233` | Text-only centered loading does not preserve auth card/logo/form footprint. |
| P2 | Setup password redirect | `apps/web/app/auth/setup-password/page.tsx:61`, `:130` | Returns `null` while redirecting when session missing. |
| P2 | Student access gate | `apps/web/components/student/StudentAccessGate.tsx:47`, `apps/web/app/student/layout.tsx:29` | Centered card skeleton jumps into full sidebar/main shell. |
| P2 | Student sidebar profile | `apps/web/components/student/StudentSidebar.tsx:110`, `:178`, `:315` | Avatar/profile fallback shows `?` instead of loading cue while profile data resolves. |

## Detailed Sync Plan

### Phase 0 - Establish Skeleton Contract

Goal: prevent future drift before changing many files.

Tasks:

1. Document rule in a short code comment or local helper README if needed: initial load skeleton must preserve loaded layout footprint; background refetch uses `QueryRefreshStrip`; empty states render only after loading completes.
2. Choose one shared primitive strategy:
   - `Skeleton` for all bars/shapes.
   - Surface containers use normal `bg-bg-surface` / border classes.
   - Avoid raw `animate-pulse` except where wrapping an entire skeleton group is intentional.
3. Create or standardize small reusable helpers only where they remove real duplication:
   - `DataTableSkeleton` with `columns`, `rows`, `minWidth`, optional checkbox/action columns.
   - `ResponsiveListSkeleton` with mobile-card and desktop-table variants.
   - `AuthCardSkeleton`.
   - `CalendarSkeleton`.
   - `NotificationFeedSkeleton`.

Success criteria:

- New skeletons can express list/table/card layouts without copying stale columns.
- Empty-before-load and `null` loading are explicitly disallowed for data-driven pages.

### Phase 1 - Fix Shared List/Table Skeletons

Goal: remove highest reuse drift affecting both admin and staff.

Tasks:

1. Update `StaffListTableSkeleton` to match `apps/web/app/admin/staffs/page.tsx`:
   - Add `Thành tích`.
   - Match unpaid/action widths.
   - Make delete/action column conditional like loaded UI.
   - Use `PAGE_SIZE` row count where page uses 20.
2. Update `StudentListTableSkeleton` to match `apps/web/app/admin/students/page.tsx`:
   - Remove `Giới tính`, `Trường`.
   - Add `QR`, `Số dư`, `Tiền vào`, `Tỉnh`, `Lớp`, `Xóa`.
   - Match mobile card shape if loading is visible on mobile.
3. Update `ClassListTableSkeleton` to match `apps/web/app/admin/classes/page.tsx`:
   - `min-w-[620px]`.
   - Columns: `Trạng thái`, `Lớp`, `Gia sư`, `Sĩ số`, action.
   - Add mobile card skeleton or use responsive helper.
4. Update `SessionHistoryTableSkeleton`:
   - Add `showBulkSelectionColumn`.
   - Keep `showActionsColumn`.
   - Align with `SessionHistoryTable` colgroup/header variants.
5. Update `CostListTableSkeleton`:
   - Add checkbox/action column variants.
   - Add mobile-card skeleton and pagination/footer skeleton.
6. Split/configure extra allowance skeletons:
   - List view: 8-column table with role/action.
   - Role detail: 6-column table with create/bulk/action bar.

Success criteria:

- Admin and staff list routes no longer shift columns on first load.
- Mobile loading state resembles mobile data state, not desktop table only.

### Phase 2 - Replace Generic Segment Loading

Goal: reduce incorrect flashes from `admin/loading.tsx`, `staff/loading.tsx`, `student/loading.tsx`.

Tasks:

1. Replace `admin/loading.tsx` and `staff/loading.tsx` with a neutral shell fallback:
   - Header/title bars.
   - General content bands/cards.
   - Avoid pretending every route is a table.
2. Add route-specific `loading.tsx` for high-traffic/high-shift routes:
   - `admin/dashboard`
   - `admin/calendar`, `staff/calendar`
   - `admin/students`, `staff/students`
   - `admin/staffs`, `staff/staffs`
   - `admin/classes`, `staff/classes`
   - `admin/lesson-plans`, `staff/lesson-plans`
   - `admin/lesson-plans/tasks/[taskId]`, `staff/lesson-plans/tasks/[taskId]`
   - `student`
3. Rewrite `student/loading.tsx` around actual student profile:
   - Sidebar/main shell if appropriate.
   - Header/avatar/chips/action buttons.
   - Info cards, wallet card, class list mobile/table desktop.

Success criteria:

- Segment fallback is never a misleading table for dashboards/forms/tabs.
- Student route loading and inline query loading share the same shape.

### Phase 3 - Fix Page-Local Loading States

Goal: remove blank/text/spinner/empty-before-load states.

Tasks:

1. Auth:
   - Add shared `AuthCardSkeleton`.
   - Replace login `Suspense fallback={null}`.
   - Replace reset/setup text fallback.
   - Use same shell while setup redirects.
2. Deductions:
   - Expose `isLoading` from settings query.
   - Do not compute empty history from default `[]` until loading completes.
   - Add form/history skeleton.
3. Customer care:
   - Replace “Đang tải…” cards in `CustomerCareDetailPanels` with tab-specific card/table/grid skeletons.
4. Calendar:
   - Add board skeleton for month/week view.
   - Add schedule-list skeleton for list mode.
5. Lesson plans:
   - Replace overview generic skeleton with resource/task sections.
   - Task tab skeleton uses 6 columns.
   - Task detail skeleton preserves `lg:grid-cols-3` hero/output/resource/sidebar layout.
   - Staff wrappers return policy/profile skeleton instead of `null`.
6. Staff profile:
   - Expand initial profile skeleton to real card count.
   - Replace nested “Đang tải…” sections with section skeletons.
7. Notifications:
   - Skeletonize count badges/groups.
   - Do not show `0` while counts are loading.
8. Wallet/history/users/dashboard:
   - Wallet rows use per-cell skeletons.
   - History includes count strip.
   - Users uses responsive card/table skeleton.
   - Dashboard skeleton includes 6 KPI and primary loaded regions.

Success criteria:

- No data route shows blank, centered text-only loading, spinner-only loading, or false empty state while initial query is pending.

### Phase 4 - Role and Route Parity

Goal: keep admin/staff/student variants consistent.

Tasks:

1. Profile-dependent staff role pages:
   - Gate branch choice behind explicit profile loading.
   - Show branch-neutral role skeleton until role is known.
   - Avoid rendering self-page skeleton before switching to admin/staffId variant.
2. Staff class detail:
   - Split by role after profile resolves.
   - Include student list, makeup schedule, session, survey skeleton regions.
3. Legacy aliases:
   - Re-export matching `loading.tsx` where aliases re-export pages.
   - For redirect-only aliases, use a small redirect shell or document intentional blank redirect.
4. Route parity docs:
   - If route behavior or loading strategy changes for admin/staff/student shared domains, update matching route docs under `docs/pages/`.

Success criteria:

- Staff/admin re-export routes do not drift.
- Route aliases have explicit loading behavior.

### Phase 5 - Validation

Recommended checks after implementation:

1. Static checks:
   - `pnpm --filter web lint`
   - `pnpm --filter web exec tsc --noEmit`
2. Browser checks with throttled/mock slow loading:
   - Desktop and mobile screenshots for `/admin/students`, `/admin/staffs`, `/admin/classes`, `/admin/dashboard`, `/admin/calendar`, `/staff`, `/staff/classes/[id]`, `/staff/lesson-plans`, `/student`, `/auth/login`.
   - Verify no text overflows and no large jumps between loading and data state.
3. Route parity spot checks:
   - Compare `/admin/students` vs `/staff/students`.
   - Compare `/admin/classes` vs `/staff/classes`.
   - Compare `/admin/calendar` vs `/staff/calendar`.
4. Regression checklist:
   - Initial load shows skeleton.
   - Background refetch shows `QueryRefreshStrip`.
   - Empty state appears only after loading completes.
   - Mobile skeleton is not desktop-table-only.

## Suggested Implementation Order

1. Shared table skeletons: staff, student, class, session history.
2. Student/auth loading fixes: high user-facing mismatch, contained scope.
3. Calendar and customer-care text/spinner replacements.
4. Deductions and notification false empty/count states.
5. Lesson plans workspace/task detail skeletons.
6. Staff role/profile/class-detail branch loading.
7. Generic segment loading cleanup and docs sync.

This order reduces shared drift first, then removes the most visible blank/wrong states, then cleans route-level fallback behavior.
