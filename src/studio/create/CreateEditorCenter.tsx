import { useEffect, useMemo, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RefreshCw, Sparkles, UploadCloud } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { SelectControl, TextareaControl, TextInputControl } from '../../components/design-system/FormField';
import { StatusPill } from '../../components/design-system/StatusPill';
import { ImageDropzone } from '../shared/ImageDropzone';
import type { StudioCreateTemplate } from './createTemplates';
import { isFileTemplateInput } from './templateQuickEditValidation';
import type { useTemplateGeneration } from './useTemplateGeneration';

type GenerationState = ReturnType<typeof useTemplateGeneration>;

export function CreateEditorCenter({
  template,
  generation,
  historyRail,
}: {
  template: StudioCreateTemplate;
  generation: GenerationState;
  historyRail?: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputs = template.requiredInputs.filter(isFileTemplateInput);
  const primaryInput = fileInputs[0] ?? null;
  const secondaryInputs = fileInputs.slice(1);
  const textInputs = template.requiredInputs.filter((input) => input.type === 'text');
  const showingResults = generation.resultUrls.length > 0;
  const busy = generation.status === 'submitting' || generation.status === 'polling';
  const heroImage = generation.resultUrls[0] || previewUrl || template.previewImage;

  useEffect(() => {
    if (!generation.primaryImage) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(generation.primaryImage);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [generation.primaryImage]);

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (primaryInput && file) generation.setInputFile(primaryInput.id, file);
  }

  const statusTone = showingResults
    ? 'success'
    : busy
      ? 'running'
      : generation.error || generation.validationMessage
        ? 'error'
        : 'neutral';

  return (
    <main className="@container min-h-0 overflow-y-auto bg-[#0f0f0d]">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 px-4 py-4 lg:px-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={statusTone}>
                {showingResults ? '结果' : busy ? '生成中' : generation.validationMessage ? '待补充' : '准备生成'}
              </StatusPill>
              <span className="text-xs font-semibold text-on-surface-variant">{template.platforms.slice(0, 3).join(' / ')}</span>
            </div>
            <h1 className="mt-3 truncate font-display text-2xl font-bold text-on-surface">{template.title}</h1>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">{template.useCase}</p>
          </div>
          <Button
            variant="primary"
            iconStart={busy ? <Loader2 className="animate-spin" size={15} /> : <UploadCloud size={15} />}
            disabled={!generation.canSubmit}
            loading={busy}
            className="min-w-36"
            onClick={generation.submitTemplate}
          >
            {generation.status === 'submitting' ? '提交中' : generation.status === 'polling' ? '生成中' : '生成'}
          </Button>
        </header>

        <section className="grid gap-4 @2xl:grid-cols-[minmax(200px,1fr)_minmax(0,3fr)] @2xl:items-start">
          <div className="min-w-0 space-y-3">
            {primaryInput ? (
              <div data-testid="create-primary-image-dropzone">
                <ImageDropzone
                  className="min-h-44"
                  label={primaryInput.label}
                  dragging={dragging}
                  previewUrl={previewUrl}
                  fileName={generation.primaryImage?.name}
                  onFileChange={(event) => generation.handleFileChange(primaryInput.id, event)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                />
              </div>
            ) : null}

            {secondaryInputs.length ? (
              <div className="grid gap-2">
                {secondaryInputs.map((input) => (
                  <label
                    key={input.id}
                    className="ds-motion-press flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 text-sm transition hover:border-white/[0.16]"
                  >
                    <span className="min-w-0">
                      <span className="block font-bold text-on-surface">{input.label}</span>
                      <span className="block truncate text-xs text-on-surface-variant">
                        {generation.inputFiles[input.id]?.name ?? (input.required ? '必填' : '可选')}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-on-surface-variant">上传</span>
                    <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => generation.handleFileChange(input.id, event)} />
                  </label>
                ))}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-black/30">
              {showingResults ? (
                <a href={heroImage} target="_blank" rel="noreferrer" className="ds-motion-press grid aspect-square place-items-center p-2">
                  <img src={heroImage} alt="生成结果主图" className="max-h-full max-w-full object-contain" />
                </a>
              ) : (
                <div className="grid aspect-square place-items-center p-2">
                  <img src={heroImage} alt="模板预览" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <div className="flex items-center gap-2 border-t border-white/[0.08] px-3 py-2 text-xs font-semibold text-on-surface-variant">
                {showingResults ? <CheckCircle2 size={14} className="shrink-0 text-lime" /> : <ImagePlus size={14} className="shrink-0" />}
                <span className="truncate">{showingResults ? '生成结果已就绪' : generation.primaryImage ? '已接入参考图' : '模板预览'}</span>
              </div>
            </div>

            {generation.resultUrls.length > 1 ? (
              <div className="grid grid-cols-2 gap-2">
                {generation.resultUrls.slice(1).map((url, index) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="ds-motion-press block overflow-hidden rounded-lg border border-white/[0.08] bg-black/20">
                    <img src={url} alt={`生成结果 ${index + 2}`} className="aspect-square w-full object-contain" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 space-y-4">
            <div className="grid gap-3 @md:grid-cols-2">
              {textInputs.map((input) => (
                <label key={input.id} className="grid gap-1.5">
                  <span className="text-xs font-semibold text-on-surface-variant">{input.label}</span>
                  <TextInputControl
                    value={generation.inputValues[input.id] ?? ''}
                    placeholder={`填写${input.label}`}
                    onChange={(event) => generation.setInputValues((current) => ({ ...current, [input.id]: event.target.value }))}
                  />
                </label>
              ))}
              {template.variables.map((variable) => (
                <VariableControl
                  key={variable.id}
                  variable={variable}
                  value={generation.variableValues[variable.id] ?? variable.defaultValue}
                  onChange={(value) => generation.setVariableValues((current) => ({ ...current, [variable.id]: value }))}
                />
              ))}
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-on-surface-variant">尺寸</span>
                <SelectControl value={generation.aspectRatio} onChange={(event) => generation.setAspectRatio(event.target.value)}>
                  {template.aspectRatios.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </SelectControl>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-semibold text-on-surface-variant">数量</span>
                <SelectControl value={String(generation.count)} onChange={(event) => generation.setCount(Number(event.target.value))}>
                  {generation.countOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectControl>
              </label>
            </div>

            <label className="grid gap-1.5">
              <span className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                <Sparkles size={14} className="text-lime" />
                提示词
              </span>
              <TextareaControl
                className="min-h-44"
                value={generation.promptOverride || generation.templatePrompt}
                onChange={(event) => generation.setPromptOverride(event.target.value)}
              />
            </label>
          </div>
        </section>

        {historyRail}

        {generation.error || generation.validationMessage ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/25 bg-error-container/10 p-3 text-xs leading-5 text-error">
            <AlertCircle className="mt-0.5 shrink-0" size={14} />
            <span className="min-w-0 flex-1">{generation.error || generation.validationMessage}</span>
            {generation.status === 'failed' ? (
              <button
                type="button"
                onClick={generation.submitTemplate}
                disabled={!generation.canSubmit}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-error/40 px-2.5 py-1 font-semibold text-error transition hover:bg-error/10 disabled:opacity-50"
              >
                <RefreshCw size={13} />
                重试
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function VariableControl({
  variable,
  value,
  onChange,
}: {
  variable: StudioCreateTemplate['variables'][number];
  value: string | boolean;
  onChange: (value: string) => void;
}) {
  if (variable.type === 'select') {
    return (
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-on-surface-variant">{variable.label}</span>
        <SelectControl value={String(value)} onChange={(event) => onChange(event.target.value)}>
          {(variable.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectControl>
      </label>
    );
  }

  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-on-surface-variant">{variable.label}</span>
      <TextInputControl value={String(value)} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
