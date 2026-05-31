import { useLocation } from 'react-router-dom';
import type { StudioT1 } from './studioLocation';
import { STUDIO_NAV } from './studioNav';
import { ASSETS_ROUTE, CREATE_ROUTE, REDRAW_ROUTE, STUDIO_COMPAT_ROUTE, USER_ROUTE } from './studioRoutes';

export type StudioIntent =
  | {
      kind: 'continue-redraw';
      assetId: string;
      scenarioId?: string;
    }
  | {
      kind: 'create-from-inspiration';
      inspirationId: string;
      prompt?: string;
    }
  | {
      kind: 'redraw-from-inspiration';
      inspirationId: string;
      imageUrl: string;
    }
  | {
      kind: 'open-section';
      t1: StudioT1;
      t2?: string;
      sceneKey?: string;
      customerKey?: string;
    };

export type StudioDemoMode = 'inspiration' | 'create' | 'assets' | 'redraw' | null;

const t1Ids = new Set(STUDIO_NAV.map((item) => item.id));

function isStudioT1(value: string | undefined): value is StudioT1 {
  return Boolean(value && t1Ids.has(value as StudioT1));
}

export function useStudioIntent() {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const pathParts = location.pathname.split('/').filter(Boolean);
  const pathRoot = `/${pathParts[0] ?? ''}`;
  const t1ByRoute: Partial<Record<string, StudioT1>> = {
    [CREATE_ROUTE]: 'create',
    [ASSETS_ROUTE]: 'assets',
    [REDRAW_ROUTE]: 'redraw',
    [USER_ROUTE]: 'user',
  };
  const pathT1 = pathRoot === STUDIO_COMPAT_ROUTE ? pathParts[1] : t1ByRoute[pathRoot];
  const pathT2 = pathRoot === STUDIO_COMPAT_ROUTE ? pathParts[2] : pathParts[1];
  const demo = search.get('demo') as StudioDemoMode;
  const intent = search.get('intent');
  const assetId = search.get('assetId');
  const sceneKey = search.get('scene') ?? undefined;
  const customerKey = search.get('customer') ?? undefined;

  if (intent === 'redraw' && assetId) {
    return {
      demo,
      intent: {
        kind: 'continue-redraw',
        assetId,
        scenarioId: search.get('scenario') ?? undefined,
      } satisfies StudioIntent,
    };
  }

  if (isStudioT1(pathT1)) {
    return {
      demo,
      intent: {
        kind: 'open-section',
        t1: pathT1,
        t2: pathT2,
        sceneKey,
        customerKey,
      } satisfies StudioIntent,
    };
  }

  return { demo, intent: null };
}
