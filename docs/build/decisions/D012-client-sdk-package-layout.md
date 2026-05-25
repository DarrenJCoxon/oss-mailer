# D012 — Client SDK lives in a separate package directory, not the root package

| Field | Value |
| --- | --- |
| Status | ✅ accepted |
| Date | 2026-05-25 |
| Affects | WU-012, WU-013, repo root `package.json`, future packaging/publishing |
| Supersedes | — |
| Superseded by | — |

## Context

WU-012 ships the consumer-facing npm package `oss-mailer`, which exports a `createMailerClient` function and a NextAuth v5 email provider from the `oss-mailer/nextauth` subpath. The mailer service itself lives at the repo root: a Next.js 15 app with `@aws-sdk/client-ses`, `@neondatabase/serverless`, Drizzle, QStash, and react-email as runtime dependencies, and `"private": true` in its `package.json`.

The architect had to decide how to lay out the published package alongside the service. Two structurally different designs were on the table.

## Decision

The client SDK lives in `packages/oss-mailer/` as its own publishable package, with its own `package.json`, its own `tsconfig.json`, and its own source tree under `packages/oss-mailer/src/`. The repo-root `package.json` stays `"private": true` — it represents the deployable service, not a published artefact. Only the `packages/oss-mailer/` subtree is published to npm.

The published package has **zero runtime dependencies** — it uses native `fetch` only. The `oss-mailer/nextauth` entry is exposed via a subpath export in `packages/oss-mailer/package.json` and ships compiled JS + `.d.ts` files alongside the main entry.

The renderer-side change (a `props.html` passthrough — see D013) lives in the service tree at `src/renderer/index.tsx` as it always has.

## Why

**The decision turns on isolation of the dependency graph.** A consumer who runs `npm install oss-mailer` must not pull in `@aws-sdk/client-ses`, `@neondatabase/serverless`, `drizzle-orm`, or `next` — those are service-side dependencies, irrelevant to a developer who only wants to POST to a running mailer instance. They bloat node_modules, slow installs, and (worst) might be accidentally imported by autocomplete in the consumer's IDE.

The alternative — flipping the root `package.json` from `"private": true` to publishable and using `files` / `exports` to whitelist the client tree — works on paper but has three concrete failure modes:

1. **Accidental cross-import at compile time.** With one `tsconfig.json` covering the whole repo, the client source can `import` from `src/sender/` without the type-checker complaining; an enforcement layer (lint rule, separate tsconfig project, `exports` whitelist) is required to prevent it. Each layer is a place the discipline can erode.
2. **Bundled-size and dependency-graph surprises.** The package's published `dependencies` field would need to be manually pruned to remove every service dep. A new service dep added in WU-014 silently widens the published package's install surface unless someone notices.
3. **The published artefact's identity is ambiguous.** Consumers reading the GitHub repo see one `package.json` named `oss-mailer` with Next.js, AWS SDK, and Drizzle in its dependencies — and have to infer that the publish step somehow filters those out. The separation between "the service" and "the SDK" only exists in publish config, not in the source layout.

A `packages/oss-mailer/` subtree makes all three failure modes structural rather than disciplinary. The client source physically cannot import from `src/`. The client `package.json` has its own `dependencies` field (empty in v1). The published artefact is the entire directory; there is no filtering step.

## What this commits future work to

- A `packages/` directory exists at the repo root. Future published packages (e.g. a CLI in Phase 3) live there too.
- The root `package.json` stays `"private": true`. The repo is **not** a workspace in v1 — no `workspaces` field, no pnpm/yarn workspaces config. The client package is built and published standalone. This avoids hoisting surprises and keeps the root install behaviour identical to today. A workspaces conversion is a deliberate future decision, not a side-effect.
- The client package has its own `tsconfig.json` with no `paths` mapping into `src/` and no `include` reaching outside `packages/oss-mailer/src/`. A coder who tries to `import { renderTemplate } from '../../../src/renderer'` from inside the client gets a TS error.
- The client package's `package.json` declares `"dependencies": {}` in v1. Adding any runtime dependency requires a follow-up decision — `fetch` is universally available in the target runtimes (Node 18+, Edge, browser).
- Build for the client package emits dual JS + `.d.ts` to `packages/oss-mailer/dist/`, configured via `tsc --build`. Bundling is unnecessary — the package is < 200 LoC and consumers' bundlers can handle ESM directly. (If this proves wrong, switching to `tsup` is a small follow-up.)
- The service code at the repo root keeps using `src/` and `src/renderer/`, `src/api/` etc. No file moves required. The renderer's `props.html` passthrough is added in place per D013.

## Alternatives considered

**Single-package layout: flip root `package.json` to publishable, put client at `src/client/`.** Rejected for the three failure modes above — accidental cross-imports, dependency-graph bleed, ambiguous artefact identity. The wins (one publish step, one `package.json`) are real but small, and undone by the first time a coder accidentally imports `@aws-sdk/client-ses` from a client file because TS autocomplete offered it.

**Separate repository for `oss-mailer-client`.** Rejected for v1 — the client's request/response types are derived from the API handler's validator (`src/api/send/index.ts`). Keeping them in the same repo lets the client's tests pin against the actual handler's behaviour without a published-version dance. A separate repo is reconsidered if/when the client gains complexity that justifies independent release cycles.

## Pointers

- Builds on [D001 — Open-source and self-hosted](D001-open-source-self-hosted.md) (the SDK is the consumer-facing surface of D001's "any developer can deploy and use this")
- Shapes [WU-012 — npm package + client SDK](../work-units/012-npm-package-client.md)
- Pairs with [D013 — `props.html` passthrough in the renderer](D013-renderer-props-html-passthrough.md)
