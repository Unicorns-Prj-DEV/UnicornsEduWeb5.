# Loading Skeleton Parity - Proposed Issues

Source: `.scratch/loading-skeleton-parity-audit-2026-05-20.md`

Status: Draft for review. Do not publish until approved.

## User Stories

- US1: As an admin/staff operator, when a management list loads, the skeleton should match the final table/card shape so columns and actions do not jump.
- US2: As an admin/staff operator, when a detail or operations page loads, I should see the same major regions that will appear after data arrives.
- US3: As a student/auth user, I should not see blank screens or dashboard-shaped placeholders that do not match my actual page.
- US4: As any user, initial loading should show a skeleton, background refetch should use `QueryRefreshStrip`, and empty states should only appear after loading completes.

## Proposed Breakdown

1. **Title**: Sync student management list skeletons across admin/staff
   - **Type**: AFK
   - **Blocked by**: None - can start immediately
   - **User stories covered**: US1, US4
   - **What to build**: Update the student list loading path so `/admin/students` and `/staff/students` show mobile cards and desktop columns matching the loaded student table, including QR, balance/top-up, province, class, and delete/action cells.
   - **Acceptance criteria**:
     - [ ] Student list skeleton columns match the loaded desktop table in `apps/web/app/admin/students/page.tsx`.
     - [ ] Mobile loading state matches the mobile student card list shape.
     - [ ] Skeleton row/card count uses the same page-size intent as the loaded route or an explicitly documented reduced placeholder count.
     - [ ] `/admin/students` and `/staff/students` share the same corrected behavior.

2. **Title**: Sync staff management list skeletons across admin/staff
   - **Type**: AFK
   - **Blocked by**: None - can start immediately
   - **User stories covered**: US1, US4
   - **What to build**: Update staff list loading so `/admin/staffs` and `/staff/staffs` preserve the loaded table shape, including `Thành tích`, unpaid summary, conditional delete/action behavior, and mobile card parity.
   - **Acceptance criteria**:
     - [ ] Staff list skeleton has the same visible columns and relative widths as the loaded table.
     - [ ] Delete/action column is represented only where the loaded UI can show it.
     - [ ] Mobile loading state matches staff mobile cards.
     - [ ] `/admin/staffs` and `/staff/staffs` remain route-parity aligned.

3. **Title**: Sync class list and session-history skeleton variants
   - **Type**: AFK
   - **Blocked by**: None - can start immediately
   - **User stories covered**: US1, US2, US4
   - **What to build**: Update class list loading for `/admin/classes` and `/staff/classes`, and update `SessionHistoryTableSkeleton` to model optional action and bulk-selection columns used by class/staff detail pages.
   - **Acceptance criteria**:
     - [ ] Class list skeleton uses the loaded class table columns and `min-w` shape.
     - [ ] Mobile class loading matches loaded mobile cards.
     - [ ] `SessionHistoryTableSkeleton` supports bulk-selection and actions without shifting loaded columns.
     - [ ] Admin and staff class routes share the same corrected loading behavior.

4. **Title**: Sync finance table skeletons for costs and extra allowances
   - **Type**: AFK
   - **Blocked by**: None - can start immediately
   - **User stories covered**: US1, US2, US4
   - **What to build**: Update cost list and extra allowance loading states so selection/action columns, mobile cards, pagination, role-detail action bars, and list/detail column variants match the loaded finance views.
   - **Acceptance criteria**:
     - [ ] `CostListTableSkeleton` includes checkbox/action variants and mobile-card loading.
     - [ ] Cost loading includes pagination/footer shape where the loaded UI shows it.
     - [ ] Extra allowance list and role-detail skeletons use separate or configurable column/action shapes.
     - [ ] Admin and staff finance routes inherit the same corrected parity.

5. **Title**: Fix student and auth initial loading parity
   - **Type**: AFK
   - **Blocked by**: None - can start immediately
   - **User stories covered**: US3, US4
   - **What to build**: Replace the generic `/student` dashboard skeleton and auth blank/text fallbacks with skeletons matching the real student profile/wallet/class-list page and auth card forms.
   - **Acceptance criteria**:
     - [ ] `apps/web/app/student/loading.tsx` matches student profile, wallet, and class-list layout.
     - [ ] Student inline query loading reuses the same shape as route loading.
     - [ ] Login Suspense no longer uses `fallback={null}`.
     - [ ] Reset/setup-password fallbacks and setup redirect preserve the auth card footprint.

