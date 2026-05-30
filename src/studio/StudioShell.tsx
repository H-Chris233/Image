import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Editor } from 'tldraw';
import { ArrowLeft, FileDown, MousePointer2, Plus, Redo2, Type, Undo2 } from 'lucide-react';
import { StudioCanvas } from './canvas/StudioCanvas';
import {
  applyGenerationResult,
  ensureTldrawPage,
  insertImageAssetOnCanvas,
  insertPromptBlockOnCanvas,
  insertTextOnCanvas,
} from './canvas/applyGenerationResult';
import { exportCurrentArtboardSvg } from './canvas/exportArtboard';
import { readCanvasContext } from './canvas/readCanvasContext';
import { StudioGenerateButton } from './generation/StudioGenerateButton';
import { AssetsPanel } from './panels/AssetsPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { LayersPanel } from './panels/LayersPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { createInitialStudioState, createStudioId, studioReducer } from './state/studioReducer';
import type { StudioAsset, StudioLayer } from './state/studioTypes';
import { templateCatalog, type StudioTemplate } from './templates/templateCatalog';
import type { StudioStartPreset } from './create-new/CreateNewWorkbench';

type LeftPanelMode = 'assets' | 'templates';

export function StudioShell({
  initialPreset,
  onBackToCreate,
}: {
  initialPreset?: StudioStartPreset;
  onBackToCreate?: () => void;
}) {
  const [state, dispatch] = useReducer(studioReducer, undefined, createInitialStudioState);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('assets');
  const appliedInitialPresetRef = useRef(false);
  const insertedInitialPromptRef = useRef(false);
  const project = state.project;
  const activeArtboard = useMemo(
    () => project.artboards.find((artboard) => artboard.id === project.activeArtboardId) ?? project.artboards[0],
    [project.activeArtboardId, project.artboards],
  );
  const selectedLayers = project.selectedLayerIds.map((id) => project.layers[id]).filter(Boolean);

  useEffect(() => {
    if (!editor || !activeArtboard) return;
    ensureTldrawPage(editor, activeArtboard);
  }, [activeArtboard, editor]);

  useEffect(() => {
    if (!initialPreset || appliedInitialPresetRef.current) return;
    appliedInitialPresetRef.current = true;

    dispatch({ type: 'project.rename', name: initialPreset.projectName });
    dispatch({
      type: 'generation.settings.update',
      settings: {
        sceneId: initialPreset.templateId ?? null,
        prompt: initialPreset.prompt,
        aspectRatio: initialPreset.aspectRatio,
      },
    });
  }, [initialPreset]);

  useEffect(() => {
    if (!editor || !activeArtboard || !initialPreset?.prompt || insertedInitialPromptRef.current) return;
    insertedInitialPromptRef.current = true;
    ensureTldrawPage(editor, activeArtboard);
    insertPromptBlockOnCanvas(editor, initialPreset.prompt);
  }, [activeArtboard, editor, initialPreset]);

  function registerInsertedAsset(asset: StudioAsset) {
    if (!editor || !activeArtboard) return;
    ensureTldrawPage(editor, activeArtboard);
    const shapeId = insertImageAssetOnCanvas(editor, asset);
    const layer: StudioLayer = {
      id: createStudioId('layer'),
      type: asset.kind === 'generated-image' ? 'generated-image' : 'product-image',
      artboardId: activeArtboard.id,
      name: asset.name,
      visible: true,
      locked: false,
      tldrawShapeId: shapeId,
      assetId: asset.id,
      taskId: asset.metadata?.taskId,
    };
    dispatch({ type: 'asset.insert', assetId: asset.id, layer });
  }

  function addTextLayer() {
    if (!editor || !activeArtboard) return;
    ensureTldrawPage(editor, activeArtboard);
    const shapeId = insertTextOnCanvas(editor, 'New text');
    dispatch({
      type: 'layer.register',
      layer: {
        id: createStudioId('layer'),
        type: 'text',
        artboardId: activeArtboard.id,
        name: 'Text',
        text: 'New text',
        visible: true,
        locked: false,
        tldrawShapeId: shapeId,
      },
    });
  }

  function applyTemplate(template: StudioTemplate) {
    if (editor && activeArtboard) {
      ensureTldrawPage(editor, activeArtboard);
      insertPromptBlockOnCanvas(editor, template.prompt);
    }
    dispatch({ type: 'template.apply', templateId: template.id, prompt: template.prompt });
    dispatch({ type: 'generation.settings.update', settings: { aspectRatio: template.aspectRatio } });
  }

  function getGenerationContext() {
    const context = readCanvasContext(editor, project);
    if (!context.productImage || !context.prompt.trim()) return null;
    return {
      prompt: context.prompt,
      aspectRatio: context.aspectRatio,
      count: context.count,
      quality: context.quality,
      productImage: context.productImage,
      referenceImages: context.referenceImages,
    };
  }

  function applyGeneratedAsset(asset: StudioAsset) {
    dispatch({ type: 'generation.result.apply', asset, artboardName: `Result ${project.artboards.length}` });
  }

  useEffect(() => {
    if (!editor) return;
    const latestGenerated = project.assets.find((asset) => asset.kind === 'generated-image');
    if (!latestGenerated || !activeArtboard.layerIds.some((layerId) => project.layers[layerId]?.type === 'generated-image')) return;
    const layer = activeArtboard.layerIds.map((id) => project.layers[id]).find((item) => item?.type === 'generated-image');
    if (layer?.tldrawShapeId) return;
    const shapeId = applyGenerationResult(editor, activeArtboard, latestGenerated);
    dispatch({
      type: 'layer.register',
      layer: {
        ...layer!,
        tldrawShapeId: shapeId,
      },
    });
  }, [activeArtboard, editor, project.assets, project.layers]);

  async function exportArtboard() {
    if (!editor) return;
    const result = await exportCurrentArtboardSvg(editor);
    if (!result) return;
    const blob = new Blob([result.svg], { type: 'image/svg+xml' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${activeArtboard.name}.svg`;
    link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-on-surface">
      <div className="grid h-full grid-rows-[48px_minmax(0,1fr)_68px]">
        <header className="flex min-w-0 items-center justify-between gap-2 border-b border-white/[0.08] bg-[#111110] px-3">
          <div className="min-w-0 flex-1">
            {onBackToCreate ? (
              <button
                type="button"
                title="Back to Create New"
                className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] text-on-surface-variant hover:bg-white/[0.06]"
                onClick={onBackToCreate}
              >
                <ArrowLeft size={16} aria-hidden="true" />
              </button>
            ) : null}
            <span className="text-sm font-bold text-lime">AetherGenix</span>
            <span className="ml-2 hidden truncate text-sm text-on-surface-variant sm:inline">/ {project.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              title="Undo"
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-white/[0.08] text-on-surface-variant hover:bg-white/[0.06] sm:inline-flex"
              onClick={() => editor?.undo()}
            >
              <Undo2 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Redo"
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-white/[0.08] text-on-surface-variant hover:bg-white/[0.06] sm:inline-flex"
              onClick={() => editor?.redo()}
            >
              <Redo2 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Export SVG"
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-white/[0.08] text-on-surface-variant hover:bg-white/[0.06] sm:inline-flex"
              onClick={exportArtboard}
            >
              <FileDown size={16} aria-hidden="true" />
            </button>
            <StudioGenerateButton
              getContext={getGenerationContext}
              onTaskCreated={(taskId) => dispatch({ type: 'generation.submit', taskId })}
              onResult={applyGeneratedAsset}
            />
          </div>
        </header>

        <div className="grid min-h-0 grid-cols-[48px_minmax(200px,260px)_minmax(0,1fr)_minmax(240px,300px)] max-lg:grid-cols-[48px_minmax(0,1fr)]">
          <nav className="flex flex-col gap-2 border-r border-white/[0.08] bg-[#111110] p-2 text-xs text-on-surface-variant">
            <button
              type="button"
              title="Select"
              className="inline-flex h-8 items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.08]"
              onClick={() => editor?.setCurrentTool('select')}
            >
              <MousePointer2 size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Assets"
              className={`inline-flex h-8 items-center justify-center rounded-md ${leftPanelMode === 'assets' ? 'bg-lime text-on-lime' : 'bg-white/[0.04] hover:bg-white/[0.08]'}`}
              onClick={() => setLeftPanelMode('assets')}
            >
              A
            </button>
            <button
              type="button"
              title="Templates"
              className={`inline-flex h-8 items-center justify-center rounded-md ${leftPanelMode === 'templates' ? 'bg-lime text-on-lime' : 'bg-white/[0.04] hover:bg-white/[0.08]'}`}
              onClick={() => setLeftPanelMode('templates')}
            >
              T
            </button>
            <button
              type="button"
              title="Add text"
              className="inline-flex h-8 items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.08]"
              onClick={addTextLayer}
            >
              <Type size={16} aria-hidden="true" />
            </button>
          </nav>

          <aside className="min-h-0 overflow-y-auto border-r border-white/[0.08] bg-[#141412] p-3 max-lg:hidden">
            {leftPanelMode === 'assets' ? (
              <AssetsPanel
                assets={project.assets}
                onAddAsset={(asset) => dispatch({ type: 'asset.add', asset })}
                onInsertAsset={registerInsertedAsset}
              />
            ) : (
              <TemplatesPanel templates={templateCatalog} onApplyTemplate={applyTemplate} />
            )}
          </aside>

          <main className="min-h-0">
            <StudioCanvas onMount={setEditor} />
          </main>

          <aside className="min-h-0 overflow-y-auto border-l border-white/[0.08] bg-[#141412] p-3 max-lg:hidden">
            <InspectorPanel
              artboard={activeArtboard}
              selectedLayers={selectedLayers}
              onPromptChange={(prompt) => dispatch({ type: 'generation.settings.update', settings: { prompt } })}
              onAspectRatioChange={(aspectRatio) =>
                dispatch({ type: 'generation.settings.update', settings: { aspectRatio } })
              }
              onCountChange={(count) => dispatch({ type: 'generation.settings.update', settings: { count } })}
              onQualityChange={(quality) => dispatch({ type: 'generation.settings.update', settings: { quality } })}
            />
            <LayersPanel
              artboard={activeArtboard}
              layers={project.layers}
              selectedLayerIds={project.selectedLayerIds}
              onSelectLayer={(id) => dispatch({ type: 'layer.select', ids: [id] })}
            />
          </aside>
        </div>

        <footer className="flex min-w-0 items-center gap-2 overflow-x-auto border-t border-white/[0.08] bg-[#111110] px-3 text-xs text-on-surface-variant">
          {project.artboards.map((artboard, index) => (
            <button
              key={artboard.id}
              type="button"
              onClick={() => dispatch({ type: 'artboard.switch', id: artboard.id })}
              className={`h-12 w-24 shrink-0 rounded-lg border px-2 text-left ${
                artboard.id === project.activeArtboardId
                  ? 'border-lime/80 bg-lime/10 text-on-surface'
                  : 'border-white/[0.08] bg-white/[0.03]'
              }`}
            >
              <span className="block truncate">{artboard.name || `Page ${index + 1}`}</span>
              <span className="block text-[10px]">{artboard.width}x{artboard.height}</span>
            </button>
          ))}
          <button
            type="button"
            title="Add artboard"
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg border border-white/[0.08] px-3 hover:bg-white/[0.06]"
            onClick={() => dispatch({ type: 'artboard.create' })}
          >
            <Plus size={14} aria-hidden="true" />
            Artboard
          </button>
          <span className="ml-auto shrink-0">{project.activeTaskId ? `task ${project.activeTaskId}` : 'local draft'}</span>
        </footer>
      </div>
    </div>
  );
}
