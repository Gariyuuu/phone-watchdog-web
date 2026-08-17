# FEATURES.md — Feature-by-Feature Status

Status classifications follow the scale requested for this audit:
Verified complete / Mostly complete / Partially implemented / UI only /
Backend only / Mocked / Planned / Broken / Deprecated / Unable to verify.
Nothing here is marked "Verified complete" unless the full flow (UI +
client logic + server logic + DB + validation + error/loading states) was
actually traced through the code — runtime/browser behavior was **not**
tested this session (no dev server started, no webcam used, no live DB
query run), so the ceiling for any feature this audit is **"Mostly
complete — code-complete and statically verified, runtime unconfirmed,"**
not "Verified complete," unless otherwise noted.

## Webcam-based phone detection

- **Purpose:** Continuously watch the user's webcam feed and detect when
  a cell phone is visible/held.
- **User flow:** Click Start → grant browser webcam permission → video
  feed appears → detection runs automatically every 300ms in the
  background.
- **Status: Mostly complete.** Code is present and internally consistent;
  `tsc --noEmit`, `npm run build` pass. **Not runtime-verified this
  session** — no dev server was started and no webcam/model was actually
  exercised.
- **Frontend files:** `src/app/page.tsx` (`start()`, `runDetection()`,
  the model-loading `useEffect`).
- **Backend files:** None — fully client-side.
- **DB dependencies:** None for detection itself.
- **External integrations:** `@tensorflow/tfjs` + `@tensorflow-models/coco-ssd`
  (client-side ML, `mobilenet_v2` base model), browser
  `navigator.mediaDevices.getUserMedia` API.
- **Env vars:** None.
- **Permissions:** Browser webcam permission prompt (standard browser
  UX, not app-controlled).
- **Validation:** None needed (no user input beyond the permission
  grant).
- **Error/loading states:** "Loading model…" button label while
  `modelLoading`; webcam permission/access failure surfaces via
  `setError` → red text under the Start/Stop button. No loading
  indicator for the webcam stream itself between "granted" and "first
  frame decoded" (`video.readyState < 2` guard silently skips detection
  until ready, with no UI feedback for that gap).
- **Edge cases considered in code:** partial occlusion (hand covering
  part of the phone) is explicitly why the debounce was reworked in
  commit `ab92aae` from a strict consecutive-frame streak to a
  rolling-window threshold. Multiple phones in frame: not specifically
  handled either way (`predictions.some(...)` just needs one match).
- **Tests:** None.
- **Known issues:** Detection accuracy is entirely dependent on
  coco-ssd's pretrained `"cell phone"` class and the hand-tuned
  confidence threshold (`0.35`) — no calibration data or accuracy
  measurement exists in the repo.
- **Remaining work:** A real runtime smoke test (see `TESTING.md`).

## Alarm (siren + full-screen overlay)

- **Purpose:** Make it hard to ignore that a phone was detected.
- **User flow:** Automatic — triggers when the debounce condition is met
  (phone seen in ≥3 of the last 6 samples), no user action needed to
  start it. Dismissed by the phone being absent for 10 consecutive
  samples (~3s) or by pressing Escape.
- **Status: Mostly complete** (code-complete, statically verified, not
  runtime-tested this session).
- **Frontend files:** `src/app/page.tsx` (`startSiren()`,
  `triggerAlarm()`, `clearAlarm()`, `dismiss()`, the `{caught && (...)}`
  overlay JSX, the Escape-key `useEffect`).
- **Backend files:** None directly (triggering also fires the catch-log
  API call — see below).
- **DB dependencies:** Indirect, via the catch-log feature.
- **External integrations:** Web Audio API (`AudioContext`,
  `OscillatorNode`, `GainNode`) — no external asset/sound file.
- **Env vars:** None.
- **Permissions:** None beyond the webcam permission already granted for
  detection to be running at all.
