# FILE_MAP.md — Practical Repository Map

This repo is small (4 source files). This map is deliberately granular —
at this size, every file matters.

## Application source (`src/`)

### `src/app/page.tsx`

- **Purpose:** The entire application UI and client-side logic: webcam
  capture, TensorFlow.js model loading + detection loop, the
  trigger/clear debounce state machine, the siren, the full-screen alarm
  overlay, and the catch-log list. Client component (`"use client"`).
- **What calls it:** Rendered by the Next.js App Router as the `/` page
  (via `src/app/layout.tsx` wrapping it).
- **What it calls:** `navigator.mediaDevices.getUserMedia`, dynamically
  imported `@tensorflow/tfjs` and `@tensorflow-models/coco-ssd`, the Web
  Audio API (`AudioContext`), and `fetch` calls to
  `/api/catches` (`GET`, `POST`, `PATCH`).
- **When to edit:** Any change to detection behavior (thresholds,
  timing), alarm UX (siren sound, overlay text/design), or the catch-log
  display.
- **Edit risk:** Medium. It's one large stateful component — changing the
  debounce constants or the effect dependency arrays without care can
  reintroduce stale-closure bugs (the code has an explicit comment about
  why the detection interval effect re-subscribes when `caught`/
  `triggerAlarm`/`dismiss` change). Also currently has one known lint
  error at line 85 — see `TASKS.md` `TASK-001` before adding more
  `useEffect` logic near it.

### `src/app/layout.tsx`

- **Purpose:** Root layout — HTML shell, font loading (Geist, Geist
  Mono), page the title tag/`description` metadata.
- **What calls it:** Next.js App Router (automatic, wraps every page).
- **What it calls:** `next/font/google` (`Geist`, `Geist_Mono`), imports
  `./globals.css`.
- **When to edit:** Changing the page title/description, adding a global
  font, adding app-wide providers (there are currently none).
- **Edit risk:** Low. Small, stable file.

### `src/app/globals.css`

- **Purpose:** Tailwind entry point (`@import "tailwindcss"`) plus two
  CSS custom properties (`--background`, `--foreground`) with a
  `prefers-color-scheme: dark` override, remapped into Tailwind's
  `@theme inline` block.
- **What calls it:** Imported once, by `src/app/layout.tsx`.
- **When to edit:** Adding new design tokens, changing the light/dark
  background-foreground pair.
- **Edit risk:** Low, but note the `body` rule's `font-family` falls back
  to `Arial, Helvetica, sans-serif` rather than referencing
  `var(--font-sans)` — see `UI_SYSTEM.md` for the exact discrepancy
  before "cleaning this up."

### `src/app/icon.svg`

- **Purpose:** Custom favicon — a dog emoji (🐕) rendered via inline SVG
  `<text>`. Added in commit `ecd6d89`.
- **What calls it:** Picked up automatically by Next.js's file-convention
  icon resolution (no explicit import anywhere).
- **When to edit:** Changing the favicon.
- **Edit risk:** Low. Note: this file takes priority over
  `src/app/favicon.ico` — editing `favicon.ico` instead would have no
  visible effect.

### `src/app/favicon.ico`

- **Purpose:** Leftover default `create-next-app` favicon. Currently
  inert (shadowed by `icon.svg`).
- **When to edit:** Only if `icon.svg` is ever removed and you want an
  `.ico` fallback again; otherwise safe to ignore or delete.
- **Edit risk:** None (unused).

### `src/app/api/catches/route.ts`

- **Purpose:** The one API route. `GET` lists the last 100 catches
  (newest first); `POST` inserts a new catch row and returns its `id`;
  `PATCH` sets `cleared_at = NOW()` on a given `id`. Each handler calls a
  local `ensureTable()` first (idempotent `CREATE TABLE IF NOT EXISTS`).
- **What calls it:** `src/app/page.tsx` (`refreshLog`, `triggerAlarm`,
  `closeCurrentCatch`).
- **What it calls:** `@vercel/postgres`'s `sql` tagged template (reads
  `POSTGRES_URL` internally).
