import { useState } from 'react';
import { Download, Loader2, Scissors } from 'lucide-react';
import RetryImage from '../RetryImage';

interface BackgroundRemovalPreviewProps {
  originalUrl: string;
  removedUrl: string | null;
  removing: boolean;
  onRemove: () => void;
}

export function BackgroundRemovalPreview({ originalUrl, removedUrl, removing, onRemove }: BackgroundRemovalPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!removedUrl || downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(removedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-no-bg.png';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="border border-white/10 bg-black/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ag-lime)' }}>
          智能抠图
        </span>
        <div className="flex items-center gap-2">
          {removedUrl && (
            <button
              type="button"
              className="flex h-7 items-center gap-1.5 border border-white/20 px-3 text-[10px] uppercase tracking-widest text-white/60 hover:border-primary hover:text-primary disabled:opacity-50"
              disabled={downloading}
              onClick={() => { void handleDownload(); }}
            >
              {downloading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              下载
            </button>
          )}
          {!removedUrl && (
            <button
              type="button"
              className="flex h-7 items-center gap-1.5 border border-secondary/40 px-3 text-[10px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary/10 disabled:opacity-50"
              disabled={removing}
              onClick={onRemove}
            >
              {removing ? <Loader2 size={11} className="animate-spin" /> : <Scissors size={11} />}
              {removing ? '处理中…' : '一键抠图'}
            </button>
          )}
        </div>
      </div>

      {removedUrl ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="mb-1 text-[8px] uppercase tracking-widest text-white/35">原图</div>
            <RetryImage
              src={originalUrl}
              alt="原图"
              className="w-full object-contain"
              style={{ maxHeight: 180 }}
            />
          </div>
          <div>
            <div className="mb-1 text-[8px] uppercase tracking-widest" style={{ color: 'var(--ag-lime)' }}>
              抠图结果
            </div>
            <div
              className="relative w-full overflow-hidden"
              style={{
                maxHeight: 180,
                background: 'repeating-conic-gradient(#444 0% 25%, #222 0% 50%) 0 0 / 14px 14px',
              }}
            >
              <RetryImage
                src={removedUrl}
                alt="抠图结果"
                className="w-full object-contain"
                style={{ maxHeight: 180 }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="py-1.5 text-[11px]" style={{ color: 'rgba(240,237,232,0.35)' }}>
          自动去除背景，导出透明 PNG，适合电商详情页和白底主图
        </div>
      )}
    </div>
  );
}
