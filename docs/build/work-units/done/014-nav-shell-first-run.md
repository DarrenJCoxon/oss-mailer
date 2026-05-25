# Work Unit 014 — Navigation shell + first-run experience

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-25

**Depends on:** [WU-011 — Send Log Dashboard UI](done/011-send-log-dashboard-ui.md)

## What's done when this ships

A developer who deploys oss-mailer for the first time opens the root URL and immediately understands what the product is and what they need to do to get it working. A persistent sidebar links all four pages (Dashboard, Test Send, Templates, Settings). If any required env vars are missing, a prominent amber banner appears on the dashboard with a count of missing vars and a link to Settings. If all vars are set, the banner is absent. Page titles and the browser tab title reflect the active page.

## Walkthrough

1. New deployer opens `/` — sees the sidebar with four nav items, the "Send log" page heading, and (if env vars are missing) an amber banner: "3 environment variables are not configured. Go to Settings →"
2. Clicks a nav item — active item is highlighted in blue, page changes.
3. If all env vars are set and sends have been made — dashboard shows the log table, no banner.
4. Browser tab reads "Send log — oss-mailer", "Test send — oss-mailer", etc.
5. On mobile (< 768px) — sidebar collapses to a top bar with a hamburger menu.

**What if something goes wrong:**
- Health check fails to read env vars: banner shows "Could not check configuration" in amber (no crash).

## How we'll know it's done

1. `src/app/layout.tsx` renders a sidebar with links to `/` (Send log), `/test-send` (Test send), `/templates` (Templates), `/settings` (Settings).
2. Active nav item has a distinct visual state (blue left border + blue text).
3. On `/`, if any `REQUIRED_ENV_VARS` are missing, an amber banner renders above the log table with the count and a link to `/settings`.
4. If all vars are set, no banner renders.
5. Each page has a `<title>` of `"[Page name] — oss-mailer"`.
6. Layout is responsive: sidebar visible on ≥ 768px, top bar + drawer on < 768px.
7. `npx vitest run` exits 0 (layout test updated).

## Notes / log

### 2026-05-25 — initial filing

Filed as WU-014 — the shell every other surface hangs off. Without this, the product is a collection of disconnected pages.

#### Design notes for architect

**Sidebar structure (desktop):**

```
┌─────────────────────────────────────────────┐
│  oss-mailer          [logo / wordmark]      │
├─────────────────────────────────────────────┤
│  ● Send log          /                      │
│  ○ Test send         /test-send             │
│  ○ Templates         /templates             │
│  ○ Settings          /settings              │
└─────────────────────────────────────────────┘
```

Sidebar width: 220px fixed. Main content: `flex-1`, scrolls independently. Background: `neutral.surface` (`#F9FAFB` / `#1A1D27`). Active item: blue left border (`colour.brand.primary`) + blue text. Inactive item: `neutral.text.body` text, transparent background, hover: `neutral.surface.raised`.

**First-run banner:**

The layout is a Server Component — it can read `REQUIRED_ENV_VARS` and `process.env` directly to check which vars are missing. No client component needed for the banner. Banner renders above `{children}` in the main content area, inside a `<main>` wrapper. Amber background (`colour.semantic.warning.bg`), warning icon, text, link to `/settings`. Dismissed when all vars are set (server-side check on each page load — no dismiss button, no cookie).

**Mobile:**

Top bar with "oss-mailer" wordmark + hamburger button. Drawer slides in from left over content. Close button in drawer. Drawer overlay backdrop. This requires a Client Component for toggle state.

**Files to create/modify:**

| File | Action |
| --- | --- |
| `src/app/layout.tsx` | Replace stub — add sidebar, font imports, first-run banner logic |
| `src/app/(shell)/Sidebar.tsx` | Client Component — active-link detection via `usePathname` |
| `src/app/(shell)/MobileNav.tsx` | Client Component — hamburger + drawer |
| `src/app/layout.test.tsx` | Update existing smoke test |

