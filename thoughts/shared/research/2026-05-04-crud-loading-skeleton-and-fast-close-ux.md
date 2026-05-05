---
date: 2026-05-04T21:53:34+0700
researcher: sunny
git_commit: ae1ccf1
branch: fix/api-auth-multi-device-session
repository: UnicornsEduWeb5.
topic: "CRUD loading skeletons and fast-close save UX for classes, staff, and students"
tags: [research, codebase, frontend, tanstack-query, skeletons, crud, classes, staff, students]
status: complete
last_updated: 2026-05-04
last_updated_by: sunny
---

# Research: CRUD loading skeletons and fast-close save UX for classes, staff, and students

**Date**: 2026-05-04T21:53:34+0700  
**Researcher**: sunny  
**Git Commit**: ae1ccf1  
**Branch**: fix/api-auth-multi-device-session  
**Repository**: UnicornsEduWeb5.

## Research Question

Current UX should make users feel less blocked by slow queries. Specifically: add loading skeletons, and make CRUD forms for classes, staff, and students close immediately after Save instead of waiting for the response.

## Summary

The relevant frontend code lives under `apps/web/app/admin/**`, `apps/web/app/staff/**`, `apps/web/app/student/page.tsx`, and shared components under `apps/web/components/admin/{class,staff,student}`. Staff list/detail routes for classes, staff, and students mostly re-export admin pages, so admin route changes flow into staff mirror pages unless the staff route has its own implementation.

Current loading behavior already includes list skeletons for class, staff, and student list pages, plus inline pulse skeletons for class detail, staff detail, student detail, student self-service, and session history tables. There are no route-level `loading.tsx` files for the class/staff/student route groups.

Current mutation behavior is mixed. Most CRUD popups wait for `mutateAsync`, invalidation, and sometimes callback work before closing. `EditClassSchedulePopup` is the notable existing fast-close pattern: it validates, calls `onClose()`, then fires `updateMutation.mutate(...)`.

## Detailed Findings

### Route Parity

- `apps/web/app/staff/classes/page.tsx` re-exports `apps/web/app/admin/classes/page.tsx`, so the staff class list uses the admin list page.
- `apps/web/app/staff/staffs/page.tsx` and `apps/web/app/staff/staffs/[id]/page.tsx` re-export admin staff routes.
- `apps/web/app/staff/students/page.tsx` and `apps/web/app/staff/students/[id]/page.tsx` re-export admin student routes.
- `apps/web/app/staff/classes/[id]/page.tsx` has its own staff-ops detail page, but assistant and accountant-without-teacher cases fall back to `AdminClassDetailPage`.

### Existing Skeletons

- `apps/web/components/ui/skeleton.tsx` defines the shared `Skeleton` primitive.
- `apps/web/components/admin/class/ClassListTableSkeleton.tsx` is used by `apps/web/app/admin/classes/page.tsx` while the class list query is loading.
- `apps/web/components/admin/staff/StaffListTableSkeleton.tsx` is used by `apps/web/app/admin/staffs/page.tsx` while the staff list query is loading.
- `apps/web/components/admin/student/StudentListTableSkeleton.tsx` is used by `apps/web/app/admin/students/page.tsx` while the student list query is loading.
- `apps/web/components/admin/session/SessionHistoryTableSkeleton.tsx` is reused by class and staff detail pages for session history loading.
- `apps/web/app/admin/classes/[id]/page.tsx`, `apps/web/app/staff/classes/[id]/page.tsx`, `apps/web/app/admin/staffs/[id]/page.tsx`, `apps/web/app/admin/students/[id]/page.tsx`, and `apps/web/app/student/page.tsx` use inline `animate-pulse` blocks for initial detail loading.
- No route-local `loading.tsx` files were found under `apps/web/app/admin/{classes,staffs,students}`, `apps/web/app/staff/{classes,staffs,students}`, or `apps/web/app/student`.

