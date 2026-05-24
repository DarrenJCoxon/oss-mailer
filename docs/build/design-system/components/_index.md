# Components

The reusable pieces every UI/UX surface uses. Each component has its own file documenting variants, states, accessibility commitments, and how it consumes tokens. See [the design system index](../_index.md) for the overall shape.

## Index

| Component | Status |
| --- | --- |
| [Button](button.md) | 🔵 proposed |
| [Input](input.md) | 🔵 proposed |
| [Select](select.md) | 🔵 proposed |
| [Badge](badge.md) | 🔵 proposed |
| [Data Table](data-table.md) | 🔵 proposed |
| [Page Header](page-header.md) | 🔵 proposed |
| [Empty State](empty-state.md) | 🔵 proposed |
| [Result Panel](result-panel.md) | 🔵 proposed |

## What goes in a component file

Each component documents:

- **What it is** — one sentence
- **When it's used** — the role it plays
- **Variants** — primary / secondary / destructive / link, etc.
- **States** — default, hover, focus, active, disabled, loading
- **Tokens consumed** — colour, type, spacing, radius, motion — linked to the token files
- **Accessibility commitments** — keyboard, screen reader, contrast
- **Examples** — concrete uses; which surfaces in `ui-ux/` consume it

## How to add a component

Copy `_template.md` to `<component-name>.md`. Fill in. Add a row to the table above. Surfaces that use this component reference it by name from their surface file.

## Component naming

Use plain lowercase-with-dashes names that describe the role: `button`, `card`, `input-text`, `nav-primary`, `modal`. Avoid framework-specific names (no `material-button`, no `bootstrap-card`). The catalogue describes design; implementation maps to it.
