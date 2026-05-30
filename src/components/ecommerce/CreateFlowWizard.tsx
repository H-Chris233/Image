import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import type { BalanceInfo } from '../../api';
import {
  Button,
  FileInput,
  IconButton,
  SegmentedControl,
  Surface,
  TextareaField,
} from '../design-system';
import { CreditEstimate } from './CreditEstimate';
import { SceneBrowser } from './SceneBrowser';
import type { SceneTemplate } from './sceneCatalog';
import {
  canContinueFromUpload,
  createInitialWizardState,
  wizardReducer,
  type WizardStep,
} from './createWizardState';

const ACCEPTED = 'image/png,image/jpeg,image/webp';
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16'] as const;
const IMAGE_COUNTS = ['1', '2', '3', '4'] as const;

const STEP_META: Record<WizardStep, { index: number; label: string; progress: number }> = {
  browse: { index: 1, label: '选择场景', progress: 33 },
  upload: { index: 2, label: '上传商品', progress: 67 },
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
  selectedTemplate: SceneTemplate;
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

  const handleGenerate = useCallback(async () => {
    if (!state.productImage || !state.selectedTemplate || state.generating) return;
    dispatch({ type: 'generate_start' });
    try {
      await onComplete({
        productImage: state.productImage,
        brief: state.brief.trim(),
        selectedTemplate: state.selectedTemplate,
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
        {state.step === 'browse' ? (
          <SceneBrowser onPick={(template) => dispatch({ type: 'select_template', template })} />
        ) : null}
        {state.step === 'upload' ? (
          <UploadStep
            templateTitle={state.selectedTemplate?.label ?? ''}
            brief={state.brief}
            error={state.error}
            dragging={dragging}
            productImage={state.productImage}
            previewUrl={previewUrl}
            canSubmit={canContinueFromUpload(state)}
            onBriefChange={(brief) => dispatch({ type: 'set_brief', brief })}
            onFileChange={handleFileChange}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onBack={() => dispatch({ type: 'back' })}
            onNext={() => dispatch({ type: 'next_from_upload' })}
          />
        ) : null}
        {state.step === 'tune' && state.selectedTemplate ? (
          <TuneStep
            template={state.selectedTemplate}
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

function UploadStep({
  templateTitle,
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
  onBack,
  onNext,
}: {
  templateTitle: string;
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
  onBack: () => void;
  onNext: () => void;
}) {
  const inputId = 'wizard-product-image-input';

  return (
    <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Surface tone="default" padding="lg" className="min-w-0">
        <div className="mb-5">
          <h2 className="font-display text-xl font-semibold text-on-surface">上传商品图</h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            {templateTitle ? `已选场景「${templateTitle}」，` : ''}建议上传白底图，主体清晰（目前支持单张商品图）
          </p>
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
          label="补充需求（可选，最多 300 字）"
          helpText={`${brief.length}/300`}
          maxLength={300}
          rows={4}
          value={brief}
          onChange={(event) => onBriefChange(event.target.value)}
          placeholder="例如：更突出保湿卖点，适合淘宝主图，干净高级一点。"
        />

        {error ? <p className="mt-3 text-sm leading-6 text-error">{error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" iconStart={<ArrowLeft aria-hidden="true" size={14} />} onClick={onBack}>
            返回选场景
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!canSubmit}
            iconEnd={<Sparkles aria-hidden="true" size={15} />}
            onClick={onNext}
          >
            下一步
          </Button>
        </div>
      </Surface>

      <Surface tone="subtle" padding="lg" className="min-w-0">
        <h3 className="text-sm font-semibold text-on-surface">示例商品图</h3>
        <p className="mt-1 text-xs leading-5 text-on-surface-variant">主体清晰、边缘干净、无遮挡的图片效果更稳定。</p>
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
  template: SceneTemplate;
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
              用「{template.label}」风格生成 {imageCount} 张
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
          {template.sampleImage ? (
            <img src={template.sampleImage} alt={template.label} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <ImagePlus aria-hidden="true" size={24} />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-display text-base font-semibold text-on-surface">{template.label}</h3>
          {template.prompt ? <p className="mt-2 line-clamp-4 text-sm leading-6 text-on-surface-variant">{template.prompt}</p> : null}
        </div>
      </Surface>
    </div>
  );
}
