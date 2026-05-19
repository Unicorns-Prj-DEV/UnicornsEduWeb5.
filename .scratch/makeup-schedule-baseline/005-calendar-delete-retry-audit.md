# Preserve Google Calendar retry path and audit makeup mutations

Labels: needs-triage
Type: AFK

## What to build

Make makeup schedule deletion and mutation auditing reliable by preserving retry information when Google Calendar delete fails and recording action history for create, update, delete, and resync.

## Acceptance criteria

- [x] Failed Google Calendar delete does not silently lose the only event ID needed for retry.
- [x] Makeup create, update, delete, and resync are recorded in action history.
- [x] Calendar sync status is visible in API responses after failures.
- [x] Tests cover successful delete, failed external delete, and audit side effects.

## Blocked by

- `.scratch/makeup-schedule-baseline/002-backend-time-invariants.md`
