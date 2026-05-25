import { useState } from 'react';
import { Check, Copy, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { createShareLink, deleteShareLink, type ShareLinkResult } from '../../api';

interface SharePanelProps {
  historyId: string;
  onError: (err: unknown) => void;
}

export function SharePanel({ historyId, onError }: SharePanelProps) {
  const [link, setLink] = useState<ShareLinkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await createShareLink(historyId);
      setLink(result);
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (deleting || !link) return;
    setDeleting(true);
    try {
      await deleteShareLink(historyId);
      setLink(null);
    } catch (err) {
      onError(err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {link ? (
        <>
          <div className="flex items-center gap-2 border border-white/10 bg-black/60 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[11px] text-white/70">{link.share_url}</span>
            <button
              type="button"
              className="flex h-7 shrink-0 items-center gap-1.5 border border-primary/30 px-2 text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10"
              onClick={() => void handleCopy()}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? '已复制' : '复制'}
            </button>
            <a
              href={link.share_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 shrink-0 items-center gap-1 px-2 text-[10px] text-white/40 hover:text-white/80"
            >
              <ExternalLink size={11} />
            </a>
          </div>
          {link.expires_at && (
            <div className="text-[10px]" style={{ color: 'rgba(240,237,232,0.4)' }}>
              链接有效期至 {new Date(link.expires_at).toLocaleDateString()}
            </div>
          )}
          <button
            type="button"
            className="flex h-8 items-center gap-2 border border-error/30 bg-error/5 px-3 text-[10px] uppercase tracking-widest text-error hover:bg-error/15 disabled:opacity-50"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            撤销分享
          </button>
        </>
      ) : (
        <button
          type="button"
          className="flex h-9 items-center gap-2 border border-primary/30 px-4 text-[11px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10 disabled:opacity-50"
          disabled={loading}
          onClick={() => void handleCreate()}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
          {loading ? '生成链接中…' : '生成分享链接'}
        </button>
      )}
    </div>
  );
}
