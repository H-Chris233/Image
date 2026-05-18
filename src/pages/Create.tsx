import React, { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
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

const MODE_LABELS: Record<CreateMode, { title: string; sub: string }> = {
  general: { title: '图像生成', sub: '全能图像模型' },
  ecommerce: { title: '电商图', sub: '商品场景图' },
};

export default function Create() {
  const navigate = useNavigate();
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { t } = useSite();
  const { addTask } = useTasks();
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
    if (!prompt) { notifyError('请输入提示词'); return; }
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
      if (!prompt) notifyError('请先输入提示词');
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
    const files = Array.from<File>(event.target.files ?? new FileList()).filter((f) => f.type.startsWith('image/'));
    setSelectedReferences((prev) => [...prev, ...files.map((f) => createReferenceEntry(f))].slice(0, 8));
    event.target.value = '';
  }

  const modes = Object.entries(MODE_LABELS) as [CreateMode, { title: string; sub: string }][];

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center px-4 py-12">
      {/* 扇形叠层 Mode Tab */}
      <div className="relative flex items-end justify-center mb-6 h-20 w-full max-w-2xl">
        {modes.map(([m, label], idx) => {
          const isActive = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{ zIndex: isActive ? 10 : 5 - idx, left: `calc(50% - 120px + ${idx * 100}px)` }}
              className={`absolute bottom-0 w-[140px] rounded-t-2xl px-4 py-3 text-left transition-all duration-300 ${
                isActive
                  ? 'gradient-genesis text-white h-16 shadow-lg glow-cyan'
                  : 'bg-surface-container/80 text-on-surface-variant h-12 hover:bg-surface-container-high border border-outline-variant/50'
              }`}
            >
              <div className="text-sm font-semibold leading-tight font-display">{label.title}</div>
              {isActive && <div className="text-xs opacity-75 mt-0.5">{label.sub}</div>}
            </button>
          );
        })}
      </div>

      {/* 主输入卡片 */}
      <div
        className="w-full max-w-2xl rounded-2xl border border-outline-variant/60 bg-surface/80 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-shadow hover:shadow-[0_8px_40px_rgba(0,212,240,0.1)]"
        onDrop={handleRefImageDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* 参考图预览 */}
        {selectedReferences.length > 0 && (
          <div className="flex gap-2 flex-wrap p-4 pb-0">
            {selectedReferences.map((ref) => (
              <div key={ref.id} className="relative group">
                <img
                  src={URL.createObjectURL(ref.file)}
                  alt={ref.file.name}
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <button
                  type="button"
                  className="absolute -right-1.5 -top-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-surface-container-highest text-on-surface"
                  onClick={() => setSelectedReferences((prev) => prev.filter((r) => r.id !== ref.id))}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <div className="flex gap-3 p-4">
          <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high transition-colors">
            <ImagePlus size={18} className="text-on-surface-variant" />
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleRefImageChange} />
          </label>
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none min-h-[80px] leading-relaxed"
            placeholder={
              mode === 'ecommerce'
                ? '描述商品和目标场景，如：白色运动鞋，放在干净的白色背景上…'
                : '输入一句话，让 AI 帮你生成图片…'
            }
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
          />
        </div>

        {/* 底部参数栏 */}
        <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/50 px-4 py-3">
          <GenerationSelect
            label={t('home_scale') || '模型'}
            value={imageScale}
            onChange={setImageScale}
            options={SIZE_OPTIONS}
            getOptionLabel={(v) => SIZE_LABELS[v] ?? v}
            isOptionDisabled={(v) => !isSupportedImagePreset(v, aspectRatio)}
          />
          <GenerationSelect
            label={t('home_aspect_ratio') || '比例'}
            value={aspectRatio}
            onChange={setAspectRatio}
            options={ASPECT_RATIO_OPTIONS}
          />
          <GenerationSelect
            label={t('home_count') || '数量'}
            value={imageCount}
            onChange={setImageCount}
            options={IMAGE_COUNT_OPTIONS}
          />

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleOptimize}
              disabled={optimizingPrompt || !promptValue.trim()}
              className="flex h-9 items-center gap-1.5 rounded-full border border-outline-variant px-3 text-xs text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
            >
              {optimizingPrompt ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              优化
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="flex h-9 items-center gap-1.5 rounded-full gradient-genesis px-4 text-sm font-semibold text-white hover:brightness-110 transition-all disabled:opacity-50 shadow-[0_0_16px_rgba(0,212,240,0.25)]"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
              生成图片
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