No new npm packages. Use Next.js `<Link>` for nav. Use `next/font/google` for Inter + JetBrains Mono (already planned in design system — add here as fonts affect layout).

#### Constraints

- Layout must remain a Server Component at the root level (font loading, env check). Client Components are children only.
- No JS required for the first-run banner (server-rendered).
- `usePathname` is required for active nav state — that component must be `"use client"`.
- Do not add new npm packages.

---

### 2026-05-25 — architect: design-it-twice + coder brief

#### Pattern N — two structurally different designs

**Design A — Single root layout owns the shell (no route group)**

`src/app/layout.tsx` (Server Component) handles fonts, the shell flex container, the first-run banner, and renders `<Sidebar />` + `<MobileNav />` + `<main>{children}</main>`. Nav-link active state and the mobile drawer live in Client Components under `src/app/(shell)/`. The existing `src/app/(dashboard)/` folder stays as a plain colocation folder for `LogTable.tsx` (its current role). Every page under `src/app/` inherits the shell automatically.

Tradeoffs:
- (+) Zero migration cost. The current `src/app/page.tsx` imports `./(dashboard)/LogTable` — that path stays valid.
- (+) First-run banner sits in the same Server Component that reads `process.env` — one obvious place.
- (+) `/health` is a `route.ts` Route Handler; Route Handlers ignore layout JSX, so this approach does not affect it.
- (−) Every future surface inherits the shell. If a shell-less page is ever needed (e.g. a public unsubscribe page in Phase 2), we'd add a route group at that point — small localised refactor.

**Design B — Route group `(dashboard)` as a layout boundary**

Root `src/app/layout.tsx` stays minimal (html/body/fonts only). A new `src/app/(dashboard)/layout.tsx` owns the shell. Existing pages move into `src/app/(dashboard)/`: `page.tsx`, `test-send/`, plus the new `templates/` and `settings/`. The current `(dashboard)/LogTable.tsx` (a sibling component, not a page) collides with this new meaning of the folder.

Tradeoffs:
- (+) Shell-less pages can be added as siblings of `(dashboard)/` later with no rework.
- (+) Root layout stays minimal — clean separation of "everything" vs "shelled".
- (−) **Breaks the existing `(dashboard)/LogTable` import** in `src/app/page.tsx`. Three pages must move; tests must be updated; CI risk for a refactor that delivers no user-visible value now.
- (−) Folder-name overload: `(dashboard)` would mean both "route group with the shell layout" and "the historical home of the Send Log's `LogTable` component". Future agents reading the catalogue will be confused.
- (−) No benefit for the first-run banner — it works the same in either place.

#### Chosen design

**Design A.** Phase 1 has no shell-less surfaces planned (WU-015 Settings and WU-016 Templates both want the shell), so Design B's only structural benefit is unrealised; meanwhile it forces a path-rename refactor on the just-shipped WU-011 dashboard with zero functional gain. The route-group boundary can be introduced when the first shell-less surface actually arrives. Filed as D014.

#### Coder brief

**Goal.** Replace `src/app/layout.tsx` with a Server Component that loads fonts, runs the first-run env check, and renders the shell (Sidebar + main with optional banner). Add two Client Components under `src/app/(shell)/`. Add stub pages for `/templates` and `/settings`. Update `globals.css` to wire the font CSS variables into Tailwind v4 via `@theme`. Update `layout.test.tsx`.

**Files to create / modify.**

| File | Action |
| --- | --- |
| `src/app/layout.tsx` | Replace stub. Server Component. |
| `src/app/globals.css` | Add `@theme` block mapping font variables. |
| `src/app/(shell)/Sidebar.tsx` | New. Client Component. Active-link detection via `usePathname`. Desktop only (hidden on `<md`). |
| `src/app/(shell)/MobileNav.tsx` | New. Client Component. Top bar + hamburger + drawer. Visible only on `<md`. |
| `src/app/(shell)/nav-items.ts` | New. Shared list of `{ href, label }` consumed by both `Sidebar` and `MobileNav`. Server-safe (no React, no `"use client"`). |
| `src/app/(shell)/FirstRunBanner.tsx` | New. Server Component. Reads `REQUIRED_ENV_VARS` against `process.env`. Returns `null` when all set. |
| `src/app/templates/page.tsx` | New stub. `<main>Templates — coming soon.</main>` |
| `src/app/settings/page.tsx` | New stub. `<main>Settings — coming soon.</main>` |
| `src/app/layout.test.tsx` | Update — still a smoke test (default export is a function), but mock `next/font/google` so it does not network. |

