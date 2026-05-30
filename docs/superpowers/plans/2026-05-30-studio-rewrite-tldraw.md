# Studio Rewrite Tldraw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new Canva-like `/studio` creation module and stop extending the old `/create` wizard.

**Architecture:** New `src/studio/` module owns shell, project state, panels, canvas adapter, and generation bridge. tldraw owns canvas editing/history; Studio owns business actions/history and generation lifecycle.

**Tech Stack:** React 19, TypeScript, Vite, tldraw SDK, existing design-system primitives, existing `src/api.ts` ecommerce generation APIs.

---

## Worktree

```text
C:\Users\luoxu\.config\superpowers\worktrees\Image\studio-rewrite-tldraw
└─ branch: feat/studio-rewrite-tldraw
```

## File Map

```text
package.json
package-lock.json
src/App.tsx
src/studio/
├─ StudioPage.tsx
├─ StudioShell.tsx
├─ state/
│  ├─ studioTypes.ts
│  ├─ studioActions.ts
│  ├─ studioReducer.ts
│  ├─ history.ts
│  └─ studioReducer.test.ts
├─ canvas/
│  ├─ StudioCanvas.tsx
│  ├─ tldrawComponents.tsx
│  ├─ readCanvasContext.ts
│  ├─ applyGenerationResult.ts
│  └─ exportArtboard.ts
├─ panels/
│  ├─ AssetsPanel.tsx
│  ├─ TemplatesPanel.tsx
│  ├─ LayersPanel.tsx
│  └─ InspectorPanel.tsx
├─ generation/
│  ├─ buildGenerationRequest.ts
│  ├─ buildGenerationRequest.test.ts
│  └─ StudioGenerateButton.tsx
└─ templates/
   ├─ templateCatalog.ts
   └─ scenePromptMap.ts
```

## Guardrails

```text
Reuse
├─ design-system primitives
├─ api.ts generation/task types
├─ auth/account/balance hooks
└─ sceneCatalog prompts where useful

Avoid
├─ editing old CreateFlowWizard for new UX
├─ moving old Workspace logic into Studio
├─ mixing dirty original worktree changes
└─ building custom canvas math before tldraw adapter proves needed
```

---

### Task 1: Route + Studio Shell Skeleton

**Files**

```text
Modify: package.json
Modify: package-lock.json
Modify: src/App.tsx
Create: src/studio/StudioPage.tsx
Create: src/studio/StudioShell.tsx
Create: src/studio/canvas/StudioCanvas.tsx
Create: src/studio/canvas/tldrawComponents.tsx
```

- [ ] Install tldraw: `npm install tldraw`
- [ ] Add `/studio` route in `src/App.tsx`.
- [ ] Create `StudioPage.tsx`; import `tldraw/tldraw.css`; render `StudioShell`.
- [ ] Create `StudioShell.tsx` with fixed topbar, left rail, left panel, center canvas, right panel, bottom artboard strip.
- [ ] Create `StudioCanvas.tsx` wrapping `<Tldraw />`.
- [ ] Create `tldrawComponents.tsx` for hiding/replacing default tldraw UI slots supported by installed types.
- [ ] Verify: `npm run lint && npm run build`.
- [ ] Commit: `feat(studio): add tldraw studio shell`.

**Acceptance**

```text
/studio renders
center canvas is tldraw
product shell is AetherGenix-owned
old /create remains untouched
```

---

### Task 2: Studio Project Model

**Files**

```text
Create: src/studio/state/studioTypes.ts
Create: src/studio/state/studioActions.ts
Create: src/studio/state/studioReducer.ts
Create: src/studio/state/history.ts
Create: src/studio/state/studioReducer.test.ts
```

- [ ] Define `StudioProject`, `Artboard`, `StudioAsset`, `StudioLayer`, `GenerationSettings`.
- [ ] Define layer union: `ProductImageLayer | GeneratedImageLayer | TextLayer | ShapeLayer | TemplateSlotLayer | PromptBlockLayer | GroupLayer`.
- [ ] Define business actions: project rename, artboard create/delete/switch, asset add/remove, layer register/remove/select, template apply, generation settings update, generation submit/result apply, draft save/restore.
- [ ] Implement reducer with immutable updates.
- [ ] Implement business history helpers in `history.ts`.
- [ ] Test reducer: create project, create artboard, add asset, add layer, switch artboard, apply generation result.
- [ ] Verify: `npx tsx src/studio/state/studioReducer.test.ts && npm run lint`.
- [ ] Commit: `feat(studio): define project model`.

**Acceptance**

```text
state model supports multiple artboards
assets and layers are independent
generation result can create a new artboard in state
business actions are logged outside tldraw history
```

---

### Task 3: Canvas Adapter

**Files**

