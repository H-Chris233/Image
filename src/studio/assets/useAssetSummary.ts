import { useEffect, useState } from 'react';
import { getHistory } from '../../api';

export type AssetSummary = {
  loading: boolean;
  total: number;
  hasAssets: boolean;
  checked: boolean;
};

export function useAssetSummary(authenticated: boolean): AssetSummary {
  const [summary, setSummary] = useState<AssetSummary & { authenticated: boolean }>({
    authenticated,
    loading: authenticated,
    total: 0,
    hasAssets: false,
    checked: !authenticated,
  });

  useEffect(() => {
    let cancelled = false;

    if (!authenticated) {
      setSummary({ authenticated, loading: false, total: 0, hasAssets: false, checked: true });
      return undefined;
    }

    async function loadAssetSummary() {
      setSummary((current) => ({ ...current, authenticated, loading: true, checked: false }));
      try {
        const response = await getHistory({ limit: 1, ecommerce_only: true });
        if (!cancelled) {
          const total = response.items.length;
          setSummary({ authenticated, loading: false, total, hasAssets: total > 0, checked: true });
        }
      } catch {
        if (!cancelled) setSummary({ authenticated, loading: false, total: 0, hasAssets: false, checked: true });
      }
    }

    void loadAssetSummary();
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  if (summary.authenticated !== authenticated) {
    return { loading: authenticated, total: 0, hasAssets: false, checked: !authenticated };
  }

  return summary;
}
