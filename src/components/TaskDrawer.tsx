import { Clock3, History, ImageIcon, Loader2, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDate } from '../api';
import ImagePreviewModal from './ImagePreviewModal';
import RetryImage from './RetryImage';
import { useSite } from '../site';
import { useTasks } from '../tasks';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function statusLabel(status: 'queued' | 'running' | 'succeeded' | 'failed', t: ReturnType<typeof useSite>['t']) {
  if (status === 'queued') return t('tasks_status_queued');
  if (status === 'running') return t('tasks_status_running');
  if (status === 'succeeded') return t('tasks_status_succeeded');
  return t('tasks_status_failed');
}

function statusIcon(status: 'queued' | 'running' | 'succeeded' | 'failed') {
  if (status === 'queued') return <Clock3 aria-hidden="true" size={14} className="text-[#8a8680]" />;
  if (status === 'running') return <Loader2 aria-hidden="true" size={14} className="animate-spin text-[#E3FF74]" />;
  return <Clock3 aria-hidden="true" size={14} className="text-[#8a8680]" />;
}

export default function TaskDrawer() {
  const { t } = useSite();
  const { tasks, drawerOpen, closeDrawer, activeCount } = useTasks();
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const [previewItem, setPreviewItem] = useState<{
    imageUrl?: string | null;
    images?: { id?: string; url: string; prompt?: string | null; title?: string | null }[];
    initialIndex?: number;
    prompt: string;
  } | null>(null);

  // active 任务在前；后接最近 5 个 succeeded/failed —— 让用户打开抽屉就能看到"刚才那个任务好了没"，
  // 而不是任务一终态就消失只剩 idle 空状态。
  const displayTasks = useMemo(() => {
    const active = tasks.filter((task) => task.status === 'queued' || task.status === 'running');
    const recentDone = tasks
      .filter((task) => task.status === 'succeeded' || task.status === 'failed')
      .slice(0, 5);
    return [...active, ...recentDone];
  }, [tasks]);
  const titleId = 'task-drawer-title';

  useEffect(() => {
    if (!drawerOpen) return undefined;
    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      (closeButtonRef.current ?? getFocusableElements(drawerRef.current)[0] ?? drawerRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      const previous = previouslyFocusedElementRef.current;
      if (previous && document.contains(previous)) previous.focus();
      previouslyFocusedElementRef.current = null;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen || previewItem) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusableElements = getFocusableElements(drawer);
      if (!focusableElements.length) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (!(activeElement instanceof HTMLElement) || !drawer.contains(activeElement)) {
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
  }, [closeDrawer, drawerOpen, previewItem]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeDrawer}
      />
      <aside
        ref={drawerRef}
        aria-labelledby={drawerOpen ? titleId : undefined}
        aria-hidden={!drawerOpen}
        aria-modal={drawerOpen ? 'true' : undefined}
        className={`fixed right-0 top-0 z-[130] h-full w-full max-w-[420px] bg-[#111110] shadow-xl transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        inert={drawerOpen ? undefined : true}
        role={drawerOpen ? 'dialog' : undefined}
        tabIndex={-1}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#8a8680] mb-1">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#E3FF74]" />
                {t('top_tasks')}
              </div>
              <h2 className="font-display text-xl font-bold text-[#f0ede8]" id={titleId}>{t('tasks_title')}</h2>
              <p className="mt-1 text-sm text-[#8a8680]">{t('tasks_subtitle')}</p>
            </div>
            <button
              ref={closeButtonRef}
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg text-[#8a8680] transition-colors hover:bg-white/[0.05] hover:text-[#f0ede8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
              type="button"
              aria-label={t('modal_close')}
              onClick={closeDrawer}
              title={t('modal_close')}
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-6 py-3 text-sm text-[#8a8680]">
            <span>{activeCount > 0 ? t('tasks_active', { value: activeCount }) : t('tasks_idle')}</span>
            <Link
              className="inline-flex h-11 items-center gap-2 rounded-lg px-2 font-medium text-[#E3FF74] transition-colors hover:bg-white/[0.04] hover:text-[#f0ede8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
              to="/history"
              onClick={closeDrawer}
            >
              <History aria-hidden="true" size={14} />
              {t('tasks_open_history')}
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {displayTasks.length === 0 ? (
              <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-outline-variant/70 bg-surface/70 px-5 py-8 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                    <Sparkles aria-hidden="true" size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-on-surface">
                    {t('tasks_idle')}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {t('tasks_subtitle')}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Link className="btn-primary min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35" to="/create" onClick={closeDrawer}>
                      <Sparkles aria-hidden="true" size={14} />
                      {t('tasks_create_action')}
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {displayTasks.map((task) => {
                  const previewImages = task.items
                    .filter((item) => item.image_url)
                    .sort((a, b) => (a.batch_index || 0) - (b.batch_index || 0))
                    .map((item) => ({ id: item.id, url: item.image_url || '', prompt: item.prompt }));
                  const previewImage = previewImages[0]?.url || null;
                  return (
                    <div key={task.id} className="rounded-xl border border-white/[0.07] bg-[#1a1917] p-3">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {statusIcon(task.status)}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#f0ede8]">
                              {task.mode === 'edit' ? t('home_mode_edit') : t('home_mode_generate')}
                            </div>
                            <div className="text-xs text-[#8a8680]">{formatDate(task.created_at)}</div>
                          </div>
                        </div>
                        <div className="rounded-lg bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-[#8a8680]">
                          {statusLabel(task.status, t)}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.03]">
                          {previewImages.length > 1 ? (
                            <div className="grid h-full w-full grid-cols-2 gap-0.5 p-0.5">
                              {previewImages.slice(0, 4).map((image, imageIndex) => (
                                <button
                                  key={image.id}
                                  aria-label={`${t('history_preview')} ${imageIndex + 1}`}
                                  className="min-h-11 min-w-11 cursor-zoom-in overflow-hidden rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
                                  type="button"
                                  title={t('history_preview')}
                                  onClick={() => setPreviewItem({
                                    images: previewImages.map((galleryImage, galleryIndex) => ({
                                      id: galleryImage.id,
                                      url: galleryImage.url,
                                      prompt: '',
                                      title: `${task.id}-${galleryIndex + 1}`,
                                    })),
                                    initialIndex: imageIndex,
                                    prompt: '',
                                  })}
                                >
                                  <RetryImage alt={'生成结果'} className="h-full w-full object-cover" src={image.url} />
                                </button>
                              ))}
                            </div>
                          ) : previewImage ? (
                            <button
                              aria-label={t('history_preview')}
                              className="h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
                              type="button"
                              title={t('history_preview')}
                              onClick={() => setPreviewItem({ imageUrl: previewImage, prompt: '' })}
                            >
                              <RetryImage alt={'生成结果'} className="h-full w-full object-contain" src={previewImage} />
                            </button>
                          ) : (
                            <ImageIcon aria-hidden="true" size={18} className="text-[#8a8680]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm text-[#f0ede8]">{'商品图'}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#8a8680]">
                            <span>{task.size}</span>
                            {task.aspect_ratio ? <span>{task.aspect_ratio}</span> : null}
                            {previewImages.length > 1 ? <span>x{previewImages.length}</span> : null}
                          </div>
                          {task.error ? (
                            <div className="mt-2 text-sm text-[#ff6b6b]">{presentTaskError(task.error).message}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
      <ImagePreviewModal
        imageUrl={previewItem?.imageUrl || null}
        images={previewItem?.images}
        initialIndex={previewItem?.initialIndex || 0}
        alt={previewItem?.prompt || 'preview'}
        subtitle={previewItem?.prompt}
        onClose={() => setPreviewItem(null)}
      />
    </>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const isVisible = element.offsetWidth > 0 || element.offsetHeight > 0 || element.getClientRects().length > 0;
    return isVisible && !element.getAttribute('aria-hidden');
  });
}
