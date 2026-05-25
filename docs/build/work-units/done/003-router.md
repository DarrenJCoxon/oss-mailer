# Work Unit 003 — Router — category → provider from env config

**Status:** ✅ shipped
**For:** [P001 — Indie SaaS Developer](../../personas/P001-indie-dev.md)
**Last updated:** 2026-05-24

**Depends on:** [WU-002 — `EmailProvider` interface + SES adapter](002-email-provider-interface-ses-adapter.md)

## What's done when this ships

The Router module reads env vars (`MAGIC_LINK_PROVIDER`, `PROMOTIONAL_PROVIDER`, `UPDATE_PROVIDER`) and returns the correct `EmailProvider` instance for a given category. No routing logic lives anywhere else in the codebase. Adding a new provider is one new adapter file plus one env var — zero changes to the Router.

## Walkthrough

1. P001 sets `MAGIC_LINK_PROVIDER=ses` in `.env.local`.
2. At runtime, Mail Sender calls `router.resolve('magic_link')` and receives the SES adapter instance.
3. P001 later sets `PROMOTIONAL_PROVIDER=mailgun` — the Router returns the Mailgun adapter for that category without any code change.

**What if something goes wrong:**
- Unknown category: Router throws a typed `RouterError` with `{ code: 'UNKNOWN_CATEGORY', category }`.
- Provider env var missing or invalid: Router throws `RouterError` with `{ code: 'PROVIDER_NOT_CONFIGURED', category }`.

## How we'll know it's done

1. `router.resolve('magic_link')` returns the SES adapter when `MAGIC_LINK_PROVIDER=ses`.
2. `router.resolve('promotional')` returns the SES adapter when `PROMOTIONAL_PROVIDER=ses`.
3. `router.resolve('update')` returns the SES adapter when `UPDATE_PROVIDER=ses`.
4. Passing an unknown category throws `RouterError` with `code: 'UNKNOWN_CATEGORY'`.
5. Missing provider env var throws `RouterError` with `code: 'PROVIDER_NOT_CONFIGURED'`.
6. `npx vitest run` exits 0.

## Notes / log

### 2026-05-24 — initial filing

Intentionally thin module (architecture note). Single responsibility: category string in, `EmailProvider` instance out. Config-driven mapping enforced by D002 (no failover logic here). Filed after WU-002 because the return type is `EmailProvider`.

### 2026-05-24 — coder implementation

Implemented `src/router/index.ts` (82 lines). Exports: `EmailCategory`, `RouterErrorCode`, `RouterError`, `isRouterError`, `createRouter`. Eager-snapshot design per Design B. `PROVIDERS` registry and `ENV_VAR_BY_CATEGORY` map are module-level constants; `createRouter()` iterates all three categories at construction, throws `RouterError` immediately on missing or unknown provider id, instantiates each provider once, freezes the result map. `resolve()` is a pure map lookup with a defensive `UNKNOWN_CATEGORY` guard. `npx tsc --noEmit` exits 0. Ready for tester to write `src/router/index.test.ts`.

Nothing left undone from the WU spec.

### 2026-05-24 — architect brief

**Design A — Lazy env read**
`createRouter()` does no work at construction — it just returns an object with a `resolve(category)` method. Each call to `resolve()` reads `process.env[envVarMap[category]]` at that moment, looks the value up in the provider registry, and instantiates a fresh provider (or throws `RouterError`). Tradeoffs: zero startup cost; misconfiguration is only discovered when a category is first used (so a broken `UPDATE_PROVIDER` is invisible until the first update email is sent); tests can mutate `process.env` between assertions without rebuilding the router; every resolve allocates a new provider instance, which defeats the SES client memoisation inside `createSesAdapter` if the caller doesn't cache the result.

**Design B — Eager snapshot**
`createRouter()` reads all three category env vars at construction time, validates each one against the known-provider registry, instantiates each provider exactly once, and stores a frozen `Record<EmailCategory, EmailProvider>` map. Any misconfigured category throws `RouterError` immediately — before any send is attempted. `resolve(category)` becomes a pure map lookup with a single `UNKNOWN_CATEGORY` guard for typo-safety in TypeScript-light callers. Tradeoffs: fails fast at module load (matches the architecture's "intentionally thin" framing — the router's whole job is a static lookup table); env must be set before `createRouter()` runs, which is the normal Vercel serverless lifecycle anyway; provider instances are reused across requests within a warm lambda (good, given SES client memoisation); tests must set env *before* calling `createRouter()`, which is a clearer mental model than "set env, call resolve" and matches how the validated env is already handled by `src/lib/env.ts`.

**Chosen design: B**
Eager snapshot fails fast on misconfiguration (a `PROMOTIONAL_PROVIDER` typo surfaces at boot, not at the first promotional send three days later), preserves provider memoisation across warm invocations on Vercel, and gives `resolve()` the trivial shape the architecture promises — a map lookup. This mirrors the existing `validateEnv()` pattern in `src/lib/env.ts` (read once, validate once, fail loudly) and keeps the surface area of the router exactly as advertised: "category in, provider out."

