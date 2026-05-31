import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Heart, ImagePlus, Loader2, RotateCw, Sparkles } from 'lucide-react';
import { listImageTasks } from '../../api';
import type { ImageTask } from '../../api';
import { Button, StatusPill, Surface, SurfaceState } from '../../components/design-system';
import type { StudioLocation } from '../app/studioLocation';
import { useHistoryImages } from '../history/useHistoryImages';
import type { UserImage } from '../history/historyTypes';
import type { StudioAssetInput } from './assetTypes';

const FAVORITES_KEY = 'aethergenix_studio_asset_favorites';
const REFERENCE_KEY = 'aethergenix_studio_reference_asset';

type AssetLibraryItem = StudioAssetInput & {
  subtitle: string;
  source: UserImage['source'] | 'failed-task';
  status?: ImageTask['status'];
};

export function AssetLibraryWorkspace({
  location,
  onLocationChange,
}: {
  location: StudioLocation;
  onLocationChange: (next: StudioLocation) => void;
}) {
  const history = useHistoryImages();
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readFavoriteIds());
  const [copiedId, setCopiedId] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const failedTasks = useFailedTasks(location.t2 === 'failed');

  useEffect(() => {
    writeFavoriteIds(favoriteIds);
  }, [favoriteIds]);

  const allAssets = useMemo<AssetLibraryItem[]>(
    () => history.images.map((image) => ({
      id: image.id,
      src: image.src,
      title: image.title,
      subtitle: image.subtitle,
      prompt: image.prompt,
      source: image.source,
    })),
    [history.images],
  );

  const failedAssets = useMemo<AssetLibraryItem[]>(
    () => failedTasks.tasks.map((task) => ({
      id: task.id,
      src: task.input_image_url || task.input_image_path || '',
      title: task.prompt || '失败任务',
      subtitle: task.error || '可检查参数后重试',
      prompt: task.prompt,
      source: 'failed-task' as const,
      status: task.status,
    })).filter((item) => item.src),
    [failedTasks.tasks],
  );

  const visibleAssets = useMemo(() => {
    if (location.t2 === 'favorites') return allAssets.filter((asset) => favoriteIds.includes(asset.id));
    if (location.t2 === 'failed') return failedAssets;
    if (location.t2 === 'recent-redraw') return allAssets.filter((asset) => asset.source === 'history-output' || asset.source === 'history-input');
    return allAssets;
  }, [allAssets, failedAssets, favoriteIds, location.t2]);

  function startRedraw(asset: StudioAssetInput) {
    onLocationChange({
      surface: 'studio',
      t1: 'redraw',
      t2: 'product',
      t3: { kind: 'asset', id: asset.id },
      composer: {
        kind: 'redraw',
        preset: asset,
      },
    });
  }

  function toggleFavorite(asset: StudioAssetInput) {
    setFavoriteIds((current) => (
      current.includes(asset.id)
        ? current.filter((id) => id !== asset.id)
        : [asset.id, ...current]
    ));
  }

  async function copyPrompt(asset: StudioAssetInput) {
    const prompt = asset.prompt?.trim();
    if (!prompt) {
      setCopiedId('');
      return;
    }
    try {
      await navigator.clipboard?.writeText(prompt);
      setCopiedId(asset.id);
      window.setTimeout(() => setCopiedId((current) => (current === asset.id ? '' : current)), 1500);
    } catch {
      setCopiedId('');
    }
  }

  function setReference(asset: StudioAssetInput) {
    setReferenceId(asset.id);
    try {
      window.sessionStorage.setItem(REFERENCE_KEY, JSON.stringify(asset));
    } catch {
      // Session storage is a convenience handoff, not a required persistence layer.
    }
  }

  const loading = history.loading || failedTasks.loading;
  const error = location.t2 === 'failed' ? failedTasks.error : history.error;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <Surface tone="subtle" padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-on-surface-variant">资产库</div>
            <h2 className="mt-1 font-display text-xl font-bold text-on-surface">{titleForTab(location.t2)}</h2>
          </div>
          <StatusPill tone={loading ? 'running' : error ? 'error' : 'neutral'}>
            {loading ? '同步中' : error ? '读取失败' : `${visibleAssets.length} 项`}
          </StatusPill>
        </div>
      </Surface>

      {visibleAssets.length ? (
        <div className="grid flex-1 content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleAssets.map((asset) => (
            <article key={asset.id} className="ds-motion-card overflow-hidden rounded-lg border border-white/[0.08] bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.24)]">
              <div className="relative aspect-[4/3] bg-black/25">
                <img src={asset.src} alt={asset.title} className="h-full w-full object-cover" />
                <div className="absolute left-2 top-2">
                  <StatusPill tone={asset.status === 'failed' ? 'error' : 'neutral'} size="sm">
                    {asset.subtitle}
                  </StatusPill>
                </div>
              </div>
              <div className="space-y-3 p-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-on-surface">{asset.title}</h3>
                  {asset.prompt ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-on-surface-variant">{asset.prompt}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm" iconStart={<RotateCw size={14} />} onClick={() => startRedraw(asset)}>
                    重绘
                  </Button>
                  <Button variant="ghost" size="sm" iconStart={<Sparkles size={14} />} onClick={() => setReference(asset)}>
                    {referenceId === asset.id ? '已参考' : '参考'}
                  </Button>
                  <Button variant="ghost" size="sm" iconStart={<Copy size={14} />} disabled={!asset.prompt} onClick={() => void copyPrompt(asset)}>
                    {copiedId === asset.id ? '已复制' : 'Prompt'}
                  </Button>
                  <Button as="a" variant="plain" size="sm" iconStart={<Download size={14} />} href={asset.src} download>
                    下载
                  </Button>
                  <Button variant={favoriteIds.includes(asset.id) ? 'lime' : 'plain'} size="sm" iconStart={<Heart size={14} />} onClick={() => toggleFavorite(asset)}>
                    收藏
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <SurfaceState
          className="flex-1"
          kind={loading ? 'loading' : error ? 'error' : 'empty'}
          title={loading ? '正在读取资产' : location.t2 === 'favorites' ? '还没有收藏资产' : '还没有可用资产'}
          description={error || (location.t2 === 'favorites' ? '在任意资产卡片点击收藏后会出现在这里。' : '完成一次创建或重绘后，历史图片会自动成为资产。')}
          action={location.t2 === 'favorites' ? { label: '查看最近生成', iconStart: <ImagePlus size={14} />, onClick: () => onLocationChange({ ...location, t2: 'recent-generated' }) } : undefined}
        />
      )}
    </section>
  );
}

function titleForTab(t2: string | null) {
  if (t2 === 'uploads') return '上传原图与输入图';
  if (t2 === 'recent-redraw') return '最近重绘';
  if (t2 === 'favorites') return '收藏';
  if (t2 === 'failed') return '失败任务';
  return '最近生成';
}

function readFavoriteIds() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // Favorites are local-only in v1.
  }
}

function useFailedTasks(enabled: boolean) {
  const [tasks, setTasks] = useState<ImageTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    listImageTasks({ limit: 24, status: ['failed'] })
      .then((response) => {
        if (!cancelled) setTasks(response.items);
      })
      .catch(() => {
        if (!cancelled) {
          setTasks([]);
          setError('失败任务暂时不可用');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { tasks, loading, error };
}
