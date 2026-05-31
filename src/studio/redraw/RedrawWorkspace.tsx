import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ArrowUp, CheckCircle2, ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { generateEcommerceImages } from '../../api';
import { Button, SectionHeader, SelectControl, StatusPill, Surface, SurfaceState, TextareaControl, WorkbenchCard } from '../../components/design-system';
import { providerImageSize } from '../../imageOptions';
import { useTasks } from '../../tasks';
import type { StudioLocation } from '../app/studioLocation';
import type { StudioAssetInput } from '../assets/assetTypes';
import { resultUrlsFromTask } from '../generation/resultAdapters';
import { waitForTaskResult } from '../generation/taskPolling';
import { useHistoryImages } from '../history/useHistoryImages';
import { fileFromImageUrl } from '../shared/fileFromImageUrl';
import { ImageDropzone } from '../shared/ImageDropzone';
import { useStudioPreferences } from '../preferences/useStudioPreferences';
import {
  IMAGE2_SCENARIOS,
  buildImage2ScenarioPrompt,
  groupedScenarios,
  scenarioById,
  type Image2Scenario,
} from '../image-editor/operations/image2Scenarios';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const QUALITY_OPTIONS = ['auto', 'low', 'medium', 'high'];

const groupByT2: Record<string, string | null> = {
  product: '商品生成',
  cleanup: '图像清理',
  replace: '局部替换',
  variation: '变体生成',
  extend: '画幅扩展',
  enhance: '质量增强',
};

type SubmitState = 'idle' | 'importing' | 'submitting' | 'polling' | 'succeeded' | 'failed';

