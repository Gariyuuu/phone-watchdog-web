# CLAUDE.md — Operating Manual for Phone Watchdog (web)

This file is the primary entry point for any AI coding agent (or human)
picking up this repository. Read this first, then `PROJECT_STATE.md`, then
`TASKS.md`, before touching code.

This entire memory system (`CLAUDE.md`, `PROJECT_STATE.md`, `ARCHITECTURE.md`,
`FILE_MAP.md`, `FEATURES.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`,
`DATABASE.md`, `API_REFERENCE.md`, `UI_SYSTEM.md`, `SECURITY.md`,
`TESTING.md`, `DEPLOYMENT.md`, `CHANGELOG.md`, `SESSION_LOG.md`,
`HANDOFF.md`) was generated on **2026-08-06** by auditing the actual
repository (source, config, git history, and the live Vercel
deployment/env-var configuration) — not by recalling prior chat history.
Before this audit, `CLAUDE.md` was a one-line `@AGENTS.md` include with no
project-specific content; that has been replaced with this file.
Where something couldn't be verified from the repo, it is labeled
**Unverified** or **Inferred** rather than stated as fact.

## Project identity

- **Name:** Phone Watchdog (web) — `package.json` name: `phone-watchdog-web`.
- **One-sentence description:** A single-page Next.js app that uses your
  webcam and a client-side TensorFlow.js object detector to catch you
  holding your phone, then puts up a full-screen red alarm with a siren
  until you put it down.
- **Detailed summary:** You open the site, click Start, and grant webcam
  access. A `coco-ssd` (COCO-SSD) TensorFlow.js model runs entirely in the
  browser tab, sampling the video feed every 300ms for a `"cell phone"`
  detection. A rolling-window debounce (needs the phone seen in at least
  3 of the last 6 samples to trigger, and fully absent for 10 consecutive
  samples to clear) avoids false triggers/clears from a single missed or
  spurious frame. On trigger, a full-screen red overlay reading "PUT YOUR
  PHONE DOWN" appears along with a two-tone siren built from the Web Audio
  API, and a "catch" is logged to a Postgres table via an API route. The
  overlay auto-dismisses once the phone is gone for the clear window, or
  the user presses Escape. A simple log of past catches (timestamp +
  duration) is shown under the video. The whole site is gated behind a
  single shared Basic Auth password.
- **Target audience:** The developer, personally — a self-accountability
  tool for reducing personal phone use while working/studying at a
  webcam-equipped computer. No multi-user concept, no accounts.
- **Current development stage:** Small, working hobby project. Core
  detection/alarm/logging loop is implemented and has been iterated on
  once already (accuracy tuning commit `ab92aae`). Deployed and
  publicly reachable, gated by a password. Not a commercial product.
- **Production status:** **Deployed and live** on Vercel at
  **https://phone-watchdog-web.vercel.app** (confirmed this audit — see
  "Deployment" below and `DEPLOYMENT.md`). The production URL currently
  returns `401 Authentication required.` with
  `WWW-Authenticate: Basic realm="phone-watchdog"` when queried without
  credentials, i.e. the app's own Basic Auth gate (`src/proxy.ts`) is
  active and working correctly in production — this is **not** Vercel's
  separate SSO/Deployment-Protection wall, which was not encountered.
- **Repository type:** Single Next.js app, not a monorepo. One
  `package.json` at the repo root.
- **Sibling project note:** `~/Projects/phone-watchdog` (no trailing
  `-web`) is a **separate, unrelated git repository** — a small Python
  script (`monitor.py`) that appears to be the original local/YOLO-based
  prototype this web app replaced. Commit `5ac4574`'s message says
  explicitly: "Replaces the local Python/YOLO prototype with a fully
  client-side TensorFlow.js detector so it can run as a website." The two
  repos do **not** call into each other at runtime — there is no shared
  code, API, or database between them. Do not confuse the two when working
  in either repo.
- **Important scope note:** `~/Projects` (the parent of this repo) is
  **not** a monorepo — it's ~20+ unrelated, independently-pushed git
  repos belonging to the same developer. Nothing in this memory system
  applies outside `~/Projects/phone-watchdog-web`.

## Current status

See `PROJECT_STATE.md` for the exact, timestamped snapshot. Summary:

