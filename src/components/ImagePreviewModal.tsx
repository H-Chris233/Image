import { ChevronLeft, ChevronRight, Download, ExternalLink, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
  const titleId = useId();
  const subtitleId = `${titleId}-subtitle`;

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
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleFocusIn = (event: FocusEvent) => {
      const dialog = dialogRef.current;
      if (!dialog || !(event.target instanceof Node) || dialog.contains(event.target)) {
        return;
      }
      const focusTarget = getFocusableElements(dialog)[0] ?? dialog;
      focusTarget.focus();
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
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
    <div className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        aria-describedby={currentSubtitle ? subtitleId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-hidden rounded-2xl bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        {/* Top bar */}
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-xs text-secondary font-medium" id={titleId}>{t('modal_preview')}</h2>
            <div className="mt-0.5 flex items-center gap-3">
              {hasMultiple ? <span className="text-sm font-semibold text-on-surface">{currentIndex + 1} / {gallery.length}</span> : null}
              {currentSubtitle ? <div className="min-w-0 truncate text-sm text-on-surface-variant" id={subtitleId}>{currentSubtitle}</div> : null}
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <a
              aria-label={t('modal_download')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 text-center text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
              href={current.url}
              download
              title={t('modal_download')}
            >
              <Download size={14} />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{t('modal_download')}</span>
            </a>
            <a
              aria-label={t('modal_open_image')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant px-3 text-center text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
              href={current.url}
              rel="noreferrer"
              target="_blank"
              title={t('modal_open_image')}
            >
              <ExternalLink size={14} />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{t('modal_open_image')}</span>
            </a>
            <button
              ref={closeButtonRef}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
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
        <div className="relative flex max-h-[calc(100dvh-8rem)] items-center justify-center overflow-auto bg-surface-container-low sm:max-h-[75vh]">
          {hasMultiple ? (
            <>
              <button
                className="absolute left-3 top-1/2 z-10 flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-on-surface shadow-lg backdrop-blur hover:bg-surface transition-colors"
                type="button"
                aria-label={t('modal_previous')}
                onClick={() => setIndex((value) => (value <= 0 ? gallery.length - 1 : value - 1))}
                title={t('modal_previous')}
              >
                <ChevronLeft aria-hidden="true" size={20} />
              </button>
              <button
                className="absolute right-3 top-1/2 z-10 flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-on-surface shadow-lg backdrop-blur hover:bg-surface transition-colors"
                type="button"
                aria-label={t('modal_next')}
                onClick={() => setIndex((value) => (value >= gallery.length - 1 ? 0 : value + 1))}
                title={t('modal_next')}
              >
                <ChevronRight aria-hidden="true" size={20} />
              </button>
            </>
          ) : null}
          <RetryImage alt={current.title || alt} className="max-h-[calc(100dvh-10rem)] w-auto max-w-full object-contain p-4 sm:max-h-[70vh]" src={current.url} />
        </div>
      </div>
    </div>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const isVisible = element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0;
    return isVisible && element.getAttribute('aria-hidden') !== 'true';
  });
}
