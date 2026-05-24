# AetherGenix Design-System References

Canonical static design system:

```text
src/design-system/design.md
```

Canonical static preview:

```text
src/design-system/preview/index.html
```

React execution layer:

```text
src/components/design-system/
src/pages/DesignSystem.tsx
```

This directory is now a reference index. It may hold supporting notes, migration context, and route-specific reminders, but it must not define rules that conflict with `src/design-system/design.md`.

## Current Reference Files

- `tokens.md`: notes about runtime token implementation in `src/index.css`.
- `components.md`: React primitive and accessibility notes.
- `patterns.md`: route-to-pattern coverage and page-level guardrails.
- `scale-alignment.md`: design-system governance scale and drift response.

## Source Order

When documents disagree, use this order:

1. `src/design-system/design.md`
2. `src/design-system/preview/index.html`
3. React execution layer under `src/components/design-system/`
4. This `docs/design-system/` reference directory
5. Historical ADRs and old route implementations

## Usage

New UI work starts from `src/design-system/design.md`. If a rule, component, token, or pattern is missing there, add it to the canonical file and static preview first. Then update the React execution layer and any supporting reference notes here.