- **Validation:** N/A.
- **Error/loading states:** No explicit error state (Web Audio API
  failures, e.g. browser autoplay-policy blocks, are not caught/handled
  — an `AudioContext` created outside a direct user gesture can
  sometimes start in a `"suspended"` state in some browsers; the code
  does not check `ctx.state` or call `ctx.resume()`). This is an
  **unverified edge case** — flagged, not confirmed as an actual bug,
  since `getUserMedia`'s own permission prompt is itself a user gesture
  that may satisfy the same-gesture requirement in practice.
- **Edge cases considered in code:** cleanup on unmount (a `useEffect`
  return stops the siren and webcam tracks); cleanup on `stop()` (stopping
  detection also dismisses any active alarm).
- **Tests:** None.
- **Known issues:** None beyond the unverified autoplay-policy edge case
  above.
- **Remaining work:** Runtime verification; optionally handle the
  `AudioContext` suspended-state edge case defensively.

## Catch log (persistence + display)

- **Purpose:** Keep a record of every time the alarm was triggered and
  how long it took to clear, displayed under the video.
- **User flow:** Automatic on trigger/clear (no manual logging action);
  the list refreshes after every trigger and every clear, and once on
  initial page load.
- **Status: Mostly complete — Unable to fully verify the live-database
  path.** The code (client fetch calls + API route + `ensureTable()`)
  reads as correct and self-consistent, and the required env vars
  (`POSTGRES_URL` and the rest of the Neon var set) are confirmed present
  on Vercel for Production/Preview/Development (names only — values not
  read, and no live query was run against the database this session per
  the task's "do not touch a real database" constraint). Whether the
  live `catches` table actually exists and matches the expected shape
  was **not verified**.
- **Frontend files:** `src/app/page.tsx` (`refreshLog`, the `<ul>` log
  rendering, `CatchRow` type).
- **Backend files:** `src/app/api/catches/route.ts` (`GET`, `POST`,
  `PATCH`).
- **DB dependencies:** `catches` table (Postgres, via `@vercel/postgres`)
  — see `DATABASE.md`.
- **External integrations:** None beyond the DB itself.
- **Env vars:** `POSTGRES_URL` (required for persistence to work; its
  absence degrades gracefully — see below).
- **Permissions:** None beyond the site-wide Basic Auth gate (`src/proxy.ts`)
  — no per-catch ownership or per-user scoping exists.
- **Validation:** `PATCH` checks `id` is present (`400` if missing);
  no other validation (no type check on `id`'s shape, no bounds on
  `GET`'s implicit `LIMIT 100`).
- **Error/loading states:** No loading spinner for the log itself (it
  simply renders empty — "Nothing yet. Good." — until the first
  successful `GET` resolves). All DB-related fetch failures are silently
  swallowed client-side (`.catch(() => {})` / `.catch(() => {})`), so a
  totally broken DB connection produces **no visible error to the user**
  at all — detection and the alarm still work, just without a saved log
  (this is the explicitly documented, intended degradation described in
  `.env.example`'s comment).
- **Edge cases considered in code:** a `PATCH` with a nonexistent `id`
  silently no-ops (the `UPDATE ... WHERE id = ${id}` simply matches zero
  rows; the handler still returns `{ ok: true }`).
- **Tests:** None.
- **Known issues:** Generic `500` error message reused for every DB
  failure type (see `CLAUDE.md` "Known issues" #2); no migration system
  for schema changes (see `DATABASE.md`).
- **Remaining work:** A real query against the live database (or a fresh
  local Postgres instance) to confirm `ensureTable()` and the three
  handlers actually behave as expected end-to-end. Not performed this
  session per task constraints.

## Site-wide Basic Auth gate

- **Purpose:** Prevent the public internet from freely using the app
  (webcam access is opt-in anyway, but the catch log and API would
  otherwise be fully open).
- **User flow:** Any request to any non-static path triggers a browser
  Basic Auth prompt if `SITE_PASSWORD` is set; correct password →
  through, wrong/missing → `401`.
- **Status: Verified complete (including live production behavior).**
  This is the one feature independently confirmed working end-to-end
  this session: `src/proxy.ts`'s logic was read and cross-checked against
  Next.js's own `proxy.js` documentation (confirming the file-convention
  rename is real and this repo uses it correctly), and a live, read-only
  `curl` against `https://phone-watchdog-web.vercel.app/` returned `401`
  with `WWW-Authenticate: Basic realm="phone-watchdog"` — the exact
  behavior the code implies, in production. `SITE_PASSWORD` was
  confirmed present (name only) on Vercel's Production and Preview
  environments via `vercel env ls`.
- **Frontend files:** None (native browser Basic Auth UI).
- **Backend files:** `src/proxy.ts`.
- **DB dependencies:** None.
- **External integrations:** None.
- **Env vars:** `SITE_PASSWORD`.
- **Permissions:** Binary — correct password or not. No roles.
- **Validation:** String equality check
  (`suppliedPassword === password`), not a constant-time comparison —
  see `SECURITY.md` for the (low-severity, given the threat model)
  timing-attack note.
- **Error/loading states:** `401` plain-text response with a
  `WWW-Authenticate` header; no custom error page.
- **Edge cases considered in code:** unset `SITE_PASSWORD` (e.g. local
  dev) intentionally bypasses the gate entirely rather than locking
  everyone out.
- **Tests:** None automated; manually confirmed live this session (see
  above).
- **Known issues:** No rate limiting on auth attempts; no lockout; no
  audit log of access attempts. Acceptable for a personal single-user
  tool, not for anything more exposed.
- **Remaining work:** None required for current scope.

## SEO / link-preview metadata [Verified 2026-08-17, commits `ee1206e`/`ebafc28`]

- **What:** `src/app/opengraph-image.tsx` (next/og-generated OG card),
  `src/app/robots.ts`, `src/app/sitemap.ts`, plus OpenGraph/Twitter meta
  tags added to `src/app/layout.tsx`.
- **Status:** Present in code; not independently live-curl-verified this
  sweep (unlike some sibling repos) because this site sits behind Basic
  Auth (`src/proxy.ts`) — an unauthenticated `curl` would only confirm
  the 401 gate, not the metadata routes themselves, and no credentials
  were supplied. Treat as **code-verified, not live-verified**.

## Motion polish [Verified 2026-08-17, commits `94abb61`/`9fe894e`]

This app's first motion/animation of any kind (previously zero
keyframes anywhere in the codebase):

- A `ThinkingOrb` (`state="searching"`) renders alongside the existing
  "Loading model..." text while the TensorFlow.js model downloads.
- Start/Stop button press feedback (independently implemented technique
  — the commit message notes the reference source, `kinetics.colorion.co`,
  ships `license: null`, so only the technique was used, no source
  copied).
- A text-shadow-only glow pulse on the "PUT YOUR PHONE DOWN" alarm text
  — deliberately restricted to `text-shadow` alone (opacity, color,
  size, and position never change across any frame, in either motion
  state, per the commit's own verification against computed styles in a
  real browser). The commit message explicitly notes a pulse synced to
  the siren on the alarm overlay itself was **deliberately not done** —
  judged too close to a jump-scare/photosensitivity pattern for this
  app.
- A scoped (not blanket) `prefers-reduced-motion` guard was added
  alongside the new motion, deliberately not a portfolio-wide `*` rule
  (would conflict with the `ThinkingOrb` component's own independent
  reduced-motion handling).

## Features explicitly NOT present (confirmed by absence, not assumed)

- No user accounts/login beyond the single shared password.
- No settings/configuration UI (thresholds are hardcoded constants, not
  user-adjustable).
- No mobile-specific UI or PWA manifest.
- No notification system beyond the in-tab siren/overlay (no browser
  push notifications, no email/SMS).
- No data export/deletion UI for the catch log (no `DELETE` handler
  exists in `src/app/api/catches/route.ts`).
- No analytics, no usage tracking.
