# TESTING.md

## Current test strategy

**There is no automated test suite.** No test framework is installed (no
Jest, Vitest, Playwright, Cypress, Testing Library — verified via
`package.json` and a repo-wide search for `*.test.*`/`*.spec.*`, which
found zero matches). There is no `test` script in `package.json`. The
project's only current verification is:

1. `npx tsc --noEmit` — TypeScript strict-mode type checking.
2. `npm run lint` — ESLint (flat config, `eslint-config-next`).
3. `npm run build` — a full Turbopack production build (which itself runs
   a TypeScript check as part of the build, per the `next build` output
   observed this audit).

**Verified this audit (2026-08-06), against the clean working tree:**

- `npx tsc --noEmit` → passes, no output.
- `npm run build` → succeeds: "Compiled successfully in 4.6s," "Finished
  TypeScript in 1279ms," all 4 routes generated
  (`/`, `/_not-found`, `/api/catches`, `/icon.svg`).
- `npm run lint` → **fails**, 1 error:
  ```
  src/app/page.tsx
    85:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders
    react-hooks/set-state-in-effect
  ```
  See `TASKS.md` `TASK-001` for the fix plan. This is pre-existing, not
  caused by this audit (no application code was touched).

No runtime/browser testing (loading the dev server, granting webcam
access, holding up a phone, confirming the alarm/siren, confirming the
DB write path) was performed this session — the task explicitly
prohibited starting a long-running dev server or touching a real
database. Everything below the "static checks" line in this file is
therefore **documented but unverified**.

## Test frameworks

None installed. If adding one, the natural fit given the stack would be
Vitest (fast, works well with Next.js/Turbopack) or Playwright (for the
webcam/detection flow, which is fundamentally a browser-integration
concern that unit tests alone can't cover — `getUserMedia` and
`AudioContext` are browser APIs, not pure functions).

## Test directory structure

Does not exist.

## Existing tests

None.

## Missing test areas (highest-value first)

1. **The debounce state machine itself** (`TRIGGER_WINDOW`/
   `TRIGGER_HITS`/`CLEAR_WINDOW`/`CLEAR_HITS` logic inside
   `runDetection()`). This is the one piece of core logic that's pure
   enough to unit-test without a real browser/webcam/model, if it were
   extracted into a standalone function taking a boolean-sample array and
   returning trigger/clear decisions. Currently it's inline inside
   `runDetection()`, coupled to refs and `model.detect()`, so it can't be
   tested in isolation without refactoring first.
2. **The three API handlers** (`GET`/`POST`/`PATCH` in `src/app/api/catches/route.ts`) —
   could be tested against a real or test Postgres instance (or mocked
   `@vercel/postgres`) to confirm `ensureTable()`, the insert, the
   update-by-id, and the error paths all behave as documented.
3. **`src/proxy.ts`'s auth logic** — a small, easily unit-testable pure
   function (`proxy(req)` given various `Authorization` headers and
   `SITE_PASSWORD` values) that currently has zero test coverage.
