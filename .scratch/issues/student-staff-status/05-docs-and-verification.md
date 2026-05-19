# Issue 05: Documentation and verification

## Type

AFK

## Blocked by

Issues 01, 02, 03, 04

## User stories covered

31, 32

## What to build

Synchronize project docs with the implemented status semantics and run targeted backend/frontend verification.

## Acceptance criteria

- [x] `docs/Database Schema.md` documents `StudentInfo.status` and `StaffInfo.status` operational semantics.
- [x] Page docs describe admin status filtering/actions and inactive workspace access behavior.
- [x] Relevant backend unit specs pass.
- [x] Targeted frontend lint checks pass; full web typecheck/lint is blocked by unrelated existing `MakeupScheduleCard.tsx` errors.
- [x] Manual smoke note: no browser run; UI changes are list filters/edit confirmations only and were covered by targeted lint plus code inspection.