Do **not** touch: `src/app/page.tsx`, `src/app/test-send/page.tsx`, `src/app/(dashboard)/LogTable.tsx`, `src/app/health/route.ts`, `src/app/api/**`. The `(dashboard)` folder stays as a plain colocation folder.

**Exact font setup.**

In `src/app/layout.tsx`, at the top of the module (next/font requires module-scope calls):

```tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})
```

Apply both variable classes to `<html>` so the CSS variables are available globally:

```tsx
<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
```

In `src/app/globals.css`, wire the variables into Tailwind v4's `@theme` so `font-sans` and `font-mono` resolve to them:

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

That is the entire `globals.css` for this WU. No body styles, no resets — Tailwind v4's preflight handles that.

**Root layout structure (Server Component).**

```tsx
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from './(shell)/Sidebar'
import { MobileNav } from './(shell)/MobileNav'
import { FirstRunBanner } from './(shell)/FirstRunBanner'

const inter = Inter({ /* as above */ })
const jetbrainsMono = JetBrains_Mono({ /* as above */ })

export const metadata: Metadata = {
  title: 'oss-mailer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-white text-gray-900 dark:bg-[#0F1117] dark:text-gray-50 antialiased">
        <div className="min-h-screen md:flex">
          <Sidebar />
          <MobileNav />
          <div className="flex-1 min-w-0">
            <FirstRunBanner />
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
```

Key constraints:
- The root layout stays a Server Component — no `"use client"`. Client Components (`Sidebar`, `MobileNav`) are imported and used as children, which Next.js supports.
- The flex container is `md:flex` so on `<md` it stacks vertically (mobile nav top bar, then content). On `≥md`, sidebar sits beside content.
- `min-w-0` on the content wrapper prevents flex children from forcing horizontal overflow when tables are wide.

**`src/app/(shell)/nav-items.ts` (shared, server-safe).**

```ts
export type NavItem = { href: string; label: string }

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Send log' },
  { href: '/test-send', label: 'Test send' },
  { href: '/templates', label: 'Templates' },
  { href: '/settings', label: 'Settings' },
] as const
```

**`src/app/(shell)/Sidebar.tsx` (Client Component).**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './nav-items'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      aria-label="Primary navigation"
      className="hidden md:flex md:flex-col md:w-[220px] md:shrink-0 md:border-r md:border-gray-200 md:dark:border-[#2E3244] md:bg-gray-50 md:dark:bg-[#1A1D27]"
    >
      <div className="px-6 py-5 border-b border-gray-200 dark:border-[#2E3244]">
        <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
          oss-mailer
        </span>
      </div>
      <nav className="flex-1 py-3">
        <ul className="flex flex-col">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={
                    isActive
                      ? 'flex items-center gap-2 px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-l-2 border-blue-600 dark:border-blue-400 bg-gray-100 dark:bg-[#21263A]'
                      : 'flex items-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-l-2 border-transparent hover:bg-gray-100 dark:hover:bg-[#21263A]'
                  }
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
```

Active-link rules (load-bearing):
- `/` is active only on exact `pathname === '/'` — otherwise it would match every route.
- Other items are active on exact match **or** when `pathname` starts with `item.href + '/'` (so future `/templates/[category]` routes from WU-016 highlight Templates).

**`src/app/(shell)/MobileNav.tsx` (Client Component).**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from './nav-items'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#2E3244] bg-gray-50 dark:bg-[#1A1D27]">
        <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
          oss-mailer
        </span>
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          onClick={() => setOpen(true)}
          className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21263A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="mobile-nav-drawer"
        aria-label="Primary navigation"
        hidden={!open}
        className="md:hidden fixed inset-y-0 left-0 z-50 w-[260px] bg-gray-50 dark:bg-[#1A1D27] border-r border-gray-200 dark:border-[#2E3244] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#2E3244]">
          <span className="text-base font-semibold text-gray-900 dark:text-gray-50">
            oss-mailer
          </span>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21263A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <nav className="flex-1 py-3">
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={
                      isActive
                        ? 'flex items-center gap-2 px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-l-2 border-blue-600 dark:border-blue-400'
                        : 'flex items-center gap-2 px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-l-2 border-transparent'
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
```

