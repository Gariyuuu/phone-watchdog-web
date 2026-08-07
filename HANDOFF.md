# HANDOFF.md — Start Here

## What is this project?

Phone Watchdog (web) — a single-page Next.js app that uses your webcam
and a client-side TensorFlow.js object detector (`coco-ssd`) to catch you
holding your phone, then puts up a full-screen red alarm with a siren
until you put it down. Every catch is logged to a Postgres table. The
whole site is gated behind one shared HTTP Basic Auth password
(`SITE_PASSWORD`). It's a personal accountability tool, not a
multi-user product — no accounts, no per-user data.

Live at **https://phone-watchdog-web.vercel.app** (confirmed responding
correctly with its Basic Auth gate as of 2026-08-06).

**Do not confuse this with `~/Projects/phone-watchdog`** (no `-web`
suffix) — that's a separate Python prototype for the same idea. No
shared code/API/database between the two (verified from both sides).
This repo's own commit history calls itself a "replacement" for that
script, but the sibling repo's own docs don't describe itself as
deprecated — treat "replaced" as this repo's framing, not a confirmed
fact about the sibling's current status. See `CLAUDE.md`'s "Sibling
project note" and `DECISIONS.md` `DEC-001` for the full caveat.

## What should I read first?

In this order: `CLAUDE.md` (full operating manual) → `PROJECT_STATE.md`
(exact current snapshot) → `TASKS.md` (what to work on). Then whichever
of `ARCHITECTURE.md` / `FEATURES.md` / `API_REFERENCE.md` / `DATABASE.md`
/ `UI_SYSTEM.md` / `SECURITY.md` / `DEPLOYMENT.md` / `TESTING.md` is
relevant to your specific task.

## What is the current task?

**None actively in progress.** The prior session (2026-08-06) was a
documentation-only audit that produced this entire memory system; it did
not change any application code. See `TASKS.md` → "Current task" for the
exact same framing.

The best next pick, if the user wants suggestions, is `TASKS.md`
`TASK-001`: fix the one currently-failing check, `npm run lint`'s
`react-hooks/set-state-in-effect` error at `src/app/page.tsx:85`. But
**confirm with the user before starting it** — don't assume it's wanted.

## What was the previous session doing?

A full repository audit: read every source/config file, checked git
history, ran `tsc --noEmit`/`lint`/`build`, and made several read-only
Vercel CLI queries (deployment list, env var names/environments, one
unauthenticated `curl` against the production URL) to confirm the live
deployment's actual state. Produced all 17 memory files listed below. No
application code was touched.

## What works right now?

- **Confirmed working, live, this audit:** the Basic Auth gate
  (`src/proxy.ts`) — verified via a real `curl` against production
  returning the expected `401`/`WWW-Authenticate` challenge.
- **Statically verified (typechecks + builds), but not runtime-tested:**
  the webcam capture, the TensorFlow.js detection loop, the alarm siren/
  overlay, and the catch-log API round trip. All the code reads as
  internally consistent, but no dev server was started and no real
  webcam/database interaction was exercised this session — see
  `PROJECT_STATE.md` and `FEATURES.md` for the exact verification
  ceiling on each.

## What is broken?

`npm run lint` fails with one error
(`react-hooks/set-state-in-effect`, `src/app/page.tsx:85` — calling
`refreshLog()`, which sets state, synchronously inside a `useEffect`
body). This is the only confirmed-broken thing in the repo. See
`TASKS.md` `TASK-001` for the fix options already worked out.

## What should I do next?

If the user gives you a specific task, do that. If they ask "what's
next" without more direction: propose `TASK-001` (the lint fix — small,
well-scoped, low risk) and `TASK-002` (a real runtime smoke test of the
core feature, which has apparently never been done) from `TASKS.md`.
Don't invent new feature work without being asked.

## Which files are most important?

- `src/app/page.tsx` — the entire app's client logic (webcam, detection,
  alarm, log UI). Everything of substance lives here.
- `src/app/api/catches/route.ts` — the only server logic beyond auth.
- `src/proxy.ts` — the only access control in the app.
- `.env.local` / Vercel's env var config — governs whether the DB and
  auth gate actually work; never read/print/commit real values from
  here.

## Which areas are dangerous to modify?

- `src/proxy.ts` — weakening or removing this removes the only barrier
  between the public internet and the app.
- `SITE_PASSWORD` / `POSTGRES_URL` (and the rest of the Neon var set) on
  Vercel — rotating or unsetting either has real consequences (open site,
  or a silently different/empty database) — see `CLAUDE.md` "DO NOT
  CHANGE WITHOUT REVIEW."
