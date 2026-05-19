# Align teacher self-service edit and delete rules

Labels: needs-triage
Type: AFK

## What to build

Allow a teacher who can create a makeup event for their own class to also edit or delete their own safe, unlinked makeup event, while keeping elevated permissions for admins and assistants.

## Acceptance criteria

- [x] Teacher self-service edit is allowed only when the event belongs to the actor teacher.
- [x] Teacher self-service delete is allowed only when the event belongs to the actor teacher and is safe to remove.
- [x] Staff without teacher ownership cannot mutate unrelated makeup events.
- [x] UI edit/delete buttons match backend permissions.
- [x] Permission tests cover admin, assistant, teacher owner, and unrelated staff.

## Blocked by

- `.scratch/makeup-schedule-baseline/001-range-and-note-clearing.md`
