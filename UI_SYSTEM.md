# UI_SYSTEM.md

This app has one page and no component library — this file is
necessarily short. Every fact below is traced to `src/app/page.tsx`,
`src/app/layout.tsx`, and `src/app/globals.css` (the only three files
that touch UI/styling).

## Layout system

- `src/app/layout.tsx`: `<html>` with `className={"${geistSans.variable}
  ${geistMono.variable} h-full antialiased"}`, `<body>` with
  `className="min-h-full flex flex-col"`.
- `src/app/page.tsx`'s root element:
  `<div className="flex flex-1 flex-col items-center gap-8 p-8">` — a
  simple centered vertical flex column with `2rem` gap and padding.
- No grid layout, no sidebar, no multi-column structure anywhere.

## Navigation

None. One route (`/`). No nav bar, no links, no router usage beyond the
implicit App Router page/`_not-found` handling.

## Page structure

Top to bottom in `src/app/page.tsx`'s JSX, exactly in this order:
1. `<h1>` — "Phone Watchdog" (`text-2xl font-bold`).
2. `<video>` — the webcam preview (`muted`, `playsInline`,
   `w-full max-w-md rounded-lg bg-black`).
3. A row with the Start/Stop button and, conditionally, an error message.
4. A `<section>` — "Caught log" heading + the log list or an empty-state
   message.
5. Conditionally, a full-screen fixed-position alarm overlay (`{caught &&
   (...)}`), rendered last in JSX but visually on top via
   `fixed inset-0 z-50`.

## Reusable components

**None exist.** No `src/components/` directory. Every UI element is
inline JSX inside the single `Home` component in `src/app/page.tsx`. If this app
grows, extracting the video preview, the log list, and the alarm overlay
into separate components would be a natural next step, but nothing like
that has been started.

## Themes

