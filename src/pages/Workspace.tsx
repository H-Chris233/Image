import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Archive,
  CheckCircle2,
  Clock3,
  Download,
  Globe2,
  ImageIcon,
  Loader2,
  RotateCcw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  formatDate,
  generateImage,
  getImageTask,
  HistoryItem,
  ImageTask,
  publishHistory,
  taskDownloadUrl,
  unpublishHistory,
} from '../api';
import ImagePreviewModal from '../components/ImagePreviewModal';
import RetryImage from '../components/RetryImage';
import { Button, Pressable } from '../components/design-system';
import { useNotifier } from '../notifications';
import { useSite } from '../site';
import { useTasks } from '../tasks';

const POLL_INTERVAL = 1500;
const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';

const WORKSPACE_COPY = {
  'zh-CN': {
    back: '返回',
    loading: '连接工作台',
    loadingHint: '同步任务状态',
    missingEyebrow: '工作台不可用',
    missingTitle: '未找到任务',
    missingDescription: '这个链接没有对应的生成任务，可能已过期或被删除。',
    missingTerminal: '返回上一页，或开始新的创作任务。',
    createAction: '新建创作',
    goBackAction: '返回',
    queuedEyebrow: '任务进度',
    queuedTitle: '任务排队中',
    queuedSubtitle: '工作台会自动刷新。',
    runningTitle: '正在生成',
    runningSubtitle: '完成后结果会出现在这里。',
    accepted: '已接收',
    queued: '排队中',
    running: '生成中',
    succeeded: '已完成',
    failed: '失败',
    promptContext: '提示词',
    promptFallback: '没有可用提示词。',
    taskParameters: '任务参数',
    expectedResult: '预期结果',
    expectedResultHint: '生成完成后会显示结果图。',
    outputSlot: (index: number) => `输出 ${index}`,
    status: '状态',
    mode: '类型',
    model: '模型',
    size: '尺寸',
    ratio: '比例',
    quality: '质量',
    count: '张数',
    taskId: '任务 ID',
    created: '创建',
    started: '开始',
    completed: '完成',
    updated: '更新',
    generatedMode: '生成',
    editedMode: '改图',
    countUnknown: '同步中',
    imageCount: (count: number) => `${count} 张`,
    resultEyebrow: '任务工作台',
    resultTitle: '结果已生成',
    resultSubtitle: '结果和操作已归档到当前任务。',
    previewAll: '预览全部',
    downloadAll: '打包下载',
    reusePrompt: '复用提示词',
    regenerate: '重新生成',
    retryPrompt: '重试',
    publishing: '发布中',
    published: '已发布',
    publishCase: '发布案例',
    unpublishCase: '取消发布',
    albumSummary: '相册',
    albumTitleFallback: '系列集合',
    albumCurrentAsset: (index: number, total: number) => `当前 ${index} / ${total}`,
    albumStyleGuide: '风格',
    albumPlan: '计划',
    collectionActions: '批量',
    selected: '已选',
    selectedActions: '操作',
    selectedAsset: '已选',
    selectedAssetNumber: (index: number, total: number) => `第 ${index} / ${total} 张`,
    selectedPrompt: '提示词',
    selectedStatus: '状态',
    selectedPublishStatus: '发布',
    previewSelected: '预览选中',
    reuseSelectedPrompt: '复用提示词',
    createVariant: '生成变体',
    publishSelected: '发布选中',
    unpublishSelected: '取消发布',
    publishingSelected: '更新中',
    unpublished: '未发布',
    selectAsset: (index: number) => `选择第 ${index} 张`,
    currentTask: '当前任务',
    resultAssets: '结果',
    noPreview: '暂无预览',
    failedTitle: '生成失败',
    failedSubtitle: '失败原因保留在当前工作台。',
    failureReason: '失败原因',
    unknownError: '未知错误。请稍后重试。',
    nextSteps: '下一步',
    revisePrompt: '调整提示词',
    retrySameSettings: '按当前参数重试',
    failedStepOne: '检查提示词是否冲突或过长。',
    failedStepTwo: '保留尺寸、比例和质量后重试。',
    failedStepThree: '如果是额度或服务限制，请稍后再试。',
    emptyTitle: '没有可预览结果',
    emptyDescription: '可以复用提示词重新提交。',
    fetchError: '加载任务失败',
  },
  'en-US': {
    back: 'Back',
    loading: 'Connecting workspace',
    loadingHint: 'Syncing task status and context.',
    missingEyebrow: 'Workspace unavailable',
    missingTitle: 'Task not found',
    missingDescription:
      'This workspace link does not point to an active generation task. The task may have expired, been removed, or the URL may be incomplete.',
    missingTerminal: 'Nothing else will happen on this route until a valid task id is supplied.',
    createAction: 'Start a new creation',
    goBackAction: 'Go back',
    queuedEyebrow: 'Task progress',
    queuedTitle: 'Task is queued',
    queuedSubtitle: 'This workbench keeps refreshing while preserving the input, parameters, and expected result.',
    runningTitle: 'Generating images',
    runningSubtitle: 'The image workflow is running. Finished assets will appear here on this task workbench.',
    accepted: 'Accepted',
    queued: 'Queued',
    running: 'Running',
    succeeded: 'Completed',
    failed: 'Failed',
    promptContext: 'Prompt / Context',
    promptFallback: 'This task did not return a readable prompt.',
    taskParameters: 'Task parameters',
    expectedResult: 'Expected result',
    expectedResultHint: 'The result area is reserved. Generated assets replace these placeholders when complete.',
    outputSlot: (index: number) => `Output ${index}`,
    status: 'Status',
    mode: 'Mode',
    model: 'Model',
    size: 'Size',
    ratio: 'Ratio',
    quality: 'Quality',
    count: 'Count',
    taskId: 'Task ID',
    created: 'Created',
    started: 'Started',
    completed: 'Completed',
    updated: 'Updated',
    generatedMode: 'Generate',
    editedMode: 'Edit',
    countUnknown: 'Syncing',
    imageCount: (count: number) => `${count} image${count === 1 ? '' : 's'}`,
    resultEyebrow: 'Task workbench',
    resultTitle: 'Generated assets are ready',
    resultSubtitle: 'Assets, context, and next actions stay attached to the current task.',
    previewAll: 'Preview all',
    downloadAll: 'Download ZIP',
    reusePrompt: 'Reuse prompt',
    regenerate: 'Regenerate',
    retryPrompt: 'Retry prompt',
    publishing: 'Publishing',
    published: 'Published',
    publishCase: 'Publish case',
    unpublishCase: 'Unpublish',
    albumSummary: 'Album',
    albumTitleFallback: 'Series collection',
    albumCurrentAsset: (index: number, total: number) => `Current ${index} of ${total}`,
    albumStyleGuide: 'Style',
    albumPlan: 'Plan',
    collectionActions: 'Batch',
    selected: 'Selected',
    selectedActions: 'Actions',
    selectedAsset: 'Selected',
    selectedAssetNumber: (index: number, total: number) => `Asset ${index} of ${total}`,
    selectedPrompt: 'Prompt',
    selectedStatus: 'Asset status',
    selectedPublishStatus: 'Publish status',
    previewSelected: 'Preview selected',
    reuseSelectedPrompt: 'Reuse selected prompt',
    createVariant: 'Create variant',
    publishSelected: 'Publish selected',
    unpublishSelected: 'Unpublish selected',
    publishingSelected: 'Updating selected',
    unpublished: 'Not published',
    selectAsset: (index: number) => `Select asset ${index}`,
    currentTask: 'Current task',
    resultAssets: 'Result assets',
    noPreview: 'No preview',
    failedTitle: 'Generation failed',
    failedSubtitle: 'This task did not produce deliverable images. The reason and next step stay in this workbench.',
    failureReason: 'Failure reason',
    unknownError: 'Unknown error. Try again later, or revise the prompt before resubmitting.',
    nextSteps: 'Next steps',
    revisePrompt: 'Revise prompt in Create',
    retrySameSettings: 'Retry with current settings',
    failedStepOne: 'Check whether the prompt has conflicting, overly long, or unclear requirements.',
    failedStepTwo: 'Keep the size, ratio, and quality parameters, then submit another version.',
    failedStepThree: 'If the error mentions credit or service limits, wait until that state recovers before submitting.',
    emptyTitle: 'Task completed, but no previewable assets returned',
    emptyDescription: 'The backend returned a completed task without displayable images. You can still reuse the prompt.',
    fetchError: 'Failed to load task',
  },
} as const;