### Class CRUD Save Behavior

- `apps/web/components/admin/class/AddClassPopup.tsx` uses `classApi.createClass`; `onSuccess` awaits `invalidateQueries(["class","list"])`, then toasts, resets, and closes.
- `apps/web/components/admin/class/EditClassBasicInfoPopup.tsx` awaits `updateMutation.mutateAsync(payload)`, then toasts and closes.
- `apps/web/components/admin/class/EditClassTeachersPopup.tsx` awaits `updateMutation.mutateAsync({ teachers })`, then toasts and closes.
- `apps/web/components/admin/class/EditClassStudentsPopup.tsx` awaits `updateMutation.mutateAsync({ students })`, then toasts and closes.
- `apps/web/components/admin/class/AddSessionPopup.tsx` closes in mutation `onSuccess` after invalidating session queries, toasting, and calling `onCreated`.
- `apps/web/components/admin/class/EditClassSchedulePopup.tsx` validates, calls `onClose()` first, then calls `updateMutation.mutate({ schedule })`; success invalidates and toasts after the dialog has already closed.
- `apps/web/components/staff/StaffCreateClassPopup.tsx` exists and uses `staffOpsApi.createClass`, but `/staff/classes` currently re-exports the admin class list page and does not mount this popup.

### Staff CRUD Save Behavior

- `apps/web/components/admin/staff/AddTutorPopup.tsx` awaits `createMutation.mutateAsync`, optionally awaits CCCD upload, awaits `onCreated`, toasts, and closes.
- `apps/web/components/admin/staff/EditStaffPopup.tsx` awaits `updateMutation.mutateAsync`, optionally awaits CCCD upload and extra invalidations, then toasts and closes.
- `apps/web/components/staff/StaffSelfEditPopup.tsx` awaits sequential profile/staff/upload mutations, then awaits multiple invalidations, awaits optional `onSuccess`, toasts, and closes.
- Admin/staff staff list deletion awaits `deleteMutation.mutateAsync` before closing the confirmation dialog.

### Student CRUD Save Behavior

- `apps/web/components/admin/student/AddStudentPopup.tsx` closes in mutation `onSuccess` after invalidating the student list, awaiting `onCreated`, and toasting.
- `apps/web/components/admin/student/EditStudentPopup.tsx` awaits student update, awaits exam schedule update, awaits multiple invalidations, dispatches `calendar:refetch`, awaits optional `onSuccess`, toasts, and closes.
- `apps/web/components/admin/student/EditStudentClassesPopup.tsx` awaits class membership update before toasting and closing.
- `apps/web/components/admin/student/StudentBalancePopup.tsx` awaits balance mutation before toasting and closing; it blocks close while pending.
- `apps/web/components/admin/student/StudentClassTuitionPopup.tsx` uses `updateMutation.mutate(undefined, { onSuccess })`; the dialog closes in the per-call `onSuccess`, after the response.
- `apps/web/app/student/page.tsx` self-profile editing uses `updateStudentProfileMutation.mutate(...)`; on success it patches query data, invalidates self detail, sets edit mode false, and toasts.

### Query and Invalidation Patterns

- Class list query key: `["class", "list", page, PAGE_SIZE, search]`.
- Class detail query key: `["class", "detail", id]`; class sessions key: `["sessions", "class", id, year, month]`.
- Staff list query uses `keepPreviousData` and a key including page, search, province, school, role, and class filter.
- Student list query key includes page, search, gender, province, school, and class filter.
- Staff class detail owns `staffOpsKeys` for staff-scoped class detail, list, sessions, schedule update, create session, and update session.
- Invalidation is mostly direct `queryClient.invalidateQueries(...)`, often grouped with `Promise.all`.

## Code References

