# Flair Image Production UX P0 Queue

Source: `docs/ux-references/flair-image-production-ux.md`

Status: local issue draft only. Do not create or mutate GitHub issues from this queue.

Default labels:

- AFK slices: `ready-for-agent`, `ux-p0`, `image-production`
- HITL slices: `ready-for-human`, `ux-p0`, `image-production`

## Queue Overview

The UX reference compares AetherGenix against Flair's image production flow. The P0 direction is to move the canonical creation entry `/create` away from a parameter form and toward a product image production workbench:

1. Upload a product image.
2. Treat the upload as a reusable product asset.
3. Let the user choose a use case, aspect ratio, and AI-recommended scene.
4. Show an immediate scene preview before generation.
5. Generate a downloadable, editable, reusable product asset pack.

These are tracer-bullet slices. Each one should be demoable on its own, keep the existing generation core intact unless a later implementation ticket explicitly widens scope, and prefer rearranging existing components over building a full freeform canvas.

## Proposed Vertical Slices

| Slice | Type | Label | Blocked by |
|---|---|---|---|
| 1. Validate the workbench IA and interaction contract | HITL | `ready-for-human`, `ux-p0`, `image-production` | Resolved 2026-05-27 |
| 2. Add a static ScenePreviewBoard path | AFK | `ready-for-agent`, `ux-p0`, `image-production` | Slice 1 |
| 3. Promote uploads into a Product Asset state | AFK | `ready-for-agent`, `ux-p0`, `image-production` | Slice 1 |
| 4. Make batch generation the default CTA | AFK | `ready-for-agent`, `ux-p0`, `image-production` | Slice 2, Slice 3 |
| 5. Add result image production actions | AFK | `ready-for-agent`, `ux-p0`, `image-production` | Slice 4 |
| 6. Persist generation output as a Product Project | AFK | `ready-for-agent`, `ux-p0`, `image-production` | Slice 4 |
| 7. Run P0 end-to-end UX smoke and product review | HITL | `ready-for-human`, `ux-p0`, `image-production` | Slice 2, Slice 3, Slice 4, Slice 5, Slice 6 |

## Slice 1. Validate the workbench IA and interaction contract

Type: HITL

Labels: `ready-for-human`, `ux-p0`, `image-production`

Blocked by: None - can start immediately

### What to decide

Confirm the first P0 implementation should reshape `/create` around a product image workbench rather than a full freeform canvas. The UX contract should be narrow enough for AFK agents to implement without re-opening product direction:

- Product asset lane.
- Central scene preview board.
- Compact generation controls.
- Default multi-template output.
- Result actions for preview, download, similar image, and background change.

This slice should also decide whether any existing wizard remains as a lightweight project creation entry, and which naming should be used in UI copy: "product asset", "scene", "asset pack", "product project", or local Chinese equivalents.

### Decision record

Resolved on 2026-05-27: the Flair-style image production flow enters `/create` now. This aligns with ADR 0001, which defines `/create` as the logged-in creation entry and rejects a long-term split where `/ecommerce` remains an independent creation route. The legacy `/ecommerce` route should redirect to `/create`; its source can still be mined for reusable implementation pieces during migration, but new P0 work should target `/create`.

### Acceptance criteria

- [x] Maintainer confirms `/create` should become a product image production workbench, not a parameter-only generation form.
- [ ] Maintainer confirms P0 does not require a drag-and-drop freeform canvas.
- [ ] Maintainer confirms the central preview may be a static composition preview for P0.
- [ ] Maintainer confirms the default generation path should prefer 2-3 templates when AI recommendations exist.
- [ ] Maintainer confirms any existing wizard should be retained, simplified, or removed before AFK slices start.
- [ ] Maintainer confirms final UI vocabulary for product asset, scene preview, asset pack, and project.

## Slice 2. Add a static ScenePreviewBoard path

Type: AFK

Labels: `ready-for-agent`, `ux-p0`, `image-production`

Blocked by: Slice 1

Implementation checkpoint 2026-05-27: `/create` now has a first static `ScenePreviewBoard` path. The board reflects product asset, aspect ratio, product category, human model choice, background choice, scene description, and output count. It is intentionally a static generation-intent preview, not a freeform canvas.

