# D001 — Mailer is open-source and self-hosted

| Field | Value |
| --- | --- |
| Status | ✅ accepted |
| Date | 2026-05-24 |
| Supersedes | — |
| Superseded by | — |

## Context

The project started as a personal cost-cutting tool for the operator's own SaaS products. During Phase A planning it was decided to open-source it so other developers can benefit from the same approach — bring your own provider credentials (SES, Mailgun, Brevo), deploy your own instance, pay nothing to run it beyond what the underlying providers charge.

## Decision

Mailer will be released as an open-source, self-hosted application. Every user deploys their own instance. There is no hosted SaaS version, no multi-tenant infrastructure, no billing layer, and no central operator.

## Why

- Removes the need for billing, multi-tenancy, and data isolation — substantially simpler architecture
- Aligns with the cost ethos: the tool itself costs nothing to use
- Enables community contributions (new provider integrations, etc.)
- Operator's intent: a gift to the dev community

## What this commits future work to

- No multi-tenant data models — each deployment is single-tenant by design
- No in-app billing or subscription management
- Provider credentials are env vars on the user's own deployment, never stored centrally
- Architecture must be deployable by a developer in under 30 minutes (one-click Vercel deploy + env vars)
- Codebase must be clean enough for public contribution (good README, clear structure)
