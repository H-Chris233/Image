import { Archive, CheckCircle2, Clock3, ImageIcon, ListFilter, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  if (status === 'queued') return <Clock3 size={14} className="text-[#8a8680]" />;
  if (status === 'running') return <Loader2 size={14} className="animate-spin text-[#E3FF74]" />;
  if (status === 'succeeded') return <CheckCircle2 size={14} className="text-[#4ade80]" />;
  return <XCircle size={14} className="text-[#ff6b6b]" />;
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
  const hasFilter = filter !== 'all';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 text-[#f0ede8]">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#f0ede8]">
          {t('tasks_title')}
          <span className="ml-2 text-[#E3FF74]">·</span>
        </h1>
        <p className="mt-1 text-sm text-[#8a8680]">{t('tasks_subtitle')}</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[#8a8680]">
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
                ? 'border border-[rgba(227,255,116,0.15)] bg-[rgba(227,255,116,0.1)] text-[#E3FF74]'
                : 'border border-transparent text-[#8a8680] hover:bg-white/[0.04] hover:text-[#f0ede8]'
            }`}
            type="button"
            onClick={() => setFilter(key as FilterKey)}
          >
            {label}
          </button>
        ))}
      </div>

      {visibleTasks.length === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-outline-variant/70 bg-surface/70 px-6 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-sm flex-col items-center">
            <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${
              hasFilter ? 'border-secondary/25 bg-secondary/10 text-secondary' : 'border-primary/25 bg-primary/10 text-primary'
            }`}
            >
              {hasFilter ? <ListFilter size={24} /> : <Sparkles size={24} />}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-on-surface">
              {hasFilter ? t('tasks_filter_empty_title') : t('tasks_empty_title')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              {hasFilter ? t('tasks_filter_empty_desc') : t('tasks_empty_desc')}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {hasFilter ? (
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
                  type="button"
                  onClick={() => setFilter('all')}
                >
                  <ListFilter size={16} />
                  {t('tasks_clear_filter')}
                </button>
              ) : null}
              <Link className="btn-primary" to="/create">
                <Sparkles size={16} />
                {t('tasks_create_action')}
              </Link>
            </div>
          </div>
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
              <div key={task.id} className="rounded-xl border border-white/[0.07] bg-[#1a1917] p-4">
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
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.03]">
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
                      <ImageIcon size={18} className="text-[#8a8680]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-3 text-sm text-[#f0ede8]">{task.prompt}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#8a8680]">
                      <span>{task.model}</span>
                      <span>{task.size}</span>
                      {task.aspect_ratio ? <span>{task.aspect_ratio}</span> : null}
                      <span>{task.quality}</span>
                      {previewImages.length > 1 ? <span>x{previewImages.length}</span> : null}
                    </div>
                    {task.error ? <div className="mt-2 text-sm text-[#ff6b6b]">{task.error}</div> : null}
                    {previewImages.length > 1 ? (
                      <a
                        className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[#8a8680] transition-colors hover:bg-white/[0.04] hover:text-[#f0ede8]"
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
