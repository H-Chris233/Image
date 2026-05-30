import type { GenerationSettings, StudioAsset, StudioLayer } from './studioTypes';

export type StudioAction =
  | { type: 'project.rename'; name: string }
  | { type: 'artboard.create'; name?: string; width?: number; height?: number; background?: string }
  | { type: 'artboard.delete'; id: string }
  | { type: 'artboard.switch'; id: string }
  | { type: 'asset.add'; asset: StudioAsset }
  | { type: 'asset.remove'; id: string }
  | { type: 'asset.insert'; assetId: string; layer: StudioLayer }
  | { type: 'layer.register'; layer: StudioLayer }
  | { type: 'layer.remove'; id: string }
  | { type: 'layer.select'; ids: string[] }
  | { type: 'template.apply'; templateId: string; prompt: string; layers?: StudioLayer[] }
  | { type: 'generation.settings.update'; settings: Partial<GenerationSettings> }
  | { type: 'generation.submit'; taskId: string }
  | {
      type: 'generation.result.apply';
      asset: StudioAsset;
      artboardName?: string;
      width?: number;
      height?: number;
      layer?: StudioLayer;
    }
  | { type: 'draft.save' }
  | { type: 'draft.restore'; state: unknown };

