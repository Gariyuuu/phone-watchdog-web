# DEPLOYMENT.md

## Hosting provider

**Vercel.** Project name `phone-watchdog-web`, org/team
`garywangsmes-8349s-projects` (confirmed via `.vercel/project.json` and
`npx vercel ls`/`npx vercel project ls` this audit). Linked locally via
the standard `.vercel/` folder (gitignored, auto-created by `vercel
link`/first deploy — see `.vercel/README.txt`).

## Production URLs

- **Primary/stable alias:** `https://phone-watchdog-web.vercel.app`
  (confirmed via `npx vercel inspect`'s "Aliases" output this audit).
- Per-deployment URLs also exist (e.g.
  `https://phone-watchdog-fmyfqdlrt-garywangsmes-8349s-projects.vercel.app`
  for the latest deployment at audit time) but are not what a user should
  bookmark — use the stable alias above.
- No custom domain is configured — `npx vercel domains ls` returned "0
  Domains found under garywangsmes-8349s-projects" this audit.

## Build command / output

- **Build command:** `next build` (via `npm run build`), using Turbopack
  (confirmed: build output header reads "▲ Next.js 16.2.12 (Turbopack)").
  No custom `vercel.json` build override found in the repo — Vercel's
  Next.js framework preset is used as-is.
- **Output:** Standard Next.js App Router output. Verified this audit:
  `/` and `/_not-found` and `/icon.svg` are static (prerendered);
  `/api/catches` is dynamic (server-rendered per request); `Proxy
  (Middleware)` is listed separately in the build output, confirming
  `src/proxy.ts` is picked up and bundled correctly.

## Installation command

`npm install` (standard `npm ci`-equivalent behavior is whatever Vercel's
build system does by default for a repo with a `package-lock.json` — no
override found).

## Runtime version

**Node.js 24.x** on Vercel, per `npx vercel project ls`'s output column
for this project (`24.x`). **Not pinned via an `engines` field in
`package.json`** (no `engines` key present) — so this is a Vercel
project-setting default, not something version-controlled in this repo.
If Vercel's platform default ever changes, this repo would silently pick
up a different Node version on the next deploy unless a project setting
or `engines` field is added.

## Environment variables (deployment-specific)

Confirmed via `npx vercel env ls` (names and target environments only —
no values read):

| Variable | Environments configured |
|---|---|
| `SITE_PASSWORD` | Preview, Production (**not** Development) |
| `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL_NO_SSL`, `POSTGRES_PRISMA_URL`, `POSTGRES_HOST`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `PGHOST`, `PGHOST_UNPOOLED`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_PROJECT_ID`, `NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL` | Production, Preview, Development (all three) |

`SITE_PASSWORD` deliberately being absent from Development matches
`src/proxy.ts`'s own fallback behavior (unset password → gate bypassed),
so local `vercel dev`/Development-environment usage is intentionally
open. Plain `npm run dev` (not `vercel dev`) instead reads whatever's in
your local `.env.local`/shell environment directly, independent of
Vercel's Development env-var config.

## Domains

None configured beyond the default `*.vercel.app` subdomains (see
"Production URLs" above).

## Preview deployments

Inferred to happen automatically for non-`main` branches/PRs, per
Vercel's standard GitHub-integration behavior — not independently
confirmed this session (no branch other than `main` exists in this repo
to test against, and no preview deployment was found in the `vercel ls`
output at audit time — only 5 `Production`-target deployments were
listed).

## Production deployment steps

**Inferred to be fully automatic:** push to `main` → Vercel's GitHub
integration builds and deploys. Evidence: `git remote -v` confirms
`origin` is `https://github.com/Gariyuuu/phone-watchdog-web.git`; `npx
vercel ls` shows 5 "Ready" production deployments whose timestamps
closely track the 5 commits' timestamps (e.g. the latest deployment was
created within 5 seconds of the latest commit's timestamp). No
explicit Vercel Git connection status was retrievable via the `vercel
git` CLI subcommand this session (it only listed `connect`/`disconnect`
as available actions, not a status query) — so this is a strong
inference from timing correlation, not a directly-confirmed setting.

If auto-deploy is ever found to **not** be connected, the manual
fallback is:
```bash
npx vercel deploy --prod
```
(not attempted this session — deploying was explicitly out of scope for
this audit).

## First-time / fresh-clone setup step easy to miss

A fresh clone needs, at minimum:
1. `npm install`.
2. Either connect to the existing Vercel project (`vercel link`) and
   `vercel env pull` to get a working `.env.local`, or manually create a
   `.env.local` with at least `POSTGRES_URL` pointed at some Postgres
   instance (local or remote) to get log persistence working — the app
   *will* run without it, just with detection/alarm working and no log
   persistence (see `DECISIONS.md` DEC-004).
3. If testing the auth gate locally, also set `SITE_PASSWORD` — otherwise
   local dev is ungated by default.

## Database deployment / migrations

None — there is no migration step in the deployment process at all.
`ensureTable()` runs its `CREATE TABLE IF NOT EXISTS` lazily on the first
real request after any deploy, against whatever database `POSTGRES_URL`
points to. See `DATABASE.md` "Migration risks" for why this doesn't
generalize to future schema changes.

## Storage setup (buckets, etc.)

None — no blob/file storage used.

## External service setup

The only external service is the Postgres/Neon database itself,
connected through Vercel's Postgres/Neon marketplace integration (env
vars auto-populated as documented in `CLAUDE.md`/`DATABASE.md`). No other
service (email, analytics, payments) is configured.

## Scheduled jobs / webhooks

None exist.

## Known build failures / runtime limitations

None encountered this audit — `npm run build` succeeded cleanly on the
current `main`. The one known-red check is `npm run lint` (see
`TESTING.md`/`TASKS.md` `TASK-001`), which does **not** block
`next build` from succeeding (Next.js's build-time TypeScript check is
separate from the standalone ESLint run, and this repo's `next build`
was observed to succeed despite the lint error existing simultaneously).

## Rollback procedure

Not documented anywhere in the repo, and not exercised this session. The
standard Vercel mechanism (re-promoting a prior "Ready" deployment to
Production via the Vercel dashboard or `vercel rollback`) would apply,
but this project's specific rollback process has never been used/recorded
as far as this audit found.

## Deployment checklist

Before pushing to `main` (which appears to auto-deploy to production):

```bash
npx tsc --noEmit
npm run lint      # currently fails — see TASKS.md TASK-001
npm run build
```

Ideally also the manual smoke test in `TESTING.md`, though that requires
a real browser/webcam and isn't automatable in this repo today.

## Post-deployment verification

This audit performed one read-only post-deployment check: `curl` against
`https://phone-watchdog-web.vercel.app/` with no credentials, confirming
a `401` with the expected `WWW-Authenticate: Basic realm="phone-watchdog"`
header — i.e. the deployed code matches local source and the auth gate is
live and functioning. No further verification (correct-password access,
the detection flow, or the DB write path) was performed against
production this session.
