import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSite } from '../site';
import RetryImage from './RetryImage';

export type PreviewImage = {
  id?: string;
  url: string;
  prompt?: string | null;
  title?: string | null;
  subtitle?: string | null;
};

type Props = {
  imageUrl?: string | null;
  images?: PreviewImage[];
  initialIndex?: number;
  alt?: string;
  subtitle?: string | null;
  onClose: () => void;
};

export default function ImagePreviewModal({ imageUrl, images, initialIndex = 0, alt = 'preview', subtitle, onClose }: Props) {
  const { t } = useSite();
  const gallery = useMemo(() => {
    const validImages = (images || []).filter((image) => image.url);
    if (validImages.length > 0) {
      return validImages;
    }
    return imageUrl ? [{ url: imageUrl, prompt: subtitle || alt }] : [];
  }, [alt, imageUrl, images, subtitle]);
  const galleryKey = gallery.map((image) => image.url).join('|');
  const [index, setIndex] = useState(initialIndex);
  const currentIndex = gallery.length > 0 ? Math.max(0, Math.min(index, gallery.length - 1)) : 0;
  const current = gallery[currentIndex];
  const currentSubtitle = current?.subtitle || current?.prompt || subtitle || '';
  const hasMultiple = gallery.length > 1;

  useEffect(() => {
    setIndex(Math.max(0, Math.min(initialIndex, Math.max(0, gallery.length - 1))));
  }, [gallery.length, galleryKey, initialIndex]);

  useEffect(() => {
    if (!current) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowLeft' && hasMultiple) {
        setIndex((value) => (value <= 0 ? gallery.length - 1 : value - 1));
      }
      if (event.key === 'ArrowRight' && hasMultiple) {
        setIndex((value) => (value >= gallery.length - 1 ? 0 : value + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current, gallery.length, hasMultiple, onClose]);

  if (!current) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-5xl bg-surface rounded-2xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <div className="text-xs text-secondary font-medium">{t('modal_preview')}</div>
            <div className="mt-0.5 flex items-center gap-3">
              {hasMultiple ? <span className="text-sm font-semibold text-on-surface">{currentIndex + 1} / {gallery.length}</span> : null}
              {currentSubtitle ? <div className="min-w-0 truncate text-sm text-on-surface-variant">{currentSubtitle}</div> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              className="flex h-9 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
              href={current.url}
              download
              title={t('modal_download')}
            >
              <Download size={14} />
              {t('modal_download')}
            </a>
            <a
              className="flex h-9 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
              href={current.url}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={14} />
              {t('modal_open_image')}
            </a>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              type="button"
              onClick={onClose}
              title={t('modal_close')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image area */}
        <div className="relative flex max-h-[75vh] items-center justify-center overflow-auto bg-surface-container-low">
          {hasMultiple ? (
            <>
              <button
                className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-on-surface shadow-lg backdrop-blur hover:bg-surface transition-colors"
                type="button"
                onClick={() => setIndex((value) => (value <= 0 ? gallery.length - 1 : value - 1))}
                title={t('modal_previous')}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-on-surface shadow-lg backdrop-blur hover:bg-surface transition-colors"
                type="button"
                onClick={() => setIndex((value) => (value >= gallery.length - 1 ? 0 : value + 1))}
                title={t('modal_next')}
              >
                <ChevronRight size={20} />
              </button>
            </>
          ) : null}
          <RetryImage alt={current.title || alt} className="max-h-[70vh] w-auto max-w-full object-contain p-4" src={current.url} />
        </div>
      </div>
    </div>
  );
}