**No theme system.** `src/app/globals.css` defines exactly two CSS custom
properties, `--background`/`--foreground`, switched via a
`@media (prefers-color-scheme: dark)` block — this follows the OS/browser
color-scheme preference automatically; there is no in-app toggle and no
`localStorage`-persisted preference.

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}
```

However, in practice, **none of the actual UI elements reference these
tokens** — every color used in `src/app/page.tsx` is a hardcoded Tailwind
utility class (`bg-blue-600`, `text-red-600`, `bg-red-800`,
`text-gray-500`, `bg-black`, `text-white`), not `bg-background`/
`text-foreground`. The `--background`/`--foreground` tokens only affect
the plain `body` CSS rule in `src/app/globals.css` (`background: var(--background);
color: var(--foreground);`), which is the page's base canvas color behind
everything else. So: the page background/text color does follow OS dark
mode; the button, error text, alarm overlay, and log text colors do not
adapt to dark mode at all (they're fixed Tailwind grays/reds/blues).

## Colors

All hardcoded Tailwind v4 default palette classes, used directly (no
custom palette defined in `src/app/globals.css` beyond the two tokens above):

| Class | Used for |
|---|---|
| `bg-blue-600` | Start/Stop button background |
| `text-white` | Button text, alarm overlay text |
| `text-red-600` | Webcam-access error message |
| `bg-red-800` | Alarm overlay background |
| `text-gray-500` | Empty-log message, catch-duration text |
| `bg-black` | Video element background (before stream attaches) |

## Typography

`Geist` (sans) and `Geist Mono`, loaded via `next/font/google` in
`src/app/layout.tsx`, exposed as CSS variables (`--font-geist-sans`,
`--font-geist-mono`) and remapped into Tailwind's `--font-sans`/
`--font-mono` via `@theme inline` in `src/app/globals.css`. **Note:** the plain
`body` rule in `src/app/globals.css` sets `font-family: Arial, Helvetica,
sans-serif` directly, rather than `var(--font-sans)` — so in practice the
page renders in the browser's Arial/Helvetica fallback stack, not Geist,
unless some other rule overrides it (none was found). This is a real,
verified discrepancy between "the fonts are loaded and wired as CSS
variables" and "the fonts are actually applied to the body text" — worth
fixing if font choice matters, but purely cosmetic.

## Spacing / border radius / shadows

No custom scale — plain Tailwind defaults used ad hoc (`gap-8`, `p-8`,
`gap-4`, `gap-6`, `rounded-lg`, `mb-2`). No shadows used anywhere.

## Breakpoints

Only one responsive class exists in the whole app: `sm:text-6xl` on the
alarm overlay's headline text (scales from `text-5xl` up at the `sm`
breakpoint). No other responsive behavior — the layout is otherwise a
single centered column at any width (`max-w-md` caps the video and log
section width).

## Animations

None. No CSS keyframes, no Framer Motion or similar library, no
transition classes anywhere in the app.

## Icon system

None beyond the single custom favicon (`src/app/icon.svg`, an inline SVG
`<text>` rendering a dog emoji 🐕). No icon library (no lucide-react,
heroicons, etc.) is installed or used.

## Image assets

- `src/app/icon.svg` — active favicon (dog emoji).
- `src/app/favicon.ico` — inert, shadowed by `icon.svg` (see
  `FILE_MAP.md`).
- `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`
  — unreferenced `create-next-app` scaffold assets (dead weight, see
  `TASKS.md` `TASK-003`).
- The `<video>` element itself is the only "live imagery" in the app (the
  user's own webcam feed, not a static asset).

## Modals

None (the full-screen alarm overlay is a fixed `<div>`, not a
`<dialog>`/portal-based modal — no focus trap, no `role="dialog"`, no ARIA
modal semantics).

## Notifications / toasts

None. The only "notification" is the full-screen alarm overlay itself,
and the inline red error text for webcam-access failures — no toast
library, no ephemeral notification pattern.

## Forms

None. No `<form>` element anywhere — the only interactive control is the
Start/Stop `<button>`.

## Loading states

- "Loading model…" replaces the button label while `modelLoading` is
  true, and the button is `disabled` during that time.
- **No loading state exists for:** the webcam stream itself between
  permission-grant and first-frame-ready (`video.readyState < 2`
  silently gates detection with no visual feedback), or the catch log
  between page load and the first successful `GET /api/catches` (it just
  renders as empty/"Nothing yet. Good." until data arrives, indistinguishable
  from "genuinely empty").

## Empty states

- Catch log, when `log.length === 0`: `"Nothing yet. Good."` — the only
  explicit empty-state message in the app.

## Error states

- Webcam access/permission failure: red text
  (`<p className="text-red-600">`) showing `err.message` (or a generic
  "Could not access webcam." fallback) next to the Start/Stop button.
- **No error state exists for:** catch-log fetch failures (silently
  swallowed — see `FEATURES.md`), or DB write failures on trigger/clear
  (also silently swallowed).

## Accessibility

No explicit accessibility work found: no ARIA labels/roles beyond what
native HTML elements provide by default, no focus management for the
full-screen alarm overlay (it's not a real modal, so focus isn't trapped
or moved to it), no documented screen-reader consideration for the siren/
visual-only alarm (a Deaf or hard-of-hearing user would only get the
visual overlay, which does have large readable text; a blind user would
get the siren but no announced text, since nothing uses `aria-live`).
This has not been audited or tested with assistive technology.

## Responsive design

Minimal — see "Breakpoints" above. The layout is a single centered
column (`max-w-md`) at all viewport widths; only the alarm overlay's
headline text size changes at `sm:`.

## Browser support

Not documented anywhere in the repo. The app depends on
`navigator.mediaDevices.getUserMedia` (broadly supported in modern
browsers, requires HTTPS or `localhost` per browser security policy) and
the Web Audio API (`AudioContext`, also broadly supported). No
polyfills, no explicit browser-support statement or `browserslist` config
found.

## Known visual inconsistencies

1. Body text renders in Arial/Helvetica, not the loaded Geist font (see
   "Typography" above) — a real, verified discrepancy between what's
   wired up and what's actually applied.
2. Only the page's base background/foreground color follows OS dark-mode
   preference; every other color (button, error, alarm overlay, log
   text) is fixed regardless of light/dark mode.
