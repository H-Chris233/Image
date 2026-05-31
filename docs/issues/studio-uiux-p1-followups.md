# Studio UI/UX P1 Follow-ups

Date: 2026-05-31

This note records UI/UX debt found while fixing the active studio `/create` route. These items are intentionally out of scope for the current P0 pass so the create-route cleanup does not become a full app redesign.

## Shared Pattern

- Lime is used too broadly as a page emphasis color. Per `src/design-system/design.md`, lime should stay small and represent selected, running, notification, or focus state. Default submit actions should use cream `primary`.
- Several page-local surfaces still hardcode charcoal, cream, and lime values instead of using semantic tokens.
- Some action labels imply execution, upload, or generation even when the handler only changes selection.

## Follow-up Surfaces

- `src/studio/app/StudioApp.tsx`: T2 navigation, account summary, asset cards, and demo-card actions use lime in several roles at once. Keep selected state visible, but reduce large lime backgrounds and repeated lime action text.
- `src/studio/shell/StudioShell.tsx` and `src/studio/shell/LeftNav.tsx`: active navigation may keep a small lime selected signal, but should avoid becoming the dominant page color.
- `src/studio/image-editor/ImageEditorShell.tsx`: generation/run CTAs and status accents need a separate pass to separate cream primary actions from lime running/selected state.
- `src/pages/Workspace.tsx`: the page has substantial hardcoded colors and a local visual language. Treat as a page-level design-system migration, not part of the create-route pass.
- `src/pages/Create.tsx` and `src/components/ecommerce/CreateFlowWizard.tsx`: legacy create surfaces have similar lime and action-copy issues, but the active `/create` route currently uses the studio chain. Do not patch these unless the legacy route is confirmed to still be user-facing.

## Suggested Next Pass

Run a focused Studio Shell and Image Editor cleanup after `/create` is verified:

- Replace default submit/generate actions with `Button` `variant="primary"` unless the button represents running or selected state.
- Keep lime for active nav rails, focus rings, running states, and small selected indicators.
- Convert touched hardcoded colors to semantic tokens only within the target surface.
- Avoid touching legacy create code until routing ownership is decided.
