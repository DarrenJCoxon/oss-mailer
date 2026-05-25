# D010 — `createLogWriter()` factory lives in `src/send-log/index.ts`

| Field | Value |
| --- | --- |
| Status | ✅ accepted |
| Date | 2026-05-25 |
| Supersedes | — |
| Superseded by | — |

## Context

`writeSendAttempt` (in `src/send-log/index.ts`) returns `Promise<{ id: string }>`. The `SendLogWriter` interface consumed by `createMailSender` (in `src/sender/index.ts`) requires `Promise<void>`. TypeScript strict mode does not accept the wider-return assignment, so the WU-007 coder hand-rolled an inline adapter in `src/app/api/queue/deliver/route.ts`:

```ts
const logWriter = {
  writeSendAttempt: (args: Parameters<typeof writeSendAttempt>[0]) =>
    writeSendAttempt(args).then(() => undefined),
}
```

The WU-007 reviewer flagged this as DRY debt to be paid before WU-008 ships, since WU-008's `POST /api/send` will need exactly the same construction (a `mailSender` requires a `SendLogWriter`). Without a factory, the same hand-rolled adapter will appear twice across two route files.

## Decision

Add `createLogWriter(): SendLogWriter` to `src/send-log/index.ts`. It returns an object that delegates to `writeSendAttempt` and discards the returned `{ id }`. Update the existing WU-007 route file (`src/app/api/queue/deliver/route.ts`) to use the factory at the same time as WU-008 introduces it.

The factory lives **with** the send-log module rather than in a new `src/lib/log-writer.ts` because:

1. The shape conversion is a property of *how the send-log writes* — `writeSendAttempt` returns the new row id for callers that care; the `SendLogWriter` contract represents the subset of that capability the sender consumes. Both belong to the send-log's public surface.
2. `src/lib/` currently contains only `env.ts` — environment validation. A second file in there for a one-line adapter is over-extraction.
3. Importing from `@/send-log` is already established in both route files. A second module path adds nothing.

## What this commits future work to

- `src/send-log/index.ts` exports `createLogWriter(): SendLogWriter` (a function, not a singleton — caller decides lifetime).
- `SendLogWriter` is **re-exported from `@/send-log`** as a type so callers do not have to dual-import (`createMailSender` from `@/sender`, `SendLogWriter` from `@/sender` — confusing). The canonical type still lives in `@/sender` (where `createMailSender` consumes it); `@/send-log` re-exports for ergonomics.
- The WU-007 route file is updated to `const logWriter = createLogWriter()` in the same WU-008 changeset. The inline adapter is removed.
- Any future module that needs to feed `createMailSender` a `SendLogWriter` uses `createLogWriter()`. No new inline adapters.

## Alternatives considered

- **New `src/lib/log-writer.ts`** — rejected: over-extracted for a one-line adapter; introduces a third module that imports from `@/send-log` to wrap `@/send-log`, which is indirection without benefit.
- **Change `writeSendAttempt` to return `Promise<void>`** — rejected: existing callers (and the existing return-shape test in `src/send-log/index.test.ts`, AC-1) depend on `{ id }`. Narrowing breaks a working contract.
- **Change `SendLogWriter.writeSendAttempt` to return `Promise<{ id: string } | void>`** — rejected: forces every implementor to widen for no consumer's benefit (`createMailSender` only ever discards the result). Polluting an interface to avoid one adapter is bad economics.
- **Leave the inline adapter and add a second copy in WU-008** — rejected: that's the DRY debt the reviewer flagged. Two identical inline adapters is exactly what the factory exists to prevent.

## Pointers

- WU-007 reviewer note (the DRY flag): `docs/build/work-units/done/007-queue.md` — review section
- WU-008 architect brief (consumer): `docs/build/work-units/008-api-endpoint.md`
- Sender's `SendLogWriter` definition: `src/sender/index.ts`
