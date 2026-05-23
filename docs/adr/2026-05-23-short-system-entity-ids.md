# ADR: Short System Entity IDs

- **Status:** Accepted
- **Date:** 2026-05-23

## Context

Student, class, and staff IDs appear in URLs, audit filters, SePay transfer notes, QR payloads, and Google Calendar metadata. UUID-length IDs make QR transfer content long enough to be truncated by some banking apps, especially when a student belongs to multiple active classes.

## Decision

Use short generated system IDs for the three primary user-facing entities:

- Student: `UNIST-[0-9a-f]{10}`
- Class: `UNICL-[0-9a-f]{10}`
- Staff: `UNISTAFF-[0-9a-f]{10}`

Existing rows are rotated to fully new IDs generated from `pgcrypto.gen_random_bytes(5)`. The migration does not derive short IDs from old UUIDs. The migration is fix-forward only; no rollback migration is provided.

## Consequences

- Direct database references update through existing `ON UPDATE CASCADE` foreign keys.
- Embedded references in `classes.schedule`, `action_history`, and `student_wallet_sepay_orders.transfer_note` are best-effort backfilled by migration.
- Old API links do not redirect. Operators must treat old `/students/:id`, `/classes/:id`, and `/staffs/:id` links as invalid after rollout.
- Active student QR/VietQR payloads must be reissued after deploy so parents use the new `UNIST-*` and `UNICL-*` tokens.
- Google Calendar external event metadata must be resynced/updated by the rollout runbook or a dedicated script. Do not delete/recreate all Calendar events by default because existing event IDs/attendees are operational state.
