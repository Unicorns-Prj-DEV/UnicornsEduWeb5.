# Issue 04: Status filters and confirmation UX

## Type

AFK

## Blocked by

Issues 02, 03

## User stories covered

1, 2, 3, 4, 5, 13, 16, 17, 18, 19, 29

## What to build

Expose status as a first-class admin list filter for students and staff, and make status changes deliberate through confirmation UX, Sonner toasts, and correct React Query invalidation.

## Acceptance criteria

- [x] Student list URL state, query key, and API params include `status`.
- [x] Staff list URL state, query key, and API params include `status`.
- [x] Student and staff detail/edit flows show clear Vietnamese labels.
- [x] Inactive transitions show confirmation copy describing operational impact.
- [x] Successful transitions invalidate relevant list/detail/session queries and show Sonner success toasts.
- [x] Targeted ESLint passes for touched web code; full web typecheck/lint is blocked by unrelated existing `MakeupScheduleCard.tsx` errors.
