import type { StudioIntent } from './studioIntent';
import type { StudioLocation } from './studioLocation';
import { defaultT2 } from './studioNav';

export type StudioEntryContext = {
  auth: {
    loading: boolean;
    authenticated: boolean;
  };
  assets: {
    loading: boolean;
    total: number;
    hasAssets: boolean;
  };
  intent: StudioIntent | null;
};

export function resolveStudioEntry(context: StudioEntryContext): StudioLocation {
  if (context.intent?.kind === 'continue-redraw') {
    return {
      surface: 'studio',
      t1: 'redraw',
      t2: 'input-source',
      t3: { kind: 'asset', id: context.intent.assetId },
      composer: {
        kind: 'redraw',
        preset: {
          assetId: context.intent.assetId,
          scenarioId: context.intent.scenarioId,
        },
      },
    };
  }

  if (!context.auth.authenticated) {
    return {
      surface: 'inspiration',
      t1: null,
      t2: null,
      t3: null,
      composer: null,
    };
  }

  if (context.intent?.kind === 'open-section') {
    return {
      surface: 'studio',
      t1: context.intent.t1,
      t2: context.intent.t2 ?? defaultT2(context.intent.t1),
      t3: context.intent.sceneKey ? { kind: 'workflow', id: `${context.intent.customerKey ?? 'scene'}-${context.intent.sceneKey}` } : null,
      composer: context.intent.sceneKey
        ? {
            kind: 'create',
            preset: {
              customerKey: context.intent.customerKey,
              sceneKey: context.intent.sceneKey,
            },
          }
        : null,
    };
  }

  if (!context.assets.hasAssets) {
    return {
      surface: 'studio',
      t1: 'create',
      t2: defaultT2('create'),
      t3: null,
      composer: null,
    };
  }

  return {
    surface: 'studio',
    t1: 'assets',
    t2: 'recent-generated',
    t3: null,
    composer: null,
  };
}
