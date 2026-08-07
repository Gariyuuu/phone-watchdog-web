# CHANGELOG.md — Repository / Engineering Changelog

This file did not exist before this audit. It is being introduced now to
track engineering/documentation milestones going forward, per the
handoff memory system described in `CLAUDE.md`. It does not attempt to
invent version numbers or dates for history that predates it — see
"Prior history" below, reconstructed strictly from `git log`.

---

## 2026-08-06 — Documentation & handoff audit

**Type:** Documentation only. No product/application behavior was
intentionally changed. No code files under `src/` were modified.

A full repository audit was performed to build a permanent, in-repo
memory system — matching the standard already established in sibling
repos `chamber-seven` and `buildstrike-arena` — so that a new AI coding
session (or new developer) can resume work with minimal rediscovery.
This was done by reading the actual source code, configuration, and git
history, plus read-only checks against the live Vercel deployment
(deployment list, env var names/environments, one unauthenticated
`curl` against the production URL) — not by relying on prior chat/session
history, and not by copying content from the sibling repos used only as
a structural/format reference.

**Files created (all 16 were missing before this audit):**
- `PROJECT_STATE.md`
- `ARCHITECTURE.md`
- `FILE_MAP.md`
- `FEATURES.md`
- `TASKS.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `DATABASE.md`
- `API_REFERENCE.md`
- `UI_SYSTEM.md`
- `SECURITY.md`
- `TESTING.md`
- `DEPLOYMENT.md`
- `CHANGELOG.md` (this file)
- `SESSION_LOG.md`
- `HANDOFF.md`

**Files updated:**
- `CLAUDE.md` — rewritten from a placeholder `@AGENTS.md` include (one
  line, no project-specific content) into a full operating manual.

**Significant findings from the audit** (see the relevant file for full
detail on each):
- `npm run lint` **currently fails** — one `react-hooks/set-state-in-effect`
  error in `src/app/page.tsx:85`. Pre-existing, not introduced by this
  audit. See `TASKS.md` `TASK-001`.
- No automated tests exist anywhere in the repo, and no runtime/browser
  testing of the core webcam → detection → alarm → DB-log flow has ever
  been recorded as having happened. See `TESTING.md` and `TASKS.md`
  `TASK-002`.
- The production Basic Auth gate (`src/proxy.ts`) was confirmed live and
  working correctly via a read-only `curl` against
  `https://phone-watchdog-web.vercel.app/` — this is the one feature
  independently confirmed end-to-end this session.
- `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`
  are unreferenced default `create-next-app` scaffold assets. `README.md`
  is likewise the unedited `create-next-app` template. Neither is a
  functional bug; both are flagged as low-priority cleanup
  (`TASKS.md` `TASK-003`).
- The `catches` table's schema exists only as an inline
  `CREATE TABLE IF NOT EXISTS` in `src/app/api/catches/route.ts`, run on
  every request — there is no migration file or migration system in this
  repo. See `DATABASE.md` "Migration risks."
- `body`'s `font-family` in `globals.css` falls back to Arial/Helvetica
  rather than the loaded Geist font variable — a real, verified
  discrepancy between what's wired up and what's actually applied. See
  `UI_SYSTEM.md`.
- The sibling repo `~/Projects/phone-watchdog` (no `-web` suffix) was
  confirmed to be a separate, unrelated Python prototype that this app's
  first real feature commit (`5ac4574`) explicitly replaced — the two
  repos share no code, API, or database at runtime.

**No product behavior was intentionally changed** during this audit.
`npx tsc --noEmit`, `npm run lint`, and `npm run build` were all run as
read-only verification (no `--fix` flags, no code edits made outside the
documentation files themselves). `tsc --noEmit` and `npm run build`
passed cleanly both before and after the documentation was added;
`npm run lint`'s pre-existing failure is unchanged (documented, not
fixed, per this audit's read-and-document scope).

---

## 2026-08-07 — Final transfer checkpoint (re-verification pass)

**Type:** Documentation only. No product/application behavior changed.

Re-verified the full 17-file memory system against the real current
repo state (a different Claude Code account than the one that wrote the
2026-08-06 audit, per this repo's cold-handoff workflow). Found and
fixed:

- `PROJECT_STATE.md`'s git-state section was stale: it described the 17
  memory files as uncommitted, but they had since been committed as
  `e2f976e`. Rewrote with the current (clean, 6-commit) state.
- Several smaller stale references to "5 commits, latest `ecd6d89`"
  (`CLAUDE.md`, `ROADMAP.md`) — updated to reflect `e2f976e` as the
  latest commit overall.
- The "this app replaced the Python prototype" framing (`CLAUDE.md`,
  `DECISIONS.md`) was softened: the sibling `~/Projects/phone-watchdog`
  repo's own (independently checkpointed) docs don't describe itself as
  deprecated, so this repo's docs now note that "replaces" reflects this
  repo's own commit-message framing, not a confirmed fact about the
  sibling's current status.
- Added a new "Data-flow consistency check" section to `SECURITY.md`
  explicitly resolving whether this dashboard's persistence (a Postgres
  `catches` table storing two timestamps per event, never image/video
  data) is consistent with the sibling's "nothing persisted" claim —
  confirmed consistent, since the sibling's claim is scoped to
  `monitor.py` specifically.
- Refreshed `HANDOFF.md`'s "Prompt for the next Claude Code account"
  section with the current verified state and the sibling-repo caveat.

No secrets found (placeholder-only `.env.example`; `.env.local`
confirmed untracked). `npx tsc --noEmit` and `npm run build` still pass;
`npm run lint`'s pre-existing failure (`TASK-001`) is unchanged.

---

## Prior history (reconstructed from `git log`)

- **`fedeec1`** — Initial commit from Create Next App (scaffold only).
- **`5ac4574`** — Add browser-based phone detection with alarm, overlay,
  and catch log. The real first feature commit: replaced a local Python/
  YOLO prototype with a client-side TensorFlow.js detector, added the
  Postgres-backed catch log (`src/app/api/catches/route.ts`) and the
  Basic Auth proxy (`src/proxy.ts`).
- **`ab92aae`** — Improve phone detection reliability for hand-held/
  occluded phones. Switched to the `mobilenet_v2` base model, requested
  higher webcam resolution, lowered the confidence threshold, and
  replaced a strict consecutive-frame streak with the current
  rolling-window debounce.
- **`d9831ab`** — Add agent/claude tooling config. Added
  `.agents/skills/`/`.claude/skills/` (vendored Neon Agent Skills) and
  `skills-lock.json`. Not application code.
- **`ecd6d89`** — Add custom favicon (watchdog emoji). Added
  `src/app/icon.svg`.
