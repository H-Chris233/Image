import { Download, Loader2, X } from 'lucide-react';

interface BatchDownloadBarProps {
  selectedCount: number;
  downloading: boolean;
  onDownload: () => void;
  onClear: () => void;
}

export function BatchDownloadBar({ selectedCount, downloading, onDownload, onClear }: BatchDownloadBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-3 border border-white/20 bg-black/95 px-4 py-3 shadow-[0_4px_32px_rgba(0,0,0,0.6)] backdrop-blur"
      style={{ minWidth: 280 }}
    >
      <span className="text-[11px] font-semibold text-white/70">
        已选 <span style={{ color: 'var(--ag-lime)' }}>{selectedCount}</span> 个项目
      </span>
      <div className="flex flex-1 items-center justify-end gap-2">
        <button
          type="button"
          className="flex h-8 items-center gap-2 border border-secondary/40 px-3 text-[10px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary/10 disabled:opacity-50"
          disabled={downloading}
          onClick={onDownload}
        >
          {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          {downloading ? '生成中…' : `批量下载 (${selectedCount})`}
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center border border-white/15 text-white/40 hover:border-white/30 hover:text-white/70"
          onClick={onClear}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
