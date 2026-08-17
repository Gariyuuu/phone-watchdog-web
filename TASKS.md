# TASKS.md — Active Execution Queue

## Current task: `T-001` (a.k.a. `TASK-001`, this repo's pre-existing ID)

**None actively in progress.** The documentation audit that produced this
memory system is complete as of 2026-08-06 (see `SESSION_LOG.md`). The
best next pick from the backlog below is `TASK-001` (the lint error,
also referenced as `T-001` elsewhere in this doc set for cross-repo
consistency — same task, two labels) — but confirm with the user before
starting it; don't assume it's wanted without asking, per the standing
rule that only the user or explicit instruction authorizes new work.
**Re-confirmed still failing, unchanged, on 2026-08-17** (`npm run lint`
run directly — same single error, same line).

If you are a fresh AI session picking this up cold: read `TASK-001`
below in full — it is written to be resumable without any prior context
beyond this file and `CLAUDE.md`.

## High priority

### TASK-001 — Fix the `react-hooks/set-state-in-effect` lint error

- **Status:** Open, not started.
- **Description:** `npm run lint` currently exits non-zero with one
  error:
  ```
  src/app/page.tsx
    85:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders
    ...
  86 |   }, [refreshLog]);
     react-hooks/set-state-in-effect
  ```
  The offending code is the model-loading `useEffect` in `src/app/page.tsx`:
  ```tsx
  useEffect(() => {
    (async () => {
      const tf = await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      await tf.ready();
      modelRef.current = await cocoSsd.load({ base: "mobilenet_v2" });
      setModelLoading(false);
    })();
    refreshLog();          // <-- flagged: calls setLog() internally
  }, [refreshLog]);
  ```
  `refreshLog` (defined a few lines above) is an async `useCallback` that
  ends with `setLog(data.catches ?? [])`. ESLint's newer
  `react-hooks/set-state-in-effect` rule flags calling a state-setting
  function directly in an effect body (as opposed to inside an event
  handler or a `.then()`/subscription callback) as a cascading-render
  risk.
- **Priority:** High — it's the only failing verification check in the
  entire repo (typecheck and build are both clean).
- **Relevant files:** `src/app/page.tsx` (lines ~74–86 for the effect;
  `refreshLog`'s definition just above it).
- **Dependencies:** None.
- **Suggested approaches (not yet decided/implemented — pick one and
  document the choice in `DECISIONS.md` if you do this):**
  1. Move the `refreshLog()` call inside the async IIFE, after the model
     load, so both async operations share one effect body without a
     bare top-level call. (Note: this changes *when* the log first
     loads — currently it starts loading immediately in parallel with
     the model; sequencing it after model load would delay it. Confirm
     this is acceptable before doing it.)
  2. Wrap `refreshLog()` in its own `.then()`-style call or a
     `queueMicrotask`/separate effect so it's not a bare synchronous
     call in the effect body.
  3. Add a targeted `eslint-disable-next-line` with a comment explaining
     why it's safe here (the effect only runs once on mount, so there's
     no actual cascading-render risk in practice) — the pragmatic option
     if the rule's concern doesn't apply to this specific case.
- **Acceptance criteria:** `npm run lint` exits 0 with no errors.
  `npx tsc --noEmit` and `npm run build` still pass. The catch log still
  populates on page load (verify manually in a browser — this can't be
  confirmed by static checks alone).
- **Validation steps:** Run `npm run lint`, `npx tsc --noEmit`,
  `npm run build`. Then manually run `npm run dev`, load the page, and
  confirm the "Caught log" section still shows past catches (if any
  exist in the connected database) without a console error.
- **Blockers:** None.
- **Notes:** This is a pre-existing condition, not introduced by the
  2026-08-06 documentation audit — confirmed by running `npm run lint`
  against the clean, unmodified working tree.

## Medium priority

### TASK-002 — Real runtime smoke test of the core detection/alarm/log flow

- **Status:** Open, not started.
- **Description:** No session has ever run the dev server and actually
  exercised the webcam → detection → alarm → DB-log flow end-to-end (per
  this audit's own constraints, and no evidence in git history/session
  logs of it having been done before). The code is statically consistent
  but "typechecks and builds" is a materially weaker claim than "actually
  works."
- **Priority:** Medium (not blocking, but it's the biggest gap between
  "looks correct" and "confirmed correct" for this repo).
- **Relevant files:** `src/app/page.tsx`, `src/app/api/catches/route.ts`.
- **Dependencies:** A real webcam, a real browser, and either a
  connection to the real Neon/Postgres database or a willingness to test
  only the "no `POSTGRES_URL`" degraded path locally.
- **Acceptance criteria:** See `TESTING.md`'s manual smoke-test
  checklist — every step in it confirmed to work as described.
- **Validation steps:** Follow `TESTING.md` step by step.
- **Blockers:** Requires explicit user involvement/permission to run a
  dev server with real webcam access (outside the scope of a
  documentation-only audit).
