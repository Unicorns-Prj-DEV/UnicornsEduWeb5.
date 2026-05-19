# Link makeup events to fixed schedule baseline metadata

Labels: needs-triage
Type: AFK

## What to build

Treat each new makeup schedule event as an override of a fixed class schedule occurrence by persisting baseline metadata and validating that the selected baseline belongs to the class.

## Acceptance criteria

- [x] Makeup events can store the fixed schedule entry identifier they are based on.
- [x] Makeup events can store the original occurrence date being made up.
- [x] Create rejects a baseline entry that is missing from the class schedule.
- [x] Create pre-fills teacher and time from the baseline when the frontend selects an occurrence.
- [x] Legacy makeup events without baseline metadata remain readable and editable.

## Blocked by

- `.scratch/makeup-schedule-baseline/001-range-and-note-clearing.md`
- `.scratch/makeup-schedule-baseline/002-backend-time-invariants.md`