Accessibility constraints (load-bearing):
- Hamburger button has `aria-label`, `aria-expanded`, `aria-controls`.
- Drawer uses `hidden` attribute (not just CSS) when closed so it is removed from the a11y tree.
- Backdrop click closes the drawer; Link click closes the drawer.
- Both Sidebar and MobileNav set `aria-current="page"` on the active link.

**`src/app/(shell)/FirstRunBanner.tsx` (Server Component).**

```tsx
import Link from 'next/link'
import { REQUIRED_ENV_VARS } from '@/lib/env'

export function FirstRunBanner() {
  let missingCount = 0
  let readFailed = false
  try {
    missingCount = REQUIRED_ENV_VARS.filter((k) => !process.env[k]).length
  } catch {
    readFailed = true
  }

  if (!readFailed && missingCount === 0) {
    return null
  }

  const message = readFailed
    ? 'Could not check configuration.'
    : `${missingCount} environment variable${missingCount === 1 ? ' is' : 's are'} not configured.`

  return (
    <div
      role="status"
      className="mx-auto max-w-5xl px-4 pt-4"
    >
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
        <span>
          <span aria-hidden="true">⚠ </span>
          {message}
        </span>
        <Link
          href="/settings"
          className="font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:focus-visible:outline-amber-300"
        >
          Go to Settings →
        </Link>
      </div>
    </div>
  )
}
```

Banner rules (load-bearing):
- Server Component — no `"use client"`, no `useState`, no `useEffect`.
- Returns `null` (renders nothing) when all vars are set — assertion target for the tester.
- `try` / `catch` around the `process.env` read produces "Could not check configuration" copy on failure (covers walkthrough error case).
- The amber colours map to `colour.semantic.warning` and `colour.semantic.warning.bg` from the design system; Tailwind's `amber-*` palette is the closest match to the spec values and is what the existing dashboard uses (`bg-amber-*` is not yet used elsewhere — verify after build that visual matches; if not, the coder may swap to inline-token `bg-[#FFFBEB]` / `dark:bg-[#78350F]`).
- Singular vs plural ("variable is" vs "variables are") is handled inline — no i18n library.

**Stub pages.**

`src/app/templates/page.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Templates — oss-mailer',
}

export default function TemplatesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 pt-10 pb-12">
      <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-8">
        Templates
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Template management coming soon (WU-016).
      </p>
    </main>
  )
}
```

`src/app/settings/page.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings — oss-mailer',
}

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-10 pb-12">
      <h1 className="text-2xl font-semibold leading-tight text-gray-900 dark:text-gray-50 mb-8">
        Settings
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Settings page coming soon (WU-015).
      </p>
    </main>
  )
}
```

WU-015 and WU-016 will replace these stubs entirely — they are placeholders to satisfy the "no 404 from nav" gate.

**Per-page `<title>` metadata.**

The existing `src/app/page.tsx` and `src/app/test-send/page.tsx` do not export `metadata`. Add `export const metadata: Metadata = { title: 'Send log — oss-mailer' }` and `{ title: 'Test send — oss-mailer' }` to those two files respectively. This is a tiny addition that satisfies "How we'll know it's done" item 5 without restructuring the page bodies.

(`page.tsx` is `async` because of the `await getRecentSends(...)` call. `export const metadata` is allowed alongside async default exports.)

**`src/app/layout.test.tsx` update.**