type WorkspaceCopy = typeof WORKSPACE_COPY['en-US'];

export default function Workspace() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { locale } = useSite();
  const { addTask } = useTasks();
  const { notifyError } = useNotifier();
  const copy = WORKSPACE_COPY[locale];
  const [task, setTask] = useState<ImageTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchingTask, setFetchingTask] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [publishingImageId, setPublishingImageId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<{ id: string; url: string; prompt: string; title?: string }[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    setTask(null);
    setError(null);

    if (!taskId?.trim()) {
      setFetchingTask(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const nextTask = await getImageTask(taskId!);
        if (cancelled) return;
        setTask(nextTask);
        setError(null);
        setFetchingTask(false);
        if (nextTask.status === 'queued' || nextTask.status === 'running') {
          timer = setTimeout(poll, POLL_INTERVAL);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : copy.fetchError);
          setFetchingTask(false);
        }
      }
    }

    setFetchingTask(true);
    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [copy.fetchError, taskId]);

  const images: HistoryItem[] = task?.items ?? [];
  const previewableImages = useMemo(() => sortImagesByBatch(images.filter((img) => Boolean(img.image_url))), [images]);
  const publishableImages = useMemo(
    () => previewableImages.filter((img) => img.status === 'succeeded' && Boolean(img.image_url)),
    [previewableImages],
  );
  const publishedCount = publishableImages.filter((img) => img.published).length;
  const primaryPrompt = task?.prompt || images[0]?.prompt || '';
  const selectedImage = previewableImages.find((img) => img.id === selectedImageId) ?? previewableImages[0] ?? null;
  const selectedImageIndex = selectedImage ? previewableImages.findIndex((img) => img.id === selectedImage.id) : -1;
  const selectedPrompt = selectedImage?.prompt || task?.prompt || '';
  const expectedCount = task ? getExpectedCount(task) : null;
  const isMissingTask = !taskId?.trim() || (!fetchingTask && !task && Boolean(error));
  const isConnecting = !isMissingTask && fetchingTask && !task;
  const isActive = !isMissingTask && (task?.status === 'queued' || task?.status === 'running');
  const isFailed = task?.status === 'failed';
  const hasResults = !isMissingTask && task?.status === 'succeeded' && previewableImages.length > 0;
  const downloadHref = taskId ? taskDownloadUrl(taskId) : '';

  useEffect(() => {
    if (previewableImages.length === 0) {
      setSelectedImageId(null);
      return;
    }
    if (!selectedImageId || !previewableImages.some((img) => img.id === selectedImageId)) {
      setSelectedImageId(previewableImages[0].id);
    }
  }, [previewableImages, selectedImageId]);

  function openPreview(imgs: HistoryItem[], index: number) {
    const gallery = imgs
      .filter((img) => img.image_url)
      .map((img, imgIndex) => ({
        id: img.id,
        url: img.image_url ?? '',
        prompt: img.prompt ?? task?.prompt ?? '',
        title: `${copy.resultAssets} ${imgIndex + 1}`,
      }));
    if (gallery.length === 0) {
      return;
    }
    setPreviewImages(gallery);
    setPreviewIndex(Math.max(0, Math.min(index, gallery.length - 1)));
  }

  function handleReusePrompt(prompt = primaryPrompt) {
    if (prompt) {
      window.sessionStorage.setItem(PROMPT_TRANSFER_KEY, prompt);
    }
    navigate('/create');
  }

  async function handleRegenerate(prompt = primaryPrompt, count?: number) {
    if (!task || !prompt) {
      return;
    }
    setRegenerating(true);
    try {
      const fallbackCount = publishableImages.length > 0 ? publishableImages.length : images.length || 1;
      const submittedTask = await generateImage({
        prompt,
        size: task.size,
        aspect_ratio: task.aspect_ratio,
        quality: task.quality,
        n: normalizeImageCount(count ?? expectedCount ?? fallbackCount),
      });
      addTask(submittedTask);
      navigate(`/workspace/${submittedTask.id}`);
    } catch (err) {
      notifyError(err);
    } finally {
      setRegenerating(false);
    }
  }

  async function handleToggleSelectedPublish(image: HistoryItem | null) {
    if (!image || image.status !== 'succeeded' || !image.image_url) {
      return;
    }
    setPublishingImageId(image.id);
    try {
      const result = image.published ? await unpublishHistory(image.id) : await publishHistory(image.id);
      setTask((current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((item) => (item.id === result.item.id ? result.item : item)),
        };
      });
    } catch (err) {
      notifyError(err);
    } finally {
      setPublishingImageId(null);
    }
  }

  return (
    <div className="min-h-screen text-[#f0ede8]">
      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <Button
          variant="plain"
          iconStart={<ArrowLeft size={15} />}
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-on-surface-variant transition-colors hover:bg-white/[0.04] hover:text-[#E3FF74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
          aria-label={copy.back}
          title={copy.back}
        >
          <span>{copy.back}</span>
        </Button>

        {isMissingTask ? (
          <MissingTaskState copy={copy} error={error} onBack={() => navigate(-1)} onCreate={() => navigate('/create')} />
        ) : null}

        {!isMissingTask && error ? <InlineError message={error} /> : null}

        {isConnecting ? <ConnectingState copy={copy} /> : null}

        {task && isActive ? <TaskProgressPanel copy={copy} task={task} expectedCount={expectedCount} /> : null}

        {task && isFailed ? (
          <FailedTaskPanel
            copy={copy}
            expectedCount={expectedCount}
            onRegenerate={() => handleRegenerate().catch(() => undefined)}
            onReusePrompt={handleReusePrompt}
            regenerating={regenerating}
            task={task}
          />
        ) : null}

        {task && hasResults ? (
          <SucceededWorkbench
            copy={copy}
            downloadHref={downloadHref}
            expectedCount={expectedCount}
            images={previewableImages}
            onPreview={openPreview}
            onPreviewAll={() => openPreview(previewableImages, 0)}
            onRegenerateSelected={() => handleRegenerate(selectedPrompt, 1).catch(() => undefined)}
            onReuseSelectedPrompt={() => handleReusePrompt(selectedPrompt)}
            onSelectImage={setSelectedImageId}
            onToggleSelectedPublish={() => handleToggleSelectedPublish(selectedImage).catch(() => undefined)}
            publishedCount={publishedCount}
            publishableCount={publishableImages.length}
            publishingImageId={publishingImageId}
            regenerating={regenerating}
            selectedImage={selectedImage}
            selectedImageIndex={selectedImageIndex}
            task={task}
          />
        ) : null}

        {task && task.status === 'succeeded' && !hasResults ? (
          <EmptyResultState
            copy={copy}
            expectedCount={expectedCount}
            onRegenerate={() => handleRegenerate().catch(() => undefined)}
            onReusePrompt={handleReusePrompt}
            regenerating={regenerating}
            task={task}
          />
        ) : null}
      </main>

      {previewImages ? (
        <ImagePreviewModal
          images={previewImages}
          initialIndex={previewIndex}
          onClose={() => setPreviewImages(null)}
        />
      ) : null}
    </div>
  );
}

