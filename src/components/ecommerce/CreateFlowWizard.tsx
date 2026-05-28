import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import { analyzeEcommerceProduct, type BalanceInfo, type RecommendedTemplate, type EcommerceAnalyzeResponse } from '../../api';
import {
  Button,
  FileInput,
  IconButton,
  SegmentedControl,
  SkeletonBlock,
  Surface,
  TextareaField,
} from '../design-system';
import { CreditEstimate } from './CreditEstimate';
import {
  canAnalyze,
  canContinueFromRecommend,
  createInitialWizardState,
  selectedTemplate,
  wizardReducer,
  type WizardStep,
} from './createWizardState';

const ACCEPTED = 'image/png,image/jpeg,image/webp';
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16'] as const;
const IMAGE_COUNTS = ['1', '2', '3', '4'] as const;

const STEP_META: Record<WizardStep, { index: number; label: string; progress: number }> = {
  upload_brief: { index: 1, label: '上传商品', progress: 33 },
  recommend: { index: 2, label: '选择模板', progress: 67 },
  tune: { index: 3, label: '微调输出', progress: 100 },
};

const EXAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=160&h=160&fit=crop&auto=format&q=70',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&h=160&fit=crop&auto=format&q=70',
  'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=160&h=160&fit=crop&auto=format&q=70',
  'https://images.unsplash.com/photo-1585386959984-a41552231658?w=160&h=160&fit=crop&auto=format&q=70',
  'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=160&h=160&fit=crop&auto=format&q=70',
  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=160&h=160&fit=crop&auto=format&q=70',
];

export interface WizardResult {
  productImage: File;
  brief: string;
  selectedTemplate: RecommendedTemplate;
  analyzeResponse: EcommerceAnalyzeResponse;
  aspectRatio: string;
  imageCount: number;
}

interface Props {
  onComplete: (result: WizardResult) => void | Promise<void>;
  onClose: () => void;
  initialSceneDescription?: string;
  balance?: BalanceInfo | null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || '操作失败，请重试');
}