### What to build

Add a narrow vertical path where an uploaded product, selected template, selected aspect ratio, watermark/logo state, and selected template queue all feed a central `ScenePreviewBoard`-style preview. The preview does not need to be a full editable canvas. It should make the expected composition visible before generation and immediately respond to the existing template and format controls.

This slice should preserve the current generation APIs and use existing product preview, template picker, format picker, watermark, and result components where possible.

### Acceptance criteria

- [ ] After a product image is uploaded, the central preview shows the product image as the main subject.
- [ ] Selecting a template immediately changes the preview background, scene title, example framing, or equivalent visual state.
- [ ] Changing aspect ratio immediately changes the preview frame shape.
- [ ] Watermark/logo settings are reflected in the preview position or placeholder.
- [ ] Multi-selecting templates shows a visible queue of templates that will be generated.
- [ ] Empty, loading, and missing-image states are understandable without exposing technical errors.
- [ ] Mobile layout keeps the preview usable and avoids horizontal overflow.
- [ ] Existing generation behavior still works from the page.

## Slice 3. Promote uploads into a Product Asset state

Type: AFK

Labels: `ready-for-agent`, `ux-p0`, `image-production`

Blocked by: Slice 1

Implementation checkpoint 2026-05-27: `/create` now treats completed wizard uploads as a page-owned product asset with thumbnail, filename, category, replace, and remove actions. Full cutout/background-removal state is not yet wired into this `/create` asset card.

### What to build

Turn product upload into a product asset state instead of a one-off form input. After upload, the UI should show an asset card with thumbnail, filename or inferred product label, replace/delete actions, original/cutout status, and the best available image version for generation.

If background removal exists, this slice should make it feel like automatic product preparation. Failure should degrade to the original image and keep generation unblocked.

### Acceptance criteria

- [ ] Upload completion creates a visible product asset card.
- [ ] The asset card shows a thumbnail and enough metadata for the user to know which product is active.
- [ ] The user can replace the product image without losing unrelated scene controls.
- [ ] The user can remove the product image and return the page to a clear empty state.
- [ ] If cutout/background-removal processing starts, progress or pending state appears on the asset card.
- [ ] If cutout/background-removal succeeds, the transparent/cutout version is preferred for preview and generation.
- [ ] If cutout/background-removal fails, the original image remains usable and generation is not blocked.
- [ ] The preview board receives the same best-available product image that generation will use.

## Slice 4. Make batch generation the default CTA

Type: AFK

Labels: `ready-for-agent`, `ux-p0`, `image-production`

Blocked by: Slice 2, Slice 3

Implementation checkpoint 2026-05-27: `/create` now defaults Product Images to a selected scene-template queue. The CTA reads as a product-image set, for example "生成 3 套 / 6 张商品图", and submits one existing ecommerce generation task per selected scene template. This preserves the existing backend contract while making batch production the default path.

### What to build

Promote batch generation from an advanced option to the default production path. When AI-recommended templates are available, the page should default to a small selected set and make the cost/output count visible near the primary CTA. The result should be grouped by template or scene so the user reads the output as an asset pack rather than unrelated images.

### Acceptance criteria

- [ ] When AI-recommended templates exist, 2-3 templates are selected by default.
- [ ] The primary CTA includes the output count, for example "Generate 3 product images" or the approved localized equivalent.
- [ ] Estimated credit/cost impact and current balance are visible near the CTA when that data is available.
- [ ] The user can reduce or expand the selected template queue before generation.
- [ ] Batch generation submits the selected templates, product asset, aspect ratio, and relevant scene controls together.
- [ ] Generation progress is understandable per template or per output group.
- [ ] Results are grouped by template, use case, or scene instead of appearing as an undifferentiated image grid.
- [ ] Single-template generation remains possible as the degenerate case of the same flow.

## Slice 5. Add result image production actions

Type: AFK

Labels: `ready-for-agent`, `ux-p0`, `image-production`

Blocked by: Slice 4

### What to build

Give every generated result a lightweight production toolbar. The toolbar should turn "generation finished" into "continue refining this image" without requiring new model capabilities for every action in P0. Existing working actions should be active; future actions can be visible but disabled or marked coming soon if that matches local product conventions.

