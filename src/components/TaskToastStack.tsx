import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useSite } from '../site';
import { useTasks } from '../tasks';
import type { NoticeToast } from '../tasks';

export default function TaskToastStack() {
  const { t } = useSite();
  const { toasts, dismissToast } = useTasks();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[160] flex w-[min(92vw,380px)] flex-col gap-3">
      {toasts.map((toast) => {
        const isTaskToast = toast.type === 'task';
        const kind: NoticeToast['kind'] = isTaskToast ? (toast.status === 'succeeded' ? 'success' : 'error') : toast.kind;
        const succeeded = kind === 'success';
        const errored = kind === 'error';
        const title = isTaskToast
          ? succeeded
            ? t('tasks_toast_succeeded')
            : t('tasks_toast_failed')
          : toast.title || (errored ? t('toast_error') : succeeded ? t('toast_success') : t('toast_info'));
        const body = isTaskToast && errored && toast.error ? toast.error : isTaskToast ? toast.prompt : toast.message;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border bg-surface p-4 shadow-lg animate-fade-in ${
              succeeded
                ? 'border-tertiary/30'
                : errored
                  ? 'border-error/30'
                  : 'border-primary/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {succeeded ? (
                  <CheckCircle2 aria-hidden="true" size={18} className="text-tertiary" />
                ) : errored ? (
                  <XCircle aria-hidden="true" size={18} className="text-error" />
                ) : (
                  <Info aria-hidden="true" size={18} className="text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-on-surface">{title}</div>
                <p className="mt-1 line-clamp-3 break-words text-sm text-on-surface-variant [overflow-wrap:anywhere]">{body}</p>
                {isTaskToast && toast.error && body !== toast.error ? <div className="mt-2 break-words text-xs text-error [overflow-wrap:anywhere]">{toast.error}</div> : null}
                {toast.type === 'notice' && toast.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.run();
                      dismissToast(toast.id);
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-lime hover:underline"
                  >
                    {toast.action.label}
                  </button>
                ) : null}
              </div>
              <button
                aria-label={`${t('modal_close')} ${title}`}
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                type="button"
                onClick={() => dismissToast(toast.id)}
                title={t('modal_close')}
              >
                <X aria-hidden="true" size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
