import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function ImagePreviewModal({ imageUrl, images, initialIndex = 0, alt = 'preview', subtitle, onClose }: Props) {
  const { t } = useSite();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
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
  const isOpen = Boolean(current);
  const titleId = 'image-preview-title';

  useEffect(() => {
    setIndex(Math.max(0, Math.min(initialIndex, Math.max(0, gallery.length - 1))));
  }, [gallery.length, galleryKey, initialIndex]);

  useEffect(() => {
    if (!isOpen) return undefined;
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      (closeButtonRef.current ?? getFocusableElements(dialogRef.current)[0] ?? dialogRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      const previous = previouslyFocusedElementRef.current;
      if (previous && document.contains(previous)) previous.focus();
      previouslyFocusedElementRef.current = null;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!current) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft' && hasMultiple) {
        event.preventDefault();
        setIndex((value) => (value <= 0 ? gallery.length - 1 : value - 1));
        return;
      }
      if (event.key === 'ArrowRight' && hasMultiple) {
        event.preventDefault();
        setIndex((value) => (value >= gallery.length - 1 ? 0 : value + 1));
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusableElements = getFocusableElements(dialog);
      if (!focusableElements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!(activeElement instanceof HTMLElement) || !dialog.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
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
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative w-full max-w-5xl bg-surface rounded-2xl shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-xs text-secondary font-medium" id={titleId}>{t('modal_preview')}</h2>
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
              ref={closeButtonRef}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              type="button"
              aria-label={t('modal_close')}
              onClick={onClose}
              title={t('modal_close')}
            >
              <X aria-hidden="true" size={16} />
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
                aria-label={t('modal_previous')}
                onClick={() => setIndex((value) => (value <= 0 ? gallery.length - 1 : value - 1))}
                title={t('modal_previous')}
              >
                <ChevronLeft aria-hidden="true" size={20} />
              </button>
              <button
                className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-on-surface shadow-lg backdrop-blur hover:bg-surface transition-colors"
                type="button"
                aria-label={t('modal_next')}
                onClick={() => setIndex((value) => (value >= gallery.length - 1 ? 0 : value + 1))}
                title={t('modal_next')}
              >
                <ChevronRight aria-hidden="true" size={20} />
              </button>
            </>
          ) : null}
          <RetryImage alt={current.title || alt} className="max-h-[70vh] w-auto max-w-full object-contain p-4" src={current.url} />
        </div>
      </div>
    </div>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const isVisible = element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0;
    return isVisible && !element.getAttribute('aria-hidden');
  });
}