```text
Modify: src/studio/canvas/StudioCanvas.tsx
Modify: src/studio/canvas/tldrawComponents.tsx
Create: src/studio/canvas/readCanvasContext.ts
Create: src/studio/canvas/applyGenerationResult.ts
Create: src/studio/canvas/exportArtboard.ts
```

- [ ] Hold the tldraw editor instance in `StudioShell`.
- [ ] Map Studio artboards to tldraw pages.
- [ ] Implement add image asset to active artboard.
- [ ] Implement add text layer to active artboard.
- [ ] Implement undo/redo buttons through tldraw editor history.
- [ ] Implement `readCanvasContext(editor, project)` returning prompt, product image asset, references, aspect ratio, count, quality.
- [ ] Implement `applyGenerationResult(editor, project, resultAsset)` creating a new artboard/page and inserting generated image.
- [ ] Verify manually in `/studio`: add image, add text, undo, redo, create/switch artboards.
- [ ] Verify: `npm run lint && npm run build`.
- [ ] Commit: `feat(studio): connect canvas adapter`.

**Acceptance**

```text
Studio buttons can mutate canvas
tldraw history handles canvas edits
artboard switch changes active tldraw page
generation result insertion targets a new artboard
```

---

### Task 4: Panels

**Files**

```text
Modify: src/studio/StudioShell.tsx
Create: src/studio/panels/AssetsPanel.tsx
Create: src/studio/panels/TemplatesPanel.tsx
Create: src/studio/panels/LayersPanel.tsx
Create: src/studio/panels/InspectorPanel.tsx
Create: src/studio/templates/templateCatalog.ts
Create: src/studio/templates/scenePromptMap.ts
```

- [ ] Assets panel: upload image, show uploaded/generated assets, insert selected asset.
- [ ] Templates panel: list V1 templates from `templateCatalog.ts`, apply template to active artboard.
- [ ] Layers panel: show Studio layer tree for active artboard.
- [ ] Inspector panel: edit selected layer metadata and active generation settings.
- [ ] Use design-system primitives where they already fit; keep panel internals local to Studio.
- [ ] Verify: `npm run lint && npm run build`.
- [ ] Commit: `feat(studio): add studio panels`.

**Acceptance**

```text
left side owns assets/templates
right side owns inspector/settings/layers
bottom strip owns artboards
no old create wizard components imported
```

---

### Task 5: Generation Bridge

**Files**

```text
Create: src/studio/generation/buildGenerationRequest.ts
Create: src/studio/generation/buildGenerationRequest.test.ts
Create: src/studio/generation/StudioGenerateButton.tsx
Modify: src/studio/StudioShell.tsx
```

- [ ] Build payload for existing `generateEcommerceImages(payload, images)`.
- [ ] Use `EcommerceGeneratePayload.style` for prompt/style text.
- [ ] Use `aspect_ratio`, `quality`, `n` from active artboard settings.
- [ ] Send primary product image plus reference images.
- [ ] Track returned task id.
- [ ] On success, add generated asset and create a new artboard with result inserted.
- [ ] Test request builder with prompt, aspect ratio, count clamp, primary image.
- [ ] Verify: `npx tsx src/studio/generation/buildGenerationRequest.test.ts && npm run lint && npm run build`.
- [ ] Commit: `feat(studio): add generation bridge`.

**Acceptance**

```text
Studio submits through existing ecommerce API
request type matches src/api.ts
result does not overwrite source artboard
generated image appears on a new artboard
```

---

### Task 6: Cutover + QA

**Files**

```text
Modify: src/App.tsx
Modify: docs/STUDIO-REWRITE.md
```

- [ ] Add local cutover constant in `src/App.tsx`: `USE_STUDIO_CREATE = true`.
- [ ] Redirect `/create` to `/studio` when enabled.
- [ ] Keep old create/workspace source files in place until Studio parity is verified.
- [ ] Run: `npm run lint && npm run build`.
- [ ] Browser QA: open `/studio`, check desktop and mobile widths, verify no text overlap.
- [ ] Browser QA: `/create` redirects to `/studio`.
- [ ] Commit: `feat(studio): cut over create route`.

**Acceptance**

```text
/studio is the creation entry
/create redirects after cutover
old implementation is quarantined
build passes
basic browser QA passes
```

---

## Execution Order

```text
1 route/shell
2 model
3 canvas adapter
4 panels
5 generation bridge
6 cutover QA
```

## Final Verification

```text
npm run lint
npm run build
manual /studio smoke test
manual /create redirect test
```

## Self-Review

```text
Spec coverage: route, shell, model, history, panels, generation, cutover covered.
Placeholder scan: clear.
Type check: generation payload uses existing EcommerceGeneratePayload fields.
Risk: tldraw default UI slot names must follow installed tldraw types during Task 1.
```
