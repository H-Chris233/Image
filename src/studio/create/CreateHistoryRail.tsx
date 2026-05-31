import { ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { StatusPill } from '../../components/design-system/StatusPill';
import { SurfaceState } from '../../components/design-system/SurfaceState';
import { useHistoryImages } from '../history/useHistoryImages';
import type { UserImage } from '../history/historyTypes';

export type CreateHistorySelection = {
  id: string;
  src: string;
  title: string;
  prompt?: string;
};

export function CreateHistoryRail({
  resultUrls,
  onUseImage,
  importingId,
}: {
  resultUrls: string[];
  onUseImage: (image: CreateHistorySelection) => void;
  importingId: string;
}) {
  const history = useHistoryImages();
  const currentResults: CreateHistorySelection[] = resultUrls.map((src, index) => ({
    id: `current-result-${index}`,
    src,
    title: `当前结果 ${index + 1}`,
  }));
  const historyImages: CreateHistorySelection[] = history.images.map((image: UserImage) => ({
    id: image.id,
    src: image.src,
    title: image.title,
    prompt: image.prompt,
  }));
  const images = [...currentResults, ...historyImages].slice(0, 18);

  return (
    <aside className="flex min-h-0 flex-col border-l border-white/[0.08] bg-[#171614] max-xl:hidden">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
        <div>
          <div className="text-xs font-bold text-on-surface-variant">历史 / 结果</div>
          <div className="mt-0.5 text-sm font-bold text-on-surface">可回填为参考图</div>
        </div>
        <StatusPill tone={history.loading ? 'running' : 'neutral'} size="sm">
          {history.loading ? '同步中' : String(images.length)}
        </StatusPill>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {images.length ? (
          <div className="grid gap-2">
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                className="group overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] text-left hover:border-lime/45"
                onClick={() => onUseImage(image)}
              >
                <img src={image.src} alt="" className="aspect-square w-full object-cover opacity-90 transition group-hover:opacity-100" />
                <span className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                  <span className="min-w-0 truncate font-semibold text-on-surface">{image.title}</span>
                  <span className="shrink-0 text-lime">{importingId === image.id ? '导入中' : '使用'}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <SurfaceState
            kind={history.loading ? 'loading' : 'empty'}
            title={history.loading ? '正在读取历史' : '还没有历史图片'}
            description={history.error || '生成结果会立即出现在这里。'}
            className="min-h-48"
          />
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.08] p-3">
        <Button as="a" href="/history" variant="ghost" size="sm" iconStart={history.loading ? <Loader2 className="animate-spin" size={14} /> : <ImageIcon size={14} />} fullWidth>
          历史目录
        </Button>
      </div>
    </aside>
  );
}
