# Session — 2026-05-25 — WU-003 Router + WU-004 Template Renderer

## What this session was about

Two back-to-back swarm builds: WU-003 (Router — category → provider from env config) and WU-004 (Template Renderer — React Email → HTML). Both were fully unblocked after WU-002 (EmailProvider + SES) shipped in the previous session. The session ran two full swarm pipelines and promoted both work units to ✅ shipped, bringing the project to 110 passing tests and the Mail Sender (WU-005) to fully unblocked.

## What was done

### WU-003 — Router

**Swarm classification:** full-feature (contracts settled, but no architect brief in WU notes yet; design-it-twice required).

**Architect (opus):** Evaluated Design A (lazy env read — reads `process.env` on each `resolve()` call) against Design B (eager snapshot — reads all env vars at construction, builds frozen provider map). Chose Design B. Rationale: fails fast at startup rather than at first send of each category; preserves SES client memoisation across Vercel warm invocations; mirrors the `validateEnv()` pattern in `src/lib/env.ts` (read once, validate once, fail loudly). Brief written into WU-003 notes.

**Coder (sonnet):** Implemented `src/router/index.ts` (90 lines). Exports: `EmailCategory`, `RouterErrorCode`, `RouterError` (mirrors `ProviderError` exactly — same `_tag`, `code`, `category`, `cause`, `captureStackTrace` pattern), `isRouterError`, `createRouter()`. PROVIDERS registry with `ses` factory. `tsc --noEmit` exits 0.

**Tester (sonnet):** 27 tests at `src/router/index.test.ts`. All 6 ACs pass plus memoisation (strict reference equality), `isRouterError` guard paths (7 sub-cases), and eager-throw-at-construction proof. Required `vi.mock('@aws-sdk/client-ses')` hoisted before import because the eager design instantiates `SESClient` at `createRouter()` call time. Full suite: 70/70.

**Reviewer (sonnet):** APPROVED first pass. One NIT: the `UNKNOWN_CATEGORY` guard in `resolve()` is unreachable for well-typed callers (only fires for JavaScript/untyped callers bypassing TS). Intentional defensive safety net per architect's brief — not changed.

**Vitest gate:** ✓ 70 tests, 10 files.

---

### WU-004 — Template Renderer

**Swarm classification:** research-first → full-feature (React Email not yet installed; package API needed before design).

**Researcher (haiku):** Queried React Email install + render API. Returned: install `react-email` (unified bundle), async `render()` function, React 19 / Next.js 15 compatible.

**Coordinator correction (before architect spawned):** Ran `npm info react-email` — found it is a dev preview tool ("A live preview of your emails right in your browser"), not a runtime rendering library. Runtime packages are `@react-email/render` (v2.0.8) and `@react-email/components` (v1.0.12). Both support React 19 peer deps. Corrected before architect spawn.

**Architect (opus):** Evaluated Design A (static registry — `TEMPLATES` map imported at module load, `satisfies Record<EmailCategory, ...>` enforces compile-time exhaustiveness) against Design B (dynamic import — `await import()` per call, lazy loading). Chose Design A. Rationale: D007 says the category-to-template mapping is known at compile time — Design A makes that constraint structural via TypeScript exhaustiveness, Design B simulates it via string interpolation and weakens the guarantee. Vercel bundles all reachable code regardless, so the cold-start saving of Design B is theoretical for three small text-only components. Mirrors the router's PROVIDERS pattern for codebase consistency.

**Coder (sonnet):** Installed `@react-email/render` and `@react-email/components`. Created `src/templates/magic-link.tsx` (transactional, `{ url }` props, Preview preheader, no unsubscribe), `src/templates/promotional.tsx` (bulk, `{ subject, body, unsubscribeUrl }`, visible unsubscribe link), `src/templates/update.tsx` (same shape as promotional). Created `src/renderer/index.tsx` (`.tsx` required for JSX in TEMPLATES registry) — exports `TemplateError`, `TemplateErrorCode`, `isTemplateError`, `renderTemplate`. `tsc --noEmit` exits 0. `grep` for `<img|<script|stylesheet` returns no matches.

**Tester (sonnet):** 40 tests at `src/renderer/index.test.tsx`. All 7 ACs pass plus `isTemplateError` guard paths and `text !== html` check. React Email renders cleanly in vitest node environment without mocking — unlike the router's AWS SDK dependency. Full suite: 110/110.

**Reviewer (sonnet):** APPROVED. One WARN: the AC-4 preheader tests for `promotional` and `update` asserted on the subject string (`'Hello'`) which also appears in the body heading — the test did not uniquely prove the `<Preview>` element was present. One NIT: no fallback preview text when `subject` is empty. One NIT: inconsistent React import style (renderer imports explicitly, templates rely on auto-transform).

**Coordinator post-review:** Fixed the WARN — changed the AC-4 promotional/update preheader tests to assert on `html.toContain('max-height:0')` (the React Email Preview hidden div sentinel) alongside a unique sentinel string that can't appear in the heading. Full suite still 110/110 after fix.

**Vitest gate:** ✓ 110 tests, 11 files.

## Decisions made

No new D-NNN decision files filed. Both WUs' design choices (eager snapshot for the router, static registry for the renderer) are implementation-level and captured in the work unit notes. All relevant architectural decisions (D007, D008, D002) were already filed in the planning sessions.

## Open questions raised

None.

## Risks identified

None new. R001 (AWS SES sandbox mode) remains open from prior sessions.

## What's next

**WU-005 — Mail Sender** is fully unblocked (depends on WU-002 ✅, WU-003 ✅, WU-004 ✅). It is the natural next work unit — it wires together the router, renderer, and provider adapter into a complete sync delivery path.

**WU-006 — Send Log backend** and **WU-010 — Config Health Check UI** are also available in parallel (both depend only on WU-001 which shipped in the previous session).

## Resume hint

Both WU-003 and WU-004 are fully shipped and promoted to `done/`. The project has 110 passing tests across 11 files. WU-005 (Mail Sender) is the critical path — run `/build-wu WU-005` to continue. The Mail Sender will import `createRouter` from `src/router`, `renderTemplate` from `src/renderer`, and pass `{ html, text }` to the provider's `send()` method.
