import { ImageIcon } from 'lucide-react';
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
  onOpenAssets,
}: {
  resultUrls: string[];
  onUseImage: (image: CreateHistorySelection) => void;
  importingId: string;
  onOpenAssets: () => void;
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
  const images = [...currentResults, ...historyImages].slice(0, 12);

  return (
    <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#171614]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-bold text-on-surface">最近结果</span>
          <span className="hidden text-xs text-on-surface-variant @md:inline">点击回填为参考图</span>
          <StatusPill tone={history.loading ? 'running' : 'neutral'} size="sm">
            {history.loading ? '同步中' : String(images.length)}
          </StatusPill>
        </div>
        <Button variant="ghost" size="sm" iconStart={<ImageIcon size={14} />} onClick={onOpenAssets}>
          去资产库
        </Button>
      </div>

      {images.length ? (
        <div className="flex gap-2 overflow-x-auto p-3">
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              className="group relative w-28 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03] text-left transition hover:border-lime/45"
              onClick={() => onUseImage(image)}
            >
              <img src={image.src} alt="" className="aspect-square w-full object-cover opacity-90 transition group-hover:opacity-100" />
              <span className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px]">
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
          description={history.error || '生成结果会立即出现在这里，可点击回填为参考图。'}
          className="m-3"
        />
      )}
    </section>
  );
}