**Implementation brief for the coder:**
- File: `src/router/index.ts` — exports `createRouter()`, `RouterError`, `RouterErrorCode`, `EmailCategory`
- `EmailCategory` type: `'magic_link' | 'promotional' | 'update'`
- `RouterErrorCode` type: `'UNKNOWN_CATEGORY' | 'PROVIDER_NOT_CONFIGURED'`
- `RouterError` class: modelled on `ProviderError` in `src/providers/errors.ts` — constructor takes `{ code: RouterErrorCode, category: string, message: string, cause?: unknown }`; exposes readonly `code`, `category`, `cause`, and `readonly _tag = 'RouterError' as const`; extends `Error`; sets `this.name = 'RouterError'`; calls `Error.captureStackTrace?.(this, RouterError)`
- `createRouter()`: at construction, iterates the env-var mapping; for each category reads `process.env[varName]`; if missing/empty throws `RouterError({ code: 'PROVIDER_NOT_CONFIGURED', category, message })`; if the value is not a key in the providers registry throws `RouterError({ code: 'PROVIDER_NOT_CONFIGURED', category, message })` naming both the category and the unknown provider id; invokes the registry factory once per category and stores the resulting `EmailProvider` in an internal `Record<EmailCategory, EmailProvider>` that is then `Object.freeze`d
- `resolve(category: EmailCategory)`: looks the category up in the frozen map; if the category is not a known `EmailCategory` (defensive against untyped callers) throws `RouterError({ code: 'UNKNOWN_CATEGORY', category, message })`; otherwise returns the stored `EmailProvider`
- Known providers registry: `const PROVIDERS = { ses: () => createSesAdapter() } as const satisfies Record<string, () => EmailProvider>` — import `createSesAdapter` from `../providers/ses` (or `../providers` if a barrel exists)
- Env var mapping: `const ENV_VAR_BY_CATEGORY: Record<EmailCategory, string> = { magic_link: 'MAGIC_LINK_PROVIDER', promotional: 'PROMOTIONAL_PROVIDER', update: 'UPDATE_PROVIDER' }`
- Must export `isRouterError(e: unknown): e is RouterError` guard following the dual-check pattern from `isProviderError` (`instanceof` OR `_tag === 'RouterError'`)
- The router does **not** call `provider.validate()` — provider env validation is the provider's responsibility, invoked by the caller (Mail Sender / Config Health). Router only validates that the provider id is known and that the env var for the category is set.
- Tests must live at `src/router/index.test.ts` and cover, at minimum: (a) all three categories resolve to the SES adapter when env is `ses`; (b) missing env var throws `PROVIDER_NOT_CONFIGURED` at `createRouter()` time, not at `resolve()` time; (c) unknown provider id (e.g. `MAGIC_LINK_PROVIDER=fakeprovider`) throws `PROVIDER_NOT_CONFIGURED` at `createRouter()` time; (d) `resolve('not_a_category' as EmailCategory)` throws `UNKNOWN_CATEGORY`; (e) `isRouterError` returns true for thrown instances and false for `ProviderError` and plain `Error`; (f) repeated `resolve('magic_link')` calls return the **same** `EmailProvider` instance (proves memoisation).

### 2026-05-24 — tester results

27 tests written at `src/router/index.test.ts`. Full suite (`npx vitest run`) exits 0: 70 tests across 10 files, all passing.

**Acceptance criteria coverage:**

| AC | Description | Status |
|----|-------------|--------|
| 1 | `resolve('magic_link')` returns SES adapter when `MAGIC_LINK_PROVIDER=ses` | PASS |
| 2 | `resolve('promotional')` returns SES adapter when `PROMOTIONAL_PROVIDER=ses` | PASS |
| 3 | `resolve('update')` returns SES adapter when `UPDATE_PROVIDER=ses` | PASS |
| 4 | Unknown category throws `RouterError` with `code: 'UNKNOWN_CATEGORY'` | PASS |
| 5 | Missing env var throws `RouterError` with `code: 'PROVIDER_NOT_CONFIGURED'` | PASS |
| 6 | `npx vitest run` exits 0 | PASS |

**Architect brief extras (all passing):**
- Unknown provider id (`MAGIC_LINK_PROVIDER=fakeprovider`) throws `PROVIDER_NOT_CONFIGURED` at `createRouter()` time
- `isRouterError` returns true for `RouterError`, false for plain `Error` and `ProviderError`
- Repeated `resolve()` calls return the same `EmailProvider` instance (memoisation proven via strict reference equality)

**Testing notes:**
- `@aws-sdk/client-ses` must be mocked via `vi.mock` before importing `createRouter`; otherwise `SESClient` construction fails without real AWS credentials
- All three category env vars plus the three SES credential vars must be set before `createRouter()` is called (eager-snapshot design)
- `process.env` is saved/restored in `beforeEach`/`afterEach` to prevent test pollution
- Casting to `never` (not `EmailCategory`) is required to pass a genuinely unknown category to `resolve()` without TypeScript compile errors

**Recommendation: ready for review.**

### 2026-05-25 — shipped ✅

Reviewer approved first pass — no retries needed. One NIT recorded: the `UNKNOWN_CATEGORY` guard in `resolve()` is structurally unreachable for well-typed callers; it is an intentional safety net for untyped callers per the architect's brief. No change required.

**What was attempted:** build the router module via the full swarm pipeline (architect → coder → tester → reviewer).

**What worked:** design-it-twice surface both viable options clearly — eager snapshot was obviously correct once compared to the lazy alternative. The `satisfies Record<EmailCategory, ...>` pattern (mirrored from the router's PROVIDERS registry in WU-003) gives compile-time exhaustiveness. The AWS SDK mock pattern (`vi.mock` hoisted before import) is the correct approach for eager-instantiation modules in vitest.

**What was learned:** for eager-snapshot modules (all env reads at construction), tests must set `process.env` before the module is imported — or before `createRouter()` is called if the factory is invoked inside the test. The `beforeEach`/`afterEach` env save/restore pattern is the standard approach.

**Next concrete action:** WU-004 (Template Renderer) was built immediately after in the same session. WU-005 (Mail Sender) consumes the router via `createRouter()` — no interface changes expected.
