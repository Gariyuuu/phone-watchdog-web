# PROJECT_STATE.md — Exact Handoff Snapshot

## Audit timestamp

**2026-08-06**, performed by an AI coding session (account/identity not
recorded by the tooling — see `SESSION_LOG.md`). This snapshot reflects a
full read-only repository audit plus read-only checks against the live
Vercel project (deployment list, env var names, `curl` of the production
URL). No code, config, or deployment was changed as part of producing
this file, except the documentation files themselves.

## Git state

- **Branch:** `main` (only branch that exists locally or on `origin`; no
  other local or remote branches — confirmed via `git branch -a`).
- **Remote:** `origin` → `https://github.com/Gariyuuu/phone-watchdog-web.git`
  (confirmed via `git remote -v`).
- **Tracking:** `main` is up to date with `origin/main` (confirmed via
  `git status`).
- **Working tree at the START of this audit:** Clean. `git status`
  reported "nothing to commit, working tree clean." No untracked files,
  no staged/unstaged changes.
- **Working tree as of the END of this audit (current state):**
  **Dirty — by design, as the direct output of this documentation task.**
  Per the task's explicit instructions, **nothing was committed.**
  Exact `git status` output at the end of this session:
  - `modified: CLAUDE.md` (rewritten from a one-line `@AGENTS.md` include
    into the full operating manual)
  - `Untracked files:` `API_REFERENCE.md`, `ARCHITECTURE.md`,
    `CHANGELOG.md`, `DATABASE.md`, `DECISIONS.md`, `DEPLOYMENT.md`,
    `FEATURES.md`, `FILE_MAP.md`, `HANDOFF.md`, `PROJECT_STATE.md` (this
    file), `ROADMAP.md`, `SECURITY.md`, `SESSION_LOG.md`, `TASKS.md`,
    `TESTING.md`, `UI_SYSTEM.md`
  - No other file (nothing under `src/`, no config file) was modified —
    confirmed via `git diff --stat`, which shows only `CLAUDE.md`
    changed among tracked files.
  - These 17 files (16 new + 1 modified) are the entire diff.
    **Not staged, not committed, not pushed** — left exactly as the task
    instructed ("Do not commit, push, deploy, reset, or discard
    anything"). The next session (human or AI) should commit these
    deliberately, once reviewed, rather than assuming it's already done.
- **Latest commit (unchanged by this session):**
  `ecd6d898461bed3356854674d8af92b20d990d6` ("Add custom favicon
  (watchdog emoji)"), authored by Gary Wang, dated 2026-08-06 03:42:32
  -0700.
- **Full commit history (5 commits total, oldest to newest):**
  1. `fedeec1` — "Initial commit from Create Next App"
  2. `5ac4574` — "Add browser-based phone detection with alarm, overlay,
     and catch log" (the real feature commit: webcam/TensorFlow.js
     detection, the alarm UI, `src/app/api/catches/route.ts`,
     `src/proxy.ts`, `.env.example`)
  3. `ab92aae` — "Improve phone detection reliability for hand-held/
     occluded phones" (tuned the debounce constants, switched to
     `mobilenet_v2`, raised webcam resolution request)
  4. `d9831ab` — "Add agent/claude tooling config" (added
     `.agents/skills/`, `.claude/skills/` symlinks, `skills-lock.json` —
     Neon Agent Skills, not application code)
  5. `ecd6d89` — "Add custom favicon (watchdog emoji)" (added
     `src/app/icon.svg`)
- **No uncommitted or untracked files of any kind at the START of this
  audit.** See "Working tree as of the END of this audit" above for the
  current (post-documentation-write) state.

## Active objective

No feature work was in progress when this audit began. The active
objective **for this session** was: bring `phone-watchdog-web`'s
documentation up to the same standard already completed for sibling
repos `chamber-seven` and `buildstrike-arena` (17 memory files), using
only facts verified from this repo's own code/config/git history/live
deployment — not copying content from those siblings.

## Last completed task (before this audit)

The last product change was commit `ecd6d89` (custom favicon), followed
by `d9831ab` (agent tooling config, not a product change). Before that,
`ab92aae` was the last functional change: reliability tuning for the
phone-detection debounce logic.

## Current unfinished task

**Documentation audit (this session).** Exact related files: all files
listed in the "Report back" section of the task, i.e. every file in this
memory system. Status at the end of this session: **complete** — all 17
files created/rewritten. See `TASKS.md` → "Current task" for the
still-open follow-up work this audit *surfaced* but did not fix (the
lint error, primarily).

## What has been attempted this session

1. Read the pre-audit `CLAUDE.md` (a one-line `@AGENTS.md` include) and
   `AGENTS.md` in full.
2. Read every source file: `src/app/page.tsx`, `src/app/layout.tsx`,
   `src/app/globals.css`, `src/app/icon.svg`, `src/app/api/catches/route.ts`,
   `src/proxy.ts`.
3. Read every config file: `package.json`, `tsconfig.json`,
   `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`,
   `.gitignore`, `.env.example`, `skills-lock.json`, `.vercel/project.json`.
4. Checked `.env.local`'s variable **names** only (never read/copied any
   value) to build the full environment-variable inventory.
5. Inspected `node_modules/@vercel/postgres`'s own source to confirm
   which env var (`POSTGRES_URL`) it actually reads.
6. Inspected `node_modules/next/dist/docs/` to confirm the `proxy.ts`
   file-convention rename is real (not a misconfiguration).
