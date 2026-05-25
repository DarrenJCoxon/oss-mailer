# D014 — Navigation shell lives in the root layout; no route-group boundary in Phase 1

| Field | Value |
| --- | --- |
| Status | ✅ accepted |
| Date | 2026-05-25 |
| Supersedes | — |
| Superseded by | — |

## Context

WU-014 ships the navigation shell that wraps every dashboard page (Send log, Test send, Templates, Settings) plus the first-run env-check banner. Two structurally different placements were considered:

- **A.** `src/app/layout.tsx` (the root layout) owns the shell directly. Every page under `src/app/` inherits it. The existing `src/app/(dashboard)/` folder stays as a plain colocation folder for `LogTable.tsx`.
- **B.** A new `src/app/(dashboard)/layout.tsx` owns the shell as a route-group boundary. The root layout stays minimal. All existing pages move into `src/app/(dashboard)/`.

Phase 1 has no shell-less surfaces planned. WU-015 (Settings) and WU-016 (Templates) both want the shell. Design B would force a path-rename refactor on the just-shipped WU-011 dashboard (breaking `src/app/page.tsx`'s `./(dashboard)/LogTable` import) for zero functional gain today.

## Decision

The oss-mailer navigation shell (sidebar + mobile nav + first-run banner + fonts) lives in **`src/app/layout.tsx`** — the root layout. Client-only concerns (active-link detection, drawer toggle) are extracted into Client Components under `src/app/(shell)/`. The first-run banner is a Server Component that reads `REQUIRED_ENV_VARS` against `process.env` at render time. No route group is introduced for the dashboard surfaces in Phase 1.

The folder `src/app/(shell)/` is a **colocation folder for shell components**, not a route group with a layout. Likewise, `src/app/(dashboard)/` remains a colocation folder for the Send Log's `LogTable.tsx` — it does **not** host a layout file.

## Why

1. Phase 1 has no shell-less route. Every planned surface (Send log, Test send, Templates, Settings, plus future pages in this phase) wants the shell — Design B's structural benefit is unrealised.
2. Design B requires moving `src/app/page.tsx`, `src/app/test-send/page.tsx` and renaming the existing `(dashboard)/` folder's purpose. That refactor risk is unjustified by the current scope.
3. Colocating the env-driven first-run banner with the root layout keeps the server-only env read in one obvious place.
4. The route-group boundary can be introduced later when the first shell-less surface (e.g. a public unsubscribe page, an embed preview) actually arrives — a localised refactor, not a permanent constraint.

## What this commits future work to

- All dashboard surfaces (current and future, in Phase 1) inherit the shell from the root layout automatically. New pages do not need to import or compose the shell themselves.
- Client Components used by the shell live under `src/app/(shell)/` and are imported as children of the Server-Component root layout. The root layout itself stays a Server Component — no `"use client"` at the top of `src/app/layout.tsx`.
- The first-run banner reads `REQUIRED_ENV_VARS` directly. If the canonical list of required env vars changes, the banner picks it up with no extra wiring.
- When (and only when) a shell-less route is genuinely required, file a superseding decision that introduces the route-group boundary at that point — do not silently add `src/app/(dashboard)/layout.tsx`.
- The `(dashboard)` folder name is reserved for its current colocation use; do not promote it to a route group without superseding this decision.

## Alternatives considered and rejected

- **Route-group layout (`src/app/(dashboard)/layout.tsx`):** rejected for Phase 1 — see Why above. May be reconsidered in a future phase.
- **Shell as a wrapping component imported by each page (no layout file):** rejected — would duplicate the shell mount on every page, defeats the purpose of Next.js layouts, and complicates the first-run banner (each page would need to import it).
