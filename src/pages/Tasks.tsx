import { Archive, CheckCircle2, Clock3, ImageIcon, Loader2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatDate, taskDownloadUrl } from '../api';
import ImagePreviewModal from '../components/ImagePreviewModal';
import RetryImage from '../components/RetryImage';
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

export default function Tasks() {
  const { t } = useSite();
  const { tasks, activeCount } = useTasks();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [previewItem, setPreviewItem] = useState<{
    imageUrl?: string | null;
    images?: { id?: string; url: string; prompt?: string | null; title?: string | null }[];
    initialIndex?: number;
    prompt: string;
  } | null>(null);

  const visibleTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'active') return tasks.filter((task) => task.status === 'queued' || task.status === 'running');
    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">{t('tasks_title')}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t('tasks_subtitle')}</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-on-surface-variant">
          {activeCount > 0 ? t('tasks_active', { value: activeCount }) : t('tasks_idle')}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {([
          ['all', t('tasks_filter_all')],
          ['active', t('tasks_filter_active')],
          ['succeeded', t('tasks_filter_succeeded')],
          ['failed', t('tasks_filter_failed')],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
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

      {visibleTasks.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-6 text-sm text-on-surface-variant">
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
              <div key={task.id} className="rounded-xl border border-outline-variant bg-surface p-4">
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

      <ImagePreviewModal
        imageUrl={previewItem?.imageUrl || null}
        images={previewItem?.images}
        initialIndex={previewItem?.initialIndex || 0}
        alt={previewItem?.prompt || 'preview'}
        subtitle={previewItem?.prompt}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}