export function RedrawWorkspace({
  location,
  onLocationChange,
}: {
  location: StudioLocation;
  onLocationChange: (next: StudioLocation) => void;
}) {
  const { addTask, notify } = useTasks();
  const { preferences } = useStudioPreferences();
  const history = useHistoryImages();
  const preset = location.composer?.preset as Partial<StudioAssetInput & { scenarioId: string }> | undefined;
  const initialScenario = useMemo(() => scenarioById(typeof preset?.scenarioId === 'string' ? preset.scenarioId : location.t3?.id), [location.t3?.id, preset?.scenarioId]);
  const [activeScenario, setActiveScenario] = useState<Image2Scenario>(initialScenario);
  const [promptBrief, setPromptBrief] = useState('');
  const [aspectRatio, setAspectRatio] = useState(initialScenario.defaultAspectRatio || preferences.aspectRatio);
  const [count, setCount] = useState(initialScenario.defaultCount || preferences.count);
  const [quality, setQuality] = useState('auto');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<SubmitState>('idle');
  const [error, setError] = useState('');
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [importingImageId, setImportingImageId] = useState('');
  const scenarioGroups = useMemo(() => groupedScenarios(), []);
  const visibleGroup = groupByT2[location.t2 ?? ''] ?? null;
  const visibleScenarios = visibleGroup ? scenarioGroups[visibleGroup] ?? IMAGE2_SCENARIOS : IMAGE2_SCENARIOS;

  useEffect(() => {
    setActiveScenario(initialScenario);
    setAspectRatio(initialScenario.defaultAspectRatio || preferences.aspectRatio);
    setCount(initialScenario.defaultCount || preferences.count);
  }, [initialScenario, preferences.aspectRatio, preferences.count]);

  useEffect(() => {
    if (!productImage) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(productImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [productImage]);

  useEffect(() => {
    if (typeof preset?.src !== 'string') return;
    let cancelled = false;
    setStatus('importing');
    setError('');
    fileFromImageUrl(preset.src, preset.title || 'asset-image')
      .then((file) => {
        if (cancelled) return;
        setProductImage(file);
        if (preset.prompt) setPromptBrief(preset.prompt.slice(0, 600));
        setStatus('idle');
      })
      .catch((event) => {
        if (cancelled) return;
        setStatus('failed');
        setError(event instanceof Error ? event.message : '无法载入资产图');
      });
    return () => {
      cancelled = true;
    };
  }, [preset?.src, preset?.title, preset?.prompt]);

  function selectScenario(scenario: Image2Scenario) {
    setActiveScenario(scenario);
    setAspectRatio(scenario.defaultAspectRatio || preferences.aspectRatio);
    setCount(scenario.defaultCount || preferences.count);
    setError('');
    onLocationChange({
      ...location,
      t3: { kind: 'scenario', id: scenario.id },
      composer: {
        kind: 'redraw',
        preset: {
          ...(location.composer?.preset ?? {}),
          scenarioId: scenario.id,
        },
      },
    });
  }

  function applyFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('仅支持 PNG / JPEG / WEBP 图片');
      return;
    }
    setProductImage(file);
    setResultUrls([]);
    setError('');
    setStatus('idle');
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) applyFile(file);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) applyFile(file);
  }

  async function useImageAsInput(image: StudioAssetInput) {
    setImportingImageId(image.id);
    setStatus('importing');
    setError('');
    try {
      const file = await fileFromImageUrl(image.src, image.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'history-image');
      setProductImage(file);
      if (image.prompt) setPromptBrief(image.prompt.slice(0, 600));
      setStatus('idle');
    } catch (event) {
      setStatus('failed');
      setError(event instanceof Error ? event.message : '无法使用这张历史图片');
    } finally {
      setImportingImageId('');
    }
  }

  async function submitScenario() {
    if (!productImage) {
      setError('先上传或选择一张图片作为重绘输入。');
      return;
    }

    setStatus('submitting');
    setError('');
    setResultUrls([]);
    try {
      const finalPrompt = buildImage2ScenarioPrompt({
        scenario: activeScenario,
        userBrief: promptBrief,
        outputSpec: `aspect ratio ${aspectRatio}, ${count} image(s), quality ${quality}`,
      });
      const task = await generateEcommerceImages(
        {
          style: finalPrompt,
          size: providerImageSize('FAST', aspectRatio),
          aspect_ratio: aspectRatio,
          quality,
          n: count,
        },
        [{ file: productImage, primary: true, role: 'primary', note: activeScenario.title }],
      );
      addTask(task);
      setStatus('polling');
      const completed = task.status === 'succeeded' ? task : await waitForTaskResult(task.id);
      addTask(completed);
      const urls = resultUrlsFromTask(completed);
      if (!urls.length) throw new Error('重绘任务已完成，但没有可显示的结果图。');
      setResultUrls(urls);
      setStatus('succeeded');
      notify({ kind: 'success', title: '重绘完成', message: activeScenario.title });
    } catch (event) {
      const message = event instanceof Error ? event.message : '重绘失败。';
      setStatus('failed');
      setError(message);
      notify({ kind: 'error', title: '重绘失败', message });
    }
  }

  const historyAssets: StudioAssetInput[] = history.images.map((image) => ({
    id: image.id,
    src: image.src,
    title: image.title,
    prompt: image.prompt,
  }));
  const busy = status === 'submitting' || status === 'polling' || status === 'importing';

  return (
    <section className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="@container space-y-4">
        <Surface tone="subtle" padding="md">
          <SectionHeader
            className="mb-3"
            eyebrow="重绘场景"
            title={visibleGroup ?? '选择 Image-2 操作'}
            status={
              <StatusPill tone={status === 'succeeded' ? 'success' : busy ? 'running' : status === 'failed' ? 'error' : 'neutral'}>
                {status === 'importing' ? '导入中' : status === 'submitting' ? '提交中' : status === 'polling' ? '生成中' : status === 'succeeded' ? '已生成' : status === 'failed' ? '需要处理' : '准备'}
              </StatusPill>
            }
          />
          <div className="grid gap-3 @xl:grid-cols-2">
            {visibleScenarios.map((scenario, index) => (
              <WorkbenchCard
                key={scenario.id}
                title={scenario.title}
                description={scenario.description}
                icon={<Sparkles size={17} />}
                active={activeScenario.id === scenario.id}
                motionIndex={index}
                actionLabel="选择"
                onClick={() => selectScenario(scenario)}
              />
            ))}
          </div>
        </Surface>

        <Surface tone="default" padding="md">
          <div className="grid gap-4 @2xl:grid-cols-[260px_minmax(0,1fr)]">
            <ImageDropzone
              label={activeScenario.inputLabel}
              dragging={dragging}
              previewUrl={previewUrl}
              fileName={productImage?.name}
              onFileChange={handleFileChange}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            />
            <div className="min-w-0 space-y-3">
              <TextareaControl
                className="min-h-40 text-sm leading-6"
                value={promptBrief}
                placeholder={activeScenario.userPromptPlaceholder}
                onChange={(event) => setPromptBrief(event.target.value.slice(0, 600))}
              />
              <div className="grid gap-3 @md:grid-cols-[1fr_1fr_1fr_auto] @md:items-end">
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold text-on-surface-variant">比例</span>
                  <SelectControl value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
                    {['1:1', '4:5', '16:9', '9:16', '3:2', '2:3', '4:3'].map((ratio) => <option key={ratio}>{ratio}</option>)}
                  </SelectControl>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold text-on-surface-variant">数量</span>
                  <SelectControl value={String(count)} onChange={(event) => setCount(Number(event.target.value))}>
                    {[1, 2, 3, 4].map((option) => <option key={option}>{option}</option>)}
                  </SelectControl>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-semibold text-on-surface-variant">质量</span>
                  <SelectControl value={quality} onChange={(event) => setQuality(event.target.value)}>
                    {QUALITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                  </SelectControl>
                </label>
                <Button
                  variant="primary"
                  className="h-11 @md:w-14 @md:px-0"
                  iconStart={busy ? <Loader2 className="animate-spin" size={17} /> : <ArrowUp size={17} />}
                  disabled={busy}
                  onClick={submitScenario}
                  aria-label="生成重绘结果"
                >
                  <span className="@md:sr-only">生成</span>
                </Button>
              </div>
              {error ? <p className="text-sm leading-6 text-error">{error}</p> : null}
            </div>
          </div>
        </Surface>

        {resultUrls.length ? (
          <Surface tone="subtle" padding="md">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-on-surface">
              <CheckCircle2 size={16} className="text-lime" />
              重绘结果
            </div>
            <div className="grid gap-3 @md:grid-cols-2">
              {resultUrls.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  className="overflow-hidden rounded-lg border border-white/[0.08] bg-black/20 text-left hover:border-lime/45"
                  onClick={() => void useImageAsInput({ id: `result-${index}`, src: url, title: activeScenario.title, prompt: promptBrief })}
                >
                  <img src={url} alt={`${activeScenario.title}结果`} className="aspect-square w-full object-contain" />
                  <span className="block px-3 py-2 text-xs font-bold text-lime">继续作为输入</span>
                </button>
              ))}
            </div>
          </Surface>
        ) : null}
      </div>

      <aside className="space-y-4">
        <Surface tone="subtle" padding="md">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-on-surface-variant">历史图片</div>
              <div className="mt-1 text-sm font-bold text-on-surface">选择作为输入</div>
            </div>
            {history.loading ? <Loader2 size={16} className="animate-spin text-lime" /> : <span className="text-xs text-on-surface-variant">{historyAssets.length}</span>}
          </div>
          {historyAssets.length ? (
            <div className="grid max-h-[640px] gap-2 overflow-y-auto pr-1">
              {historyAssets.slice(0, 12).map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-left hover:border-lime/45"
                  onClick={() => void useImageAsInput(asset)}
                >
                  <img src={asset.src} alt="" className="h-16 w-16 rounded-md object-cover" />
                  <span className="min-w-0 self-center">
                    <span className="block truncate text-sm font-bold text-on-surface">{asset.title}</span>
                    <span className="mt-1 block text-xs text-lime">{importingImageId === asset.id ? '导入中...' : '用作输入'}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <SurfaceState kind={history.loading ? 'loading' : 'empty'} title={history.loading ? '正在读取历史图片' : '还没有可用图片'} description={history.error || '上传一张图片即可开始重绘。'} className="min-h-48" />
          )}
        </Surface>
        <Surface tone="lime" padding="md">
          <div className="flex items-start gap-3">
            <ImageIcon className="mt-0.5 text-lime" size={17} />
            <p className="text-xs leading-5 text-on-surface-variant">重绘会保留输入图的主体识别信息，并把结果沉淀进任务中心和历史图片。</p>
          </div>
        </Surface>
      </aside>
    </section>
  );
}