The P0 active actions are preview, download, regenerate similar image, and change background. Upscale, erase, extend, or local repaint may be placeholders if no stable implementation exists yet.

### Acceptance criteria

- [ ] Every result image exposes preview and download actions.
- [ ] Every result image exposes a regenerate-similar action that reuses the product asset, template/scene, aspect ratio, and relevant prompt context.
- [ ] Every result image exposes a change-background action that returns the user to scene/template selection while preserving the active product asset.
- [ ] Future actions such as upscale, erase, extend, or local repaint are either absent or clearly disabled/coming soon.
- [ ] Toolbar behavior works on touch devices without relying on hover.
- [ ] Toolbar controls have accessible names and meet the existing tap-target standard.
- [ ] Result selection state is visible when an action targets a specific image.
- [ ] Download-all behavior still works for batch results if it already exists.

## Slice 6. Persist generation output as a Product Project

Type: AFK

Labels: `ready-for-agent`, `ux-p0`, `image-production`

Blocked by: Slice 4

### What to build

Group each production session into a reusable product project. The project should tie together product asset, selected templates, generated images, copy/prompt context, export settings, and history. This slice should make history feel like product work rather than a loose list of images.

Keep persistence scoped to existing storage and history patterns. Do not introduce team collaboration, enterprise asset management, or a new backend contract unless the current code already has an appropriate extension point.

### Acceptance criteria

- [ ] Each generation session has a project name, defaulting to product name or upload filename plus timestamp.
- [ ] Batch results, single-image results, prompt/copy context, selected templates, and export settings are associated with the same project.
- [ ] History can show or filter by product project rather than only individual images.
- [ ] Opening a project restores enough context to understand what product and scenes produced the outputs.
- [ ] Reusing a project can start a new generation with the same product asset and prior scene/template choices.
- [ ] Existing history behavior remains backwards-compatible for older loose image records.
- [ ] No team/enterprise collaboration surface is introduced in this P0 slice.

## Slice 7. Run P0 end-to-end UX smoke and product review

Type: HITL

Labels: `ready-for-human`, `ux-p0`, `image-production`

Blocked by: Slice 2, Slice 3, Slice 4, Slice 5, Slice 6

### What to review

Verify that the implemented P0 chain feels like a Flair-style image production flow rather than a parameter form. This is a human product review plus an automated smoke gate. The key review question is whether a user can understand the page as "upload product -> choose scene/use case -> preview expected production -> generate asset pack -> continue editing or downloading."

### Acceptance criteria

- [ ] Automated smoke covers upload-to-preview behavior.
- [ ] Automated smoke covers template selection updating the preview.
- [ ] Automated smoke covers aspect ratio changing the preview frame.
- [ ] Automated smoke covers default batch CTA count and selected template queue.
- [ ] Automated smoke covers grouped batch results.
- [ ] Automated smoke covers at least preview, download, regenerate similar, and change background result actions.
- [ ] Mobile smoke verifies no horizontal overflow and no hover-only action dependency.
- [ ] Maintainer reviews the real page and confirms the P0 chain matches the UX reference direction.
- [ ] Any remaining design objections are converted into follow-up AFK slices instead of being hidden in the review summary.

## Out of Scope for This P0 Queue

- Full Figma/Canva-style drag-and-drop canvas.
- Full human model photography workflow.
- Video generation.
- Enterprise team collaboration or permissions.
- Custom model training.
- Complex mask editing, erase, extend, or local repaint unless existing stable APIs already support them.

## Implementation Notes for Future Agents

- Work in vertical slices. A slice should be independently demoable from upload or project state through visible UI behavior.
- Keep the image generation core stable unless the assigned slice explicitly requires a backend or model contract change.
- Prefer reusing and reorganizing existing components such as `CreateFlowWizard`, `TemplatePicker`, `FormatPicker`, `BackgroundRemovalPreview`, `GenerationProgress`, `ResultPanel`, `BatchResultPanel`, and `WatermarkEditor`.
- Use the project vocabulary confirmed in Slice 1.
- Do not create GitHub issues from this document without a separate explicit instruction.