- `apps/web/app/admin/classes/page.tsx` - class list query, list skeleton, create/delete popup wiring.
- `apps/web/app/admin/classes/[id]/page.tsx` - admin class detail query, detail skeletons, class CRUD popups, session skeleton.
- `apps/web/app/staff/classes/[id]/page.tsx` - staff-specific class detail, staff-ops query keys and mutations.
- `apps/web/app/admin/staffs/page.tsx` - staff list query, skeleton, delete dialog.
- `apps/web/app/admin/staffs/[id]/page.tsx` - staff detail query, edit popup, detail skeletons.
- `apps/web/app/admin/students/page.tsx` - student list query, skeleton, delete dialog.
- `apps/web/app/admin/students/[id]/page.tsx` - student detail query, edit/class/balance/tuition popups, detail skeleton.
- `apps/web/app/student/page.tsx` - student self-service query, profile edit mutation, self page skeleton.
- `apps/web/components/admin/class/AddClassPopup.tsx` - class create form.
- `apps/web/components/admin/class/EditClassBasicInfoPopup.tsx` - class basic info edit form.
- `apps/web/components/admin/class/EditClassSchedulePopup.tsx` - existing fast-close schedule form pattern.
- `apps/web/components/admin/class/EditClassTeachersPopup.tsx` - class teachers edit form.
- `apps/web/components/admin/class/EditClassStudentsPopup.tsx` - class students edit form.
- `apps/web/components/admin/class/AddSessionPopup.tsx` - session create form in class detail.
- `apps/web/components/admin/staff/AddTutorPopup.tsx` - staff create form.
- `apps/web/components/admin/staff/EditStaffPopup.tsx` - staff edit form.
- `apps/web/components/staff/StaffSelfEditPopup.tsx` - staff self edit form.
- `apps/web/components/admin/student/AddStudentPopup.tsx` - student create form.
- `apps/web/components/admin/student/EditStudentPopup.tsx` - student edit form and exam schedule save.
- `apps/web/components/admin/student/EditStudentClassesPopup.tsx` - student class membership edit form.
- `apps/web/components/admin/student/StudentBalancePopup.tsx` - student balance mutation popup.
- `apps/web/components/admin/student/StudentClassTuitionPopup.tsx` - per-class student tuition popup.

## Architecture Documentation

- Frontend server state is handled with TanStack Query and Axios through `apps/web/lib/client.ts`.
- CRUD pages use route-local query keys rather than a single class/staff/student query-key factory.
- Staff mirror routes often reuse admin pages through re-export, preserving route-base behavior via `apps/web/lib/admin-shell-paths.ts`.
- Loading states are implemented component-locally, either with specific table skeleton components or inline pulse blocks.
- Success toasts use Sonner; `<Toaster richColors position="top-right" />` is mounted in `apps/web/app/providers.tsx`.

## Historical Context (from thoughts/)

- `thoughts/shared/research/2026-04-29-rerender-and-data-fetching-patterns.md` documents broad React Query/refetch and shell rerender behavior, including invalidation sources and query bridges.
- `thoughts/shared/plans/2026-04-29-rerender-and-data-fetching-optimization-plan.md` plans scoped invalidation and reduced redundant refetch behavior.
- `thoughts/shared/plans/2026-04-29-be-authoritative-uuid-generation.md` includes class/student CRUD popup flows as part of frontend contract cleanup.
- `thoughts/shared/plans/2026-05-01-fix-staff-unpaid-summary-rules.md` covers staff/classes domain behavior around unpaid summary rules.

## Related Research

- `thoughts/shared/research/2026-04-29-rerender-and-data-fetching-patterns.md`

## Open Questions

- Should fast-close apply to all successful Save attempts after client-side validation, including create flows that return a new ID, or only to edit flows where the current page already exists?
- After fast-close, should the existing page keep stale data until invalidation completes, show subtle section-level refreshing skeletons, or apply optimistic cache updates for the edited entity?
- Should delete confirmation dialogs also close immediately after confirmation, or should they keep the current existing blocking pattern?
