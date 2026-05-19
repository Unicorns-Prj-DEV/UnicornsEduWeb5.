# Enforce backend makeup schedule time invariants

Labels: needs-triage
Type: AFK

## What to build

Reject invalid makeup schedule time ranges at the backend boundary for create and update, matching the fixed schedule baseline behavior where start time must be before end time.

## Acceptance criteria

- [x] Creating a makeup event rejects `endTime <= startTime`.
- [x] Updating a makeup event rejects `endTime <= startTime`, including partial updates where only one side changes.
- [x] Error messages are actionable and consistent with existing Vietnamese validation style.
- [x] Tests cover create and update rejection behavior.

## Blocked by

None - can start immediately.
