# SECURITY.md — Defensive Security Review

## Data-flow consistency check vs. the sibling `phone-watchdog` repo (2026-08-07)

The sibling repo `~/Projects/phone-watchdog` (the Python `monitor.py`
prototype) documents that it stores/transmits **nothing** — every webcam
frame is processed in-memory and discarded, never written to disk,
logged, or sent anywhere (see that repo's `SECURITY.md`/`DATABASE.md`/
`README.md`). This repo (`phone-watchdog-web`) is a **different
codebase** and does **not** make the same "nothing persisted" claim —
verified directly from this repo's own code, not assumed:

- **This dashboard does persist data.** `src/app/api/catches/route.ts`
  writes to a Postgres `catches` table on every alarm trigger (`POST`)
  and clear (`PATCH`), and `page.tsx` renders that table's contents back
  as the "Caught log" list (`GET`).
- **What's stored is strictly event metadata, never image/video data.**
  The `catches` table has exactly three columns: `id`, `caught_at`
  (timestamp), `cleared_at` (timestamp) — see `DATABASE.md`. There is no
  column, and no code path anywhere in `src/`, that writes a video frame,
  an image, or any raw webcam data to the database, to a log, or to any
  network destination other than the browser's own `<video>` element
  (which never leaves the client). Confirmed via a full read of
  `src/app/page.tsx` and `src/app/api/catches/route.ts`: the only network
  calls the client makes are the three `fetch("/api/catches", ...)`
  calls, and none of them include frame/image data in the request body
  (`POST`/`PATCH` send no body at all beyond an optional `{ id }`).
- **Conclusion: no contradiction.** The sibling's "nothing persisted"
  claim is about `monitor.py` specifically and remains true for that
  codebase. This repo is honest about persisting something different and
  much narrower — *when* a phone was seen and *when* it was cleared, not
  *what the webcam saw*. A "dashboard" implies something is shown/stored,
  and here that something is exactly two timestamps per catch, nothing
  more. This distinction was previously implicit across `DATABASE.md`/
  `CLAUDE.md` but not stated side-by-side with the sibling's claim until
  this checkpoint pass.

---

This is a read-only, non-destructive review. No penetration testing, no
credential guessing, no attempt was made to bypass the auth gate or
access the live database — only a single unauthenticated `curl` GET
against the production URL (to confirm the gate responds as expected)
and read-only `vercel env ls`/`vercel ls`/`vercel inspect` calls (names/
metadata only, never values).

## Authentication boundaries

There is no user authentication — no accounts, no login form, no OAuth,
no session tokens. The **only** boundary is `src/proxy.ts`'s HTTP Basic
Auth check against a single shared secret, `SITE_PASSWORD`. Confirmed
live: `curl https://phone-watchdog-web.vercel.app/` (no credentials)
returns `401` with `WWW-Authenticate: Basic realm="phone-watchdog"` and
body `Authentication required.` — matching the code exactly.

- The **username** portion of the Basic Auth header is never checked or
  used — only the password segment
  (`Buffer.from(encoded, "base64").toString().split(":")`, destructuring
  out the second element). Anyone can supply any username.
- The password comparison is a plain `===` string comparison
  (`suppliedPassword === password`), **not constant-time**. This is a
  theoretical timing-attack surface, but low real-world severity here:
  the app has no rate limiting to make many precisely-timed remote
  requests practical, and the value being protected (a personal catch
  log, not financial/PII data) is a low-value target. Worth knowing, not
  urgent to fix.
