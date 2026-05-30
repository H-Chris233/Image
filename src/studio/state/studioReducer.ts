import type { StudioAction } from './studioActions';
import { appendBusinessHistory } from './history';
import type { GenerationSettings, StudioArtboard, StudioLayer, StudioState } from './studioTypes';

export function createStudioId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultGenerationSettings(): GenerationSettings {
  return {
    sceneId: null,
    prompt: '',
    aspectRatio: '1:1',
    count: 1,
    quality: 'auto',
  };
}

export function createStudioArtboard(
  name: string,
  width = 1024,
  height = 1024,
  background = '#ffffff',
  tldrawPageId?: string,
): StudioArtboard {
  const id = createStudioId('artboard');
  return {
    id,
    name,
    width,
    height,
    background,
    tldrawPageId: tldrawPageId ?? `page:${id}`,
    generationSettings: defaultGenerationSettings(),
    layerIds: [],
  };
}

export function createInitialStudioState(): StudioState {
  const firstArtboard = createStudioArtboard('Page 1', 1024, 1024, '#ffffff', 'page:page');
  return {
    project: {
      id: createStudioId('project'),
      name: 'Untitled Studio Project',
      activeArtboardId: firstArtboard.id,
      selectedLayerIds: [],
      assets: [],
      artboards: [firstArtboard],
      layers: {},
      businessHistory: [],
      activeTaskId: null,
    },
  };
}

function addLayerToArtboard(artboard: StudioArtboard, layer: StudioLayer) {
  if (artboard.id !== layer.artboardId || artboard.layerIds.includes(layer.id)) return artboard;
  return { ...artboard, layerIds: [layer.id, ...artboard.layerIds] };
}

function removeLayerFromArtboard(artboard: StudioArtboard, layerId: string) {
  if (!artboard.layerIds.includes(layerId)) return artboard;
  return { ...artboard, layerIds: artboard.layerIds.filter((id) => id !== layerId) };
}

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  const history = appendBusinessHistory(state.project.businessHistory, action.type);

  switch (action.type) {
    case 'project.rename':
      return { project: { ...state.project, name: action.name, businessHistory: history } };

    case 'artboard.create': {
      const artboard = createStudioArtboard(
        action.name ?? `Page ${state.project.artboards.length + 1}`,
        action.width,
        action.height,
        action.background,
      );
      return {
        project: {
          ...state.project,
          activeArtboardId: artboard.id,
          artboards: [...state.project.artboards, artboard],
          businessHistory: history,
        },
      };
    }

    case 'artboard.delete': {
      if (state.project.artboards.length <= 1) return state;
      const nextArtboards = state.project.artboards.filter((artboard) => artboard.id !== action.id);
      const deletedLayerIds = new Set(state.project.artboards.find((artboard) => artboard.id === action.id)?.layerIds ?? []);
      const nextLayers = { ...state.project.layers };
      deletedLayerIds.forEach((id) => delete nextLayers[id]);
      return {
        project: {
          ...state.project,
          activeArtboardId:
            state.project.activeArtboardId === action.id ? nextArtboards[0].id : state.project.activeArtboardId,
          selectedLayerIds: state.project.selectedLayerIds.filter((id) => !deletedLayerIds.has(id)),
          artboards: nextArtboards,
          layers: nextLayers,
          businessHistory: history,
        },
      };
    }

    case 'artboard.switch':
      if (!state.project.artboards.some((artboard) => artboard.id === action.id)) return state;
      return { project: { ...state.project, activeArtboardId: action.id, selectedLayerIds: [], businessHistory: history } };

    case 'asset.add': {
      const assets = state.project.assets.some((asset) => asset.id === action.asset.id)
        ? state.project.assets.map((asset) => (asset.id === action.asset.id ? action.asset : asset))
        : [action.asset, ...state.project.assets];
      return { project: { ...state.project, assets, businessHistory: history } };
    }

    case 'asset.remove':
      return {
        project: {
          ...state.project,
          assets: state.project.assets.filter((asset) => asset.id !== action.id),
          businessHistory: history,
        },
      };

    case 'asset.insert':
    case 'layer.register':
      return {
        project: {
          ...state.project,
          layers: { ...state.project.layers, [action.layer.id]: action.layer },
          artboards: state.project.artboards.map((artboard) => addLayerToArtboard(artboard, action.layer)),
          selectedLayerIds: [action.layer.id],
          businessHistory: history,
        },
      };

    case 'layer.remove': {
      const layers = { ...state.project.layers };
      delete layers[action.id];
      return {
        project: {
          ...state.project,
          layers,
          artboards: state.project.artboards.map((artboard) => removeLayerFromArtboard(artboard, action.id)),
          selectedLayerIds: state.project.selectedLayerIds.filter((id) => id !== action.id),
          businessHistory: history,
        },
      };
    }

    case 'layer.select':
      return { project: { ...state.project, selectedLayerIds: action.ids, businessHistory: history } };

    case 'template.apply': {
      const layers = { ...state.project.layers };
      const activeArtboardId = state.project.activeArtboardId;
      const nextLayers = (action.layers ?? []).filter((layer) => layer.artboardId === activeArtboardId);
      nextLayers.forEach((layer) => {
        layers[layer.id] = layer;
      });
      return {
        project: {
          ...state.project,
          layers,
          artboards: state.project.artboards.map((artboard) =>
            artboard.id === activeArtboardId
              ? {
                  ...artboard,
                  generationSettings: { ...artboard.generationSettings, sceneId: action.templateId, prompt: action.prompt },
                  layerIds: [...nextLayers.map((layer) => layer.id), ...artboard.layerIds],
                }
              : artboard,
          ),
          businessHistory: history,
        },
      };
    }

    case 'generation.settings.update':
      return {
        project: {
          ...state.project,
          artboards: state.project.artboards.map((artboard) =>
            artboard.id === state.project.activeArtboardId
              ? { ...artboard, generationSettings: { ...artboard.generationSettings, ...action.settings } }
              : artboard,
          ),
          businessHistory: history,
        },
      };

    case 'generation.submit':
      return { project: { ...state.project, activeTaskId: action.taskId, businessHistory: history } };

    case 'generation.result.apply': {
      const asset = action.asset;
      const artboard = createStudioArtboard(
        action.artboardName ?? `Result ${state.project.artboards.length}`,
        action.width,
        action.height,
      );
      const layer =
        action.layer ??
        ({
          id: createStudioId('layer'),
          type: 'generated-image',
          artboardId: artboard.id,
          name: asset.name,
          visible: true,
          locked: false,
          assetId: asset.id,
          taskId: asset.metadata?.taskId,
        } satisfies StudioLayer);
      return {
        project: {
          ...state.project,
          activeTaskId: null,
          activeArtboardId: artboard.id,
          assets: [asset, ...state.project.assets],
          layers: { ...state.project.layers, [layer.id]: layer },
          artboards: [...state.project.artboards, { ...artboard, layerIds: [layer.id] }],
          selectedLayerIds: [layer.id],
          businessHistory: history,
        },
      };
    }

    case 'draft.save':
      return { project: { ...state.project, businessHistory: history } };

    case 'draft.restore':
      return state;

    default:
      return state;
  }
}

