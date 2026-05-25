import { Download, Maximize2, RotateCcw } from 'lucide-react';
import RetryImage from '../RetryImage';

interface ResultPanelProps {
  images: string[];
  loading: boolean;
  expectedCount: number;
  onPreview: (url: string, index: number) => void;
  onRetry?: () => void;
  onDownload?: (url: string) => void;
  /** 用户已上传的商品图 URL — 触发「就绪」引导状态（Step 3） */
  uploadedImageUrl?: string;
  /** 已选中的风格模板名称 — 触发模板提示标签（Step 3） */
  selectedTemplateName?: string;
}

export function ResultPanel({
  images,
  loading,
  expectedCount,
  onPreview,
  onRetry,
  onDownload,
  uploadedImageUrl,
  selectedTemplateName,
}: ResultPanelProps) {
  // 空状态：上传了图片 → 显示「就绪」引导
  if (!loading && images.length === 0 && uploadedImageUrl) {
    return (
      <div className="min-h-[200px] overflow-hidden rounded-xl border border-primary/20 bg-black/50">
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-5 text-center">
          <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/15">
            <img src={uploadedImageUrl} alt="商品图" className="h-full w-full object-cover" />
          </div>
          <div>
            <div
              className="mb-1 text-[11px] font-bold"
              style={{ color: 'var(--ag-lime)' }}
            >
              ✓ 商品图已就绪
            </div>
            {selectedTemplateName ? (
              <p className="text-[10px] text-white/50">
                已选「{selectedTemplateName}」风格 — 点击「生成场景图」查看效果
              </p>
            ) : (
              <p className="text-[10px] text-white/50">
                选择左侧风格模板后，点击「生成场景图」
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 完全空状态（无图片，无上传）
  if (!loading && images.length === 0) {
    return (
      <div className="min-h-[200px] rounded-xl border border-white/8 bg-white/[0.02] p-5">
        {selectedTemplateName && (
          <div className="mb-4 flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--ag-lime)' }}>
              ✓ 已选「{selectedTemplateName}」
            </span>
            <span className="text-[10px] text-white/40">— 上传商品图后点击生成</span>
          </div>
        )}
        <div className="flex flex-col items-center justify-center gap-5 py-4 text-center">
          <div className="flex items-center gap-2">
            {[
              { step: '①', label: '上传商品图', done: false },
              { step: '②', label: '选择风格', done: Boolean(selectedTemplateName) },
              { step: '③', label: '点击生成', done: false },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black"
                    style={{
                      background: s.done ? 'rgba(227,255,116,0.12)' : 'rgba(255,255,255,0.06)',
                      color: s.done ? 'var(--ag-lime)' : 'rgba(240,237,232,0.3)',
                      border: s.done ? '1px solid rgba(227,255,116,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {s.done ? '✓' : s.step}
                  </div>
                  <span className="text-[9px] text-white/35">{s.label}</span>
                </div>
                {i < 2 && <span className="mb-4 text-white/15">→</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-white/30">生成后的图片将显示在这里</p>
        </div>
      </div>
    );
  }

  const skeletonCount = loading && images.length === 0 ? Math.max(1, expectedCount) : 0;

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      {/* 顶部操作栏（有结果时显示） */}
      {images.length > 0 && onRetry && (
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-white/35">
            生成结果 ({images.length} 张)
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/50 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw size={10} />
            再生成一次
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Skeleton 格子 */}
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={`sk-${i}`}
            className="aspect-square animate-pulse rounded-lg bg-white/[0.06]"
          />
        ))}

        {/* 结果图片 */}
        {images.map((url, index) => (
          <div
            key={url}
            className="group relative cursor-pointer overflow-hidden rounded-lg border border-white/8"
            onClick={() => onPreview(url, index)}
          >
            <RetryImage
              src={url}
              alt={`生成图 ${index + 1}`}
              className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {/* 悬停操作层 */}
            <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <span className="text-[9px] font-semibold text-white/60">#{index + 1}</span>
              <div className="flex gap-1">
                {onDownload && (
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white/80 hover:text-white"
                    onClick={(e) => { e.stopPropagation(); onDownload(url); }}
                  >
                    <Download size={12} />
                  </button>
                )}
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white/80 hover:text-white"
                  onClick={(e) => { e.stopPropagation(); onPreview(url, index); }}
                >
                  <Maximize2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
