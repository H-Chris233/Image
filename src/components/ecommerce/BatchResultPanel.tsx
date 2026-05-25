import { Download, Loader2, X } from 'lucide-react';
import RetryImage from '../RetryImage';

export interface BatchResult {
  templateId: string;
  templateName: string;
  taskId: string | null;
  status: 'pending' | 'success' | 'error';
  imageUrls: string[];
  error?: string;
}

interface BatchResultPanelProps {
  results: BatchResult[];
  onPreview: (url: string) => void;
  onDownload: (url: string) => void;
  onClose: () => void;
}

export function BatchResultPanel({ results, onPreview, onDownload, onClose }: BatchResultPanelProps) {
  const doneCount = results.filter((r) => r.status === 'success').length;

  return (
    <div className="overflow-hidden rounded-xl border border-primary/20 bg-black/50">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--ag-lime)' }}
          >
            批量结果
          </span>
          <span className="text-[10px] text-white/40">
            {doneCount}/{results.length} 完成
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center text-white/40 hover:text-white/80"
          aria-label="关闭批量结果"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
        {results.map((result) => (
          <div
            key={result.templateId}
            className="overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              {result.status === 'pending' && (
                <Loader2 className="animate-spin text-white/40" size={10} />
              )}
              {result.status === 'success' && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: 'var(--ag-lime)' }}
                />
              )}
              {result.status === 'error' && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              )}
              <span className="text-[10px] font-bold text-white/70">{result.templateName}</span>
            </div>

            <div className="p-2">
              {result.status === 'pending' && (
                <div className="grid grid-cols-2 gap-1">
                  {[0, 1].map((i) => (
                    <div key={i} className="aspect-square animate-pulse rounded bg-white/[0.08]" />
                  ))}
                </div>
              )}

              {result.status === 'error' && (
                <p className="py-2 text-[10px] text-red-400/80">
                  {result.error ?? '提交失败，请重试'}
                </p>
              )}

              {result.status === 'success' && (
                <div className="grid grid-cols-2 gap-1">
                  {result.imageUrls.slice(0, 4).map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded"
                      onClick={() => onPreview(url)}
                    >
                      <RetryImage
                        src={url}
                        alt={result.templateName}
                        className="h-full w-full object-cover transition-opacity hover:opacity-90"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(url);
                        }}
                        className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded bg-black/70 text-white/80 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                        aria-label="下载"
                      >
                        <Download size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