- **Notes:** Should be done before trusting this app as an actual daily
  accountability tool, not just before any specific code change.

### TASK-003 — Decide whether to clean up unreferenced `public/` assets and the stock `README.md`

- **Status:** Open, not started.
- **Description:** `public/file.svg`, `globe.svg`, `next.svg`,
  `vercel.svg`, `window.svg` are unedited `create-next-app` scaffold
  assets, unreferenced by any source file (verified via grep).
  `README.md` is likewise the unedited `create-next-app` template — it
  describes generic Next.js getting-started steps, not this project.
- **Priority:** Medium-low — purely cosmetic/hygiene, no functional
  impact.
- **Relevant files:** `public/file.svg`, `public/globe.svg`,
  `public/next.svg`, `public/vercel.svg`, `public/window.svg`,
  `README.md`.
- **Dependencies:** None.
- **Acceptance criteria:** Either the unused SVGs are deleted and
  `README.md` is rewritten to describe this project (name, what it does,
  how to run it, link to `CLAUDE.md`), or a deliberate decision is made
  to leave them and that decision is recorded in `DECISIONS.md`.
- **Validation steps:** `git status` shows only the intended
  deletions/edits; `npm run build` still succeeds.
- **Blockers:** None.
- **Notes:** Low stakes either way — flagged for completeness per the
  audit's "unfinished/risky work" scan, not because it's urgent.

## Low priority

### TASK-004 — Improve the generic API error message

- **Status:** Open, not started.
- **Description:** All three handlers in
  `src/app/api/catches/route.ts` return
  `{ error: "database not configured", detail: String(err) }` on *any*
  caught exception, even ones unrelated to configuration (a transient
  network blip, a malformed query after a future schema change, etc.).
  Since the client ignores these responses entirely today, this has zero
  user-facing impact, but it would make future debugging clearer to
  differentiate "no `POSTGRES_URL` set" from "query failed."
- **Priority:** Low.
- **Relevant files:** `src/app/api/catches/route.ts`.
- **Dependencies:** None.
- **Acceptance criteria:** Error responses distinguish (at least in the
  `detail` field, which they already somewhat do via `String(err)`)
  configuration errors from runtime query errors, or a decision is made
  that the current generic message is fine and this task is rejected.
- **Validation steps:** Manual — trigger a real error (e.g. temporarily
  unset `POSTGRES_URL` locally) and confirm the response is informative.
- **Blockers:** None.

## Bugs

See `TASK-001` (the only currently-known, currently-verified bug — the
lint error). No runtime bugs are confirmed, because no runtime testing
has been performed (see `TASK-002`).

## Technical debt

- `ensureTable()` running a `CREATE TABLE IF NOT EXISTS` on every single
  API request rather than via a one-time migration (see `DATABASE.md`
  "Migration risks").
- No schema migration system at all — any future column change has no
  established safe path.
- `@/*` path alias configured in `tsconfig.json` but never used by any
  existing import (harmless, but worth knowing before assuming it's
  exercised/tested).
- `favicon.ico` is dead weight, shadowed by `icon.svg`.

## Testing needed

- The full manual smoke test described in `TESTING.md` (see `TASK-002`).
- No automated test suite exists at all — establishing even a minimal
  one (e.g. a unit test around the pure debounce-window logic, which
  could in principle be extracted and tested without a real browser/
  webcam) is unstarted work, not currently planned by the user as far as
  this audit found.

## Documentation needed

None outstanding — this audit's purpose was exactly this. Keep this file
and `PROJECT_STATE.md`/`SESSION_LOG.md` current going forward per
`CLAUDE.md`'s "Permanent rules for future development."

## Recently completed

- **2026-08-06 — Full documentation/handoff audit.** Created/rewrote all
  17 memory files (`CLAUDE.md` through `HANDOFF.md`). No application
  code was changed. See `CHANGELOG.md` and `SESSION_LOG.md` for the full
  record.
- **`ecd6d89` — Add custom favicon (watchdog emoji).**
- **`d9831ab` — Add agent/claude tooling config** (Neon Agent Skills).
- **`ab92aae` — Improve phone detection reliability for hand-held/
  occluded phones** (rolling-window debounce, `mobilenet_v2`, higher
  webcam resolution, lower confidence threshold).
- **`5ac4574` — Add browser-based phone detection with alarm, overlay,
  and catch log** (the original feature build: replaced a local Python/
  YOLO prototype with a client-side TensorFlow.js detector, added the
  Postgres-backed catch log and the Basic Auth proxy).

## Deferred

Nothing explicitly deferred by the user — the items above are simply
unstarted, not deliberately postponed.

## Rejected ideas

None found in git history, code comments, or prior documentation. (This
repo has no prior memory-file system, so there is no historical
"rejected ideas" record to preserve — this section starts empty and
should be filled in going forward as decisions are made.)