7. Ran `git log`, `git status`, `git branch -a`, `git remote -v` to build
   the exact git state above.
8. Ran `npx tsc --noEmit`, `npm run lint`, `npm run build` — all
   read-only/non-destructive static verification. No dev server was
   started; no database was touched.
9. Ran `npx vercel ls`, `npx vercel project ls`, `npx vercel inspect
   <deployment-url>`, `npx vercel env ls` — read-only Vercel CLI queries
   (no deploy, no env var changes) to confirm production URL, deployment
   recency/status, Node runtime, and which env vars are configured on
   which Vercel environments (names only).
10. Ran a single read-only `curl` against
    `https://phone-watchdog-web.vercel.app/` (no credentials supplied) to
    confirm the live Basic Auth gate responds as `proxy.ts` implies it
    should. No password was guessed or attempted.
11. Checked the sibling repo `~/Projects/phone-watchdog` (`ls`, one
    `cat` attempt on a nonexistent `README.md`) only to confirm it's an
    unrelated Python prototype, per instructions.

## What currently works (verified this audit)

- `npx tsc --noEmit` — passes, no output.
- `npm run build` — succeeds. Turbopack build, all 4 routes generated
  (`/`, `/_not-found`, `/api/catches`, `/icon.svg`), TypeScript check
  passes as part of the build.
- The production deployment is live and responding: `curl` against
  `https://phone-watchdog-web.vercel.app/` returns `401` with
  `WWW-Authenticate: Basic realm="phone-watchdog"` and body
  `Authentication required.` — exactly what `src/proxy.ts` would produce,
  confirming the deployed code matches the local source and the Basic
  Auth gate is functioning in production.
- `SITE_PASSWORD` is confirmed configured on Vercel for Production and
  Preview (via `vercel env ls`, names/environments only, not values).
- `POSTGRES_URL` and the rest of the Neon/Postgres var set are confirmed
  configured on Vercel for Production, Preview, and Development.
- Vercel deployment history shows 5 "Ready" production deployments, the
  most recent timestamped seconds after the latest git commit — strong
  evidence of a working GitHub → Vercel auto-deploy pipeline.

## What currently fails / is unverified

- **`npm run lint` fails.** One ESLint error:
  `react-hooks/set-state-in-effect` at `src/app/page.tsx:85` (calling
  `refreshLog()` synchronously inside a `useEffect`). Verified by
  directly running the command; not fixed this session (documentation-
  only audit, per task constraints). See `TASKS.md` `TASK-001`.
- **No runtime/browser verification was performed.** Whether the webcam
  capture, the TensorFlow.js model, the actual phone-detection accuracy,
  the siren, the full-screen alarm overlay, or the end-to-end
  catch-logging round trip to the real Postgres database all work as
  intended **in a real browser against the real database** is **not
  verified this session** — no dev server was started and no database
  query was run, per the task's explicit "do not start long-running dev
  servers, do not touch a real database" constraint. The code reads as
  internally consistent and passes static checks, which is a weaker
  claim than "confirmed working at runtime."
- **Whether Vercel's GitHub auto-deploy is actually configured** (vs. all
  5 deployments having been pushed manually via `vercel deploy --prod`
  around the same times as commits) is **Inferred**, not directly
  confirmed — `vercel git ls` did not return a clear connect/disconnect
  status in the CLI output captured this session, and no GitHub Actions
  workflow or Vercel deploy hook config file exists in this repo to
  confirm it structurally.

## Errors observed this session

- `npm run lint` → 1 error (`react-hooks/set-state-in-effect`,
  `src/app/page.tsx:85`). See above. This is the only error encountered
  this session; it is pre-existing, not caused by this audit (no
  application code was edited).

## Blockers

None for the documentation task (now complete). For the lint fix
(`TASKS.md` `TASK-001`), no blockers — it's a small, well-understood fix,
just not made during this documentation-only session.

## Assumptions currently in effect (not independently re-verified beyond
what's stated above)

- That the Neon Postgres database behind `POSTGRES_URL` currently
  contains a `catches` table matching the shape `ensureTable()` expects
  (not verified — would require querying the live database, out of
  scope this session).
- That the production deployment's `SITE_PASSWORD` value matches
  whatever the developer expects/remembers (not verified — only the
  *presence* of the env var was confirmed, never its value).
- That no one else is concurrently deploying or modifying this Vercel
  project (deployment list was a point-in-time snapshot at audit time).

## Next three recommended actions

1. Fix `TASK-001` (the `react-hooks/set-state-in-effect` lint error in
   `src/app/page.tsx:85`) so `npm run lint` passes cleanly — it's the
   only red signal in the entire verification suite.
2. Do a real runtime smoke test per `TESTING.md`'s manual checklist
   (start the dev server, grant webcam access, hold up a phone, confirm
   the alarm fires and clears, confirm a row appears via `GET
   /api/catches`) — this has apparently never been documented as having
   happened, and is the only way to move the core feature from "code
   complete, statically verified" to "actually verified."
3. Decide whether to clean up the unreferenced default `create-next-app`
   assets in `public/` and rewrite the still-stock `README.md`, or
   deliberately leave them (both are low-severity, cosmetic-only items —
   see `TASKS.md` "Low priority").

## Verification required before continuing

Anyone picking this up next should, at minimum, re-run
`npx tsc --noEmit && npm run lint && npm run build` and re-run
`git status`/`git log --oneline -5` to confirm nothing has changed since
this snapshot before trusting any fact above as still current.