function ConnectingState({ copy }: { copy: WorkspaceCopy }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1a1917] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 shrink-0 animate-spin text-[#E3FF74]" size={20} />
        <div>
          <h1 className="text-lg font-semibold text-[#f0ede8]">{copy.loading}</h1>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">{copy.loadingHint}</p>
        </div>
      </div>
    </section>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="mb-5 flex items-start gap-2 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
      <AlertCircle className="mt-0.5 shrink-0" size={16} />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{message}</span>
    </div>
  );
}

function TaskProgressPanel({
  copy,
  expectedCount,
  task,
}: {
  copy: WorkspaceCopy;
  expectedCount: number | null;
  task: ImageTask;
}) {
  const isRunning = task.status === 'running';
  const skeletonCount = Math.max(1, Math.min(expectedCount ?? 4, 9));

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151412] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-[rgba(227,255,116,0.18)] bg-[rgba(227,255,116,0.06)] px-3 py-1 text-xs font-semibold text-[#E3FF74]">
              {isRunning ? <Loader2 className="shrink-0 animate-spin" size={13} /> : <Clock3 className="shrink-0" size={13} />}
              <span className="truncate">{copy.queuedEyebrow}</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-[#f0ede8] sm:text-3xl">
              {isRunning ? copy.runningTitle : copy.queuedTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#b9b2a8]">
              {isRunning ? copy.runningSubtitle : copy.queuedSubtitle}
            </p>
          </div>
          <StatusBadge copy={copy} status={task.status} />
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 p-5 sm:p-6">
          <ProgressRail copy={copy} status={task.status} />

          <div className="mt-6">
            <SectionLabel icon={<Sparkles size={14} />} label={copy.promptContext} />
            <p className="mt-3 break-words rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#f0ede8] [overflow-wrap:anywhere]">
              {task.prompt || copy.promptFallback}
            </p>
          </div>

          <div className="mt-6">
            <SectionLabel icon={<ImageIcon size={14} />} label={copy.expectedResult} />
            <p className="mt-2 text-sm leading-6 text-[#8a8680]">{copy.expectedResultHint}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: skeletonCount }).map((_, index) => (
                <div
                  key={index}
                  className="flex aspect-square min-h-[132px] items-center justify-center rounded-xl border border-white/[0.06] bg-[linear-gradient(110deg,rgba(240,237,232,0.035),rgba(227,255,116,0.11),rgba(240,237,232,0.035))] bg-[length:220%_100%] animate-skeleton text-xs font-medium text-white/35"
                >
                  {copy.outputSlot(index + 1)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="border-t border-white/[0.07] bg-[#1a1917] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <TaskMetaGrid copy={copy} expectedCount={expectedCount} task={task} />
        </aside>
      </div>
    </section>
  );
}

function SucceededWorkbench({
  copy,
  downloadHref,
  expectedCount,
  images,
  onPreview,
  onPreviewAll,
  onRegenerateSelected,
  onReuseSelectedPrompt,
  onSelectImage,
  onToggleSelectedPublish,
  publishedCount,
  publishableCount,
  publishingImageId,
  regenerating,
  selectedImage,
  selectedImageIndex,
  task,
}: {
  copy: WorkspaceCopy;
  downloadHref: string;
  expectedCount: number | null;
  images: HistoryItem[];
  onPreview: (images: HistoryItem[], index: number) => void;
  onPreviewAll: () => void;
  onRegenerateSelected: () => void;
  onReuseSelectedPrompt: () => void;
  onSelectImage: (id: string) => void;
  onToggleSelectedPublish: () => void;
  publishedCount: number;
  publishableCount: number;
  publishingImageId: string | null;
  regenerating: boolean;
  selectedImage: HistoryItem | null;
  selectedImageIndex: number;
  task: ImageTask;
}) {
  const selectedPrompt = selectedImage?.prompt || task.prompt || '';
  const selectedAssetLabel =
    selectedImage && selectedImageIndex >= 0
      ? copy.selectedAssetNumber(selectedImageIndex + 1, images.length)
      : copy.selectedAsset;
  const selectedIsPublishable = selectedImage?.status === 'succeeded' && Boolean(selectedImage.image_url);
  const selectedIsPublishing = selectedImage ? publishingImageId === selectedImage.id : false;
  const isAlbum = images.length > 1;
  const seriesPlan = isAlbum ? getSeriesPlan(task, images) : null;
  const selectedPlanItem = selectedImageIndex >= 0
    ? seriesPlan?.items.find((item) => item.index === selectedImageIndex + 1) ?? seriesPlan?.items[selectedImageIndex]
    : undefined;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151412] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-[#4ade80]/20 bg-[#4ade80]/10 px-3 py-1 text-xs font-semibold text-[#4ade80]">
              <CheckCircle2 className="shrink-0" size={13} />
              <span className="truncate">{copy.resultEyebrow}</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-[#f0ede8] sm:text-3xl">{copy.resultTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8680]">
            <span>{copy.imageCount(images.length)}</span>
            {publishedCount > 0 ? <span className="text-tertiary">{copy.published} {publishedCount}/{publishableCount}</span> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 p-4 sm:p-6">
          {isAlbum ? (
            <div className="mb-4 rounded-xl border border-[#E3FF74]/18 bg-[#E3FF74]/[0.04] p-3 sm:mb-5 sm:p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <SectionLabel icon={<Archive size={14} />} label={copy.albumSummary} />
                  <h2 className="mt-2 break-words text-xl font-bold leading-tight text-[#f0ede8] [overflow-wrap:anywhere]">
                    {seriesPlan?.title || copy.albumTitleFallback}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#8a8680]">
                    <span className="rounded-full border border-white/[0.08] bg-black/10 px-2.5 py-1">
                      {copy.imageCount(images.length)}
                    </span>
                    <span className="rounded-full border border-[#E3FF74]/20 bg-[#E3FF74]/10 px-2.5 py-1 text-[#E3FF74]">
                      {selectedImageIndex >= 0 ? copy.albumCurrentAsset(selectedImageIndex + 1, images.length) : copy.selectedAsset}
                    </span>
                  </div>
                </div>

                <div className="w-full shrink-0 xl:w-[260px]">
                  <SectionLabel icon={<Download size={14} />} label={copy.collectionActions} />
                  <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-1">
                    <Button
                      variant="ghost"
                      iconStart={<ImageIcon size={15} />}
                      type="button"
                      onClick={onPreviewAll}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2 text-center text-sm font-semibold text-white transition-colors hover:border-[#E3FF74]/45 hover:text-[#E3FF74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 sm:gap-2 sm:px-3"
                    >
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.previewAll}</span>
                    </Button>
                    <a
                      href={downloadHref}
                      download
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2 text-center text-sm font-semibold text-white transition-colors hover:border-[#E3FF74]/45 hover:text-[#E3FF74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 sm:gap-2 sm:px-3"
                    >
                      <Download size={15} />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.downloadAll}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <SectionLabel icon={<Archive size={14} />} label={copy.resultAssets} />
          <div className={`mt-4 grid gap-3 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {images.map((img, index) => {
              const isSelected = selectedImage?.id === img.id;
              return (
                <Pressable
                  key={img.id}
                  type="button"
                  className={`group relative min-h-[160px] overflow-hidden rounded-xl border bg-white/[0.03] p-0 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[#E3FF74]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#151412] ${
                    isSelected
                      ? 'border-[#E3FF74]/75 shadow-[0_0_0_1px_rgba(227,255,116,0.35),0_16px_40px_rgba(0,0,0,0.28)]'
                      : 'border-white/[0.07]'
                  } ${index === 0 && images.length > 1 ? 'sm:col-span-2 sm:row-span-2' : ''}`}
                  onClick={() => onSelectImage(img.id)}
                  aria-label={copy.selectAsset(index + 1)}
                  aria-pressed={isSelected}
                  title={copy.selectAsset(index + 1)}
                >
                  <RetryImage
                    src={img.image_url ?? ''}
                    alt={img.prompt ?? task.prompt}
                    className="h-full min-h-[160px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                  <div className={`absolute inset-x-0 top-0 h-1 bg-[#E3FF74] transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                  <div className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${
                    isSelected ? 'bg-[#E3FF74] text-[#151412]' : 'bg-black/55 text-white'
                  }`}>
                    {isSelected ? copy.selected : `${index + 1}/${images.length}`}
                  </div>
                  <div className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 transition-opacity ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    <span className="min-w-0 truncate rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                      {copy.selectAsset(index + 1)}
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-white/75">{index + 1}/{images.length}</span>
                  </div>
                </Pressable>
              );
            })}
          </div>

          {isAlbum && (seriesPlan?.items.length || seriesPlan?.styleGuide) ? (
            <details className="group mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-[#d8d1c7] transition-colors hover:text-[#E3FF74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 sm:px-4">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Sparkles className="shrink-0 text-[#E3FF74]" size={14} />
                  <span className="truncate">{copy.albumPlan}</span>
                </span>
                <span aria-hidden="true" className="text-lg leading-none text-[#8a8680] group-open:hidden">+</span>
              </summary>
              <div className="border-t border-white/[0.06] px-3 py-3 sm:px-4">
                {seriesPlan?.styleGuide ? (
                  <p className="mb-3 break-words text-sm leading-6 text-[#b9b2a8] [overflow-wrap:anywhere]">
                    <span className="font-semibold text-[#E3FF74]">{copy.albumStyleGuide}: </span>
                    {seriesPlan.styleGuide}
                  </p>
                ) : null}
                {seriesPlan?.items.length ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {seriesPlan.items.slice(0, 6).map((item, index) => {
                      const isSelectedPlan = item.index === selectedImageIndex + 1 || index === selectedImageIndex;
                      return (
                        <div
                          key={`${item.index}-${item.title || index}`}
                          aria-current={isSelectedPlan ? 'true' : undefined}
                          className={`min-h-[60px] rounded-lg border px-3 py-2 text-left ${
                            isSelectedPlan
                              ? 'border-[#E3FF74]/45 bg-[#E3FF74]/10'
                              : 'border-white/[0.07] bg-black/10'
                          }`}
                        >
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8680]">
                            {item.index}/{images.length}
                          </span>
                          <span className={`mt-1 block break-words text-sm font-semibold leading-5 [overflow-wrap:anywhere] ${isSelectedPlan ? 'text-[#E3FF74]' : 'text-[#f0ede8]'}`}>
                            {item.title || copy.outputSlot(item.index)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>

        <aside className="border-t border-white/[0.07] bg-[#1a1917] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <SectionLabel icon={<Sparkles size={14} />} label={copy.selectedAsset} />
          <div className="mt-3 rounded-xl border border-[#E3FF74]/18 bg-[#E3FF74]/[0.045] px-3 py-3">
            <p className="text-sm font-semibold text-[#E3FF74]">{selectedAssetLabel}</p>
            <dl className="mt-3 grid grid-cols-1 gap-2">
              <div className="min-w-0 rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8680]">{copy.selectedStatus}</dt>
                <dd className="mt-1 text-sm font-medium text-[#f0ede8]">{selectedImage ? statusText(selectedImage.status, copy) : '--'}</dd>
              </div>
              <div className="min-w-0 rounded-lg border border-white/[0.06] bg-black/10 px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8680]">{copy.selectedPublishStatus}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-[#f0ede8] [overflow-wrap:anywhere]">
                  {selectedImage?.published ? copy.published : copy.unpublished}
                </dd>
              </div>
            </dl>
          </div>

          <details className="group mt-5 rounded-xl border border-white/[0.07] bg-white/[0.025]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-[#d8d1c7] transition-colors hover:text-[#E3FF74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35">
              <span className="inline-flex min-w-0 items-center gap-2">
                <Sparkles className="shrink-0 text-[#E3FF74]" size={14} />
                <span className="truncate">{copy.selectedPrompt}</span>
              </span>
              {selectedPlanItem?.title ? (
                <span className="min-w-0 truncate text-xs font-medium text-[#8a8680]">{selectedPlanItem.title}</span>
              ) : null}
            </summary>
            <p className="break-words border-t border-white/[0.06] px-3 py-3 text-sm leading-6 text-[#f0ede8] [overflow-wrap:anywhere]">
              {selectedPrompt || copy.promptFallback}
            </p>
          </details>

          <div className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
            <SectionLabel icon={<ImageIcon size={14} />} label={copy.selectedActions} />
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Button
                variant="ghost"
                iconStart={<ImageIcon size={15} />}
                type="button"
                onClick={() => selectedImage && selectedImageIndex >= 0 ? onPreview(images, selectedImageIndex) : undefined}
                disabled={!selectedImage}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 text-center text-sm font-semibold text-white transition-colors hover:border-[#E3FF74]/45 hover:text-[#E3FF74] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
              >
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.previewSelected}</span>
              </Button>
              <Button
                variant="ghost"
                iconStart={<Sparkles size={15} />}
                type="button"
                onClick={onReuseSelectedPrompt}
                disabled={!selectedPrompt}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-center text-sm font-semibold text-on-surface-variant transition-colors hover:border-white/30 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
              >
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.reuseSelectedPrompt}</span>
              </Button>
              <Button
                variant="ghost"
                iconStart={regenerating ? <Loader2 className="animate-spin" size={15} /> : <RotateCcw size={15} />}
                type="button"
                onClick={onRegenerateSelected}
                disabled={regenerating || !selectedPrompt}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-center text-sm font-semibold text-on-surface-variant transition-colors hover:border-white/30 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
              >
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.createVariant}</span>
              </Button>
              <Button
                variant={selectedImage?.published ? 'plain' : 'ghost'}
                iconStart={selectedIsPublishing ? <Loader2 className="animate-spin" size={15} /> : <Globe2 size={15} />}
                type="button"
                onClick={onToggleSelectedPublish}
                disabled={selectedIsPublishing || !selectedIsPublishable}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-center text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  selectedImage?.published
                    ? 'border-tertiary/35 bg-tertiary/10 text-tertiary hover:bg-tertiary/20'
                    : 'border-white/15 bg-white/[0.04] text-on-surface-variant hover:border-tertiary/35 hover:text-tertiary'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary/35`}
              >
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  {selectedIsPublishing ? copy.publishingSelected : selectedImage?.published ? copy.unpublishSelected : copy.publishSelected}
                </span>
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <TaskMetaGrid compact copy={copy} expectedCount={expectedCount} task={task} />
          </div>
        </aside>
      </div>
    </section>
  );
}

function FailedTaskPanel({
  copy,
  expectedCount,
  onRegenerate,
  onReusePrompt,
  regenerating,
  task,
}: {
  copy: WorkspaceCopy;
  expectedCount: number | null;
  onRegenerate: () => void;
  onReusePrompt: () => void;
  regenerating: boolean;
  task: ImageTask;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-error/30 bg-[#151412] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="border-b border-error/20 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-error/25 bg-error/10 px-3 py-1 text-xs font-semibold text-error">
              <XCircle className="shrink-0" size={13} />
              <span className="truncate">{copy.failed}</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight text-[#f0ede8] sm:text-3xl">{copy.failedTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#b9b2a8]">{copy.failedSubtitle}</p>
          </div>
          <StatusBadge copy={copy} status="failed" />
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 p-5 sm:p-6">
          <SectionLabel icon={<AlertCircle size={14} />} label={copy.failureReason} />
          <div className="mt-3 rounded-xl border border-error/25 bg-error/10 px-4 py-3 text-sm leading-6 text-on-error-container">
            <p className="break-words [overflow-wrap:anywhere]">{task.error || copy.unknownError}</p>
          </div>

          <div className="mt-6">
            <SectionLabel icon={<Sparkles size={14} />} label={copy.promptContext} />
            <p className="mt-3 break-words rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-[#f0ede8] [overflow-wrap:anywhere]">
              {task.prompt || copy.promptFallback}
            </p>
          </div>

          <div className="mt-6">
            <SectionLabel icon={<RotateCcw size={14} />} label={copy.nextSteps} />
            <ol className="mt-3 grid gap-2 text-sm leading-6 text-[#b9b2a8]">
              <li className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">{copy.failedStepOne}</li>
              <li className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">{copy.failedStepTwo}</li>
              <li className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">{copy.failedStepThree}</li>
            </ol>
          </div>
        </div>

        <aside className="border-t border-white/[0.07] bg-[#1a1917] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <TaskMetaGrid copy={copy} expectedCount={expectedCount} task={task} />
          <div className="mt-6 grid grid-cols-1 gap-2">
            <Button
              variant="ghost"
              iconStart={<Sparkles size={15} />}
              type="button"
              onClick={onReusePrompt}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 text-center text-sm font-semibold text-white transition-colors hover:border-[#E3FF74]/45 hover:text-[#E3FF74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
            >
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.revisePrompt}</span>
            </Button>
            <Button
              variant="ghost"
              iconStart={regenerating ? <Loader2 className="animate-spin" size={15} /> : <RotateCcw size={15} />}
              type="button"
              onClick={onRegenerate}
              disabled={regenerating || !task.prompt}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-center text-sm font-semibold text-on-surface-variant transition-colors hover:border-white/30 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
            >
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.retrySameSettings}</span>
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function EmptyResultState({
  copy,
  expectedCount,
  onRegenerate,
  onReusePrompt,
  regenerating,
  task,
}: {
  copy: WorkspaceCopy;
  expectedCount: number | null;
  onRegenerate: () => void;
  onReusePrompt: () => void;
  regenerating: boolean;
  task: ImageTask;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#151412] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-[#b9b2a8]">
            <ImageIcon size={13} />
            {copy.noPreview}
          </div>
          <h1 className="text-2xl font-bold text-[#f0ede8]">{copy.emptyTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b9b2a8]">{copy.emptyDescription}</p>
          <p className="mt-4 break-words text-sm leading-6 text-[#f0ede8] [overflow-wrap:anywhere]">{task.prompt || copy.promptFallback}</p>
        </div>
        <div className="w-full shrink-0 lg:w-[340px]">
          <TaskMetaGrid compact copy={copy} expectedCount={expectedCount} task={task} />
          <div className="mt-4 grid gap-2">
            <Button
              variant="ghost"
              iconStart={<Sparkles size={15} />}
              type="button"
              onClick={onReusePrompt}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 text-center text-sm font-semibold text-white transition-colors hover:border-[#E3FF74]/45 hover:text-[#E3FF74] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
            >
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.reusePrompt}</span>
            </Button>
            <Button
              variant="ghost"
              iconStart={regenerating ? <Loader2 className="animate-spin" size={15} /> : <RotateCcw size={15} />}
              type="button"
              onClick={onRegenerate}
              disabled={regenerating || !task.prompt}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-center text-sm font-semibold text-on-surface-variant transition-colors hover:border-white/30 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
            >
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{copy.retryPrompt}</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MissingTaskState({
  copy,
  error,
  onBack,
  onCreate,
}: {
  copy: WorkspaceCopy;
  error: string | null;
  onBack: () => void;
  onCreate: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#1a1917] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.26)] sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E3FF74]/25 bg-[#E3FF74]/10 text-[#E3FF74]">
          <AlertCircle size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E3FF74]">{copy.missingEyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold text-[#f0ede8] sm:text-3xl">{copy.missingTitle}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">{copy.missingDescription}</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a8680]">{copy.missingTerminal}</p>
          {error ? (
            <p className="mt-3 break-words rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-xs text-on-surface-variant/75 [overflow-wrap:anywhere]">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="primary"
              iconStart={<Sparkles size={15} />}
              type="button"
              onClick={onCreate}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#f0ede8] px-5 py-2.5 text-sm font-semibold text-[#1a1917] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1917]"
            >
              {copy.createAction}
            </Button>
            <Button
              variant="ghost"
              iconStart={<ArrowLeft size={15} />}
              type="button"
              onClick={onBack}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant/50 px-5 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container/50 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1917]"
            >
              {copy.goBackAction}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskMetaGrid({
  compact = false,
  copy,
  expectedCount,
  task,
}: {
  compact?: boolean;
  copy: WorkspaceCopy;
  expectedCount: number | null;
  task: ImageTask;
}) {
  const items = getTaskMetaItems(task, expectedCount, copy);

  return (
    <div aria-label={copy.taskParameters}>
      <SectionLabel icon={<Archive size={14} />} label={copy.taskParameters} />
      <dl className={`mt-3 grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-1'}`}>
        {items.map((item) => (
          <div key={item.label} className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8680]">{item.label}</dt>
            <dd className="mt-1 min-w-0 break-words text-sm font-medium text-[#f0ede8] [overflow-wrap:anywhere]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ProgressRail({ copy, status }: { copy: WorkspaceCopy; status: ImageTask['status'] }) {
  const steps = [
    { label: copy.accepted, done: true },
    { label: copy.queued, done: status === 'queued' || status === 'running' || status === 'succeeded' },
    { label: copy.running, done: status === 'running' || status === 'succeeded' },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3" aria-label={copy.status}>
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm ${
            step.done
              ? 'border-[#E3FF74]/20 bg-[#E3FF74]/10 text-[#E3FF74]'
              : 'border-white/[0.06] bg-white/[0.03] text-[#8a8680]'
          }`}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/25 text-[11px] font-bold">
            {index + 1}
          </span>
          <span className="truncate">{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ copy, status }: { copy: WorkspaceCopy; status: ImageTask['status'] }) {
  const label = status === 'queued' ? copy.queued : status === 'running' ? copy.running : status === 'succeeded' ? copy.succeeded : copy.failed;
  const tone =
    status === 'failed'
      ? 'border-error/25 bg-error/10 text-error'
      : status === 'succeeded'
        ? 'border-[#4ade80]/20 bg-[#4ade80]/10 text-[#4ade80]'
        : 'border-[#E3FF74]/20 bg-[#E3FF74]/10 text-[#E3FF74]';
  const icon =
    status === 'failed' ? (
      <XCircle size={14} />
    ) : status === 'succeeded' ? (
      <CheckCircle2 size={14} />
    ) : status === 'running' ? (
      <Loader2 className="animate-spin" size={14} />
    ) : (
      <Clock3 size={14} />
    );

  return (
    <div className={`inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${tone}`}>
      {icon}
      {label}
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a8680]">
      <span className="shrink-0 text-[#E3FF74]">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function getTaskMetaItems(task: ImageTask, expectedCount: number | null, copy: WorkspaceCopy) {
  return [
    { label: copy.status, value: statusText(task.status, copy) },
    { label: copy.mode, value: task.mode === 'edit' ? copy.editedMode : copy.generatedMode },
    { label: copy.model, value: task.model || '--' },
    { label: copy.size, value: task.size || '--' },
    { label: copy.ratio, value: task.aspect_ratio || '--' },
    { label: copy.quality, value: task.quality || '--' },
    { label: copy.count, value: expectedCount ? copy.imageCount(expectedCount) : copy.countUnknown },
    { label: copy.created, value: formatDate(task.created_at) },
    { label: task.completed_at ? copy.completed : task.started_at ? copy.started : copy.updated, value: formatDate(task.completed_at || task.started_at || task.updated_at) },
    { label: copy.taskId, value: task.id },
  ];
}

function statusText(status: ImageTask['status'], copy: WorkspaceCopy) {
  if (status === 'queued') return copy.queued;
  if (status === 'running') return copy.running;
  if (status === 'succeeded') return copy.succeeded;
  return copy.failed;
}

type SeriesPlanSummary = {
  title: string | null;
  styleGuide: string | null;
  items: { index: number; title: string | null }[];
};

function getSeriesPlan(task: ImageTask, images: HistoryItem[]): SeriesPlanSummary | null {
  const seriesPlan =
    recordFromUnknown(task.result?.series_plan) ??
    recordFromUnknown(images.find((img) => recordFromUnknown(img.task_result?.series_plan))?.task_result?.series_plan);
  if (!seriesPlan) return null;

  const items = Array.isArray(seriesPlan.items)
    ? seriesPlan.items
        .map((rawItem, fallbackIndex) => {
          const item = recordFromUnknown(rawItem);
          if (!item) return null;
          const index = numberFromUnknown(item.index) ?? fallbackIndex + 1;
          const title = stringFromUnknown(item.title);
          return { index, title };
        })
        .filter((item): item is { index: number; title: string | null } => Boolean(item))
    : [];

  return {
    title: stringFromUnknown(seriesPlan.title) ?? stringFromUnknown(seriesPlan.source),
    styleGuide: stringFromUnknown(seriesPlan.style_guide),
    items,
  };
}

function getExpectedCount(task: ImageTask) {
  const resultCount = numberFromUnknown(task.result?.count_requested);
  if (resultCount) return resultCount;

  const selectedPlan = recordFromUnknown(task.result?.selected_plan);
  const selectedPlanCount = numberFromUnknown(selectedPlan?.image_count);
  if (selectedPlanCount) return selectedPlanCount;

  const seriesPlan = recordFromUnknown(task.result?.series_plan);
  const planItems = Array.isArray(seriesPlan?.items) ? seriesPlan.items.length : 0;
  if (planItems > 0) return planItems;

  if (task.items.length > 0) return task.items.length;
  return null;
}

function sortImagesByBatch(items: HistoryItem[]) {
  return [...items].sort((a, b) => {
    const batchDelta = a.batch_index - b.batch_index;
    if (batchDelta !== 0) return batchDelta;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

function normalizeImageCount(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(9, Math.round(value)));
}

function numberFromUnknown(value: unknown) {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0;
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.max(1, Math.min(9, Math.round(numeric)));
}

function recordFromUnknown(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringFromUnknown(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