- The debounce constants at the top of `page.tsx`
  (`CONFIDENCE_THRESHOLD`, `TRIGGER_WINDOW`/`TRIGGER_HITS`,
  `CLEAR_WINDOW`/`CLEAR_HITS`) — previously tuned to fix a real
  false-negative problem (commit `ab92aae`); don't change incidentally.
- `ensureTable()` in `route.ts` — the only schema definition; editing it
  will **not** retroactively alter an already-existing live table (see
  `DATABASE.md`).

## Which commands should I run first?

```bash
git status && git log --oneline -5   # confirm nothing has changed since this handoff
npx tsc --noEmit
npm run lint          # expect 1 pre-existing failure — see TASKS.md TASK-001
npm run build
```

## How do I verify the app still works?

Static checks only get you so far (see above). For a real check, run
`npm run dev`, open `http://localhost:3000` in a browser with a webcam,
and follow `TESTING.md`'s manual smoke-test checklist (Start → grant
webcam → hold up a phone → confirm the alarm fires and clears → confirm
a row appears in the catch log). This has apparently never been formally
done and recorded — see `TASKS.md` `TASK-002`. Do not run this against
the real production database without the user's awareness; test locally
or against a disposable database first if possible.

## Prompt for the next Claude Code account

*(Refreshed 2026-08-07 — a checkpoint pass re-verified this whole memory
system against the live repo, fixed several stale cross-references, and
confirmed the docs were committed as `e2f976e`. See `SESSION_LOG.md`'s
2026-08-07 entry for the full diff of what changed in that pass.)*

Copy-paste this to start a new session cleanly:

```
Read CLAUDE.md, PROJECT_STATE.md, and TASKS.md in full before doing
anything else. Then:

1. Run `git status`, `git log --oneline -5`, and `git fetch origin`
   (read-only) and confirm the repo state matches what PROJECT_STATE.md
   describes (as of 2026-08-07: clean tree, up to date with origin,
   latest commit `e2f976e`). If it doesn't (someone else has
   committed/changed things since), stop and tell me what's different
   before proceeding.
2. Run the verification suite: `npx tsc --noEmit && npm run lint && npm
   run build`. Confirm tsc and build still pass. Confirm whether the
   known lint error (react-hooks/set-state-in-effect,
   src/app/page.tsx:85) is still present (it was, as of 2026-08-07) or
   has been fixed since this handoff was written.
3. In 3-5 sentences, summarize your understanding of: what this project
   is, what the current task is, and what specifically is unverified or
   blocking it. I want to confirm you've actually absorbed the memory
   files, not just skimmed them.
4. Flag anything in CLAUDE.md/PROJECT_STATE.md/TASKS.md/FEATURES.md that
   looks stale or contradicts what you find in the actual code — don't
   silently work around a contradiction, surface it.
5. Note the sibling-repo relationship before touching anything related to
   it: `~/Projects/phone-watchdog` (no `-web`) is a separate git repo — a
   local Python/YOLO prototype for the same idea. The two repos share no
   code, API, or database at runtime (verified from both sides). This
   repo's own commit message calls itself a "replacement" for that
   script, but the sibling's own docs don't describe itself as
   deprecated — treat that word as historical framing, not a confirmed
   fact about whether the Python version is still used, and don't edit
   the sibling repo from this session (read-only reference only).
   This repo (unlike the sibling) does persist data: a Postgres
   `catches` table storing two timestamps per phone-catch event
   (`caught_at`/`cleared_at`) — never any image/video/frame data. See
   `SECURITY.md`'s "Data-flow consistency check" section for the full
   verification of that claim against the sibling's "nothing persisted"
   claim.
6. Check TASKS.md's "Current task" section — if it says nothing is in
   progress, ask me what to work on next rather than guessing; don't
   assume TASK-001 is what I want without confirming.
7. Preserve the existing architecture (client-side-only detection via
   TensorFlow.js, the single shared-password Basic Auth gate, the
   ad-hoc ensureTable() schema approach) unless you find a genuinely
   strong reason to change it — and if you do, write it up in
   DECISIONS.md rather than changing it silently.
8. Do not start a long-running dev server, touch the real production
   database, or deploy, without my explicit go-ahead.
9. After completing any meaningful work, update PROJECT_STATE.md,
   TASKS.md, and append to SESSION_LOG.md before ending your session —
   don't let the next handoff start from a stale snapshot.
```
