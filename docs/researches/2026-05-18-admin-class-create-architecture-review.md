# Admin class creation architecture review

Date: 2026-05-18

## Scope

Reviewed the current class-management path around `/admin/classes` and implemented the admin create-class flow cleanup needed for a usable handoff after creation.

## Current shape

- Frontend route: `apps/web/app/admin/classes/page.tsx` lists classes through TanStack Query and opens `AddClassPopup`.
- Create UI: `apps/web/components/admin/class/AddClassPopup.tsx` owns form state, teacher/student search, schedule rows, tuition-package parsing, payload assembly, and fast-close save UX.
- API client: `apps/web/lib/apis/class.api.ts` posts `CreateClassPayload` to `POST /class` through the shared Axios client.
- Backend boundary: `apps/api/src/class/class.controller.ts` exposes `POST /class` behind admin routes with assistant/accountant staff route allowance.
- Backend workflow: `apps/api/src/class/class.service.ts#createClass` writes `classes`, `class_teachers`, operating deduction history, `student_classes`, and `action_history` in one transaction.

## Findings

1. `ClassService` is carrying too many workflows.
   - Evidence: `apps/api/src/class/class.service.ts` is 1,526 lines with 14 async methods covering query, admin mutation, staff access, roster, schedule, delete, calendar sync, tuition mapping, and audit snapshots.
   - Candidate: split by workflow into query, roster, schedule, and mutation/audit services while keeping `ClassService` as a facade.
   - Benefit: smaller test targets, less risk when changing schedule or roster rules, clearer ownership for future class-domain work.

2. Admin class frontend has large stateful surfaces.
   - Evidence: `/admin/classes/[id]/page.tsx` is 1,035 lines, `AddClassPopup.tsx` is 735 lines, `EditClassPopup.tsx` is 1,111 lines.
   - React Doctor also flags `AdminClassesPage` / `AddClassDialog` as giant components, and `AddClassDialog` has 16 `useState` calls.
   - Candidate: move payload building and form-state transforms into focused class form helpers/hooks; keep page components mostly composition and routing.
   - Benefit: form validation can be unit-tested without rendering the full page, and visual changes stop touching business payload assembly.

3. Class cache keys were partly ad hoc.
   - Evidence: list/detail keys were repeated as raw arrays across page and popup code.
   - Change made: added `classKeys` to `apps/web/lib/query-keys.ts` and used it in the admin list/create/delete path.
   - Next candidate: migrate remaining class edit popups to `classKeys` in a follow-up sweep.

4. Create-schedule semantics are weaker than update-schedule semantics.
   - Evidence: class creation accepts schedule entries without `teacherId`; schedule update requires each slot to have one assigned class teacher and then syncs Google Calendar.
   - Decision needed later: keep create schedule as provisional metadata, or require teacher-per-slot during creation and sync recurring Google Calendar immediately.

5. DTO contracts are duplicated across frontend and backend.
   - Evidence: `apps/web/dtos/class.dto.ts` mirrors snake_case payloads while backend DTO validation lives in `apps/api/src/dtos/class.dto.ts`; normalization also exists in `class.api.ts`.
   - Candidate: create a class contract adapter module for frontend request/response normalization, then keep page/components on camelCase view models.
   - Benefit: fewer snake_case leaks into UI code and safer API evolution.

## Implemented change

- Admin class create now seeds `class/detail/:id` cache with the created class.
- Admin class create invalidates the normalized class list key through `classKeys.lists()`.
- Admin class create redirects to `/admin/classes/:id` after backend success, preserving existing fast-close toast behavior.
- `docs/pages/admin.md` now records this create-class behavior.

## Verification targets

- `pnpm --filter web exec tsc --noEmit`
- Focused frontend lint if available.
- `npx -y react-doctor@latest . --verbose --diff`
- Manual browser check on `/admin/classes`: create button opens popup, submit valid data, success toast appears, route changes to class detail.
