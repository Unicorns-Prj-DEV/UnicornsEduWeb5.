# Fix makeup schedule range and note clearing

Labels: needs-triage
Type: AFK

## What to build

Make class detail makeup schedule management usable for past and current-month events, and allow users to clear notes when editing a makeup event. This should work end-to-end through class detail UI, API payloads, backend persistence, and calendar query invalidation.

## Acceptance criteria

- [x] Class detail makeup schedule list is scoped to the selected month or date range instead of only today through 2100.
- [x] Changing the selected month resets pagination and fetches makeup events for that month.
- [x] Editing a makeup event with an empty note clears the persisted note.
- [x] Calendar-scoped queries are invalidated after create, update, and delete.
- [x] Existing upcoming makeup events remain visible in the appropriate selected month.

## Blocked by

None - can start immediately.
