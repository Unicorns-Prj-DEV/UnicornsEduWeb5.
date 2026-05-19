# Issue 02: Student status transition and roster side effects

## Type

AFK

## Blocked by

Issue 01

## User stories covered

1, 3, 4, 5, 6, 7, 8, 9, 12, 28, 29, 31, 32

## What to build

Add an explicit admin-only command for switching a student profile between `active` and `inactive`. Marking a student inactive closes currently active class memberships in the same backend operation. Reactivating a student only reopens the profile; it does not restore old class memberships.

## Acceptance criteria

- [x] Student status transition endpoint/service requires full admin permissions.
- [x] Marking a student inactive updates `StudentInfo.status` and deactivates active class memberships transactionally.
- [x] Marking a student active updates only `StudentInfo.status`; historical memberships stay inactive.
- [x] Status transition invalidates linked auth/access cache when a linked user exists.
- [x] Student service tests cover transition side effects and cache invalidation.
- [x] Docs describe student profile status semantics and the difference from class membership status.
