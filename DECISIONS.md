# DECISIONS.md — Architectural Decision Log

Each entry is labeled **Verified** (directly stated in a commit message,
code comment, or unambiguous from the code's structure) or **Inferred**
(a reasonable read of *what* was decided, without claiming to know the
developer's exact original reasoning beyond what's evidenced). No
reasoning is fabricated beyond what the repo itself shows.

### DEC-001 — Replace the local Python/YOLO prototype with a fully client-side TensorFlow.js detector

- **Label:** Verified.
- **Evidence:** Commit `5ac4574`'s message states directly: "Replaces the
  local Python/YOLO prototype with a fully client-side TensorFlow.js
  detector so it can run as a website: webcam + coco-ssd inference happen
  in the browser tab, a Postgres-backed API logs each catch, and a Basic
  Auth proxy gates the deployed URL." The sibling repo
  `~/Projects/phone-watchdog` (a standalone Python script, `monitor.py`)
  is consistent with being that original prototype. **Caveat (added
  2026-08-07):** the sibling repo's own independently-checkpointed docs
  do not describe itself as replaced/deprecated — it documents itself as
  a standalone, currently-functional tool and states "the two are not
  wired together" with no claim either way about supersession. Read
  "replaces" here as this commit's own framing of developer intent at
  the time, not as a confirmed statement that the Python script is no
  longer used.
- **Effect:** No server ever sees the webcam feed or runs inference — this
  shapes the entire architecture (see `ARCHITECTURE.md`), trading
  potentially-higher YOLO accuracy for zero-infra-cost, zero-video-upload
  deployability as a plain static-ish website.

### DEC-002 — Use `mobilenet_v2` instead of coco-ssd's faster default base model

- **Label:** Verified.
- **Evidence:** Code comment in `src/app/page.tsx`: "mobilenet_v2 is
  slower but noticeably more accurate than the lite_mobilenet_v2 default,
  which is tuned for speed and misses partially hand-occluded phones
  fairly often." Introduced in commit `ab92aae`.
- **Effect:** Trades inference speed for detection accuracy, specifically
  for the case of a phone partially covered by a hand — a real, observed
  failure mode the developer tuned against.

### DEC-003 — Rolling-window debounce instead of a strict consecutive-frame streak

- **Label:** Verified.
- **Evidence:** Code comment in `src/app/page.tsx`: "Rolling-window debounce
  instead of a strict consecutive-frame streak: a single missed frame
  (occlusion by a hand, motion blur, a bad angle) no longer resets
  progress back to zero." Also stated in commit `ab92aae`'s message.
- **Effect:** `TRIGGER_WINDOW`/`TRIGGER_HITS` (6 samples, need 3 hits) and
  `CLEAR_WINDOW`/`CLEAR_HITS` (10 samples, need 0 hits) replace what was
  presumably a simpler "N consecutive detections in a row" check. This is
  a previously-tuned trade-off — see `CLAUDE.md` "DO NOT CHANGE WITHOUT
  REVIEW."

### DEC-004 — Best-effort, fire-and-forget database writes

- **Label:** Verified.
- **Evidence:** Code comment in `src/app/page.tsx`'s `refreshLog`: "logging is
  best-effort; ignore failures here." All catch/PATCH fetches use
  `.catch(() => {})`/`.catch(() => {})` with no user-facing error
  surfaced. `.env.example`'s comment states explicitly: "Leave unset
  locally to run without a database — webcam detection and the alarm
  still work, just without a saved log."
- **Effect:** The core detection/alarm UX is fully decoupled from
  database availability by design — a DB outage degrades the app to "no
  history," never to "broken." This also means (see `SECURITY.md`/
  `FEATURES.md`) that DB write failures are invisible to the user, which
  is the accepted trade-off for that resilience.

### DEC-005 — Single shared-password Basic Auth instead of real user accounts

- **Label:** Inferred (the *what* is directly visible in `src/proxy.ts`;
  the *why* — presumably "this is a single-person personal tool, real
  auth would be overkill" — is not stated anywhere in the repo, so it's
  inferred from the app's overall single-user shape: no user table, no
  per-catch ownership field, one shared secret).
- **Evidence:** `src/proxy.ts` implements exactly one check: a single
  `SITE_PASSWORD` compared against the HTTP Basic Auth password. No
  username is checked or stored. `.env.example`'s comment describes it
  as "Shared password for the site's Basic Auth gate."
- **Effect:** Zero per-user data model anywhere in the app (see
  `DATABASE.md`, `SECURITY.md`). Appropriate for the app's apparent scope
  (personal accountability tool) but would need a real rework before any
  multi-user use.

### DEC-006 — No schema migration system; `ensureTable()` runs on every request

- **Label:** Inferred (visible directly in the code; no comment explains
  *why* this approach was chosen over a real migration tool — reasonably
  read as "small app, one table, didn't need more").
- **Evidence:** `src/app/api/catches/route.ts`'s `ensureTable()` runs
  `CREATE TABLE IF NOT EXISTS catches (...)` at the top of every handler,
  rather than via a committed migration file or a one-time setup script.
- **Effect:** Zero setup friction (a fresh Postgres database "just
  works" on first request) at the cost of no safe path for future schema
  changes — see `DATABASE.md` "Migration risks."

### DEC-007 — Vendor Neon Agent Skills into the repo for AI-agent tooling

- **Label:** Verified (the *what*); Inferred (the *why* — presumably to
  give AI coding assistants better guidance when working with the
  Neon-backed Postgres database, matching the pattern seen in this same
  developer's other repos per the user's own memory notes about
  standardizing AI tooling across projects).
- **Evidence:** Commit `d9831ab` ("Add agent/claude tooling config")
  added `.agents/skills/neon/SKILL.md`, `.agents/skills/neon-postgres/SKILL.md`,
  and `.claude/skills/` symlinks pointing at them, pinned via
  `skills-lock.json` to a specific commit of the
  `neondatabase/agent-skills` GitHub repo.
- **Effect:** Not application code — purely developer/AI-tooling
  configuration. Does not affect the deployed app in any way.

### DEC-008 — Web Audio API siren instead of a bundled audio asset

- **Label:** Verified.
- **Evidence:** Code comment above `startSiren()`: "Loud two-tone siren
  using the Web Audio API — no external sound asset needed."
- **Effect:** Zero audio-file bundle size; the siren is synthesized
  (square-wave oscillator alternating 880Hz/660Hz every 350ms) rather
  than played from a file.
