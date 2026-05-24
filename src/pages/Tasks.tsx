import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock3,
  History as HistoryIcon,
  ImageIcon,
  ListFilter,
  Loader2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, taskDownloadUrl } from '../api';
import ImagePreviewModal from '../components/ImagePreviewModal';
import RetryImage from '../components/RetryImage';
import { Button, LinkButton, Pressable, SegmentedControl } from '../components/design-system';
import { useSite } from '../site';
import { useTasks } from '../tasks';

type FilterKey = 'all' | 'active' | 'succeeded' | 'failed';
type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

const fallbackCopy = {
  'zh-CN': {
    eyebrow: '\u4efb\u52a1\u4e2d\u5fc3',
    title: '\u4efb\u52a1\u4e0e\u5386\u53f2',
    subtitle:
      '\u751f\u6210\u8bf7\u6c42\u5148\u4f5c\u4e3a\u4efb\u52a1\u8ffd\u8e2a\u8fdb\u5ea6\uff0c\u5b8c\u6210\u540e\u7684\u56fe\u50cf\u518d\u8fdb\u5165\u5386\u53f2\u76ee\u5f55\u957f\u671f\u7ba1\u7406\u3002',
    primaryHint: '\u6b63\u5728\u8fd0\u884c\u7684\u751f\u6210\u4f1a\u5728\u8fd9\u91cc\u6301\u7eed\u5237\u65b0',
    fallbackHint: '\u5386\u53f2\u76ee\u5f55\uff1a\u7ba1\u7406\u5df2\u5b8c\u6210\u56fe\u50cf',
    allState: '\u5168\u90e8\u4efb\u52a1',
    activeState: '\u6b63\u5728\u5904\u7406\u7684\u4efb\u52a1',
    completedState: '\u5df2\u4ea4\u4ed8\u7ed3\u679c',
    failedState: '\u9700\u8981\u91cd\u8bd5\u7684\u5931\u8d25\u4efb\u52a1',
    emptyTitle: '\u8fd8\u6ca1\u6709\u4efb\u52a1',
    emptyDesc:
      '\u4ece\u521b\u4f5c\u9875\u63d0\u4ea4\u7b2c\u4e00\u4e2a\u751f\u6210\u540e\uff0c\u8fdb\u884c\u4e2d\u4efb\u52a1\u548c\u5b8c\u6210\u7ed3\u679c\u90fd\u4f1a\u4ece\u8fd9\u91cc\u8fdb\u5165\u3002',
    activeEmptyTitle: '\u6682\u65e0\u6b63\u5728\u5904\u7406\u7684\u4efb\u52a1',
    activeEmptyDesc:
      '\u6392\u961f\u548c\u6267\u884c\u4e2d\u7684\u4efb\u52a1\u4f1a\u5148\u5728\u9876\u90e8\u4efb\u52a1\u56fe\u6807\u4e2d\u63d0\u9192\uff0c\u8fd9\u91cc\u4ec5\u4f5c\u5237\u65b0\u540e\u5907\u7528\u67e5\u770b\u3002',
    completedEmptyTitle: '\u6682\u65e0\u5df2\u5b8c\u6210\u8bb0\u5f55',
    completedEmptyDesc:
      '\u751f\u6210\u5b8c\u6210\u540e\u53ef\u5728\u6b64\u590d\u6838\uff0c\u957f\u671f\u53ef\u8ffd\u6eaf\u7684\u6210\u679c\u4ee5\u5386\u53f2\u4e3a\u51c6\u3002',
    failedEmptyTitle: '\u6ca1\u6709\u5931\u8d25\u4efb\u52a1',
    failedEmptyDesc:
      '\u82e5\u4efb\u52a1\u5931\u8d25\uff0c\u9519\u8bef\u539f\u56e0\u4f1a\u5728\u6b64\u4fdd\u7559\uff0c\u65b9\u4fbf\u56de\u5230\u521b\u4f5c\u9875\u8c03\u6574\u540e\u91cd\u8bd5\u3002',
    clearFilter: '\u6e05\u9664\u7b5b\u9009',
    createAction: '\u53bb\u521b\u4f5c',
    historyAction: '\u5386\u53f2\u76ee\u5f55',
    cardActive:
      '\u6b63\u5728\u6392\u961f\u6216\u6267\u884c\u3002\u66f4\u5373\u65f6\u7684\u63d0\u9192\u4ecd\u4ee5\u9876\u90e8\u4efb\u52a1\u56fe\u6807\u4e3a\u51c6\u3002',
    cardCompleted:
      '\u5df2\u5b8c\u6210\u3002\u53ef\u5728\u5386\u53f2\u76ee\u5f55\u4e2d\u7ee7\u7eed\u9884\u89c8\u3001\u91cd\u65b0\u751f\u6210\u6216\u5220\u9664\u8bb0\u5f55\u3002',
    cardFailed:
      '\u6ca1\u6709\u751f\u6210\u53ef\u4ea4\u4ed8\u8f93\u51fa\u3002\u6839\u636e\u9519\u8bef\u4fee\u6539\u63d0\u793a\u8bcd\u6216\u7d20\u6750\u540e\u91cd\u8bd5\u3002',
    generatedMode: '\u751f\u6210',
    editedMode: '\u6539\u56fe',
    taskMetaLabel: '\u4efb\u52a1\u53c2\u6570',
    noPreview: '\u6682\u65e0\u9884\u89c8',
  },
  'en-US': {
    eyebrow: 'Task Center',
    title: 'Tasks and History',
    subtitle:
      'Generation requests are tracked as tasks first. Finished images then move into the History directory for long-term management.',
    primaryHint: 'Running generations keep refreshing here',
    fallbackHint: 'History directory: manage completed images',
    allState: 'All tasks',
    activeState: 'Tasks still processing',
    completedState: 'Delivered outputs',
    failedState: 'Failed tasks to revisit',
    emptyTitle: 'No tasks yet',
    emptyDesc:
      'Submit your first generation from Create, then active tasks and delivered outputs will both flow through this center.',
    activeEmptyTitle: 'No tasks are processing',
    activeEmptyDesc:
      'Queued and running work is announced from the top task icon first. This page is only the refresh-safe fallback view.',
    completedEmptyTitle: 'No completed records here',
    completedEmptyDesc:
      'Completed output can be checked here briefly, but History is the durable archive for generated images.',
    failedEmptyTitle: 'No failed tasks',
    failedEmptyDesc:
      'If a task fails, the error remains here so you can adjust the prompt or source material before trying again.',
    clearFilter: 'Clear filter',
    createAction: 'Create',
    historyAction: 'History Directory',
    cardActive:
      'Queued or running. For the most immediate progress signal, use the top task icon drawer.',
    cardCompleted:
      'Completed. Continue previewing, regenerating, or deleting the record from the History directory.',
    cardFailed:
      'No deliverable output was created. Review the error, adjust the input, then retry from Create.',
    generatedMode: 'Generated',
    editedMode: 'Edited',
    taskMetaLabel: 'Task parameters',
    noPreview: 'No preview yet',
  },
} as const;