The existing test imports `RootLayout` from `./layout`. After the update, the import will trigger `next/font/google` resolution. The test must mock `next/font/google` so vitest does not attempt to fetch fonts.

```tsx
import { vi, describe, it, expect } from 'vitest'

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter', className: 'font-inter' }),
  JetBrains_Mono: () => ({ variable: '--font-jetbrains-mono', className: 'font-jetbrains-mono' }),
}))

describe('RootLayout', () => {
  it('exports a default function', async () => {
    const { default: RootLayout } = await import('./layout')
    expect(typeof RootLayout).toBe('function')
  })
})
```

Use a dynamic `import('./layout')` so the `vi.mock` is registered before the module evaluates. Smoke-test only — same shape as the existing `page.test.tsx`. Functional assertions about banner / nav behaviour are out of scope for this WU's tests (tester will check via `npx vitest run`; broader visual gates are deferred to manual verification per the WU's gate list).

**Verification gates (for the tester).**

1. `npm run build` exits 0 — confirms `next/font/google` resolves, no TS errors, no route conflicts (templates/, settings/ stubs are valid Next routes).
2. `npx vitest run` exits 0 — `layout.test.tsx` passes with the `next/font/google` mock; all existing tests still pass (no regression in `page.test.tsx`, `test-send`, etc.).
3. `grep -q "NAV_ITEMS" src/app/\(shell\)/nav-items.ts` — confirms shared nav list exists.
4. `grep -q "usePathname" src/app/\(shell\)/Sidebar.tsx` — confirms active-link detection wired.
5. `grep -q "REQUIRED_ENV_VARS" src/app/\(shell\)/FirstRunBanner.tsx` — confirms env-driven banner.
6. `grep -q "@theme" src/app/globals.css` — confirms Tailwind v4 font wiring.
7. Manual: open `/` with all env vars set — no banner. Unset one var (e.g. `unset MAILER_API_KEY` in dev) — banner appears with count "1". Click "Go to Settings" — lands on `/settings` stub.

**Failure modes the contract addresses.**
- Layout becoming a Client Component (would break env reads at request time, break Server-only data in children). Mitigation: explicit constraint, no `"use client"` at the top of `layout.tsx`.
- `next/font/google` failing in unit tests (network attempt). Mitigation: `vi.mock` in `layout.test.tsx`.
- Active state hitting on `/` for every route (because every path starts with `/`). Mitigation: special-case `item.href === '/'` to require exact match.
- Drawer left open across navigation. Mitigation: Link `onClick={() => setOpen(false)}` closes the drawer; pathname change is observed via `usePathname` so the next render re-evaluates active state.

---

### 2026-05-25 — coder: implementation complete

**Files created:**
- `src/app/(shell)/nav-items.ts` — shared `NAV_ITEMS` array, server-safe
- `src/app/(shell)/Sidebar.tsx` — Client Component, desktop sidebar with `usePathname` active detection
- `src/app/(shell)/MobileNav.tsx` — Client Component, mobile top bar + hamburger drawer
- `src/app/(shell)/FirstRunBanner.tsx` — Server Component, reads `REQUIRED_ENV_VARS` from `@/lib/env`
- `src/app/templates/page.tsx` — stub page, title "Templates — oss-mailer"
- `src/app/settings/page.tsx` — stub page, title "Settings — oss-mailer"

**Files modified:**
- `src/app/layout.tsx` — full replacement: Inter + JetBrains_Mono fonts, shell flex container, Sidebar + MobileNav + FirstRunBanner
- `src/app/globals.css` — added `@theme` block wiring `--font-inter` and `--font-jetbrains-mono` to Tailwind v4 `--font-sans` / `--font-mono`
- `src/app/layout.test.tsx` — updated with `vi.mock('next/font/google', ...)` + dynamic import
- `src/app/page.tsx` — added `Metadata` import + `export const metadata` with title "Send log — oss-mailer"
- `src/app/test-send/page.tsx` — added `Metadata` import + `export const metadata` with title "Test send — oss-mailer"