6. **Title**: Add calendar board/list loading skeletons for admin and staff
   - **Type**: AFK
   - **Blocked by**: None - can start immediately
   - **User stories covered**: US2, US4
   - **What to build**: Replace calendar spinner/text loading with skeletons matching `CalendarView` and `CalendarScheduleList` for both admin and staff calendar routes.
   - **Acceptance criteria**:
     - [ ] Month/week calendar board loading reserves grid geometry.
     - [ ] Schedule/list loading reserves list row geometry.
     - [ ] Admin and staff calendar routes share the same skeleton strategy.
     - [ ] No centered spinner/text-only initial loading remains on calendar routes.

7. **Title**: Replace customer-care text loading with tab-specific skeletons
   - **Type**: AFK
   - **Blocked by**: None - can start immediately
   - **User stories covered**: US2, US4
   - **What to build**: Replace “Đang tải…” cards inside `CustomerCareDetailPanels` with card/table/grid skeletons for students, top-up history, commissions, and session commissions.
   - **Acceptance criteria**:
     - [ ] Each customer-care tab has a loading state matching its loaded card/table/grid layout.
     - [ ] No tab body uses text-only loading for initial data.
     - [ ] Admin and staff customer-care routes inherit the same behavior.
     - [ ] Empty states appear only after the relevant query finishes loading.

8. **Title**: Prevent false empty/count states in deductions and notifications
   - **Type**: AFK
   - **Blocked by**: None - can start immediately
   - **User stories covered**: US2, US4
   - **What to build**: Add explicit loading handling where current pages render default empty arrays or `0` counts before data arrives.
   - **Acceptance criteria**:
     - [ ] Deductions settings query exposes and uses loading state.
     - [ ] Deductions history does not show “Chưa có lịch sử” until loading completes.
     - [ ] Staff/admin notification counts do not show false `0` while loading.
     - [ ] Notification list/group skeletons preserve badge/group shape.

9. **Title**: Sync lesson-plan workspace and task-detail skeletons
   - **Type**: AFK
   - **Blocked by**: None - can start immediately
   - **User stories covered**: US2, US4
   - **What to build**: Replace generic lesson-plan overview/task skeletons and staff wrapper `null` states with skeletons matching resource/task sections, task tables, and task-detail grid layout.
   - **Acceptance criteria**:
     - [ ] Lesson-plan overview skeleton matches resource and task sections.
     - [ ] Task tab skeleton matches the loaded 6-column task table and actions.
     - [ ] Task detail skeleton preserves the loaded `lg:grid-cols-3` shell.
     - [ ] Staff lesson-plan wrappers show policy/profile loading skeletons instead of returning `null`.

10. **Title**: Fix staff role/profile/class-detail branch loading
    - **Type**: AFK
    - **Blocked by**: None - can start immediately
    - **User stories covered**: US2, US4
    - **What to build**: Gate staff role/detail branch selection behind explicit profile loading and expand profile/class-detail skeletons to include the loaded regions.
    - **Acceptance criteria**:
      - [ ] Role/detail routes do not render the wrong self/admin branch while profile is unresolved.
      - [ ] Staff class detail skeleton includes student list, makeup schedule, session, and survey regions.
      - [ ] Staff profile nested loading sections use shape-preserving skeletons instead of text-only loading.
      - [ ] Legacy alias routes either re-export matching loading behavior or use an explicit redirect shell.

11. **Title**: Clean up segment-level loading strategy and route docs
    - **Type**: HITL
    - **Blocked by**: Issues 1-10
    - **User stories covered**: US1, US2, US3, US4
    - **What to build**: Decide and apply the final segment-level fallback policy after route-specific skeletons exist: neutral shell fallback, route-specific `loading.tsx`, or both. Update route docs if admin/staff/student parity behavior changes.
    - **Acceptance criteria**:
      - [ ] `admin/loading.tsx` and `staff/loading.tsx` no longer pretend every route is a generic table.
      - [ ] `student/loading.tsx` remains aligned with the student route after issue 5.
      - [ ] Route docs under `docs/pages/` are updated if route parity or loading behavior changes.
      - [ ] Human confirms the final fallback policy is acceptable.

## Review Questions

1. Does this granularity feel right, or should any issue be split/merged?
2. Are the dependency relationships correct? Right now only the final segment strategy is blocked by previous route fixes.
3. Should issue 11 remain HITL, or should it be AFK with the neutral fallback policy from the audit?
4. Should these be published as local markdown issues under `.scratch/` with `needs-triage` once approved?
