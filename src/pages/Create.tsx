import React, { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, CheckCircle2, Clock3, ImageIcon, ImagePlus, Loader2, Sparkles, UploadCloud, X, XCircle } from 'lucide-react';
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
import { createReferenceEntry, REFERENCE_ROLE_OPTIONS, ReferenceImageEntry } from '../referenceImages';
import { useNotifier } from '../notifications';
import { useSite } from '../site';
import { useTasks } from '../tasks';

const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';

type CreateMode = 'general' | 'ecommerce';

const MODE_LABEL_KEYS = {
  general: { title: 'create_mode_general_title', sub: 'create_mode_general_sub' },
  ecommerce: { title: 'create_mode_ecommerce_title', sub: 'create_mode_ecommerce_sub' },
} as const;

const EXAMPLE_PROMPT_KEYS = {
  general: ['create_example_general_1', 'create_example_general_2', 'create_example_general_3'],
  ecommerce: ['create_example_ecommerce_1', 'create_example_ecommerce_2', 'create_example_ecommerce_3'],
} as const;

const WORKFLOW_NOTE_KEYS = {
  general: ['create_workflow_general_1', 'create_workflow_general_2', 'create_workflow_general_3'],
  ecommerce: ['create_workflow_ecommerce_1', 'create_workflow_ecommerce_2', 'create_workflow_ecommerce_3'],
} as const;

const TASK_STATUS_KEYS = {
  queued: 'create_task_status_queued',
  running: 'create_task_status_running',
  succeeded: 'create_task_status_succeeded',
  failed: 'create_task_status_failed',
} as const;

function taskStatusIcon(status: 'queued' | 'running' | 'succeeded' | 'failed') {
  if (status === 'queued') return <Clock3 size={13} className="text-[#8a8680]" />;
  if (status === 'running') return <Loader2 size={13} className="animate-spin text-[#E3FF74]" />;
  if (status === 'succeeded') return <CheckCircle2 size={13} className="text-[#4ade80]" />;
  return <XCircle size={13} className="text-[#ff6b6b]" />;
}

