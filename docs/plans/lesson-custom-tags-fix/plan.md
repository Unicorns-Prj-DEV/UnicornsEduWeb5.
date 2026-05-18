# Lesson Custom Tags Fix Plan

## Goal

Fix the lesson-plan tag flow so custom tags are reliably persisted and discoverable:

- A custom tag typed in the picker must be included in the submitted `tags` payload when the user submits the form.
- Saved lesson output tags must be matched by the `workTag` backend filter.
- The app must clearly document the remaining scope: custom tag suggestions are currently browser-local unless a backend tag-catalog endpoint is added later.

## Current Findings

1. `LessonTagPicker` only commits a custom tag when the user presses Enter or clicks `Thêm tag mới`.
   - A user can type a custom value, click form submit, and lose the typed value because forms submit only `selectedTags`.
   - Affected submitters:
     - `apps/web/components/admin/lesson-plans/LessonResourceFormPopup.tsx`
     - `apps/web/components/admin/lesson-plans/LessonOutputEditorForm.tsx`

2. `GET /lesson-work` does not filter by the saved JSON `tags` field.
   - `apps/api/src/lesson/lesson.service.ts` parses `query.tag`, but only searches `lessonName` and `contestUploaded`.
   - This makes a saved tag look missing when users filter by that tag.

3. The custom tag catalog is local-only.
   - `LessonTagPicker` stores custom suggestions in `window.localStorage` key `lesson.custom-tags.v1`.
   - Actual selected tags are persisted on `lesson_resources.tags` and `lesson_outputs.tags`.
   - Cross-browser/shared tag suggestions are not supported by the current data model.

## Constraints

- Keep backend business truth in API. Frontend may normalize UI tag entry, but saved/filterable state must be handled by API/DB.
- Do not introduce a new tag table in this fix. That would broaden schema, migrations, permissions, API contracts, and route docs.
- Preserve current user UX: grouped preset tags, local `KHÁC` group, Enter/button creation.
- Keep admin/staff lesson routes behavior in parity because both use the shared lesson workspace/components.

## Implementation Plan

### 1. Make custom tag commit explicit in the shared picker

File: `apps/web/components/admin/lesson-plans/LessonTagPicker.tsx`

- Extend the component API with an optional imperative handle or explicit callback-safe commit contract.
- Preferred implementation:
  - Convert `LessonTagPicker` to `forwardRef`.
  - Expose `commitPendingTag(): string | null`.
  - `commitPendingTag` should:
    - normalize current `search` text with existing `normalizeTagText`;
    - ignore blank values;
    - no-op if the normalized text is already selected case-insensitively;
    - append it to `value` through `onChange`;
    - save it to local custom suggestions when it is not one of `ALL_TAGS`;
    - clear `search`;
    - return the committed tag or `null`.
- Reuse this method from `addCustomFromSearch` so Enter, click, and parent submit use exactly the same logic.
- Keep the existing button label `Thêm tag mới: ...`.

Reasoning:

- This avoids duplicating picker internals in each form.
- The pending input remains controlled by the picker, while parent forms can flush it before reading selected tags.

### 2. Flush pending tags before resource form submit

File: `apps/web/components/admin/lesson-plans/LessonResourceFormPopup.tsx`

- Create `const tagPickerRef = useRef<LessonTagPickerHandle>(null)`.
- Pass it into `<LessonTagPicker ref={tagPickerRef} ... />`.
- At the start of `handleSubmit`, call `const pendingTag = tagPickerRef.current?.commitPendingTag()`.
- Build submitted tags from current `selectedTags` plus `pendingTag`, deduped case-insensitively.
- Submit that final array in `tags`.

Edge cases:

- If user typed an existing preset tag but did not click it, submitting should include it as a selected tag.
- If user typed a duplicate with different casing, preserve the already-selected value and do not add a duplicate.

### 3. Flush pending tags before lesson output submit

File: `apps/web/components/admin/lesson-plans/LessonOutputEditorForm.tsx`

- Use the same `LessonTagPickerHandle`.
- Flush the pending picker text before calculating `enrichedTags`.
- Build `enrichedTags` from:
  - final selected tags;
  - `Checker` when checked;
  - `Code` when checked;
  - all deduped case-insensitively.

