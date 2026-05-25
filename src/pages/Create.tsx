import React, { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ChevronDown, Clock3, ImagePlus, Loader2, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import {
  editImage,
  generateImage,
  optimizePrompt,
} from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import GenerationSelect from '../components/GenerationSelect';
import {
  ASPECT_RATIO_OPTIONS,
  IMAGE_COUNT_OPTIONS,
  isSupportedImagePreset,
  providerImageSize,
  QUALITY_OPTIONS,
  SIZE_LABELS,
  SIZE_OPTIONS,
} from '../imageOptions';
import { createReferenceEntry, ReferenceImageEntry } from '../referenceImages';
import { useNotifier } from '../notifications';
import { useSite } from '../site';
import { useTasks } from '../tasks';

const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';

type CreateMode = 'general' | 'ecommerce';

const MODE_LABEL_KEYS = {
  general: { title: 'create_mode_general_title', sub: 'create_mode_general_sub' },
  ecommerce: { title: 'create_mode_ecommerce_title', sub: 'create_mode_ecommerce_sub' },
} as const;

export default function Create() {
  const navigate = useNavigate();
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { t } = useSite();
  const { activeCount, addTask } = useTasks();
  const { notifyError } = useNotifier();

  const [mode, setMode] = useState<CreateMode>('general');
  const [promptValue, setPromptValue] = useState('');
  const [selectedReferences, setSelectedReferences] = useState<ReferenceImageEntry[]>([]);
  const [imageScale, setImageScale] = useState('FAST');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageQuality, setImageQuality] = useState('auto');
  const [imageCount, setImageCount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [optimizingPrompt, setOptimizingPromptState] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pending = window.sessionStorage.getItem(PROMPT_TRANSFER_KEY);
    if (pending) {
      setPromptValue(pending);
      window.sessionStorage.removeItem(PROMPT_TRANSFER_KEY);
      textareaRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!isSupportedImagePreset(imageScale, aspectRatio)) {
      setAspectRatio(ASPECT_RATIO_OPTIONS[0]);
    }
  }, [imageScale, aspectRatio]);

  async function handleGenerate() {
    if (!viewer?.authenticated) {
      openAuthModal('login', '/create', 'generate');
      return;
    }
    const prompt = promptValue.trim();
    if (!prompt) { notifyError(t('create_prompt_required')); return; }
    if (loading) return;

    setLoading(true);
    try {
      const payload = {
        prompt,
        size: providerImageSize(imageScale, aspectRatio),
        aspect_ratio: aspectRatio,
        quality: imageQuality,
        n: Math.max(1, Math.min(9, Number(imageCount) || 1)),
      };

      const task = selectedReferences.length > 0
        ? await editImage(
            payload,
            selectedReferences.map((r) => ({ file: r.file, role: r.role, note: r.note })),
          )
        : await generateImage(payload);

      addTask(task);
      navigate(`/workspace/${task.id}`);
    } catch (err) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOptimize() {
    const prompt = promptValue.trim();
    if (!prompt || optimizingPrompt) {
      if (!prompt) notifyError(t('create_prompt_before_optimize'));
      return;
    }
    setOptimizingPromptState(true);
    try {
      const result = await optimizePrompt({
        prompt,
        size: providerImageSize(imageScale, aspectRatio),
        aspect_ratio: aspectRatio,
        quality: imageQuality,
      });
      setPromptValue(result.prompt);
    } catch (err) {
      notifyError(err);
    } finally {
      setOptimizingPromptState(false);
    }
  }

  function handleRefImageDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const files = Array.from<File>(event.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    setSelectedReferences((prev) => [...prev, ...files.map((f) => createReferenceEntry(f))].slice(0, 8));
  }

  function handleRefImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
      ? Array.from<File>(event.target.files).filter((f) => f.type.startsWith('image/'))
      : [];
    setSelectedReferences((prev) => [...prev, ...files.map((f) => createReferenceEntry(f))].slice(0, 8));
    event.target.value = '';
  }

  function openReferenceFilePicker() {
    referenceFileInputRef.current?.click();
  }

  const modes = Object.entries(MODE_LABEL_KEYS) as [CreateMode, (typeof MODE_LABEL_KEYS)[CreateMode]][];
  const selectedReferencePreviews = useMemo(
    () => selectedReferences.map((ref) => ({ ...ref, previewUrl: URL.createObjectURL(ref.file) })),
    [selectedReferences],
  );
  const outputSize = providerImageSize(imageScale, aspectRatio);
  const promptPlaceholder = mode === 'ecommerce'
    ? t('create_prompt_placeholder_ecommerce')
    : t('create_prompt_placeholder_general');
  const compactSettingsSummary = `${imageScale === 'FAST' ? t('home_size_fast') : SIZE_LABELS[imageScale] ?? outputSize} / ${aspectRatio} / ${t('create_output_count_value', { count: imageCount })} / ${imageQuality}`;

  const renderModeSwitch = (className = '') => (
    <div className={`grid w-full grid-cols-2 gap-1 rounded-lg border border-white/[0.07] bg-[#111110] p-1 ${className}`}>
      {modes.map(([m, label]) => {
        const isActive = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`min-h-11 min-w-0 rounded-md px-3 py-2 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 ${
              isActive
                ? 'bg-[#f0ede8] text-[#1a1917] shadow-[0_10px_28px_rgba(240,237,232,0.12)]'
                : 'text-[#8a8680] hover:bg-white/[0.05] hover:text-[#f0ede8]'
            }`}
            aria-pressed={isActive}
          >
            <div className="truncate font-display text-sm font-semibold leading-tight">{t(label.title)}</div>
            <div className={`mt-0.5 truncate text-xs leading-snug ${isActive ? 'opacity-60' : 'opacity-45'}`}>{t(label.sub)}</div>
          </button>
        );
      })}
    </div>
  );

  const renderActionButtons = (className = '') => (
    <div className={`grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleOptimize}
        disabled={optimizingPrompt || !promptValue.trim()}
        className="btn-ghost min-h-11 min-w-0 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 disabled:opacity-40"
      >
        {optimizingPrompt ? <Loader2 aria-hidden="true" size={13} className="animate-spin" /> : <Sparkles aria-hidden="true" size={13} />}
        <span className="min-w-0 truncate">{optimizingPrompt ? t('home_optimizing_prompt') : t('home_optimize_prompt')}</span>
      </button>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="btn-primary min-h-11 min-w-0 px-3 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_16px_36px_rgba(240,237,232,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 disabled:opacity-50"
      >
        {loading ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : <ArrowUp aria-hidden="true" size={15} />}
        <span className="min-w-0 truncate">{t('create_generate_image')}</span>
      </button>
    </div>
  );

  useEffect(() => {
    return () => {
      selectedReferencePreviews.forEach((ref) => URL.revokeObjectURL(ref.previewUrl));
    };
  }, [selectedReferencePreviews]);

  return (
    <div className="min-h-[calc(100vh-64px)] overflow-x-hidden px-3 pb-36 pt-4 text-[#f0ede8] sm:px-4 lg:px-6 lg:py-10">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-3 lg:min-h-[calc(100vh-144px)] lg:justify-center">
        {activeCount > 0 ? (
          <div className="flex justify-end">
            <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[rgba(227,255,116,0.18)] bg-[rgba(227,255,116,0.08)] px-4 text-sm font-medium text-[#E3FF74]">
              <Clock3 aria-hidden="true" size={14} />
              {t('create_active_tasks', { count: activeCount })}
            </div>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-[rgba(227,255,116,0.16)] bg-[#1a1917] shadow-[0_22px_90px_rgba(0,0,0,0.62),0_0_0_1px_rgba(255,255,255,0.03)]">
          <input
            ref={referenceFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleRefImageChange}
          />

          <div className="border-b border-white/[0.06] p-2 sm:p-3">
            {renderModeSwitch()}
          </div>

          <div
            className="p-3 sm:p-4"
            onDrop={handleRefImageDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex gap-3">
              <button
                type="button"
                className="mt-0.5 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] transition-colors hover:bg-white/[0.07] focus-visible:border-[rgba(227,255,116,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/30"
                title={t('create_add_reference')}
                aria-label={t('create_add_reference')}
                onClick={openReferenceFilePicker}
              >
                <ImagePlus aria-hidden="true" size={18} className="text-[#d8d3cc]" />
              </button>
              <textarea
                ref={textareaRef}
                className="min-h-[188px] min-w-0 flex-1 resize-none bg-transparent text-base leading-7 text-[#f0ede8] outline-none placeholder:text-[#8a8680] sm:min-h-[220px]"
                aria-label={promptPlaceholder}
                placeholder={promptPlaceholder}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
              />
            </div>

            {selectedReferencePreviews.length > 0 ? (
              <div className="mt-3 border-t border-white/[0.06] pt-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-[#8a8680]">{selectedReferences.length} / 8</span>
                </div>
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                  {selectedReferencePreviews.map((ref) => (
                    <div
                      key={ref.id}
                      className="flex h-16 w-[160px] shrink-0 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] p-2"
                    >
                      <img src={ref.previewUrl} alt={ref.file.name} className="h-12 w-12 shrink-0 rounded-md object-cover" />
                      <div className="min-w-0 flex-1 truncate text-xs font-medium text-[#d8d3cc]">{ref.file.name}</div>
                      <button
                        type="button"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#8a8680] transition-colors hover:bg-white/[0.08] hover:text-[#f0ede8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
                        onClick={() => setSelectedReferences((prev) => prev.filter((r) => r.id !== ref.id))}
                        aria-label={t('create_remove_reference')}
                        title={t('create_remove_reference')}
                      >
                        <X aria-hidden="true" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/[0.06] bg-[#141310] px-3 py-3 sm:px-4">
            <details className="group rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-[#8a8680] outline-none transition-colors hover:text-[#f0ede8] focus-visible:ring-2 focus-visible:ring-[#E3FF74]/30 [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-2">
                  <SlidersHorizontal aria-hidden="true" size={15} className="shrink-0" />
                  <span className="min-w-0 truncate text-xs">{compactSettingsSummary}</span>
                </span>
                <ChevronDown aria-hidden="true" size={16} className="shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] p-3 sm:grid-cols-4">
                <GenerationSelect
                  label={t('home_size')}
                  value={imageScale}
                  onChange={setImageScale}
                  options={SIZE_OPTIONS}
                  getOptionLabel={(v) => (v === 'FAST' ? t('home_size_fast') : SIZE_LABELS[v] ?? v)}
                  isOptionDisabled={(v) => !isSupportedImagePreset(v, aspectRatio)}
                />
                <GenerationSelect
                  label={t('home_aspect_ratio')}
                  value={aspectRatio}
                  onChange={setAspectRatio}
                  options={ASPECT_RATIO_OPTIONS}
                />
                <GenerationSelect
                  label={t('home_quality')}
                  value={imageQuality}
                  onChange={setImageQuality}
                  options={QUALITY_OPTIONS}
                />
                <GenerationSelect
                  label={t('home_image_count')}
                  value={imageCount}
                  onChange={setImageCount}
                  options={IMAGE_COUNT_OPTIONS}
                />
              </div>
            </details>

            {renderActionButtons('mt-3 lg:ml-auto lg:max-w-[360px]')}
          </div>
        </section>
      </main>
    </div>
  );
}
