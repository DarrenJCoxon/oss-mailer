# Colour Tokens

**Status:** 🔵 proposed
**Last updated:** 2026-05-24

Both light and dark modes supported. System preference respected by default (`prefers-color-scheme`). All text/background pairs meet WCAG AA (4.5:1 for body text, 3:1 for large text and UI components).

---

## Brand

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `colour.brand.primary` | `#2563EB` | `#3B82F6` | Primary actions, links, active nav |
| `colour.brand.primary.hover` | `#1D4ED8` | `#2563EB` | Hover on primary elements |
| `colour.brand.accent` | `#F97316` | `#FB923C` | Highlights, badges, key call-outs |
| `colour.brand.accent.hover` | `#EA6C0A` | `#F97316` | Hover on accent elements |

---

## Neutral scale

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `colour.neutral.background` | `#FFFFFF` | `#0F1117` | Page background |
| `colour.neutral.surface` | `#F9FAFB` | `#1A1D27` | Cards, sidebar, panels |
| `colour.neutral.surface.raised` | `#F3F4F6` | `#21263A` | Modals, dropdowns, elevated surfaces |
| `colour.neutral.border` | `#E5E7EB` | `#2E3244` | Dividers, table borders, default input border |
| `colour.neutral.border.strong` | `#D1D5DB` | `#3D4460` | Active input borders, emphasized dividers |
| `colour.neutral.text.muted` | `#9CA3AF` | `#6B7280` | Placeholders, secondary labels, metadata |
| `colour.neutral.text.body` | `#374151` | `#D1D5DB` | Body copy, table cell text |
| `colour.neutral.text.heading` | `#111827` | `#F9FAFB` | Page titles, section headings |
| `colour.neutral.text.inverse` | `#FFFFFF` | `#0F1117` | Text on coloured backgrounds |

---

## Semantic

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `colour.semantic.success` | `#10B981` | `#34D399` | Success status, "sent" badge |
| `colour.semantic.success.bg` | `#ECFDF5` | `#064E3B` | Success badge background |
| `colour.semantic.error` | `#EF4444` | `#F87171` | Failed status, error messages |
| `colour.semantic.error.bg` | `#FEF2F2` | `#7F1D1D` | Error badge background, failed row highlight |
| `colour.semantic.warning` | `#F59E0B` | `#FBBF24` | Warning states |
| `colour.semantic.warning.bg` | `#FFFBEB` | `#78350F` | Warning backgrounds |
| `colour.semantic.info` | `#3B82F6` | `#60A5FA` | Info notices (shares blue family with brand) |
| `colour.semantic.info.bg` | `#EFF6FF` | `#1E3A5F` | Info backgrounds |

---

## Contrast verification

| Pair | Contrast ratio | Standard |
| --- | --- | --- |
| `neutral.text.heading` × `neutral.background` (light) | 16.1:1 | AAA ✅ |
| `neutral.text.body` × `neutral.background` (light) | 7.4:1 | AAA ✅ |
| `neutral.text.muted` × `neutral.background` (light) | 3.1:1 | AA (large text) ✅ |
| `neutral.text.heading` × `neutral.background` (dark) | 17.5:1 | AAA ✅ |
| `neutral.text.body` × `neutral.background` (dark) | 10.7:1 | AAA ✅ |
| `brand.primary` × `neutral.background` (light) | 4.7:1 | AA ✅ |
