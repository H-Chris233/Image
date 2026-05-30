import type { Editor } from 'tldraw';
import type { StudioAsset, StudioProject } from '../state/studioTypes';

export type CanvasGenerationContext = {
  prompt: string;
  aspectRatio: string;
  count: number;
  quality: string;
  productImage: File | null;
  referenceImages: { file: File; role?: string; note?: string }[];
  productAsset: StudioAsset | null;
  referenceAssets: StudioAsset[];
  shapeCount: number;
};

export function readCanvasContext(editor: Editor | null, project: StudioProject): CanvasGenerationContext {
  const artboard = project.artboards.find((item) => item.id === project.activeArtboardId) ?? project.artboards[0];
  const artboardLayers = artboard.layerIds.map((id) => project.layers[id]).filter(Boolean);
  const productLayer = artboardLayers.find((layer) => layer.type === 'product-image');
  const promptBlocks = artboardLayers.filter((layer) => layer.type === 'prompt-block').map((layer) => layer.prompt);
  const productAsset =
    productLayer && 'assetId' in productLayer
      ? project.assets.find((asset) => asset.id === productLayer.assetId) ?? null
      : project.assets.find((asset) => asset.kind === 'uploaded-image' && asset.file) ?? null;
  const referenceAssets = project.assets.filter((asset) => asset.file && asset.id !== productAsset?.id);
  const prompt = [artboard.generationSettings.prompt, ...promptBlocks].filter(Boolean).join('\n\n');

  return {
    prompt,
    aspectRatio: artboard.generationSettings.aspectRatio,
    count: artboard.generationSettings.count,
    quality: artboard.generationSettings.quality,
    productImage: productAsset?.file ?? null,
    referenceImages: referenceAssets.map((asset) => ({
      file: asset.file!,
      role: asset.metadata?.role ?? 'reference',
      note: asset.name,
    })),
    productAsset,
    referenceAssets,
    shapeCount: editor?.getCurrentPageShapes().length ?? 0,
  };
}

