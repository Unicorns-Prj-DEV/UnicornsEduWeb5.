# Issue 01: Profile status policy and workspace access

## Type

AFK

## Blocked by

None - can start immediately

## User stories covered

15, 26, 27, 28, 30, 31, 32

## What to build

Make student/staff profile status an explicit backend policy. Inactive student profiles must not resolve student workspace access. Inactive staff profiles must not resolve staff workspace access or staff-derived admin access. User account status remains the separate global login/session lock.

## Acceptance criteria

- [x] Backend exposes a central status policy/helper for active student/staff eligibility and stable error reasons.
- [x] Auth access resolution selects profile status and ignores inactive student/staff profiles for workspace access.
- [x] Inactive staff profiles do not grant staff workspace or admin-through-staff access.
- [x] Inactive student profiles do not grant student workspace access.
- [x] Existing inactive `users.status` behavior remains unchanged.
- [x] Auth access tests cover active and inactive student/staff profiles.