Regression target:

- In taskless “Thêm bài mới”, typing a new custom tag then clicking submit must persist it without requiring Enter/click inside the picker first.

### 4. Fix backend `workTag` filtering against JSON tags

File: `apps/api/src/lesson/lesson.service.ts`

- Update `buildLessonWorkWhere` tag block.
- Keep current text fallback search for `lessonName` and `contestUploaded`.
- Add JSON array containment conditions against `tags`.
- For PostgreSQL Prisma JSON arrays, use:

```ts
{ tags: { array_contains: [tag] } }
```

- Use an `OR` across all tag terms and all searchable fields.
- Keep comma/semicolon parsing.

Expected shape:

```ts
OR: tagTerms.flatMap((tag) => [
  { tags: { array_contains: [tag] } },
  { lessonName: { contains: tag, mode: "insensitive" } },
  { contestUploaded: { contains: tag, mode: "insensitive" } },
])
```

Notes:

- Context7 Prisma docs confirm PostgreSQL JSON `array_contains` expects an array even when matching one scalar string.
- Prisma JSON containment is exact/case-sensitive for the array value. This is acceptable for first fix because saved tags preserve UI casing. If case-insensitive tag filtering is required later, add normalized tag storage or a proper tag relation.

### 5. Add focused backend tests

File: `apps/api/src/lesson/lesson.service.spec.ts`

Add or update tests around `getWorkBoard`/lesson work filtering:

- When `tag: "graph"` is provided, `lessonOutput.count`, aggregate, and `findMany` receive a `where` containing `tags: { array_contains: ["graph"] }`.
- When multiple tags are provided (`"graph, dp"`), backend builds OR conditions for both JSON tag matches.
- Keep existing search behavior for `lessonName`/`contestUploaded` as fallback.

Why backend tests first:

- The current regression is observable at API filter level.
- Existing service tests already cover create/update persistence of tags.

### 6. Add lightweight frontend tests if local test stack supports it

The web app currently has `.test.mjs` utility tests but no established React Testing Library setup for components. Prefer not adding a new test stack in this fix.

If staying within current stack:

- Add a small pure helper export from `LessonTagPicker` for case-insensitive dedupe/commit calculation only if it does not leak UI internals.
- Test that helper with a `.test.mjs` file.

If no clean pure-helper seam exists:

- Skip FE unit test and rely on typecheck plus manual browser verification.
- Do not add React Testing Library just for this patch.

### 7. Update docs

Files:

- `docs/pages/admin.md`
- `docs/README.md` if route summary wording changes
- `docs/CHANGELOG.md` when preparing the implementation commit

Doc updates:

- Clarify that typed custom tags are committed on form submit as well as Enter/button.
- Clarify `workTag` filters saved output `tags` plus legacy text fallback.
- Keep note that custom suggestion catalog remains browser-local (`localStorage`) unless a future backend catalog is implemented.

### 8. Verification Commands

Run after implementation:

```bash
pnpm --dir apps/api test -- src/lesson/lesson.service.spec.ts --runInBand
pnpm --filter api check-types
pnpm --filter web lint
pnpm --filter web exec tsc --noEmit
```

Manual browser check:

1. Open `/admin/lesson-plans`.
2. In `Tổng quan`, create or edit a resource.
3. Type a new custom tag and click submit without pressing Enter.
4. Reopen the resource and confirm the tag appears.
5. In `Công việc`, create a taskless lesson output with a new custom tag and submit without pressing Enter.
6. Filter by that tag and confirm the new output appears.

## Out Of Scope

- New `lesson_tags` table.
- Shared/global tag catalog across users/browsers.
- Migration from localStorage custom suggestions into backend.
- Case-insensitive JSON tag filtering at database level.

## Rollback Plan

- FE picker changes are isolated to `LessonTagPicker` and two submitters.
- Backend filter change is isolated to `buildLessonWorkWhere`.
- If Prisma JSON filtering causes a query issue, revert only the `tags: { array_contains: [tag] }` branch and keep existing text fallback.