- **When to edit:** Changing the `catches` schema, adding new query
  endpoints, changing the log's row limit (currently hardcoded `LIMIT
  100`).
- **Edit risk:** Medium — this is the only place the DB schema is
  defined, and it's re-run (harmlessly, via `IF NOT EXISTS`) on every
  request. Adding a column requires editing `ensureTable()`'s `CREATE
  TABLE` statement, which will **not** retroactively `ALTER` an existing
  table — see `DATABASE.md` "Migration risks."

### `src/proxy.ts`

- **Purpose:** Site-wide Basic Auth gate. Next.js 16's renamed
  `middleware.ts` file convention (confirmed via
  `node_modules/next/dist/docs/`).
- **What calls it:** The Next.js runtime, automatically, for every
  request matching `config.matcher` (everything except `_next/static`,
  `_next/image`, `favicon.ico`).
- **What it calls:** Nothing external — pure header inspection against
  `process.env.SITE_PASSWORD`.
- **When to edit:** Changing the auth mechanism (e.g. adding real
  per-user accounts), changing which paths are gated.
- **Edit risk:** **High.** This is the only access control in the entire
  app. See `CLAUDE.md` "DO NOT CHANGE WITHOUT REVIEW."

## Configuration files

| File | Purpose | Edit risk |
|---|---|---|
| `package.json` | Scripts (`dev`/`build`/`start`/`lint`) and dependencies | Medium — adding/removing deps affects bundle size, esp. for a client-heavy app like this |
| `tsconfig.json` | Strict TS config, `@/*` → `src/*` alias (currently unused by any import) | Low |
| `next.config.ts` | Currently empty — no custom Next.js config | Low |
| `eslint.config.mjs` | Flat ESLint config, extends `eslint-config-next` core-web-vitals + typescript | Low, but note `npm run lint` currently fails — see `TASKS.md` |
| `postcss.config.mjs` | `@tailwindcss/postcss` plugin only | Low |
| `.gitignore` | Standard `create-next-app` ignores, `.env*` with `!.env.example` negation | Low |
| `.env.example` | Documents `SITE_PASSWORD` and `POSTGRES_URL` (placeholders only) | Low — keep placeholder-only, never add real values |
| `.env.local` | Real local env values (gitignored, present on disk) | **Do not read/print values; do not commit** |
| `.vercel/project.json` | Vercel project link (project ID, org ID) | Low — auto-managed by `vercel` CLI |
| `skills-lock.json` | Pins the two vendored Neon Agent Skills to a specific upstream commit | Low, not app code |

## AI/agent tooling (not application code)

| Path | Purpose |
|---|---|
| `.agents/skills/neon/SKILL.md` | Vendored Neon Agent Skill (instructions for AI agents using Neon) |
| `.agents/skills/neon-postgres/SKILL.md` | Vendored Neon Postgres Agent Skill |
| `.claude/skills/neon` | Symlink → `.agents/skills/neon` |
| `.claude/skills/neon-postgres` | Symlink → `.agents/skills/neon-postgres` |
| `AGENTS.md` | Warns that this Next.js version has breaking changes vs. an AI's training data — **verified accurate** (the `src/proxy.ts` rename is real) |
| `CLAUDE.md` | This memory system's entry point (rewritten this audit; was previously `@AGENTS.md`) |

## Public assets (`public/`)

| File | Status |
|---|---|
| `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | **Unreferenced** default `create-next-app` scaffold assets (verified via grep across `src/`). Safe to delete; low priority. |

## Where to make common changes

- **Change detection sensitivity/timing** → `src/app/page.tsx`, the
  constants at the top of the file (`CONFIDENCE_THRESHOLD`,
  `DETECT_INTERVAL_MS`, `TRIGGER_WINDOW`, `TRIGGER_HITS`, `CLEAR_WINDOW`,
  `CLEAR_HITS`).
- **Change what counts as "a phone"** → `runDetection()` in `src/app/page.tsx`,
  the `p.class === "cell phone"` check (coco-ssd's fixed COCO label set —
  changing this to detect a different object class is possible without
  retraining, since coco-ssd already recognizes 80 COCO classes).
- **Change the alarm's look/text** → the `{caught && (...)}` JSX block at
  the bottom of `src/app/page.tsx`.
- **Change the siren sound** → `startSiren()` in `src/app/page.tsx` (Web Audio
  API oscillator settings: waveform, frequencies, tone-switch interval,
  gain).
- **Change the auth password mechanism** → `src/proxy.ts`. Changing the
  actual `SITE_PASSWORD` value is done in Vercel's project env-var
  settings, not in code.
- **Change/add an API endpoint** → `src/app/api/catches/route.ts` (add a
  new exported HTTP-method function), or create a new
  a new route folder under src/app/api/ with its own `route.ts` for a new resource.
- **Change the DB schema** → `ensureTable()` in `src/app/api/catches/route.ts`, being mindful
  it won't retroactively alter an already-existing table (see
  `DATABASE.md`).
- **Change fonts/page metadata** → `src/app/layout.tsx`.
- **Change global design tokens** → `src/app/globals.css`.
- **Add a new page/route** → create a new folder under `src/app/` per
  Next.js App Router conventions; remember `src/proxy.ts`'s matcher already
  covers all non-static paths, so a new page is automatically behind the
  Basic Auth gate without any extra work.