4. **End-to-end browser flow** (Playwright) — webcam mocking (fake video
   stream via Chromium's `--use-fake-device-for-media-stream` flag) to
   drive Start → simulated phone appears in frame → alarm fires → clears.
   Would require faking coco-ssd's detection output or feeding a real
   video with a phone in it — non-trivial but the highest-value test for
   the app's actual core feature.

## Manual testing steps (smoke-test checklist)

No evidence this has ever been formally run and recorded (no test log,
no session note found predating this audit). Use this checklist for the
first real verification:

### Setup

1. `npm install`
2. `npm run dev` (starts on `http://localhost:3000`; `SITE_PASSWORD` is
   not set on Vercel's Development environment, so confirm your local
   `.env.local` reflects whether you want the auth gate active locally —
   if `SITE_PASSWORD` is unset in your shell/`.env.local`, `src/proxy.ts`
   bypasses the gate entirely for local dev).
3. Open `http://localhost:3000` in a browser with a working webcam.

### Core detection/alarm flow

4. Click **Start**. Confirm the button first reads "Loading model…" and
   is disabled, then becomes "Start"/enabled once the coco-ssd model has
   loaded.
5. Click **Start** again (or if it auto-enabled). Grant the browser's
   webcam permission prompt. Confirm the `<video>` element shows your
   live feed.
6. Hold a phone up in clear view of the camera for a few seconds.
   Confirm the full-screen red "PUT YOUR PHONE DOWN" alarm appears within
   roughly 1.8 seconds (the `TRIGGER_WINDOW`/`TRIGGER_HITS` timing) along
   with the two-tone siren.
7. Put the phone down / move it out of frame. Confirm the alarm
   auto-dismisses after roughly 3 seconds (`CLEAR_WINDOW`) of the phone
   being fully absent, and the siren stops.
8. Trigger the alarm again, then press **Escape** while it's showing.
   Confirm it dismisses immediately (not waiting for the clear window).
9. Click **Stop**. Confirm the video feed stops, the webcam indicator
   light turns off, and (if the alarm was active) it's dismissed too.

### Catch log

10. After step 6/7 (a completed trigger+clear cycle), confirm a new row
    appears under "Caught log" showing the trigger time and a duration in
    seconds.
11. Reload the page. Confirm the log still shows prior entries (i.e.
    `GET /api/catches` on page load is working and the DB write actually
    persisted).
12. If `POSTGRES_URL` is intentionally unset (degraded-mode test):
    confirm detection/alarm still work fully, and the log area shows
    "Nothing yet. Good." indefinitely (writes fail silently, per
    `DECISIONS.md` DEC-004) — no error should be visible to the user.

### Auth gate

13. With `SITE_PASSWORD` set (e.g. test against the deployed Preview/
    Production URL, not local dev): confirm an unauthenticated request
    gets a `401` with a Basic Auth browser prompt, and the correct
    password grants access. (This exact behavior was already confirmed
    live against production this audit via `curl` — see
    `PROJECT_STATE.md` — but re-verify after any change to `src/proxy.ts`.)

### Regression check after any change to `src/app/page.tsx`'s detection constants

14. Re-run steps 6–8 specifically — changing `CONFIDENCE_THRESHOLD`,
    `TRIGGER_WINDOW`/`TRIGGER_HITS`, or `CLEAR_WINDOW`/`CLEAR_HITS` can
    reintroduce the false-negative-on-occlusion problem commit `ab92aae`
    was written to fix, or make the alarm too trigger-happy in the other
    direction.

## Test data / fixtures / mocks

None exist. No fixture `catches` rows, no mocked webcam stream, no mocked
`@vercel/postgres` client anywhere in the repo.

## Test environment variables

Not applicable — no test framework/environment is configured. For manual
local testing, see "Setup" above regarding `SITE_PASSWORD`/`POSTGRES_URL`
in `.env.local`.

## Coverage gaps

Effectively 100% of the runtime behavior is untested by any automated
means. The only coverage that exists is static (`tsc`, `eslint`, the
`next build` compile step).

## Critical untested flows

1. The entire detection → alarm → DB-log round trip, end-to-end, with a
   real webcam and a real database (see `TASKS.md` `TASK-002`).
2. The degraded "no `POSTGRES_URL`" path (does the app truly never
   surface an error to the user, as `DECISIONS.md` DEC-004 claims?).
3. The live production Basic Auth gate with a **correct** password (only
   the "no credentials" `401` case was confirmed this audit — the
   success path with the real password was never attempted, per
   "no credential guessing" scope).

## Known flaky tests

None — there are no automated tests to be flaky.

## Pre-release/pre-deployment checklist

Given there's no CI, this is what should be run by hand before pushing
to `main` (which appears to auto-deploy to production — see
`DEPLOYMENT.md`):

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Plus, ideally, the manual smoke-test checklist above — at minimum steps
4–9 (the core detection/alarm loop) after any change to `src/app/page.tsx`.
