import { Bell, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSite } from '../site';
import { IconButton, Surface } from './design-system';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function AnnouncementModal() {
  const { announcementOpen, closeAnnouncement, siteSettings, t } = useSite();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = 'announcement-modal-title';
  const bodyId = 'announcement-modal-body';

  useEffect(() => {
    if (!announcementOpen) return undefined;

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
  }, [announcementOpen]);

  useEffect(() => {
    if (!announcementOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAnnouncement();
        return;
      }

      if (event.key !== 'Tab') return;

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
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [announcementOpen, closeAnnouncement]);

  if (!announcementOpen) {
    return null;
  }

  const announcement = siteSettings?.announcement;
  const hasContent = Boolean(announcement?.title || announcement?.body);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={closeAnnouncement}>
      <Surface
        ref={dialogRef}
        aria-describedby={bodyId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden animate-fade-in"
        padding="lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-[#E3FF74] opacity-50" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(227,255,116,0.1)] text-[#E3FF74]">
              <Bell aria-hidden="true" size={18} />
            </div>
            <div>
              <div className="text-xs font-medium text-[#E3FF74]">{t('top_announcement')}</div>
              <h2 className="mt-0.5 text-lg font-bold text-[#f0ede8]" id={titleId}>{announcement?.title || t('top_announcement')}</h2>
            </div>
          </div>
          <IconButton
            ref={closeButtonRef}
            label={t('modal_close')}
            icon={<X aria-hidden="true" size={16} />}
            onClick={closeAnnouncement}
          />
        </div>

        <div id={bodyId} className="min-h-0 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-white/[0.03] p-5 text-sm leading-7 text-[#f0ede8] [overflow-wrap:anywhere]">
          {hasContent ? announcement?.body || announcement?.title : t('announcement_empty')}
        </div>

      </Surface>
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