export function CreateFlowWizard({ onComplete, onClose, initialSceneDescription, balance = null }: Props) {
  const [state, dispatch] = useReducer(wizardReducer, initialSceneDescription ?? '', createInitialWizardState);
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const activeStep = STEP_META[state.step];
  const selected = selectedTemplate(state);

  useEffect(() => {
    if (!state.productImage) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(state.productImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [state.productImage]);

  const applyFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      dispatch({ type: 'set_error', error: '仅支持 PNG / JPEG / WEBP 图片' });
      return;
    }
    dispatch({ type: 'set_product_image', file });
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) applyFile(file);
    event.target.value = '';
  }, [applyFile]);

  const handleDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLLabelElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDragging(false);
    }
  }, []);

  const handleDrop = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) applyFile(file);
  }, [applyFile]);

  const runAnalyze = useCallback(async () => {
    if (!state.productImage || state.analyzing) return;
    dispatch({ type: 'analyze_start' });
    try {
      const response = await analyzeEcommerceProduct(
        {
          extra_requirements: state.brief.trim(),
          image_count: 3,
        },
        [{ file: state.productImage, primary: true }],
      );
      dispatch({ type: 'analyze_success', response });
    } catch (error) {
      dispatch({ type: 'analyze_failure', error: errorMessage(error) });
    }
  }, [state.productImage, state.brief, state.analyzing]);

  const handleGenerate = useCallback(async () => {
    const template = selectedTemplate(state);
    if (!state.productImage || !state.analyzeResponse || !template || state.generating) return;
    dispatch({ type: 'generate_start' });
    try {
      await onComplete({
        productImage: state.productImage,
        brief: state.brief.trim(),
        selectedTemplate: template,
        analyzeResponse: state.analyzeResponse,
        aspectRatio: state.aspectRatio,
        imageCount: state.imageCount,
      });
    } catch (error) {
      dispatch({ type: 'set_error', error: errorMessage(error) });
      dispatch({ type: 'generate_finish' });
    }
  }, [onComplete, state]);

  const aspectOptions = useMemo(
    () => ASPECT_RATIOS.map((ratio) => ({ value: ratio, label: ratio })),
    [],
  );
  const countOptions = useMemo(
    () => IMAGE_COUNTS.map((count) => ({ value: count, label: `${count} 张` })),
    [],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-on-surface">
      <header className="shrink-0 border-b border-white/[0.08] bg-[#111110]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime">Create</p>
            <h1 className="mt-1 truncate font-display text-lg font-semibold text-on-surface">创建商品图</h1>
          </div>
          <IconButton
            label="关闭"
            onClick={onClose}
            icon={<X aria-hidden="true" size={17} />}
            className="shrink-0"
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between text-xs text-on-surface-variant">
              <span>{activeStep.index}/3 · {activeStep.label}</span>
              <span>{activeStep.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-lime transition-all duration-300"
                style={{ width: `${activeStep.progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        {state.analyzing ? <AnalyzeLoading /> : null}
        {!state.analyzing && state.step === 'upload_brief' ? (
          <UploadBriefStep
            brief={state.brief}
            error={state.error}
            dragging={dragging}
            productImage={state.productImage}
            previewUrl={previewUrl}
            canSubmit={canAnalyze(state)}
            onBriefChange={(brief) => dispatch({ type: 'set_brief', brief })}
            onFileChange={handleFileChange}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onAnalyze={runAnalyze}
          />
        ) : null}
        {!state.analyzing && state.step === 'recommend' ? (
          <RecommendStep
            templates={state.analyzeResponse?.recommended_templates ?? []}
            selectedTemplateId={state.selectedTemplateId}
            error={state.error}
            onSelect={(templateId) => dispatch({ type: 'select_template', templateId })}
            onBack={() => dispatch({ type: 'back' })}
            onRefresh={runAnalyze}
            onNext={() => dispatch({ type: 'next_from_recommend' })}
            nextEnabled={canContinueFromRecommend(state)}
          />
        ) : null}
        {!state.analyzing && state.step === 'tune' && selected ? (
          <TuneStep
            template={selected}
            aspectRatio={state.aspectRatio}
            imageCount={state.imageCount}
            generating={state.generating}
            error={state.error}
            balance={balance}
            aspectOptions={aspectOptions}
            countOptions={countOptions}
            onAspectRatioChange={(aspectRatio) => dispatch({ type: 'set_aspect_ratio', aspectRatio })}
            onImageCountChange={(count) => dispatch({ type: 'set_image_count', imageCount: Number(count) })}
            onBack={() => dispatch({ type: 'back' })}
            onGenerate={handleGenerate}
          />
        ) : null}
      </main>
    </div>
  );
}

function AnalyzeLoading() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-5xl items-center justify-center">
      <Surface tone="subtle" padding="lg" className="w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lime/25 bg-lime/10 text-lime">
            <Loader2 aria-hidden="true" size={20} className="animate-spin" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-on-surface">AI 正在分析商品...</h2>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">正在识别商品特征，并匹配 3 个 benchmark 模板。</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <SkeletonBlock className="h-44" />
          <SkeletonBlock className="h-44" />
          <SkeletonBlock className="h-44" />
        </div>
      </Surface>
    </div>
  );
}

function UploadBriefStep({
  brief,
  error,
  dragging,
  productImage,
  previewUrl,
  canSubmit,
  onBriefChange,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onAnalyze,
}: {
  brief: string;
  error: string | null;
  dragging: boolean;
  productImage: File | null;
  previewUrl: string | null;
  canSubmit: boolean;
  onBriefChange: (brief: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDragLeave: (event: DragEvent<HTMLLabelElement>) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onAnalyze: () => void;
}) {
  const inputId = 'wizard-product-image-input';

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Surface tone="default" padding="lg" className="min-w-0">
        <div className="mb-5">
          <h2 className="font-display text-xl font-semibold text-on-surface">上传商品图</h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">建议上传白底图，多角度更准（v1 暂只支持单图）</p>
        </div>

        <FileInput id={inputId} accept={ACCEPTED} onChange={onFileChange} />
        <label
          htmlFor={inputId}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={[
            'flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all',
            dragging
              ? 'border-lime bg-lime/[0.06] shadow-[0_0_0_4px_rgba(227,255,116,0.08)]'
              : 'border-white/[0.12] bg-white/[0.025] hover:border-white/[0.2] hover:bg-white/[0.04]',
          ].join(' ')}
        >
          {previewUrl && productImage ? (
            <div className="flex w-full max-w-md flex-col items-center gap-4">
              <img src={previewUrl} alt="商品图预览" className="max-h-64 max-w-full rounded-xl object-contain shadow-[0_12px_40px_rgba(0,0,0,0.45)]" />
              <div className="flex max-w-full items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-on-surface-variant">
                <CheckCircle2 aria-hidden="true" size={14} className="shrink-0 text-lime" />
                <span className="truncate">{productImage.name}</span>
              </div>
              <span className="text-xs font-semibold text-lime">点击重新选择图片</span>
            </div>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lime/20 bg-lime/10 text-lime">
                <UploadCloud aria-hidden="true" size={26} />
              </div>
              <p className="mt-4 text-base font-semibold text-on-surface">拖放图片到这里，或点击上传</p>
              <p className="mt-2 text-sm text-on-surface-variant">支持 PNG / JPEG / WEBP</p>
            </>
          )}
        </label>

        <TextareaField
          fieldClassName="mt-5"
          label="创作需求（可选，最多 300 字）"
          helpText={`${brief.length}/300`}
          maxLength={300}
          rows={4}
          value={brief}
          onChange={(event) => onBriefChange(event.target.value)}
          placeholder="例如：更突出保湿卖点，适合淘宝主图，干净高级一点。"
        />

        {error ? <p className="mt-3 text-sm leading-6 text-error">{error}</p> : null}

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            variant="primary"
            disabled={!canSubmit}
            iconEnd={<Sparkles aria-hidden="true" size={15} />}
            onClick={onAnalyze}
          >
            下一步
          </Button>
        </div>
      </Surface>

      <Surface tone="subtle" padding="lg" className="min-w-0">
        <h3 className="text-sm font-semibold text-on-surface">示例商品图</h3>
        <p className="mt-1 text-xs leading-5 text-on-surface-variant">主体清晰、边缘干净、无遮挡的图片匹配更稳定。</p>
        <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-2">
          {EXAMPLE_IMAGES.map((imageUrl) => (
            <div key={imageUrl} className="aspect-square overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03]">
              <img src={imageUrl} alt="示例商品图" loading="lazy" className="h-full w-full object-cover opacity-80" />
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function RecommendStep({
  templates,
  selectedTemplateId,
  error,
  onSelect,
  onBack,
  onRefresh,
  onNext,
  nextEnabled,
}: {
  templates: RecommendedTemplate[];
  selectedTemplateId: string | null;
  error: string | null;
  onSelect: (templateId: string) => void;
  onBack: () => void;
  onRefresh: () => void;
  onNext: () => void;
  nextEnabled: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-on-surface">选择一个推荐模板</h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">AI 根据商品图推荐 3 个 benchmark 模板。选择后会按模板风格改写你的需求。</p>
        </div>
        <Button type="button" variant="ghost" iconStart={<RefreshCw aria-hidden="true" size={14} />} onClick={onRefresh}>
          都不满意？再来 3 个
        </Button>
      </div>

      {templates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {templates.map((template) => {
            const selected = selectedTemplateId === template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template.id)}
                aria-pressed={selected}
                className={[
                  'group min-w-0 overflow-hidden rounded-2xl border bg-surface text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/30',
                  selected
                    ? 'border-lime shadow-[0_0_0_1px_rgba(227,255,116,0.35),0_0_26px_rgba(227,255,116,0.16)]'
                    : 'border-white/[0.07] hover:border-white/[0.16] hover:bg-surface-container',
                ].join(' ')}
              >
                <div className="aspect-[4/3] bg-white/[0.04]">
                  {template.image_url ? (
                    <img src={template.image_url} alt={template.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                      <ImagePlus aria-hidden="true" size={24} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 font-display text-base font-semibold leading-6 text-on-surface">{template.title}</h3>
                    {selected ? <CheckCircle2 aria-hidden="true" size={18} className="shrink-0 text-lime" /> : null}
                  </div>
                  {template.curator_note ? (
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-on-surface-variant">{template.curator_note}</p>
                  ) : (
                    <p className="mt-2 min-h-10 text-sm leading-5 text-on-surface-variant">适合商品主图和场景图的模板风格。</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {template.style_tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-on-surface-variant">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <Surface tone="dashed" padding="lg" className="text-center">
          <h3 className="font-display text-lg font-semibold text-on-surface">暂时没有匹配模板</h3>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">模板库可能还没有可用 benchmark 行。可以返回换一张商品图，或再次分析。</p>
        </Surface>
      )}

      {error ? <p className="text-sm leading-6 text-error">{error}</p> : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" iconStart={<ArrowLeft aria-hidden="true" size={14} />} onClick={onBack}>
          返回上一步
        </Button>
        <Button type="button" variant="primary" disabled={!nextEnabled} onClick={onNext}>
          下一步
        </Button>
      </div>
    </div>
  );
}

function TuneStep({
  template,
  aspectRatio,
  imageCount,
  generating,
  error,
  balance,
  aspectOptions,
  countOptions,
  onAspectRatioChange,
  onImageCountChange,
  onBack,
  onGenerate,
}: {
  template: RecommendedTemplate;
  aspectRatio: string;
  imageCount: number;
  generating: boolean;
  error: string | null;
  balance: BalanceInfo | null;
  aspectOptions: { value: string; label: string }[];
  countOptions: { value: string; label: string }[];
  onAspectRatioChange: (aspectRatio: string) => void;
  onImageCountChange: (imageCount: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Surface tone="default" padding="lg" className="min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lime/20 bg-lime/10 text-lime">
            <Sparkles aria-hidden="true" size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-on-surface">输出设置</h2>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              AI 会用「{template.title}」风格生成 {imageCount} 张
            </p>
          </div>
        </div>

        <div className="mt-7 grid gap-5">
          <SegmentedControl
            label="图片比例"
            value={aspectRatio}
            options={aspectOptions}
            onChange={onAspectRatioChange}
          />
          <SegmentedControl
            label="生成数量"
            value={String(imageCount)}
            options={countOptions}
            onChange={onImageCountChange}
          />
        </div>

        <div className="mt-6">
          <CreditEstimate balance={balance} imageCount={imageCount} sizeTier="FAST" />
        </div>

        {error ? <p className="mt-3 text-sm leading-6 text-error">{error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" iconStart={<ArrowLeft aria-hidden="true" size={14} />} onClick={onBack}>
            返回上一步
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={generating}
            disabled={generating}
            onClick={onGenerate}
          >
            生成
          </Button>
        </div>
      </Surface>

      <Surface tone="subtle" padding="none" className="min-w-0 overflow-hidden">
        <div className="aspect-[4/3] bg-white/[0.04]">
          {template.image_url ? (
            <img src={template.image_url} alt={template.title} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <ImagePlus aria-hidden="true" size={24} />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display text-base font-semibold text-on-surface">{template.title}</h3>
          {template.curator_note ? <p className="mt-2 text-sm leading-6 text-on-surface-variant">{template.curator_note}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {template.style_tags.slice(0, 5).map((tag) => (
              <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-on-surface-variant">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Surface>
    </div>
  );
}
