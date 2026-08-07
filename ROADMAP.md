# ROADMAP.md — Product Roadmap

No time estimates appear anywhere below — none exist in the repo's git
history, code comments, or any prior documentation, and none are invented
here.

## Current milestone

**Working MVP, deployed.** The core loop (webcam → client-side detection
→ alarm → best-effort Postgres logging), gated behind a shared password,
is implemented and deployed to production. This is the state as of the
latest commit (`ecd6d89`).

- **Objective:** A usable, personal phone-use accountability tool
  reachable from any browser with a webcam.
- **Priority:** N/A (already the shipped state).
- **Status:** Done, per the code — **not independently runtime-verified**
  this audit (see `PROJECT_STATE.md`). Treat as "shipped but unconfirmed
  at runtime" rather than "fully verified."
- **Dependencies:** None outstanding.
- **Difficulty:** N/A (retrospective).
- **Risk:** Low, since it's already live; the main risk is that it's
  never been confirmed to actually work end-to-end (`TASKS.md` `TASK-002`).
- **Definition of done:** A real, timestamped manual smoke test (per
  `TESTING.md`) confirming the full flow works with a real webcam and
  the real production database.

## Next milestone

**Green verification suite.** Get `npm run lint` passing (currently the
only failing check) so all of `tsc --noEmit`/`lint`/`build` are clean
simultaneously, then perform the runtime smoke test above.

- **Objective:** `TASK-001` (lint fix) + `TASK-002` (runtime smoke test)
  both closed.
- **Priority:** High for `TASK-001`, Medium for `TASK-002` (see
  `TASKS.md`).
- **Status:** Not started.
- **Dependencies:** None for `TASK-001`. `TASK-002` needs a real
  webcam/browser session, which a documentation-only audit session
  cannot perform.
- **Difficulty:** Low for `TASK-001` (a small, well-scoped fix). Low
  effort but requires human involvement for `TASK-002` (can't be fully
  automated without a real browser/webcam).
- **Risk:** Low.
- **Definition of done:** All four verification commands
  (`tsc --noEmit`, `lint`, `build`, plus the manual smoke test) pass/
  succeed on the same commit.

## MVP completion

Already reached, per the definition implied by the shipped feature set
(webcam detection + alarm + logging + a basic access gate) — see
"Current milestone" above. No explicit "MVP" definition was ever written
down by the developer anywhere in this repo (git commit messages,
comments, or otherwise), so this is an **Inferred** milestone boundary,
not one the developer explicitly declared.

## Post-MVP

No post-MVP work has been started, planned in writing, or discussed in
any commit message/comment found in this repo. The items below are
**Inferred possibilities** based on the app's current gaps, not
confirmed user intent — treat them as candidates to propose, not a
committed plan.

- Automated tests (at minimum, extracting the pure debounce-window logic
  into a testable unit — see `TESTING.md` "Missing test areas").
- A migration system for the `catches` table, if the schema ever needs
  to grow (see `DATABASE.md`).
- Per-catch or per-day summary stats (e.g. "times caught today/this
  week") — nothing like this exists in the current UI, but the data
  (`caught_at`/`cleared_at` per row) already supports it without a
  schema change.

## Long-term ideas

Speculative, not sourced from any developer statement in the repo:

- Configurable detection thresholds via a settings UI instead of
  hardcoded constants.
- Detecting additional "distraction" objects beyond `"cell phone"`
  (coco-ssd already supports 80 COCO classes, so this would be a small
  code change, not a new model).
- A way to review/export the catch history beyond the current
  last-100-rows inline list.

## Optional improvements

- Clean up unreferenced `public/` scaffold assets and rewrite the stock
  `README.md` (`TASKS.md` `TASK-003`).
- Sharpen the generic API error message (`TASKS.md` `TASK-004`).
- Move `ensureTable()` to a one-time migration rather than running on
  every request (technical debt, not urgent — see `DATABASE.md`).

## Out of scope

Nothing has been explicitly declared out of scope by the developer in
any commit, comment, or prior doc. Based on the app's clear single-user,
personal-tool framing (a single shared password, no accounts, no
per-user data model), the following are reasonable to treat as out of
scope **unless the user says otherwise**:

- Multi-user accounts / per-user catch history.
- Mobile app / native wrapper.
- Any payment or subscription functionality.