- **Latest state:** Working tree clean, `main` branch, up to date with
  `origin/main` (GitHub: `Gariyuuu/phone-watchdog-web`). 5 commits total.
  Latest commit `ecd6d89` ("Add custom favicon (watchdog emoji)").
- **Current blockers:** None functionally, but `npm run lint` currently
  **fails** (one ESLint error, not a warning) — see "Known issues" below.
  This is a pre-existing condition, not something introduced by this
  audit.
- **Highest-priority next task:** Fix the `react-hooks/set-state-in-effect`
  lint error in `src/app/page.tsx` (line 85) so `npm run lint` passes
  cleanly. See `TASKS.md`.

## Technology stack

Versions below are copied verbatim from `package.json` / installed
`node_modules/*/package.json` — not guessed.

- **Language:** TypeScript `^5` (installed: `5.9.3`), `strict: true` in
  `tsconfig.json`.
- **Frontend framework:** Next.js `16.2.12` (App Router, Turbopack build).
  **This is a very new/pre-release-era Next.js with breaking changes vs.
  older training data** — see `AGENTS.md`'s warning, which is accurate:
  the `middleware.ts` file convention has been renamed to `proxy.ts`
  (confirmed via `node_modules/next/dist/docs/.../proxy.md`, which states
  "The `middleware` file convention is deprecated and has been renamed to
  `proxy`"). This repo already uses the new convention correctly
  (`src/proxy.ts`).
- **UI runtime:** React `19.2.4` / React DOM `19.2.4`.
- **Package manager:** npm (`package-lock.json` present; no other
  lockfile).
- **Styling:** Tailwind CSS `^4` (installed: `4.3.3`) via
  `@tailwindcss/postcss`. No component library — every element in
  `page.tsx` is raw JSX with inline Tailwind utility classes.
- **ML / detection:** `@tensorflow/tfjs` `^4.22.0` (installed `4.22.0`) +
  `@tensorflow-models/coco-ssd` `^2.2.3` (installed `2.2.3`), loaded via
  dynamic `import()` client-side only, using the `mobilenet_v2` base
  model (chosen over the faster `lite_mobilenet_v2` default — see the
  code comment in `page.tsx` and `DECISIONS.md`).
- **Database:** `@vercel/postgres` `^0.10.0` (installed `0.10.0`),
  reading `process.env.POSTGRES_URL` (confirmed by reading the package's
  own source, `node_modules/@vercel/postgres/dist/chunk-7IR77QAQ.js`).
  Backed by a Neon Postgres instance provisioned through Vercel's
  Postgres/Neon integration (inferred from the full set of
  `PG*`/`POSTGRES_*`/`NEON_*`/`DATABASE_URL*` env vars present in
  `.env.local` and configured on Vercel — see "Environment setup").
- **Hosting:** Vercel. Project `phone-watchdog-web`, org/team
  `garywangsmes-8349s-projects` (from `.vercel/project.json` and `vercel`
  CLI output). Production alias: `https://phone-watchdog-web.vercel.app`.
  Confirmed via `vercel ls` this audit: 5 production deployments, all
  `● Ready`, most recent one timestamped within seconds of the latest git
  commit — strong evidence Vercel auto-deploys on push to `main` via its
  GitHub integration (GitHub remote: `Gariyuuu/phone-watchdog-web`).
  Node.js runtime on Vercel: **24.x** (from `vercel project ls` output;
  not pinned via an `engines` field in `package.json` — Vercel's project
  setting is the actual source of truth).
- **Auth:** No user accounts. A single shared password gate
  (`SITE_PASSWORD` env var) implemented as HTTP Basic Auth in
  `src/proxy.ts`. Set on Vercel for the `Preview` and `Production`
  environments only (confirmed via `vercel env ls`) — **not** set for
  `Development`, matching `proxy.ts`'s explicit "no password configured
  (e.g. local dev) — don't lock anyone out" fallback.
- **Analytics:** None found in the repo.
- **Payments:** None found in the repo.
- **Email provider:** None found in the repo.
- **Testing libraries:** **None installed.** No Jest/Vitest/Playwright/
  Cypress in `package.json`, no test files anywhere in the repo (verified
  via `find` for `*.test.*` / `*.spec.*`). No `test` script exists. See
  `TESTING.md`.
- **Build tools:** Next.js/Turbopack (`next build`, confirmed working
  this audit — see "Testing and verification").
- **Linting:** ESLint `^9` (installed `9.39.5`), flat config
  (`eslint.config.mjs`), extends `eslint-config-next` `16.2.12`
  (`core-web-vitals` + `typescript` rule sets). **Currently fails** — see
  "Known issues."
- **Formatting:** No Prettier config, no format script. Formatting is
  whatever ESLint enforces plus editor defaults.
- **External APIs:** None beyond the webcam (`navigator.mediaDevices`,
  browser API, not a network call) and Google Fonts loaded via
  `next/font/google` at build time (Geist, Geist Mono). No third-party
  network APIs called at runtime from client or server code.
- **AI/agent tooling config present but not app code:** `.agents/skills/`
  and `.claude/skills/` (a symlink to `.agents/skills/`) contain vendored
  Neon Agent Skills (`skills-lock.json` pins them to
  `neondatabase/agent-skills` on GitHub). These are editor/agent tooling
  aids for working with Neon, not part of the deployed application.

## Essential commands

All commands run from the repository root (`~/Projects/phone-watchdog-web`)
— there is no monorepo/workspace split.

```bash
npm install                # install dependencies

npm run dev                 # next dev — http://localhost:3000
                             # SITE_PASSWORD is unset on Development in
                             # Vercel's env config, and .env.local (if
                             # present locally) governs local behavior —
                             # see Environment setup before assuming the
                             # gate is on or off locally.

npm run build                # next build (Turbopack) — production build.
                              # Verified this audit: succeeds cleanly
                              # ("Compiled successfully", TypeScript check
                              # passes, all routes generated).
npm start                   # next start — serve the production build locally

npm run lint                 # eslint (flat config). Verified this audit:
                              # CURRENTLY FAILS with one error — see
                              # "Known issues" below and TASKS.md.

npx tsc --noEmit             # not an npm script, but the way to typecheck
                              # directly. Verified this audit: passes with
                              # no output (clean).
```

There is no `npm test` script (no test framework installed — see
`TESTING.md`). There is no database migration/seed/reset script — the
single table is created ad hoc by `CREATE TABLE IF NOT EXISTS` inside the
API route itself (see `DATABASE.md`). There is no codegen step.

## Repository structure

```
phone-watchdog-web/
├── src/
│   ├── app/
│   │   ├── page.tsx           # THE app. Single client component: webcam
│   │   │                       # capture, TensorFlow.js detection loop,
│   │   │                       # alarm overlay/siren, catch-log UI, and
│   │   │                       # the fetch calls to /api/catches.
│   │   ├── layout.tsx          # Root layout: Geist/Geist Mono fonts, page
│   │   │                       # <title>/description metadata.
│   │   ├── globals.css         # Tailwind import + two CSS custom
│   │   │                       # properties (--background/--foreground)
│   │   │                       # with a prefers-color-scheme dark override.
│   │   ├── icon.svg            # Custom favicon: a dog emoji (🐕) in an
│   │   │                       # inline <text> SVG. Takes precedence over
│   │   │                       # favicon.ico per Next.js file-convention
│   │   │                       # rules.
│   │   ├── favicon.ico         # Leftover default create-next-app favicon.
│   │   │                       # Not the one actually shown (icon.svg wins).
│   │   └── api/
│   │       └── catches/
│   │           └── route.ts    # THE only API route. GET/POST/PATCH on a
│   │                           # `catches` Postgres table.
│   └── proxy.ts                 # Next.js 16 "proxy" (formerly
│                                 # "middleware") file. Site-wide HTTP
│                                 # Basic Auth gate using SITE_PASSWORD.
├── public/                      # Default create-next-app SVGs
│                                 # (file/globe/next/vercel/window.svg) —
│                                 # ⚠️ UNREFERENCED by any source file
│                                 # (verified via grep across src/). Dead
│                                 # scaffold assets, never cleaned up.
├── .agents/skills/               # Vendored Neon Agent Skills (Markdown
│   ├── neon/SKILL.md             # instructions for AI coding agents on
│   └── neon-postgres/SKILL.md    # how to use Neon/Neon Postgres). Not
│                                 # application code.
├── .claude/skills/               # Symlinks into .agents/skills/ (same
│   ├── neon -> ../../.agents/skills/neon                       content,
│   └── neon-postgres -> ../../.agents/skills/neon-postgres     different tool's discovery path).
├── skills-lock.json              # Pins the two skills above to a specific
│                                 # commit hash of neondatabase/agent-skills.
├── AGENTS.md                     # Short warning that this Next.js version
│                                 # has breaking changes vs. training data.
│                                 # Verified accurate (see proxy.ts note
│                                 # above).
├── CLAUDE.md                     # This file. Previously just `@AGENTS.md`
│                                 # (an include, no real content) before
│                                 # this audit.
├── README.md                     # Default, unedited create-next-app
│                                 # README. Stale/generic — describes none
│                                 # of this project's actual features. This
│                                 # memory system supersedes it.
├── .env.example                  # Documents SITE_PASSWORD and
│                                 # POSTGRES_URL (the only two vars a new
│                                 # developer needs to know about; the rest
│                                 # of the Neon/Postgres vars are
│                                 # auto-populated by the Vercel↔Neon
│                                 # integration, not hand-set).
├── .env.local                    # Local env values (gitignored). Present
│                                 # on disk with real Neon/Postgres
│                                 # credentials and no SITE_PASSWORD entry
│                                 # among the names checked — see
│                                 # `PROJECT_STATE.md` for the exact
│                                 # variable-name inventory (values were
│                                 # never read or copied anywhere).
├── next.config.ts                # Empty — no custom Next.js config.
├── eslint.config.mjs             # Flat ESLint config.
├── tsconfig.json                 # `@/*` → `src/*` path alias, strict mode.
├── postcss.config.mjs            # `@tailwindcss/postcss` plugin only.
└── package.json                  # `dev`/`build`/`start`/`lint` scripts.
```

**What should NOT be placed where:** there is no established multi-file
convention to violate yet (this is a one-page app) — but if the app grows
past one page, keep the detection/alarm logic's client-only nature intact
(it uses `navigator.mediaDevices`, `AudioContext`, and dynamic imports of
TensorFlow.js specifically to avoid pulling ML code into any
server-rendered/SSR path).

## Architecture summary

See `ARCHITECTURE.md` for the full write-up with a Mermaid diagram. Short
version:

- **Everything except persistence and the auth gate runs in the browser.**
  Webcam capture, TensorFlow.js model loading/inference, the debounce
  state machine, the siren, and the alarm overlay are all client-side
  state in `src/app/page.tsx` (a single `"use client"` component). There
  is no server-side detection logic at all.
- **The only server code is:** `src/proxy.ts` (Basic Auth gate, runs on
  every request except static assets) and `src/app/api/catches/route.ts`
  (three tiny handlers: log a catch, list recent catches, mark one
  cleared).
- **The database is a single table** (`catches`), created lazily
  (`CREATE TABLE IF NOT EXISTS`) inside every API handler rather than via
  a migration file — there is no migration system in this repo.
- **No real-time/WebSocket layer.** The client polls nothing continuously
  server-side; it only calls the API on catch-start, catch-clear, and
  once on page load to populate the log.
- **Client-server data flow is fire-and-forget on the client side:** DB
  write failures are caught and silently ignored (the alarm/detection UX
  never blocks on the network) — see the `.catch(() => {})` calls in
  `page.tsx`. This is a deliberate resilience choice, not an oversight,
  per the inline comment "logging is best-effort; ignore failures here."

## Coding conventions

These are **Verified** (observed in the existing, small codebase) unless
marked Inferred/Recommended. Given the repo's size (4 source files), this
is necessarily a thin sample — treat conventions below as "what exists
today," not a settled house style.

- **Naming:** `camelCase` for functions/variables/hooks
  (`triggerAlarm`, `refreshLog`, `runDetection`), `PascalCase` for the
  one component (`Home`) and types (`CatchRow`), `SCREAMING_SNAKE_CASE`
  for module-level tuning constants (`CONFIDENCE_THRESHOLD`,
  `TRIGGER_WINDOW`, `CLEAR_HITS`, etc.).
  File names: lowercase for Next.js special files (`page.tsx`,
  `layout.tsx`, `route.ts`, `proxy.ts` — these names are Next.js
  conventions, not a project choice).
- **Imports:** Path alias `@/*` → `src/*` configured in `tsconfig.json`
  but **not actually used anywhere yet** — every existing import is
  either a bare package import or a relative/framework-implicit one (no
  file currently imports another local file across directories). Follow
  the alias if/when that need arises.
- **Components:** Function components only. `page.tsx` is explicitly
  `"use client"` (needed for hooks, `navigator.mediaDevices`,
  `AudioContext`). `layout.tsx` is a Server Component (default, no
  directive).
- **Heavy client-only libraries are dynamically imported inside a
  `useEffect`**, not imported at module top-level — `@tensorflow/tfjs`
  and `@tensorflow-models/coco-ssd` are both loaded via `await import(...)`
  inside the model-loading effect in `page.tsx`, avoiding bundling
  TensorFlow.js into any server code path or blocking initial paint.
  **Recommended:** follow this pattern for any future heavy/browser-only
  dependency.
- **API routes:** One file per resource under `src/app/api/`, exporting
  named `GET`/`POST`/`PATCH` functions per the Next.js App Router
  convention. Each handler independently calls a local `ensureTable()`
  helper before querying — i.e. the "migration" is idempotent and
  repeated on every request rather than run once. **Recommended if this
  grows:** move to a real migration step so every request doesn't pay for
  a `CREATE TABLE IF NOT EXISTS` round-trip.
- **Error handling:** API handlers wrap all logic in `try/catch` and
  return a `500` with `{ error: "database not configured", detail:
  String(err) }` on any failure — this is a **generic message reused for
  every kind of failure**, not just "DB not configured" (a real DB error,
  a network blip, or a bad query would all produce the same message).
  Client-side, DB-related fetches are best-effort and failures are
  swallowed (`.catch(() => {})`); only the webcam-permission failure path
  (`start()`) surfaces an error to the user (`setError`).
- **Validation:** Minimal. The `PATCH` handler checks that `id` is
  present (`if (!id) return 400`) but performs no type/shape validation
  beyond that (an arbitrary JSON body with a non-numeric `id` would reach
  the SQL query as-is, relying entirely on `@vercel/postgres`'s
  parameterized `sql` tagged-template for injection safety — see
  `SECURITY.md`).
- **Types:** `strict: true`. No `any` casts, no `@ts-ignore`/
  `@ts-expect-error` found anywhere in `src/` (verified via grep). One
  notable inferred type: `modelRef` is typed as
  `Awaited<ReturnType<typeof import("@tensorflow-models/coco-ssd").load>>
  | null` — a type-only dynamic import used purely to get the model's
  type without a static value import.
- **Comments:** Sparse but present at every non-obvious tuning decision
  (the debounce window constants, the `mobilenet_v2` choice, the
  best-effort logging choice) — follow this pattern; don't add comments
  that restate what the code already says.
- **Tests:** None exist. No test-writing convention has been established.

## UI and design system

Full detail in `UI_SYSTEM.md`. Key facts and exact file locations:

- **Design tokens:** `src/app/globals.css` — just two CSS custom
  properties, `--background`/`--foreground`, with a
  `prefers-color-scheme: dark` override. Remapped into Tailwind via
  `@theme inline`. **No other design-token system** (no spacing/radius/
  shadow scale, no color palette beyond Tailwind's stock utility classes
  used directly, e.g. `bg-blue-600`, `text-red-600`, `bg-red-800`).
- **Component library:** None. No shadcn/ui, no headless UI kit — every
  element is a plain HTML tag with Tailwind utility classes.
- **Typography:** Geist (sans) and Geist Mono, loaded via
  `next/font/google` in `layout.tsx`; body font-family falls back to
  `Arial, Helvetica, sans-serif` per `globals.css` (the Geist variable
  fonts are wired via CSS variables but the base `body` rule doesn't
  reference `var(--font-sans)` — see `UI_SYSTEM.md` for the exact
  discrepancy).
- **Pages:** Exactly one route, `/` (`src/app/page.tsx`). No navigation,
  no routing beyond the implicit Next.js `_not-found` and the API/icon
  routes.
- **Icon system:** None beyond the single custom favicon (`icon.svg`).

## Environment setup

**All environment variables found in this repo** (names only — no values
were read into this documentation; see `SECURITY.md` for how this was
verified):

| Variable | Purpose | Required? | Client/Server | Format | Safe placeholder |
|---|---|---|---|---|---|
| `SITE_PASSWORD` | Shared password checked by `src/proxy.ts`'s Basic Auth gate for the whole site | Optional at the code level (if unset, the gate is bypassed — see `proxy.ts`), but **set on Vercel Production and Preview** (confirmed via `vercel env ls`); **not set on Development** | Server-only | Plain string | `change-me-long-random-string` |
| `POSTGRES_URL` | Postgres connection string read by `@vercel/postgres`'s `sql` tagged template (confirmed by reading the package's own source) | Optional at the code level (every API handler catches connection failures and returns a `500` rather than crashing — see `route.ts`), but **required for the catch log to persist**; set on Vercel for Production/Preview/Development | Server-only | Postgres connection URI, e.g. `postgres://user:pass@host/db?sslmode=require` | `postgres://user:pass@localhost:5432/dev` |

**Also present in `.env.local` (not documented in `.env.example`, and not
referenced by any code in `src/` — verified via grep):**
`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`,
`NEON_PROJECT_ID`, `PGDATABASE`, `PGHOST`, `PGHOST_UNPOOLED`,
`PGPASSWORD`, `PGUSER`, `POSTGRES_DATABASE`, `POSTGRES_HOST`,
`POSTGRES_PASSWORD`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`,
`POSTGRES_URL_NO_SSL`, `POSTGRES_USER`, `VERCEL_OIDC_TOKEN`,
`VITE_NEON_AUTH_URL`. These are the full set auto-populated by Vercel's
Postgres/Neon integration when you connect a Neon database to a Vercel
project — only `POSTGRES_URL` is actually consumed by this app's code.
`VERCEL_OIDC_TOKEN` is a platform-injected token, not something to set
manually, and is **sensitive** — never print or commit its value.
All of the above are also configured on Vercel itself (confirmed via
`vercel env ls`: same variable names present for Production/Preview/
Development, all marked "Encrypted").

`.env.local` is gitignored (`.env*` pattern in `.gitignore`, with
`!.env.example` negation so the example file is still tracked) —
confirmed no secrets are committed (verified via `git log --all` and
`git status`; `.env.local` has never appeared in any commit).

## Database summary

One Postgres table, `catches` (`id`, `caught_at`, `cleared_at`), created
ad hoc on first use rather than via a migration file. See `DATABASE.md`
for the full schema, an ER diagram, and migration-risk notes.

## Authentication and authorization

**There is no user authentication.** No signup, login, session, or OAuth.
The entire site (pages + API routes, since `/api/catches` is not excluded
by the proxy's `matcher`) sits behind one shared HTTP Basic Auth password
(`SITE_PASSWORD`, checked in `src/proxy.ts`). Anyone who knows that one
password has full read/write access to every catch record — there is no
per-user ownership concept at all (by design: this is a single-person
self-monitoring tool). See `SECURITY.md` for the full analysis.

## API and integrations

Full detail in `API_REFERENCE.md`. One API route
(`src/app/api/catches/route.ts`) with three methods (`GET`, `POST`,
`PATCH`) over one table. No external third-party network APIs. No
webhooks. No SDKs beyond `@vercel/postgres` (DB) and the two TensorFlow.js
packages (in-browser ML, not a network API).

## Testing and verification

No automated tests exist (no framework installed, no test files). Before
considering any change "done," run:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

**Verified this audit (2026-08-06):** `tsc --noEmit` passes with no
output. `next build` succeeds cleanly (Turbopack, all 4 routes generated:
`/`, `/_not-found`, `/api/catches`, `/icon.svg`). **`npm run lint`
currently fails** — one `react-hooks/set-state-in-effect` error in
`src/app/page.tsx:85`, calling `refreshLog()` (a state-setting async
function) synchronously inside a `useEffect` body. This is a pre-existing
condition (not introduced by this audit) — see `TESTING.md` and
`TASKS.md` for the fix.

No runtime/browser testing (webcam access, actual detection accuracy, the
siren, the full-screen overlay, or the live database write path) was
performed during this audit — per the task's constraints, no dev server
was started and no real database was touched. See `PROJECT_STATE.md` for
exactly what is and isn't runtime-verified.

## Deployment

Full detail in `DEPLOYMENT.md`. Summary:

- **Hosting:** Vercel, project `phone-watchdog-web`
  (`garywangsmes-8349s-projects` org). Production alias:
  `https://phone-watchdog-web.vercel.app`.
- **Deploy trigger:** Inferred to be automatic on push to `main` via
  Vercel's GitHub integration (GitHub remote `Gariyuuu/phone-watchdog-web`;
  the 5 production deployments' timestamps line up with the 5 commits'
  timestamps almost exactly, e.g. the latest deployment was created 5
  seconds after the latest commit). No GitHub Actions workflow exists in
  this repo (`.github/` does not exist) — any CI would be Vercel's own
  build pipeline, not a repo-defined workflow.
- **Runtime:** Node.js `24.x` on Vercel (from `vercel project ls`; not
  pinned in `package.json`).
- **Verified live (read-only `curl`, this audit):** the production URL
  returns `401` with `WWW-Authenticate: Basic realm="phone-watchdog"` and
  body `Authentication required.` when queried with no credentials —
  i.e., `src/proxy.ts`'s own Basic Auth gate, working as coded, in
  production. No credentials were guessed or tried.

## Critical rules — DO NOT CHANGE WITHOUT REVIEW

- **`src/proxy.ts`** — the only thing standing between the public
  internet and this app (webcam access itself is opt-in per-browser, but
  the catch log / API is fully open to anyone with the password once
  past this gate). Do not weaken the `matcher`, do not add a bypass, and
  do not change the comparison logic (`suppliedPassword === password`)
  without understanding it removes the only access control this app has.
- **`SITE_PASSWORD` env var (on Vercel)** — do not rotate, unset, or
  print its value. It is only configured for Production/Preview; if it's
  ever accidentally removed there the site becomes fully open (the code
  intentionally treats "unset" as "no gate," per the `proxy.ts` comment
  — this is correct for local dev but would be a real exposure in
  production).
- **`POSTGRES_URL` and the other Neon/Postgres env vars** — do not
  regenerate/rotate the underlying Neon database or reconnect a different
  database to this Vercel project without understanding it will silently
  point the deployed app at a different (likely empty) `catches` table.
- **`ensureTable()` in `src/app/api/catches/route.ts`** — the closest
  thing this repo has to a schema definition. If you ever add a real
  migration system, make sure it doesn't fight with this
  `CREATE TABLE IF NOT EXISTS` running on every request.
- **The debounce constants in `page.tsx`** (`CONFIDENCE_THRESHOLD`,
  `DETECT_INTERVAL_MS`, `TRIGGER_WINDOW`, `TRIGGER_HITS`, `CLEAR_WINDOW`,
  `CLEAR_HITS`) encode a previously-tuned trade-off (commit `ab92aae`
  explicitly reworked these to fix false negatives on hand-occluded
  phones). Don't change them incidentally while touching something else.
- **Do not commit real secret values.** `.env.local` is gitignored;
  `.env.example` must stay placeholder-only (it already is, correctly).

## Known issues

See `PROJECT_STATE.md`, `FEATURES.md`, and `TESTING.md` for full detail.
Headline items, in priority order:

1. **`npm run lint` currently fails.** `src/app/page.tsx:85` —
   `react-hooks/set-state-in-effect`: `refreshLog()` (which calls
   `setLog`, a state setter) is invoked synchronously inside the
   model-loading `useEffect` body, which the new React Compiler-era ESLint
   rule flags as a potential cascading-render anti-pattern. Verified by
   directly running `npm run lint` this audit. Not fixed during this
   audit (documentation-only pass, per task constraints) — see
   `TASKS.md` `TASK-001`.
2. **Generic `500` error message reused for all API failures.**
   `src/app/api/catches/route.ts` returns
   `{ error: "database not configured", detail: String(err) }` for
   *every* caught exception in all three handlers, not just genuine
   "no `POSTGRES_URL` set" cases — a transient DB outage or a query bug
   would surface the same misleading message. Low severity (client
   ignores these failures anyway) but worth knowing when debugging.
3. **Unreferenced default assets.** `public/file.svg`, `globe.svg`,
   `next.svg`, `vercel.svg`, `window.svg` are the unedited
   `create-next-app` scaffold images — verified unused via grep across
   `src/`. Dead weight, not a functional bug.
4. **`favicon.ico` is shadowed by `icon.svg`.** Both exist; Next.js's
   file-convention priority means `icon.svg` (the dog emoji) is what
   actually renders. `favicon.ico` is inert leftover scaffold content.
   Not a bug, just worth knowing before "fixing" the favicon by editing
   the wrong file.
5. **No rate limiting, no per-catch ownership.** Anyone who has the
   shared `SITE_PASSWORD` can `POST`/`PATCH` the catch log arbitrarily
   (no per-request throttling, no auth check *inside* the route itself —
   it relies entirely on `proxy.ts` having already gated the request).
   Acceptable for a single-user personal tool; would need real
   authorization before any multi-user use. See `SECURITY.md`.
6. **No automated tests, no CI workflow.** Every change is currently
   verified by `tsc --noEmit` / `npm run lint` / `npm run build` plus
   manual browser testing only (and lint is currently red — see #1).
7. **`@/*` path alias is configured but unused.** Not a bug, just an
   unused convention — every current file happens not to need a
   cross-directory import yet.
8. **`README.md` is the stock, unedited `create-next-app` template.**
   Describes generic Next.js getting-started content, nothing about this
   project. This memory system supersedes it.

## AI working instructions

Future Claude Code sessions (or any AI agent) working in this repo must:

1. Read `CLAUDE.md` (this file).
2. Read `PROJECT_STATE.md`.
3. Read `TASKS.md`.
4. Read whichever of `ARCHITECTURE.md` / `FEATURES.md` / `API_REFERENCE.md`
   / `DATABASE.md` / `UI_SYSTEM.md` / `SECURITY.md` / `DEPLOYMENT.md` is
   relevant to the task at hand.
5. Inspect the affected code directly before changing it — do not trust
   a memory file's description of a function's exact behavior over
   reading the function itself; memory files can go stale.
6. Check `git status` before modifying files.
7. Avoid overwriting unrelated work.
8. Make small, reviewable changes.
9. Run `npx tsc --noEmit && npm run lint && npm run build` after changes
   touching `src/`.
10. Update documentation after meaningful changes (see the permanent
    rules below).
11. Never claim something works without verification — "it typechecks"
    is not the same claim as "it works in the browser with a real
    webcam." Say which one you mean.
12. Never expose secrets (`.env.local` values, `SITE_PASSWORD`,
    `POSTGRES_URL`, `VERCEL_OIDC_TOKEN`, etc.) in output, commits, or
    documentation.
13. Never modify production data (the live `catches` table, reachable via
    the live `POSTGRES_URL`) without explicit user permission, and never
    connect to it directly from a coding session unless the user asks for
    that specifically.
14. Never perform destructive database operations (dropping/truncating
    `catches`, rotating `POSTGRES_URL`) without explicit permission.
15. Never silently replace an existing architectural pattern (e.g.
    swapping the detection model/library, adding real user auth, adding
    a migration framework) with a new one without it being the explicit
    point of the task.
16. Never remove the `AGENTS.md` Next.js-version warning without
    confirming it's actually stale — it was verified accurate this audit
    (the `proxy.ts` rename is real).
17. Never change `src/proxy.ts`'s gating logic, the `SITE_PASSWORD`/
    `POSTGRES_URL` env vars, or Vercel project settings casually — these
    are listed under "DO NOT CHANGE WITHOUT REVIEW" above.
18. Record unresolved uncertainty in the relevant memory file rather than
    guessing and presenting a guess as fact.

## Permanent rules for future development

**After every meaningful coding task:**

1. Update `PROJECT_STATE.md` with the new exact stopping point.
2. Update `TASKS.md` (move/close tasks, add new ones discovered).
3. Append an entry to `SESSION_LOG.md` (do not overwrite prior entries).
4. Update whichever of `FEATURES.md` / `ARCHITECTURE.md` /
   `API_REFERENCE.md` / `DATABASE.md` / `TESTING.md` / `DEPLOYMENT.md` /
   `SECURITY.md` is affected by the change.
5. Remove or correct stale information you notice, even if unrelated to
   your task — but note what you changed and why in `SESSION_LOG.md`.
6. Record meaningful architectural decisions in `DECISIONS.md`.
7. Run the verification commands listed above.
8. Clearly record anything not verified (e.g. "typechecks but not
   runtime-tested with a real webcam") rather than implying full
   verification.
9. Treat this repository's memory files as the permanent source of
   project memory — do not rely on chat history surviving to the next
   session.

**Before every meaningful coding task:**

1. Read `CLAUDE.md`.
2. Read `PROJECT_STATE.md`.
3. Read `TASKS.md`.
4. Read the relevant technical documentation file(s).
5. Run `git status` and `git diff --stat`.
6. Inspect the specific files you're about to change.
7. Confirm the requested work isn't already done (check `TASKS.md`
   "Recently completed" and the actual code).
8. Preserve unrelated work — don't `git checkout`/`reset`/`clean` without
   first stashing or confirming with the user.
9. Identify risks before modifying anything listed under "DO NOT CHANGE
   WITHOUT REVIEW" above.
