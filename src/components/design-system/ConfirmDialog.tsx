import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';

type ConfirmTone = 'danger' | 'publish';

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
  icon?: ReactNode;
  tone?: ConfirmTone;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const toneClasses: Record<ConfirmTone, { icon: string; title: string; confirm: 'danger' | 'lime' }> = {
  danger: {
    icon: 'bg-error text-on-error',
    title: 'text-error',
    confirm: 'danger',
  },
  publish: {
    icon: 'bg-lime text-on-lime',
    title: 'text-on-surface',
    confirm: 'lime',
  },
};

export function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  icon,
  tone = 'publish',
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const toneClass = toneClasses[tone];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const focusable = [cancelRef.current, confirmRef.current].filter(
        (element): element is HTMLButtonElement => Boolean(element) && !element.disabled,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-black/70 px-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-6 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
    >
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex max-h-[min(82vh,28rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-white/[0.12] bg-surface-container-low shadow-[0_28px_90px_rgba(0,0,0,0.5)] sm:rounded-2xl"
        role="alertdialog"
      >
        <div className="flex min-h-0 flex-1 items-start gap-3 overflow-y-auto p-4 sm:p-5">
          {icon ? (
            <div className={cx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', toneClass.icon)}>
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className={cx('break-words text-base font-semibold leading-6 [overflow-wrap:anywhere]', toneClass.title)} id={titleId}>
              {title}
            </h2>
            <p className="mt-2 break-words text-sm leading-6 text-on-surface-variant [overflow-wrap:anywhere]" id={descriptionId}>
              {description}
            </p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-1 gap-2 border-t border-outline-variant/70 bg-surface-container px-4 py-3 sm:grid-cols-2 sm:p-4">
          <Button
            ref={cancelRef}
            variant="ghost"
            className="h-11 rounded-lg"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={toneClass.confirm}
            iconStart={busy ? <Loader2 className="animate-spin" size={14} /> : icon}
            className="h-11 rounded-lg"
            type="button"
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
