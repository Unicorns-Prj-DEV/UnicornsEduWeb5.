# Issue 03: Staff status transition and assignment guards

## Type

AFK

## Blocked by

Issue 01

## User stories covered

16, 18, 19, 20, 21, 22, 23, 24, 25, 28, 31, 32

## What to build

Add an explicit admin-only command for switching staff profile status and enforce active-only staff eligibility for new operational assignments. Historical assignments remain intact for audit, finance, and reporting.

## Acceptance criteria

- [x] Staff status transition endpoint/service requires full admin permissions.
- [x] Marking staff inactive updates `StaffInfo.status` without deleting historical assignments.
- [x] Status transition invalidates linked auth/access cache when a linked user exists.
- [x] Staff option endpoints used for active assignment return active staff by default.
- [x] Class teacher, CSKH, assistant manager, lesson task, and allowance assignment paths reject inactive staff IDs.
- [x] Staff/class/lesson service tests cover inactive staff exclusion and rejection.
