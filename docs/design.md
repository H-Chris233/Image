# AetherGenix Design Reference

Canonical design-system source:

```text
src/design-system/design.md
```

Static design-system preview:

```text
src/design-system/preview/index.html
```

This file is retained as a reference entry for agents and people who still look under `docs/`. It is not the design-system source of truth.

The former Warm Charcoal UI guidance from this document has been migrated into `src/design-system/design.md`. Future UI work must read that canonical file first, then inspect `src/components/design-system/` for the React execution layer.

## Reference Summary

AetherGenix uses a dark-first Warm Charcoal UI:

- Background and surfaces use warm charcoal.
- Primary actions use cream pill buttons.
- Lime is reserved for selected, running, notification, and focus states.
- Orange is reserved for recharge, purchase, and commercial actions.
- Images remain the visual subject; UI controls stay quiet.
- Cyan/violet cosmic styling is historical context only and must not be used for new primary UI.

For full tokens, component rules, layouts, responsive behavior, accessibility, reuse policy, preview rules, and verification gates, use `src/design-system/design.md`.
