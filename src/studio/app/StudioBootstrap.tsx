import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useAssetSummary } from '../assets/useAssetSummary';
import { StudioApp } from './StudioApp';
import { resolveStudioEntry, type StudioEntryContext } from './studioEntryResolver';
import { useStudioIntent } from './studioIntent';
import { EXPLORE_ROUTE } from './studioRoutes';

export function StudioBootstrap() {
  const { viewer, loading: authLoading } = useAuth();
  const { demo, intent } = useStudioIntent();
  const authenticated = Boolean(viewer?.authenticated);
  const assetSummary = useAssetSummary(authenticated);

  const context = useMemo<StudioEntryContext>(() => {
    if (demo === 'create') {
      return {
        auth: { loading: false, authenticated: true },
        assets: { loading: false, total: 0, hasAssets: false },
        intent,
      };
    }

    if (demo === 'assets') {
      return {
        auth: { loading: false, authenticated: true },
        assets: { loading: false, total: 8, hasAssets: true },
        intent,
      };
    }

    if (demo === 'redraw') {
      return {
        auth: { loading: false, authenticated: true },
        assets: { loading: false, total: 8, hasAssets: true },
        intent: intent ?? { kind: 'continue-redraw', assetId: 'demo-product-01' },
      };
    }

    return {
      auth: { loading: authLoading, authenticated },
      assets: assetSummary,
      intent,
    };
  }, [assetSummary, authLoading, authenticated, demo, intent]);

  if (context.auth.loading || (context.auth.authenticated && context.assets.loading)) {
    return (
      <div className="grid h-screen place-items-center bg-[#0d0d0b] text-[#f4f0ea]">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-5 text-sm text-[#aaa49a]">
          正在判断默认入口...
        </div>
      </div>
    );
  }

  const initialLocation = resolveStudioEntry(context);
  if (initialLocation.surface === 'inspiration') return <Navigate to={EXPLORE_ROUTE} replace />;
  return <StudioApp initialLocation={initialLocation} />;
}