function statusLabel(status: TaskStatus, t: ReturnType<typeof useSite>['t']) {
  if (status === 'queued') return t('tasks_status_queued');
  if (status === 'running') return t('tasks_status_running');
  if (status === 'succeeded') return t('tasks_status_succeeded');
  return t('tasks_status_failed');
}

function statusIcon(status: TaskStatus) {
  if (status === 'queued') return <Clock3 size={14} className="text-[#8a8680]" />;
  if (status === 'running') return <Loader2 size={14} className="animate-spin text-[#E3FF74]" />;
  if (status === 'succeeded') return <CheckCircle2 size={14} className="text-[#4ade80]" />;
  return <XCircle size={14} className="text-[#ff6b6b]" />;
}

export default function Tasks() {
  const { locale, t } = useSite();
  const { tasks, activeCount } = useTasks();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [previewItem, setPreviewItem] = useState<{
    imageUrl?: string | null;
    images?: { id?: string; url: string; prompt?: string | null; title?: string | null }[];
    initialIndex?: number;
    prompt: string;
  } | null>(null);
  const copy = fallbackCopy[locale];

  const visibleTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'active') return tasks.filter((task) => task.status === 'queued' || task.status === 'running');
    return tasks.filter((task) => task.status === filter);
  }, [filter, tasks]);

  const counts = useMemo(() => {
    const active = tasks.filter((task) => task.status === 'queued' || task.status === 'running').length;
    return {
      all: tasks.length,
      active,
      succeeded: tasks.filter((task) => task.status === 'succeeded').length,
      failed: tasks.filter((task) => task.status === 'failed').length,
    } satisfies Record<FilterKey, number>;
  }, [tasks]);

  const hasFilter = filter !== 'all';
  const stateLabel =
    filter === 'active'
      ? copy.activeState
      : filter === 'succeeded'
        ? copy.completedState
        : filter === 'failed'
          ? copy.failedState
          : copy.allState;
  const emptyTitle =
    filter === 'active'
      ? copy.activeEmptyTitle
      : filter === 'succeeded'
        ? copy.completedEmptyTitle
        : filter === 'failed'
          ? copy.failedEmptyTitle
          : copy.emptyTitle;
  const emptyDesc =
    filter === 'active'
      ? copy.activeEmptyDesc
      : filter === 'succeeded'
        ? copy.completedEmptyDesc
        : filter === 'failed'
          ? copy.failedEmptyDesc
          : copy.emptyDesc;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 text-[#f0ede8] sm:px-6 sm:pt-8 lg:pb-8">
      <div className="border-b border-white/[0.07] pb-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-[rgba(227,255,116,0.18)] bg-[rgba(227,255,116,0.06)] px-3 py-1 text-xs font-semibold text-[#E3FF74]">
              <ListFilter size={13} className="shrink-0" />
              <span className="truncate">{copy.eyebrow}</span>
            </div>
            <h1 className="font-display text-2xl font-bold leading-tight text-[#f0ede8] sm:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#b9b2a8]">{copy.subtitle}</p>
          </div>
          <div className="grid gap-2 text-xs text-[#8a8680] sm:min-w-[260px]">
            <div className="flex min-h-11 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
              <Sparkles size={14} className="shrink-0 text-[#E3FF74]" />
              <span className="min-w-0 truncate">{copy.primaryHint}</span>
            </div>
            <Link
              to="/history"
              className="flex min-h-11 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[#b9b2a8] transition-colors hover:border-[#E3FF74]/30 hover:bg-[#E3FF74]/10 hover:text-[#E3FF74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
            >
              <HistoryIcon size={14} className="shrink-0" />
              <span className="min-w-0 truncate">{copy.fallbackHint}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-[#f0ede8]">{stateLabel}</div>
          <div className="mt-1 text-xs text-[#8a8680]">
            {activeCount > 0 ? t('tasks_active', { value: activeCount }) : t('tasks_idle')}
          </div>
        </div>
        <SegmentedControl<FilterKey>
          label={copy.eyebrow}
          className="w-full lg:w-[520px]"
          value={filter}
          onChange={setFilter}
          options={([
            ['all', t('tasks_filter_all')],
            ['active', t('tasks_filter_active')],
            ['succeeded', t('tasks_filter_succeeded')],
            ['failed', t('tasks_filter_failed')],
          ] as const).map(([key, label]) => ({
            value: key,
            label,
            description: (
              <span className="inline-flex rounded-md bg-white/[0.05] px-1.5 py-0.5 tabular-nums text-[#b9b2a8]">
                {counts[key]}
              </span>
            ),
          }))}
        />
      </div>

      {visibleTasks.length === 0 ? (
        <div className="mt-6 flex min-h-[200px] items-center justify-center rounded-2xl border border-outline-variant/70 bg-surface/70 px-5 py-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:min-h-[300px] sm:px-6 sm:py-10">
          <div className="mx-auto flex max-w-sm flex-col items-center">
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border sm:h-14 sm:w-14 ${
                filter === 'failed'
                  ? 'border-error/25 bg-error/10 text-error'
                  : hasFilter
                    ? 'border-secondary/25 bg-secondary/10 text-secondary'
                    : 'border-primary/25 bg-primary/10 text-primary'
              }`}
            >
              {filter === 'failed' ? (
                <AlertTriangle size={22} />
              ) : hasFilter ? (
                <ListFilter size={22} />
              ) : (
                <Sparkles size={22} />
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-on-surface">{emptyTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{emptyDesc}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3 sm:mt-6">
              {hasFilter ? (
                <Button
                  variant="ghost"
                  iconStart={<ListFilter size={16} />}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
                  type="button"
                  onClick={() => setFilter('all')}
                >
                  {copy.clearFilter}
                </Button>
              ) : null}
              {filter === 'succeeded' ? (
                <LinkButton
                  variant="ghost"
                  iconStart={<HistoryIcon size={16} />}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
                  to="/history"
                >
                  {copy.historyAction}
                </LinkButton>
              ) : null}
              <LinkButton variant="primary" className="min-h-11" to="/create" iconStart={<Sparkles size={16} />}>
                {copy.createAction}
              </LinkButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {visibleTasks.map((task) => {
            const previewImages = task.items
              .filter((item) => item.image_url)
              .sort((a, b) => (a.batch_index || 0) - (b.batch_index || 0))
              .map((item) => ({ id: item.id, url: item.image_url || '', prompt: item.prompt }));
            const previewImage = previewImages[0]?.url || null;
            const isCompleted = task.status === 'succeeded';
            const isFailed = task.status === 'failed';

            return (
              <article key={task.id} className="rounded-xl border border-white/[0.07] bg-[#1a1917] p-3 sm:p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {statusIcon(task.status)}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#f0ede8]">
                        {task.mode === 'edit' ? copy.editedMode : copy.generatedMode}
                      </div>
                      <div className="text-xs text-[#8a8680]">{formatDate(task.created_at)}</div>
                    </div>
                  </div>
                  <div
                    className={`w-fit rounded-lg px-2.5 py-1 text-xs font-medium ${
                      isFailed
                        ? 'bg-error/10 text-error'
                        : isCompleted
                          ? 'bg-[#4ade80]/10 text-[#4ade80]'
                          : 'bg-white/[0.03] text-[#8a8680]'
                    }`}
                  >
                    {statusLabel(task.status, t)}
                  </div>
                </div>

                <div className="flex min-w-0 gap-3">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.03]">
                    {previewImages.length > 1 ? (
                      <div className="grid h-full w-full grid-cols-2 gap-0.5 p-0.5">
                        {previewImages.slice(0, 4).map((image, imageIndex) => (
                          <Pressable
                            key={`${image.id || image.url}-${imageIndex}`}
                            className="min-h-0 min-w-0 cursor-zoom-in overflow-hidden rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/50"
                            type="button"
                            title={`${t('history_preview')} ${imageIndex + 1}`}
                            aria-label={`${t('history_preview')} ${imageIndex + 1}`}
                            onClick={() =>
                              setPreviewItem({
                                images: previewImages.map((galleryImage, galleryIndex) => ({
                                  id: galleryImage.id,
                                  url: galleryImage.url,
                                  prompt: galleryImage.prompt,
                                  title: `${task.id}-${galleryIndex + 1}`,
                                })),
                                initialIndex: imageIndex,
                                prompt: image.prompt,
                              })
                            }
                          >
                            <RetryImage alt={task.prompt} className="h-full w-full object-cover" src={image.url} />
                          </Pressable>
                        ))}
                      </div>
                    ) : previewImage ? (
                      <Pressable
                        className="h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/50"
                        type="button"
                        title={t('history_preview')}
                        aria-label={t('history_preview')}
                        onClick={() => setPreviewItem({ imageUrl: previewImage, prompt: task.prompt })}
                      >
                        <RetryImage alt={task.prompt} className="h-full w-full object-contain" src={previewImage} />
                      </Pressable>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#8a8680]">
                        <ImageIcon size={18} />
                        <span className="text-xs">{copy.noPreview}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-3 break-words text-sm leading-6 text-[#f0ede8]">{task.prompt}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#8a8680]" aria-label={copy.taskMetaLabel}>
                      <span>{task.model}</span>
                      <span>{task.size}</span>
                      {task.aspect_ratio ? <span>{task.aspect_ratio}</span> : null}
                      <span>{task.quality}</span>
                      {previewImages.length > 1 ? <span>x{previewImages.length}</span> : null}
                    </div>
                    <div
                      className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-5 ${
                        isFailed
                          ? 'border-error/20 bg-error/10 text-error'
                          : isCompleted
                            ? 'border-[#4ade80]/15 bg-[#4ade80]/10 text-[#c6f6d5]'
                            : 'border-white/[0.07] bg-white/[0.03] text-[#b9b2a8]'
                      }`}
                    >
                      {isFailed ? copy.cardFailed : isCompleted ? copy.cardCompleted : copy.cardActive}
                    </div>
                    {task.error ? <div className="mt-2 break-words text-sm leading-6 text-[#ff6b6b]">{task.error}</div> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {isCompleted ? (
                        <Link
                          className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[#b9b2a8] transition-colors hover:bg-white/[0.04] hover:text-[#f0ede8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
                          to="/history"
                        >
                          <HistoryIcon size={12} />
                          {copy.historyAction}
                        </Link>
                      ) : null}
                      {previewImages.length > 1 ? (
                        <a
                          className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs font-medium text-[#b9b2a8] transition-colors hover:bg-white/[0.04] hover:text-[#f0ede8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
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
              </article>
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