**Verification gates passed:**
- `npx vitest run` — 361 tests, 18 files, exit 0
- All four grep gates (NAV_ITEMS, usePathname, REQUIRED_ENV_VARS, @theme) — OK

**Nothing unexpected.** The existing `layout.test.tsx` imported `RootLayout` at the module top level; switched to dynamic import inside the test body so `vi.mock` registers first. `REQUIRED_ENV_VARS` was already exported from `@/lib/env` — no changes needed there.

**Ready for tester:** all acceptance criteria should be verifiable. Manual gate 7 (banner appearance/disappearance with env var unset) requires a running dev server.

**What's NOT done:** no functional Settings or Templates pages — those are stubs per the brief (WU-015 and WU-016 respectively).

**What hands off to whom.**
- WU-015 (Settings) replaces `src/app/settings/page.tsx`. It can rely on the shell being present.
- WU-016 (Templates) replaces `src/app/templates/page.tsx` and adds `src/app/templates/[category]/page.tsx`. Active-link detection already handles the nested route because of the `startsWith(item.href + '/')` rule.
- The first-run banner is intentionally simple — it only shows the count. WU-015's Settings page is the place that lists *which* vars are missing. This is deliberate division of responsibility.

---

### Review — 2026-05-25

**Verdict: APPROVE** — no blockers. Two warns and two nits noted below.

---

#### Acceptance criteria walkthrough

1. **AC-1 (sidebar with four links)** — `src/app/layout.tsx:31` renders `<Sidebar />` which iterates `NAV_ITEMS` (`/`, `/test-send`, `/templates`, `/settings`). Pass.

2. **AC-2 (active nav visual state)** — `src/app/(shell)/Sidebar.tsx:33` applies `text-blue-600 border-l-2 border-blue-600` on active, transparent border + `text-gray-700` on inactive. Pass.

3. **AC-3 (amber banner on missing env vars)** — `src/app/(shell)/FirstRunBanner.tsx:8` filters `REQUIRED_ENV_VARS` against `process.env` and returns a banner with count when `missingCount > 0`. Pass. (See NIT-1 for colour token drift.)

4. **AC-4 (no banner when all vars set)** — `FirstRunBanner.tsx:13-15` returns `null` when `!readFailed && missingCount === 0`. Covered by `FirstRunBanner.test.tsx` test "returns null when all required env vars are present". Pass.

5. **AC-5 (page titles)** — All four pages verified:
   - `src/app/page.tsx:6` — "Send log — oss-mailer" ✓
   - `src/app/test-send/page.tsx:4` — "Test send — oss-mailer" ✓
   - `src/app/templates/page.tsx:3` — "Templates — oss-mailer" ✓
   - `src/app/settings/page.tsx:3` — "Settings — oss-mailer" ✓
   Pass.

6. **AC-6 (responsive layout)** — `Sidebar.tsx:13` is `hidden md:flex`. `MobileNav.tsx:14` is `md:hidden`. `layout.tsx:30` is `min-h-screen md:flex`. Pass.

7. **AC-7 (vitest exits 0)** — Confirmed: 386 tests, 22 files, exit 0.

---

#### Specific checks

- **No `"use client"` in `layout.tsx`** — confirmed absent. Server Component intact.
- **`Sidebar.tsx` active-link logic** — `Sidebar.tsx:23-25`: `/` uses exact `pathname === '/'`; others use `pathname === item.href || pathname.startsWith(item.href + '/')`. Exact match with spec.
- **`FirstRunBanner.tsx` is a Server Component** — no `"use client"`, no `useState`, no `useEffect`. Confirmed.
- **`MobileNav.tsx` drawer uses `hidden={!open}`** — `MobileNav.tsx:41`. Confirmed. A11y tree removes drawer when closed.
- **Hamburger `aria-label`, `aria-expanded`, `aria-controls`** — `MobileNav.tsx:20-22`. All three present. Confirmed.
- **`aria-current={isActive ? 'page' : undefined}`** — confirmed in both `Sidebar.tsx:30` and `MobileNav.tsx:68`.
- **`globals.css` starts with `@import "tailwindcss"` and has `@theme` block** — `globals.css:1,3`. Confirmed.
- **`src/app/page.tsx` metadata** — "Send log — oss-mailer" at `page.tsx:6`. Confirmed.
- **`src/app/test-send/page.tsx` metadata** — "Test send — oss-mailer" at `test-send/page.tsx:4`. Confirmed.
- **No new npm packages** — `package.json` diff shows only `test:client` and `build:client` scripts added (from WU-012 client SDK work), no new `dependencies` or `devDependencies` entries.
- **Protected files untouched** — `src/app/(dashboard)/LogTable.tsx`, `src/app/health/route.ts`, `src/app/api/send/route.ts`, `src/app/api/queue/deliver/route.ts` show zero diff vs HEAD.

