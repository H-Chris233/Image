import { Archive, CheckCircle2, Clock3, ImageIcon, Loader2, X, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { formatDate, taskDownloadUrl } from '../api';
import ImagePreviewModal from './ImagePreviewModal';
import RetryImage from './RetryImage';
import { useSite } from '../site';
import { useTasks } from '../tasks';

type FilterKey = 'all' | 'active' | 'succeeded' | 'failed';

function statusLabel(status: 'queued' | 'running' | 'succeeded' | 'failed', t: ReturnType<typeof useSite>['t']) {
  if (status === 'queued') return t('tasks_status_queued');
  if (status === 'running') return t('tasks_status_running');
  if (status === 'succeeded') return t('tasks_status_succeeded');
  return t('tasks_status_failed');
}

function statusIcon(status: 'queued' | 'running' | 'succeeded' | 'failed') {
  if (status === 'queued') return <Clock3 size={14} className="text-on-surface-variant" />;
  if (status === 'running') return <Loader2 size={14} className="animate-spin text-primary" />;
  if (status === 'succeeded') return <CheckCircle2 size={14} className="text-tertiary" />;
  return <XCircle size={14} className="text-error" />;
}

export default function TaskDrawer() {
  const { t } = useSite();
  const { tasks, drawerOpen, closeDrawer, activeCount } = useTasks();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [previewItem, setPreviewItem] = useState<{
    imageUrl?: string | null;
    images?: { id?: string; url: string; prompt?: string | null; title?: string | null }[];
    initialIndex?: number;
    prompt: string;
  } | null>(null);

  const visibleTasks = useMemo(() => {
    if (filter === 'all') {
      return tasks;
    }
    if (filter === 'active') {
      return tasks.filter((task) => task.status === 'queued' || task.status === 'running');
    }
    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeDrawer}
      />
      <aside
        className={`fixed right-0 top-0 z-[130] h-full w-full max-w-[420px] bg-surface shadow-xl transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-outline-variant px-6 py-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t('top_tasks')}
              </div>
              <h2 className="text-xl font-bold text-on-surface">{t('tasks_title')}</h2>
              <p className="mt-1 text-sm text-on-surface-variant">{t('tasks_subtitle')}</p>
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              type="button"
              onClick={closeDrawer}
              title={t('modal_close')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between border-b border-outline-variant px-6 py-3 text-sm text-on-surface-variant">
            <span>{activeCount > 0 ? t('tasks_active', { value: activeCount }) : t('tasks_idle')}</span>
            <Link
              className="text-primary font-medium hover:text-primary/80 transition-colors"
              to="/history"
              onClick={closeDrawer}
            >
              {t('tasks_open_history')}
            </Link>
          </div>

          <div className="flex gap-2 border-b border-outline-variant px-4 py-3">
            {([
              ['all', t('tasks_filter_all')],
              ['active', t('tasks_filter_active')],
              ['succeeded', t('tasks_filter_succeeded')],
              ['failed', t('tasks_filter_failed')],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === key
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
                type="button"
                onClick={() => setFilter(key as FilterKey)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {visibleTasks.length === 0 ? (
              <div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-6 text-sm text-on-surface-variant">
                {t('tasks_empty')}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {visibleTasks.map((task) => {
                  const previewImages = task.items
                    .filter((item) => item.image_url)
                    .sort((a, b) => (a.batch_index || 0) - (b.batch_index || 0))
                    .map((item) => ({ id: item.id, url: item.image_url || '', prompt: item.prompt }));
                  const previewImage = previewImages[0]?.url || null;
                  return (
                    <div key={task.id} className="rounded-xl border border-outline-variant bg-surface p-3">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {statusIcon(task.status)}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-on-surface">
                              {task.mode === 'edit' ? t('home_mode_edit') : t('home_mode_generate')}
                            </div>
                            <div className="text-xs text-on-surface-variant">{formatDate(task.created_at)}</div>
                          </div>
                        </div>
                        <div className="rounded-lg bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                          {statusLabel(task.status, t)}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
                          {previewImages.length > 1 ? (
                            <div className="grid h-full w-full grid-cols-2 gap-0.5 p-0.5">
                              {previewImages.slice(0, 4).map((image, imageIndex) => (
                                <button
                                  key={image.id}
                                  className="min-h-0 min-w-0 cursor-zoom-in overflow-hidden rounded"
                                  type="button"
                                  title={t('history_preview')}
                                  onClick={() => setPreviewItem({
                                    images: previewImages.map((galleryImage, galleryIndex) => ({
                                      id: galleryImage.id,
                                      url: galleryImage.url,
                                      prompt: galleryImage.prompt,
                                      title: `${task.id}-${galleryIndex + 1}`,
                                    })),
                                    initialIndex: imageIndex,
                                    prompt: image.prompt,
                                  })}
                                >
                                  <RetryImage alt={task.prompt} className="h-full w-full object-cover" src={image.url} />
                                </button>
                              ))}
                            </div>
                          ) : previewImage ? (
                            <button
                              className="h-full w-full cursor-zoom-in"
                              type="button"
                              title={t('history_preview')}
                              onClick={() => setPreviewItem({ imageUrl: previewImage, prompt: task.prompt })}
                            >
                              <RetryImage alt={task.prompt} className="h-full w-full object-contain" src={previewImage} />
                            </button>
                          ) : (
                            <ImageIcon size={18} className="text-on-surface-variant" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-3 text-sm text-on-surface">{task.prompt}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                            <span>{task.model}</span>
                            <span>{task.size}</span>
                            {task.aspect_ratio ? <span>{task.aspect_ratio}</span> : null}
                            <span>{task.quality}</span>
                            {previewImages.length > 1 ? <span>x{previewImages.length}</span> : null}
                          </div>
                          {task.error ? <div className="mt-2 text-sm text-error">{task.error}</div> : null}
                          {previewImages.length > 1 ? (
                            <a
                              className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                              href={taskDownloadUrl(task.id)}
                              title={t('history_download_zip')}
                            >
                              <Archive size={12} />
                              {t('history_download_zip')}
                            </a>
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
