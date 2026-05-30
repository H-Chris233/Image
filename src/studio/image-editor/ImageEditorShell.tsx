import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  Brush,
  CheckCircle2,
  Download,
  Eraser,
  Expand,
  GalleryVerticalEnd,
  ImagePlus,
  Loader2,
  PackagePlus,
  Palette,
  RotateCw,
  Sparkles,
  Upload,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { generateEcommerceImages, getImageTask, type ImageTask } from '../../api';
import { providerImageSize } from '../../imageOptions';
import type { StudioStartPreset } from '../create-new/CreateNewWorkbench';
import {
  buildImage2ScenarioPrompt,
  groupedScenarios,
  scenarioById,
  type Image2Scenario,
} from './operations/image2Scenarios';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ASPECT_RATIOS = ['1:1', '4:5', '16:9', '9:16', '3:2', '2:3'];
const COUNTS = [1, 2, 3, 4];

type GeneratedImage = {
  id: string;
  src: string;
  scenarioTitle: string;
  prompt: string;
};

const scenarioIcons: Record<string, typeof Sparkles> = {
  商品生成: PackagePlus,
  图像清理: Eraser,
  局部替换: Brush,
  变体生成: RotateCw,
  画幅扩展: Expand,
  质量增强: Zap,
};

function resultUrlsFromTask(task: ImageTask) {
  return task.items
    .filter((item) => item.status === 'succeeded' && (item.image_url || item.image_path))
    .map((item) => item.image_url || item.image_path)
    .filter(Boolean) as string[];
}

async function waitForTaskResult(taskId: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const task = await getImageTask(taskId);
    if (task.status === 'succeeded') return task;
    if (task.status === 'failed') throw new Error(task.error || 'Image-2 generation failed');
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return getImageTask(taskId);
}