---

#### Findings

**WARN-1 — Dark-mode banner background token drift**

What: `FirstRunBanner.tsx:26` uses `dark:bg-amber-950`. Tailwind v4's `amber-950` resolves to `#431407`, which does not match the design system token `colour.semantic.warning.bg` dark value of `#78350F` (amber-900). The spec itself flagged this and left a note: "if not, the coder may swap to inline-token `dark:bg-[#78350F]`". Light mode (`bg-amber-50` = `#FFFBEB`) is correct.

Where: `src/app/(shell)/FirstRunBanner.tsx:26`

Suggested fix: Change `dark:bg-amber-950` to `dark:bg-[#78350F]` (the exact design system token value for `colour.semantic.warning.bg` dark). Similarly review `dark:border-amber-800` — design system doesn't define a warning border token, but `amber-800` (#92400E) is close enough to not be a contrast issue. Only the background is a clear mismatch.

---

**WARN-2 — `src/app/test-send/page.tsx` modified with no test file (Gate B)**

What: `src/app/test-send/page.tsx` was modified in this WU to add `export const metadata`. There is no `src/app/test-send/page.test.tsx` (or equivalent colocated test). The parallel stub pages (`templates/page.tsx`, `settings/page.tsx`) both received `page.test.tsx` files testing the metadata export. Consistency requires the same coverage here.

Where: `src/app/test-send/page.tsx`

Suggested fix: Add `src/app/test-send/page.test.tsx` that imports `{ metadata }` from `./page` and asserts `metadata.title === 'Test send — oss-mailer'` — same two-test pattern as `src/app/settings/page.test.tsx` and `src/app/templates/page.test.tsx`. This is a straightforward addition; it is rebuttable if the coder considers this file config-only, but the equivalent stubs were tested.

---

**NIT-1 — Hamburger `aria-label` does not update when drawer is open**

What: `MobileNav.tsx:20` sets `aria-label="Open navigation"` unconditionally. When `open === true`, `aria-expanded={true}` correctly signals the expanded state, but the label still reads "Open navigation". Screen readers announce "Open navigation, expanded" — not harmful, but the idiomatic pattern for a toggle button is `aria-label={open ? 'Close navigation' : 'Open navigation'}`.

Where: `src/app/(shell)/MobileNav.tsx:20`

Suggested fix: Change to `aria-label={open ? 'Close navigation' : 'Open navigation'}`. This is a cosmetic improvement — `aria-expanded` carries the state, so the current implementation satisfies WCAG AA — but the dynamic label is better for screen-reader UX.

---

**NIT-2 — Coder notes report stale test count**

What: The coder's session note (2026-05-25) records "361 tests, 18 files, exit 0". The actual suite at review time is 386 tests, 22 files. The difference is the four new test files added as part of this WU (nav-items.test.ts, FirstRunBanner.test.tsx, settings/page.test.tsx, templates/page.test.tsx — 25 tests across 4 files). The gate passes; the note was written before the test files were complete.

Where: `docs/build/work-units/014-nav-shell-first-run.md` — coder notes section

Suggested fix: No code change needed. The authoritative gate is the live vitest output (386/386, exit 0). Future session notes should report the final post-test count.
