# Domain Docs

This is a single-context monorepo. Before implementing or reviewing domain work, read the source-of-truth docs named in `AGENTS.md`:

- `docs/README.md`
- `docs/Cách làm việc.md`
- `docs/UI-Schema.md`
- `docs/Database Schema.md`
- `docs/pages/`

## Glossary and decisions

- **`CONTEXT.md`** (repo root) — the domain glossary. It is the authority on what a term means. No implementation details live there; if you find any, they belong in a doc under `docs/` instead.
- **`docs/adr/`** — Architecture Decision Records, one file per decision, named `YYYY-MM-DD-<slug>.md`. Read the ones touching your area before changing it; an ADR marked `Accepted` is binding until superseded by a newer ADR.

There is no `CONTEXT-MAP.md` — this repo is single-context on purpose. Do not create per-package `CONTEXT.md` files under `apps/*`.

When you resolve a fuzzy term during a session, write it into `CONTEXT.md` right then. When you make a decision that is hard to reverse, surprising without context, **and** the result of a real trade-off, add an ADR. If any of the three is missing, skip the ADR.

## Vocabulary

`CONTEXT.md` is the full glossary. The terms below appear across docs and UI and are the ones most often paraphrased by mistake:

- `lịch học cố định` / fixed class schedule
- `lịch học bù` / makeup schedule event
- `buổi học` / session
- `gia sư chịu trách nhiệm` / responsible tutor
- `Google Calendar sync`
- `Khoá học` / course — replaced the old `Danh mục lớp` (class category); see `docs/adr/2026-09-05-class-category-becomes-course.md`
- `Lớp không điểm danh` / class with attendance disabled — a flag on **Class**, never on Session; see `docs/adr/2026-09-05-class-without-attendance-still-charges.md`

Do not introduce parallel vocabulary for these concepts unless a PRD or ADR explicitly changes the naming.
