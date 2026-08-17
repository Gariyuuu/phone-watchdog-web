# API_REFERENCE.md

This app has exactly one API route, three methods, one resource. No
REST conventions beyond what's shown here were established (no versioning,
no other resources).

## Auth applying to every endpoint below

Every path in this app (pages and API routes alike) is gated by
`src/proxy.ts`'s HTTP Basic Auth check before it reaches any handler,
**except** `_next/static`, `_next/image`, and `favicon.ico` (see
`config.matcher` in `src/proxy.ts`). If `SITE_PASSWORD` is set (confirmed via
`vercel env ls` to be set on Vercel's Production and Preview
environments, not Development), every request below requires a valid
`Authorization: Basic base64(<anything>:<SITE_PASSWORD>)` header or it
never reaches the handler — the responses documented below assume that
gate has already been passed. No further per-route auth exists inside
`src/app/api/catches/route.ts` itself.

## `GET /api/catches`

- **Source file:** `src/app/api/catches/route.ts`, exported `GET()`.
- **Purpose:** List the most recent catches, newest first, for display in
  the UI's "Caught log."
- **Auth/authz:** Site-wide Basic Auth only (see above). No further
  authorization — any authenticated caller sees every row.
- **Params:** None (no query params accepted or read).
- **Request body:** None.
- **Response shape (200):**
  ```json
  { "catches": [ { "id": 12, "caught_at": "2026-08-06T10:15:00.000Z", "cleared_at": "2026-08-06T10:15:32.000Z" }, ... ] }
  ```
  Up to 100 rows (`LIMIT 100`, hardcoded, not configurable via a param),
  ordered by `caught_at DESC`.
- **Response shape (500, on any error):**
  ```json
  { "error": "database not configured", "detail": "<String(err)>" }
  ```
  This message is reused for every failure type, not just genuine
  missing-config cases — see `CLAUDE.md` "Known issues."
- **Status codes:** `200` (success, including when there are zero rows —
  `catches: []`), `500` (any thrown error, including a missing/invalid
  `POSTGRES_URL`).
- **Validation:** None (no input to validate).
- **Side effects:** Calls `ensureTable()` first (idempotent
  `CREATE TABLE IF NOT EXISTS`).
- **DB ops:** One `SELECT id, caught_at, cleared_at FROM catches ORDER BY
  caught_at DESC LIMIT 100`.
- **External calls:** None beyond the DB.
- **Called by:** `src/app/page.tsx`'s `refreshLog()` — on page load, and
  after every `POST`/`PATCH` to keep the displayed log current.

## `POST /api/catches`

- **Source file:** `src/app/api/catches/route.ts`, exported `POST()`.
- **Purpose:** Record a new catch (called the instant the alarm
  triggers).
- **Auth/authz:** Site-wide Basic Auth only.
- **Params:** None.
- **Request body:** None required/read (the client sends an empty `POST`
  with no body — `src/app/page.tsx`'s `triggerAlarm()` calls
  `fetch("/api/catches", { method: "POST" })` with no `body`/headers).
- **Response shape (200):**
  ```json
  { "catch": { "id": 13, "caught_at": "2026-08-06T10:16:00.000Z" } }
  ```
- **Response shape (500):** Same generic error shape as `GET` above.
- **Status codes:** `200` (row inserted), `500` (any thrown error).
- **Validation:** None (nothing in the request to validate — the row's
  only real value, `caught_at`, is server-generated via `NOW()`).
- **Side effects:** Calls `ensureTable()`, then inserts one row. **This
  endpoint has no idempotency protection** — calling it twice creates two
  separate catch rows, by design (each call represents a genuinely new
  alarm trigger from the client's perspective).
- **DB ops:** One `INSERT INTO catches (caught_at) VALUES (NOW())
  RETURNING id, caught_at`.
- **External calls:** None beyond the DB.
- **Called by:** `src/app/page.tsx`'s `triggerAlarm()`. The returned `id`
  is stored client-side (`currentCatchIdRef`) so the matching `PATCH` can
  reference it later.

## `PATCH /api/catches`

- **Source file:** `src/app/api/catches/route.ts`, exported `PATCH()`.
- **Purpose:** Mark a previously-created catch as cleared (called when
  the alarm auto-clears or the user presses Escape).
- **Auth/authz:** Site-wide Basic Auth only.
- **Params:** None (no path/query params — this route doesn't use a
  dynamic `[id]` segment; the id is passed in the JSON body instead).
- **Request body:**
  ```json
  { "id": 13 }
  ```
- **Response shape (200):** `{ "ok": true }` (returned even if `id`
  matches zero rows — the `UPDATE ... WHERE id = ${id}` simply affects
  zero rows silently; there's no existence check).
- **Response shape (400, missing `id`):** `{ "error": "missing id" }`
- **Response shape (500):** Same generic error shape as `GET`/`POST`.
- **Status codes:** `200` (update ran, whether or not it matched a row),
  `400` (`id` falsy/missing from the body), `500` (any thrown error,
  including a malformed JSON body — `req.json()` throwing is caught by
  the same outer `try/catch`).
- **Validation:** Only `if (!id) return 400`. No type check — `id` is
  interpolated directly into the parameterized `sql` tagged template
  (safe from SQL injection via `@vercel/postgres`'s parameterization, but
  a non-numeric `id` would just match zero rows rather than erroring
  cleanly).
- **Side effects:** Calls `ensureTable()`, then updates `cleared_at` on
  the matching row (if any) to `NOW()`.
- **DB ops:** One `UPDATE catches SET cleared_at = NOW() WHERE id =
  ${id}`.
- **External calls:** None beyond the DB.
- **Called by:** `src/app/page.tsx`'s `closeCurrentCatch()`, using the
  `id` stashed by the preceding `POST`. If `currentCatchIdRef.current` is
  `null` (e.g. the `POST` never resolved, or `dismiss()` is called before
  any catch was ever triggered), `closeCurrentCatch()` short-circuits
  client-side and this endpoint is never called — the endpoint has no
  independent guard against being called with a stale/already-cleared
  `id` (it would just silently re-set `cleared_at` to a newer `NOW()`).

## What does NOT exist

- No `DELETE /api/catches` (or any per-id `DELETE`) — rows cannot be
  removed via the API.
- No `/api/catches/[id]` dynamic route — all operations go through the
  single collection-level `src/app/api/catches/route.ts` above, with `id` passed in the body
  for `PATCH`.
- No pagination beyond the hardcoded `LIMIT 100` on `GET` (no cursor, no
  offset param).
- No webhooks, no external API integrations, no third-party service
  calls of any kind from server code.
- No rate limiting on any endpoint.
- No request logging/audit trail.
