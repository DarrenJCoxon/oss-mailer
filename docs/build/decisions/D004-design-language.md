# D004 — Design language: blue/orange/grey, Inter + JetBrains Mono, dark/light/system

| Field | Value |
| --- | --- |
| Status | ✅ accepted |
| Date | 2026-05-24 |
| Supersedes | — |
| Superseded by | — |

## Context

Phase C required establishing the visual and interaction language for oss-mailer's admin UI. Choices were made during planning and are recorded here as a load-bearing decision so future UI work doesn't reinvent them.

## Decision

oss-mailer's design language is:

- **Colour palette:** Blue primary (`#2563EB` light / `#3B82F6` dark), orange accent (`#F97316` light / `#FB923C` dark), grey neutral scale. Clean developer aesthetic — not consumer, not corporate.
- **Mode:** Light, dark, and system preference supported. System preference is the default.
- **Typography:** Inter (UI text, weights 400/500/600) + JetBrains Mono (timestamps, IDs, data). Desktop-first.
- **Radius:** Slightly rounded — `radius.md` (6px) for interactive elements, `radius.lg` (8px) for containers.
- **Motion:** Functional only — no decorative animation. Fast (100ms) for hover/press, base (200ms) for open/close.

## Why

oss-mailer is a developer tool. The aesthetic should feel like the tools developers already trust (Vercel, Railway, Linear) — clean, precise, dark-mode-friendly, with monospace where data density matters. Orange provides enough warmth and distinctiveness as an accent without competing with the blue action colour.

## What this commits future work to

- All UI components consume the token values in `docs/build/design-system/tokens-*.md`
- No one-off colours introduced without superseding this decision
- Both light and dark mode CSS custom properties must be implemented for every colour token
- JetBrains Mono used consistently for any data field (timestamps, IDs, addresses)
