# D008 — Email templates must meet deliverability standards to minimise junk-mail classification

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-05-24 |
| Affects | WU-004 (Template Renderer + templates), WU-002 (SES adapter), contracts/provider-adapter.md |
| Supersedes | none |
| Superseded by | — |

## Context

oss-mailer routes email through commodity providers (SES). Commodity providers have higher deliverability risk than premium senders because they share IP reputation. Template quality is one of the few variables under the developer's control. Poorly structured templates (image-heavy, missing plain text, spam-trigger words) are the most common self-inflicted cause of junk-mail classification.

## Decision

All three default templates (`magic_link`, `promotional`, `update`) must meet the following standards before WU-004 can ship:

**Structure:**
- Valid HTML email structure: `<!DOCTYPE html>`, `<html lang="en">`, proper meta charset — React Email provides this.
- Plain-text alternative included — React Email generates this automatically; must be verified non-empty.
- No JavaScript, no external CSS files, no tracking pixels.

**Content ratio:**
- Text-first: default templates are predominantly text, not image-heavy. No decorative images in the initial templates.
- Preheader text included (hidden preview text after `<body>`) for all three categories.

**Unsubscribe (CAN-SPAM / GDPR):**
- `promotional` and `update` templates must include an `{unsubscribeUrl}` placeholder, rendered as a visible unsubscribe link at the bottom of the email.
- The SES adapter must add a `List-Unsubscribe` header for `promotional` and `update` sends, using the `{unsubscribeUrl}` from `props`.
- `magic_link` emails are transactional — no unsubscribe link required.

**From address:**
- `MAILER_FROM` must use the friendly-name format: `"Display Name <address@domain.com>"` (per D006). Documentation and `.env.example` must show this format explicitly.

**Subject lines (default templates):**
- No all-caps words.
- No exclamation marks in the default content.
- No spam-trigger words in default copy ("free", "winner", "urgent", "act now", etc.).

## Rationale

These rules are a best-practice floor, not a ceiling. They prevent the most common junk-mail triggers without restricting what P001 can add to their own templates. The unsubscribe requirement is also a legal requirement (CAN-SPAM, GDPR for EU recipients) — ignoring it exposes P001 to liability.

## Consequences

- WU-004 acceptance criteria must include: plain-text body is non-empty; promotional and update templates contain `{unsubscribeUrl}` placeholder; preheader is present in all three templates.
- WU-002 (SES adapter) must add `List-Unsubscribe` header for promotional/update sends when `props.unsubscribeUrl` is present.
- Template props schemas are: `MagicLink: { url: string }`, `Promotional: { subject: string, body: string, unsubscribeUrl: string }`, `Update: { subject: string, body: string, unsubscribeUrl: string }`.

## Alternatives considered

- **No constraints on templates** — rejected: leaves P001 with junk-mail problems by default; defeats the point of building a thoughtful email tool
- **Full email marketing compliance library** — rejected: over-engineering for v1; the above rules cover the main risk vectors without adding a dependency

## Pointers

- Shapes [WU-004 — Template Renderer](../work-units/004-template-renderer.md)
- Shapes [WU-002 — SES adapter](../work-units/002-email-provider-interface-ses-adapter.md)
- Builds on [D007 — Template derivable from category](D007-template-derivable-from-category.md)