export function ImageEditorShell({
  initialPreset,
  onBackToCreate,
}: {
  initialPreset?: StudioStartPreset | null;
  onBackToCreate: () => void;
}) {
  const initialScenario = useMemo(() => scenarioById(initialPreset?.templateId), [initialPreset?.templateId]);
  const [activeScenario, setActiveScenario] = useState<Image2Scenario>(initialScenario);
  const [promptBrief, setPromptBrief] = useState(initialPreset?.prompt ?? '');
  const [aspectRatio, setAspectRatio] = useState(initialScenario.defaultAspectRatio);
  const [count, setCount] = useState(initialScenario.defaultCount);
  const [quality, setQuality] = useState('auto');
  const [productImage, setProductImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const scenarioGroups = useMemo(() => groupedScenarios(), []);

  useEffect(() => {
    setActiveScenario(initialScenario);
    setPromptBrief(initialPreset?.prompt ?? '');
    setAspectRatio(initialScenario.defaultAspectRatio);
    setCount(initialScenario.defaultCount);
  }, [initialPreset?.prompt, initialScenario]);

  useEffect(() => {
    if (!productImage) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(productImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [productImage]);

  function selectScenario(scenario: Image2Scenario) {
    setActiveScenario(scenario);
    setAspectRatio(scenario.defaultAspectRatio);
    setCount(scenario.defaultCount);
    setError('');
  }

  function applyFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('仅支持 PNG / JPEG / WEBP 图片');
      return;
    }
    setProductImage(file);
    setError('');
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

  async function submitScenario() {
    if (!productImage) {
      setError('先上传一张图片作为 Image-2 输入');
      return;
    }

    setGenerating(true);
    setError('');
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
      const completed = task.status === 'succeeded' ? task : await waitForTaskResult(task.id);
      const urls = resultUrlsFromTask(completed);
      if (!urls.length) throw new Error('Image-2 finished without image results');
      setGeneratedImages((current) => [
        ...urls.map((src, index) => ({
          id: `${completed.id}-${index}`,
          src,
          scenarioTitle: activeScenario.title,
          prompt: finalPrompt,
        })),
        ...current,
      ]);
    } catch (event) {
      setError(event instanceof Error ? event.message : 'Image-2 生成失败');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-[#090909] text-[#f4f0ea]">
      <div className="grid h-full grid-cols-[360px_minmax(0,1fr)_280px] max-xl:grid-cols-[320px_minmax(0,1fr)] max-lg:grid-cols-1">
        <aside className="flex min-h-0 flex-col border-r border-white/[0.08] bg-[#151514] max-lg:hidden">
          <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-4">
            <button
              type="button"
              title="Back to Create"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.08] text-[#aaa49a] hover:bg-white/[0.06] hover:text-[#f4f0ea]"
              onClick={onBackToCreate}
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#8f897f]">
              <span>Image-2</span>
              <span className="rounded-full bg-lime px-2 py-0.5 font-bold text-on-lime">Atlas</span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-bold">
              <WandSparkles size={16} className="text-lime" aria-hidden="true" />
              场景操作
            </div>
            <div className="space-y-4">
              {Object.entries(scenarioGroups).map(([group, scenarios]) => {
                const GroupIcon = scenarioIcons[group] ?? Sparkles;
                return (
                  <section key={group}>
                    <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-[#8f897f]">
                      <GroupIcon size={14} aria-hidden="true" />
                      {group}
                    </div>
                    <div className="space-y-2">
                      {scenarios.map((scenario) => (
                        <button
                          key={scenario.id}
                          type="button"
                          onClick={() => selectScenario(scenario)}
                          className={`grid w-full grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-lg border p-2 text-left transition ${
                            scenario.id === activeScenario.id
                              ? 'border-lime/70 bg-lime/10'
                              : 'border-white/[0.08] bg-white/[0.025] hover:border-white/[0.18] hover:bg-white/[0.045]'
                          }`}
                        >
                          <span className="relative block h-16 overflow-hidden rounded-md bg-white/[0.04]">
                            <img src={scenario.afterImage} alt="" className="h-full w-full object-cover opacity-90" />
                          </span>
                          <span className="min-w-0 self-center">
                            <span className="block truncate text-sm font-bold text-[#f4f0ea]">{scenario.shortTitle}</span>
                            <span className="mt-1 line-clamp-2 text-xs leading-5 text-[#8f897f]">{scenario.description}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/[0.08] p-3">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.05] text-sm font-semibold text-[#aaa49a] hover:bg-white/[0.08]"
              disabled
            >
              <Download size={15} aria-hidden="true" />
              Download image
            </button>
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto bg-[#090909]">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-7 xl:px-6">
            <div className="mx-auto inline-flex rounded-lg border border-white/[0.08] bg-[#1a1a1d] p-1">
              <button type="button" className="h-11 rounded-md px-6 text-sm font-semibold text-[#8f897f]">
                Upload Image
              </button>
              <button type="button" className="h-11 rounded-md bg-[#2b2b2f] px-6 text-sm font-bold text-[#f4f0ea]">
                Generate Image
              </button>
            </div>

            <section className="rounded-xl border border-white/[0.08] bg-[#171719] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-lime/30 bg-lime/10 px-2.5 py-1 text-xs font-bold text-lime">
                      {activeScenario.group}
                    </span>
                    {activeScenario.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-[#8f897f]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h1 className="mt-4 font-display text-2xl font-bold text-[#f4f0ea]">{activeScenario.title}</h1>
                  <p className="mt-2 text-sm leading-6 text-[#8f897f]">{activeScenario.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ExampleImage label="Before" src={activeScenario.beforeImage} />
                  <ExampleImage label="After" src={activeScenario.afterImage} />
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                <ImageInput
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

                <div className="min-w-0">
                  <textarea
                    value={promptBrief}
                    onChange={(event) => setPromptBrief(event.target.value.slice(0, 600))}
                    placeholder={activeScenario.userPromptPlaceholder}
                    className="min-h-48 w-full resize-y rounded-lg border border-white/[0.08] bg-[#111113] px-4 py-3 text-base leading-7 text-[#f4f0ea] outline-none placeholder:text-[#5f5a54] focus:border-lime/60"
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                    <FieldSelect label="Aspect ratio" value={aspectRatio} onChange={setAspectRatio} options={ASPECT_RATIOS} />
                    <FieldSelect
                      label="Number of images"
                      value={String(count)}
                      onChange={(value) => setCount(Number(value))}
                      options={COUNTS.map(String)}
                    />
                    <FieldSelect label="Quality" value={quality} onChange={setQuality} options={['auto', 'low', 'medium', 'high']} />
                    <button
                      type="button"
                      onClick={submitScenario}
                      disabled={generating}
                      className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-lime text-on-lime shadow-[0_0_24px_rgba(227,255,116,0.22)] transition hover:bg-[#f0ff9c] disabled:cursor-wait disabled:opacity-60"
                      title="Generate"
                    >
                      {generating ? <Loader2 size={22} className="animate-spin" aria-hidden="true" /> : <ArrowUp size={24} aria-hidden="true" />}
                    </button>
                  </div>
                  {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-[#8f9bb0]">Your images</h2>
                {generatedImages.length ? <span className="text-xs text-[#8f897f]">{generatedImages.length} outputs</span> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {generatedImages.length ? (
                  generatedImages.slice(0, 5).map((image) => (
                    <a
                      key={image.id}
                      href={image.src}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative block aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-[#171719]"
                    >
                      <img src={image.src} alt={image.scenarioTitle} className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-semibold opacity-0 transition group-hover:opacity-100">
                        {image.scenarioTitle}
                      </span>
                    </a>
                  ))
                ) : (
                  <>
                    <SampleCard src={activeScenario.afterImage} title={activeScenario.title} />
                    <SampleCard src={activeScenario.beforeImage} title="Input reference" muted />
                    <button
                      type="button"
                      className="flex aspect-square items-center justify-center rounded-lg border border-white/[0.08] bg-[#171719] text-sm font-semibold text-[#f4f0ea] hover:border-lime/50"
                    >
                      View All
                    </button>
                  </>
                )}
              </div>
            </section>

            <section>
              <h2 className="font-display text-xl font-bold text-[#8f9bb0]">Your past edits</h2>
              <div className="mt-3 min-h-24 rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] p-4 text-sm text-[#6f6961]">
                场景结果会沉淀到这里，后续可继续作为输入图进行下一轮 Image-2 重绘。
              </div>
            </section>
          </div>
        </main>

        <aside className="flex min-h-0 flex-col border-l border-white/[0.08] bg-[#171719] max-xl:hidden">
          <div className="flex h-16 items-center gap-3 border-b border-white/[0.08] px-4">
            <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-lime/10 px-3 text-sm font-bold text-lime">
              Upgrade
              <Zap size={14} aria-hidden="true" />
            </button>
            <span className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-lime text-sm font-bold text-on-lime">
              G
            </span>
          </div>
          <div className="flex h-16 items-center gap-2 border-b border-white/[0.08] px-4 text-sm font-bold">
            <GalleryVerticalEnd size={16} className="text-[#8f897f]" aria-hidden="true" />
            Past Generations
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {generatedImages.length ? (
              <div className="grid gap-2">
                {generatedImages.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-md p-2 text-left hover:bg-white/[0.05]"
                    onClick={() => setPromptBrief(image.prompt.slice(0, 600))}
                  >
                    <img src={image.src} alt="" className="h-14 w-14 rounded-md object-cover" />
                    <span className="min-w-0 self-center">
                      <span className="block truncate text-xs font-semibold">{image.scenarioTitle}</span>
                      <span className="mt-1 block truncate text-[11px] text-[#8f897f]">Use prompt</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs leading-5 text-[#6f6961]">还没有生成记录。运行一个场景后，这里会显示结果历史。</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ExampleImage({ label, src }: { label: string; src: string }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03]">
      <img src={src} alt="" className="h-full w-full object-cover" />
      <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[10px] font-bold uppercase text-white/80">
        {label}
      </span>
    </div>
  );
}

function ImageInput({
  label,
  dragging,
  previewUrl,
  fileName,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  label: string;
  dragging: boolean;
  previewUrl: string;
  fileName?: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
}) {
  return (
    <label
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed text-center transition ${
        dragging ? 'border-lime bg-lime/10' : 'border-white/[0.12] bg-[#111113] hover:border-white/[0.22]'
      }`}
    >
      <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} />
      {previewUrl ? (
        <span className="flex h-full w-full flex-col">
          <img src={previewUrl} alt="" className="min-h-0 flex-1 object-contain p-3" />
          <span className="flex items-center gap-2 border-t border-white/[0.08] px-3 py-2 text-xs text-[#8f897f]">
            <CheckCircle2 size={14} className="text-lime" aria-hidden="true" />
            <span className="truncate">{fileName}</span>
          </span>
        </span>
      ) : (
        <span className="p-4">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-lime/20 bg-lime/10 text-lime">
            <Upload size={22} aria-hidden="true" />
          </span>
          <span className="mt-4 block text-sm font-bold text-[#f4f0ea]">{label}</span>
          <span className="mt-1 block text-xs text-[#8f897f]">PNG / JPEG / WEBP</span>
        </span>
      )}
    </label>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-[#f4f0ea]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-white/[0.08] bg-[#111113] px-3 text-sm text-[#f4f0ea] outline-none focus:border-lime/60"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SampleCard({ src, title, muted = false }: { src: string; title: string; muted?: boolean }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-white/[0.08] bg-[#171719]">
      <img src={src} alt="" className={`h-full w-full object-cover ${muted ? 'opacity-55' : ''}`} />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs font-semibold">
        {title}
      </span>
    </div>
  );
}