export default function Create() {
  const navigate = useNavigate();
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { t } = useSite();
  const { activeCount, openDrawer, tasks, addTask } = useTasks();
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
      openAuthModal('login', '/create');
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

  const modes = Object.entries(MODE_LABEL_KEYS) as [CreateMode, (typeof MODE_LABEL_KEYS)[CreateMode]][];
  const selectedReferencePreviews = useMemo(
    () => selectedReferences.map((ref) => ({ ...ref, previewUrl: URL.createObjectURL(ref.file) })),
    [selectedReferences],
  );
  const recentTasks = tasks.slice(0, 3);
  const outputSize = providerImageSize(imageScale, aspectRatio);

  useEffect(() => {
    return () => {
      selectedReferencePreviews.forEach((ref) => URL.revokeObjectURL(ref.previewUrl));
    };
  }, [selectedReferencePreviews]);

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-6 text-[#f0ede8] sm:py-8 lg:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(227,255,116,0.18)] bg-[rgba(227,255,116,0.08)] px-3 py-1 text-xs font-medium text-[#E3FF74]">
                <Sparkles size={12} />
                {t('create_workspace_tag')}
              </div>
              <h1 className="font-display text-2xl font-bold leading-tight text-[#f0ede8] sm:text-3xl">
                {t('create_workspace_title')}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a8680]">
                {t('create_workspace_desc')}
              </p>
            </div>
            <button
              type="button"
              onClick={openDrawer}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-4 text-sm font-medium text-[#d8d3cc] transition-colors hover:bg-white/[0.07] hover:text-[#f0ede8] sm:shrink-0"
            >
              <Clock3 size={14} />
              {activeCount > 0 ? t('create_active_tasks', { count: activeCount }) : t('create_task_center_idle')}
            </button>
          </div>

          <div className="mb-4 flex w-full justify-center sm:justify-start">
            <div className="grid w-full max-w-md grid-cols-2 rounded-2xl border border-white/[0.07] bg-[#171613] p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
              {modes.map(([m, label]) => {
                const isActive = mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-[#f0ede8] text-[#1a1917] shadow-[0_10px_28px_rgba(240,237,232,0.12)]'
                        : 'text-[#8a8680] hover:bg-white/[0.05] hover:text-[#f0ede8]'
                    }`}
                    aria-pressed={isActive}
                  >
                    <div className="font-display text-sm font-semibold leading-tight">{t(label.title)}</div>
                    <div className={`mt-0.5 text-xs leading-tight ${isActive ? 'opacity-60' : 'opacity-45'}`}>{t(label.sub)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1a1917] shadow-[0_8px_40px_rgba(0,0,0,0.5)] transition-shadow hover:shadow-[0_8px_40px_rgba(227,255,116,0.06)]"
            onDrop={handleRefImageDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#f0ede8]">{t('create_task_input_title')}</h2>
                <p className="mt-1 text-xs leading-5 text-[#8a8680]">
                  {selectedReferences.length > 0
                    ? t('create_reference_flow', { count: selectedReferences.length })
                    : t('create_text_flow')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[#8a8680]">
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1">{outputSize}</span>
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1">{aspectRatio}</span>
                <span className="rounded-full bg-white/[0.05] px-2.5 py-1">x{imageCount}</span>
              </div>
            </div>

            <div className="border-b border-white/[0.06] p-4">
              {selectedReferences.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedReferencePreviews.map((ref) => (
                    <div key={ref.id} className="group flex min-w-0 gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2">
                      <img src={ref.previewUrl} alt={ref.file.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 truncate text-xs font-medium text-[#f0ede8]">{ref.file.name}</div>
                          <button
                            type="button"
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#8a8680] transition-colors hover:bg-white/[0.08] hover:text-[#f0ede8]"
                            onClick={() => setSelectedReferences((prev) => prev.filter((r) => r.id !== ref.id))}
                            aria-label={t('create_remove_reference')}
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                          <select
                            className="h-8 min-w-0 rounded-lg border border-white/[0.08] bg-[#242220] px-2 text-xs text-[#d8d3cc] outline-none focus:border-[#E3FF74]"
                            value={ref.role}
                            onChange={(event) => setSelectedReferences((prev) => prev.map((item) => (
                              item.id === ref.id ? { ...item, role: event.target.value } : item
                            )))}
                            aria-label={t('create_reference_role_label')}
                          >
                            {REFERENCE_ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {t(option.labelKey)}
                              </option>
                            ))}
                          </select>
                          <input
                            className="h-8 min-w-0 rounded-lg border border-white/[0.08] bg-[#242220] px-2 text-xs text-[#d8d3cc] outline-none placeholder:text-[#6b6660] focus:border-[#E3FF74]"
                            value={ref.note}
                            onChange={(event) => setSelectedReferences((prev) => prev.map((item) => (
                              item.id === ref.id ? { ...item, note: event.target.value } : item
                            )))}
                            placeholder={t('create_reference_note_placeholder')}
                            aria-label={t('create_reference_note_label')}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-white/[0.025] px-4 py-5 text-center transition-colors hover:border-[rgba(227,255,116,0.28)] hover:bg-[rgba(227,255,116,0.04)]">
                  <UploadCloud size={20} className="text-[#E3FF74]" />
                  <span className="mt-2 text-sm font-medium text-[#f0ede8]">{t('create_reference_upload_title')}</span>
                  <span className="mt-1 text-xs leading-5 text-[#8a8680]">{t('create_reference_upload_desc')}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleRefImageChange} />
                </label>
              )}
            </div>

            <div className="flex gap-3 p-4">
              <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] transition-colors hover:bg-white/[0.07]" title={t('create_add_reference')}>
                <ImagePlus size={17} className="text-[#8a8680]" />
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleRefImageChange} />
              </label>
              <textarea
                ref={textareaRef}
                className="min-h-[118px] flex-1 resize-none bg-transparent text-sm leading-relaxed text-[#f0ede8] outline-none placeholder:text-[#4a4844]"
                placeholder={
                  mode === 'ecommerce'
                    ? t('create_prompt_placeholder_ecommerce')
                    : t('create_prompt_placeholder_general')
                }
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
              />
            </div>

            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPT_KEYS[mode].map((exampleKey) => {
                  const example = t(exampleKey);
                  return (
                  <button
                    key={exampleKey}
                    type="button"
                    onClick={() => {
                      setPromptValue(example);
                      textareaRef.current?.focus();
                    }}
                    className="max-w-full truncate rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-left text-xs text-[#8a8680] transition-colors hover:border-[rgba(227,255,116,0.24)] hover:bg-[rgba(227,255,116,0.06)] hover:text-[#f0ede8]"
                    title={example}
                  >
                    {example}
                  </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3 lg:flex-row lg:items-end">
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
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

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={optimizingPrompt || !promptValue.trim()}
                  className="btn-ghost h-9 text-xs disabled:opacity-40"
                >
                  {optimizingPrompt ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {optimizingPrompt ? t('home_optimizing_prompt') : t('home_optimize_prompt')}
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="btn-primary h-9 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
                  {t('create_generate_image')}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {WORKFLOW_NOTE_KEYS[mode].map((noteKey, index) => (
              <div key={noteKey} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
                <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(227,255,116,0.1)] text-xs font-bold text-[#E3FF74]">
                  {index + 1}
                </div>
                <div className="text-sm font-medium text-[#f0ede8]">{t(noteKey)}</div>
              </div>
            ))}
          </div>
        </main>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-white/[0.07] bg-[#1a1917] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.32)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#f0ede8]">{t('create_output_title')}</h2>
              <span className="rounded-full bg-[rgba(227,255,116,0.1)] px-2 py-1 text-xs font-medium text-[#E3FF74]">
                {selectedReferences.length > 0 ? t('create_output_reference_mode') : t('create_output_text_mode')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-white/[0.035] p-3">
                <div className="text-xs text-[#8a8680]">{t('home_aspect_ratio')}</div>
                <div className="mt-1 font-medium text-[#f0ede8]">{aspectRatio}</div>
              </div>
              <div className="rounded-xl bg-white/[0.035] p-3">
                <div className="text-xs text-[#8a8680]">{t('create_output_size')}</div>
                <div className="mt-1 font-medium text-[#f0ede8]">{outputSize}</div>
              </div>
              <div className="rounded-xl bg-white/[0.035] p-3">
                <div className="text-xs text-[#8a8680]">{t('home_image_count')}</div>
                <div className="mt-1 font-medium text-[#f0ede8]">{t('create_output_count_value', { count: imageCount })}</div>
              </div>
              <div className="rounded-xl bg-white/[0.035] p-3">
                <div className="text-xs text-[#8a8680]">{t('home_quality')}</div>
                <div className="mt-1 font-medium text-[#f0ede8]">{imageQuality}</div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#8a8680]">
              {t('create_output_desc')}
            </p>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-[#1a1917] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.32)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#f0ede8]">{t('create_recent_tasks_title')}</h2>
              <button
                type="button"
                onClick={openDrawer}
                className="text-xs font-medium text-[#8a8680] transition-colors hover:text-[#f0ede8]"
              >
                {t('create_view_all_tasks')}
              </button>
            </div>
            {recentTasks.length > 0 ? (
              <div className="space-y-2">
                {recentTasks.map((task) => {
                  const previewImage = task.items?.find((item) => item.image_url)?.image_url;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => navigate(`/workspace/${task.id}`)}
                      className="flex w-full min-w-0 gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2 text-left transition-colors hover:bg-white/[0.055]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.04]">
                        {previewImage ? (
                          <img src={previewImage} alt={task.prompt} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon size={16} className="text-[#8a8680]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs text-[#8a8680]">
                          {taskStatusIcon(task.status)}
                          <span>{t(TASK_STATUS_KEYS[task.status])}</span>
                          <span>·</span>
                          <span>{task.aspect_ratio || task.size}</span>
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#f0ede8]">{task.prompt}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.025] p-4 text-sm leading-6 text-[#8a8680]">
                {t('create_recent_tasks_empty')}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