- If `SITE_PASSWORD` is unset, the gate is **fully bypassed** — this is
  intentional for local dev (confirmed by the code comment: "No password
  configured (e.g. local dev) — don't lock anyone out") but would be a
  real exposure if the env var were ever accidentally removed from
  Vercel's Production environment. Confirmed via `vercel env ls` that it
  is currently set for Production and Preview.

## Authorization boundaries

None beyond the single pass/fail auth gate above. There are no roles, no
per-resource permissions, no ownership checks anywhere in
`src/app/api/catches/route.ts`. Anyone who passes the Basic Auth gate can
read, create, or clear **any** catch row — there is no concept of "whose"
catch it is (see `DATABASE.md`).

## Protected routes

`src/proxy.ts`'s `config.matcher` covers everything **except**
`_next/static`, `_next/image`, and `favicon.ico`. This means
`/api/catches` **is** covered/protected (verified by reading the matcher
regex directly — it is not in the exclusion list). No route was found
that's unintentionally left open.

## Secret handling

- `.env.local` (gitignored) holds real values locally; confirmed via
  `git log --all --stat` that it has never been committed to this repo's
  history.
- `.env.example` contains placeholder-only content (`SITE_PASSWORD=`,
  `POSTGRES_URL=`, both empty) — confirmed no real value is present.
- **This documentation audit never read or copied any actual secret
  value** — only variable *names* were enumerated (via `grep -oE
  '^[A-Z_]+=' .env.local` and `vercel env ls`), specifically to avoid
  transcribing real credentials into any file. No secret appears anywhere
  in the 17 memory files produced by this audit — verified by re-reading
  every file written this session before finalizing (see
  `PROJECT_STATE.md` / this session's `SESSION_LOG.md` entry).
- `VERCEL_OIDC_TOKEN` (present in `.env.local`, platform-injected) is the
  most sensitive value in the local env file — it is not read by any
  application code found in this repo, but should never be printed,
  logged, or committed regardless.

## Environment variables — client-exposed vs. server-only

**Both real env vars used by app code are server-only.** Neither
`SITE_PASSWORD` nor `POSTGRES_URL` is prefixed `NEXT_PUBLIC_*`, and
neither is referenced anywhere in client component code (`page.tsx`) —
confirmed via grep. No environment variable in this app is exposed to
the browser bundle.

## Input validation

Minimal, and appropriately so given the tiny attack surface:

- `PATCH /api/catches` checks only that `id` is truthy; no type/shape
  validation. A non-numeric `id` would reach the parameterized `sql`
  query as-is — safe from injection (see below) but would simply match
  zero rows rather than producing a clean validation error.
- `POST`/`GET` accept no client-supplied input at all, so there's nothing
  to validate.
- No request body size limits, no schema validation library (zod, etc.)
  used anywhere.

## Output encoding / XSS risk

Low risk. React escapes all rendered content by default (no
`dangerouslySetInnerHTML` found anywhere in the repo — verified via
grep). The only user-adjacent "content" rendered is server-generated
timestamps (`caught_at`/`cleared_at`, formatted client-side via
`Date.toLocaleString()`), not free-text user input, so there's no
meaningful stored-XSS surface in this app's current feature set.

## SQL injection risk

Low. All queries use `@vercel/postgres`'s `sql` tagged template
(parameterized queries under the hood), never raw string concatenation —
confirmed by reading every query in `route.ts`. The one place
user-influenced data reaches a query (`PATCH`'s `id`) goes through the
tagged template's parameter binding, not string interpolation into raw
SQL text.

## CSRF protections

None implemented explicitly, and the threat model here is unusual: this
app uses HTTP Basic Auth (credentials sent via the `Authorization`
header, cached by the browser and re-sent per-request) rather than
cookie-based sessions. Classic CSRF relies on the browser **automatically**
attaching a credential (a cookie) to a cross-site request; Basic Auth
credentials are also auto-attached by browsers to same-origin requests
once entered, which means a cross-site page **could** in principle
trigger a same-origin fetch that the browser auto-authenticates if the
user has recently authenticated in that browser session — this is a
known, long-standing weakness of Basic Auth in general (not specific to
this app), and no additional CSRF token/SameSite-cookie mitigation exists
here. Realistic severity is low given the low-value target and personal-
tool scope, but this is a real, if minor, gap — flagged rather than
dismissed.

## File upload risks

None — no file upload functionality exists anywhere in this app.

## Webhook verification

Not applicable — no webhooks are received or sent by this app.

## Rate limiting

**None, anywhere.** No rate limiting on the Basic Auth gate (brute-force
attempts on `SITE_PASSWORD` are not throttled or locked out), and none on
`POST`/`PATCH /api/catches` (an authenticated caller — or a would-be
brute-forcer, if they guess the password before being stopped by
anything — could spam either endpoint without limit). Low real-world
severity for a personal tool with a presumably-strong password, but worth
knowing before this app is ever exposed more broadly.

## Admin access

No admin role or admin-only functionality exists. The single shared
password grants full access to everything there is (which is: the one
page, and read/write on one table).

## Database policies

No RLS, no database-level access control beyond the connection string
itself having full read/write on the `catches` table (see `DATABASE.md`).
Whoever holds `POSTGRES_URL` has unrestricted access to the table,
independent of the app's own `SITE_PASSWORD` gate.

## Logging of sensitive data

No structured logging exists in this app at all (see
`ARCHITECTURE.md`). API error responses do include `String(err)` in their
JSON body (`detail` field) — this could theoretically leak internal
error detail (e.g. a connection-string fragment, in an unusual failure
mode) to any authenticated caller, though `@vercel/postgres` errors don't
typically embed the full connection string in their `.toString()` output.
Not independently verified either way (would require triggering a real
DB error, out of scope this session) — flagged as a theoretical, unverified
concern rather than a confirmed leak.

## Dependency concerns

- `@tensorflow/tfjs` and `@tensorflow-models/coco-ssd` are large,
  actively-maintained ML libraries with a substantial dependency tree —
  no specific known-vulnerability check was run this session (no `npm
  audit` was executed as part of this audit; recommended as a follow-up
  if not already part of the developer's routine).
- All dependencies are pinned with `^` semver ranges in `package.json`
  (standard `create-next-app` convention), with exact resolved versions
  locked in `package-lock.json`.

## Production security gaps (headline list)

1. Single shared secret with no rate limiting or lockout — a determined
   attacker with unlimited attempts could eventually brute-force
   `SITE_PASSWORD` (mitigated only by however strong/long the actual
   password is, which was never read or evaluated this session).
2. No CSRF mitigation beyond Basic Auth's inherent (weak) protections.
3. No per-user authorization — anyone past the gate has full read/write
   on all data.
4. Generic API error messages could theoretically leak internal error
   detail to any authenticated caller (unverified, low-confidence
   concern).
5. Non-constant-time password comparison (very low real-world severity
   given the lack of rate limiting making a timing attack impractical to
   execute anyway).

## Recommended fixes (priority order)

1. If this app is ever exposed beyond personal/trusted use, add basic
   rate limiting to `proxy.ts` (e.g. a simple in-memory or edge-config
   attempt counter) before relying on password strength alone.
2. Consider a constant-time comparison for the password check (e.g.
   Node's `crypto.timingSafeEqual`) — cheap to add, removes a
   theoretical class of attack even if impractical today.
3. Differentiate the generic `500` error message in `route.ts` so
   internal error detail isn't uniformly echoed back (see `TASKS.md`
   `TASK-004`).
4. If multi-user access is ever wanted, replace the shared-password model
   with real per-user auth and add ownership fields to `catches` before
   opening it up — do not casually add "more users" to the current
   shared-secret model.
