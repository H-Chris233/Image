import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { getImageTask, ImageTask, HistoryItem } from '../api';
import RetryImage from '../components/RetryImage';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { useSite } from '../site';

type WorkspaceTab = 'quick' | 'advanced' | 'marketing';

const TAB_LABELS: Record<WorkspaceTab, string> = {
  quick: '快捷创作',
  advanced: '高级创作',
  marketing: 'AI 营销文案',
};

const POLL_INTERVAL = 1500;

export default function Workspace() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { t } = useSite();
  const [task, setTask] = useState<ImageTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('quick');
  const [previewImages, setPreviewImages] = useState<{ id: string; url: string; prompt: string }[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const t = await getImageTask(taskId!);
        if (cancelled) return;
        setTask(t);
        if (t.status === 'queued' || t.status === 'running') {
          timer = setTimeout(poll, POLL_INTERVAL);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败');
      }
    }

    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [taskId]);

  const isLoading = !task || task.status === 'queued' || task.status === 'running';
  const isFailed = task?.status === 'failed';
  const images: HistoryItem[] = task?.items ?? [];

  function openPreview(imgs: HistoryItem[], index: number) {
    setPreviewImages(imgs.map((img) => ({ id: img.id, url: img.image_url ?? '', prompt: img.prompt ?? '' })));
    setPreviewIndex(index);
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* 返回 */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-[#E3FF74] transition-colors mb-6"
        >
          <ArrowLeft size={15} />
          返回
        </button>

        {/* 错误提示 */}
        {error && (
          <div className="rounded-2xl border border-error/30 bg-error-container p-4 mb-6 flex items-center gap-2 text-sm text-on-error-container">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* 等待中 */}
        {isLoading && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#1a1917] backdrop-blur-sm p-8 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <Loader2 className="animate-spin text-[#E3FF74]" size={20} />
              <span className="text-sm font-medium text-on-surface">
                {task?.status === 'queued' ? '任务排队中…' : '正在生成图片…'}
              </span>
            </div>
            <div className="h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
              <div className="h-full gradient-genesis rounded-full animate-pulse w-1/3" />
            </div>
            {task?.prompt && (
              <p className="mt-4 text-xs text-on-surface-variant/60 line-clamp-2 italic">{task.prompt}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-[rgba(255,255,255,0.04)] animate-skeleton" />
              ))}
            </div>
          </div>
        )}

        {/* 失败 */}
        {isFailed && (
          <div className="rounded-2xl border border-error/30 bg-error-container p-6 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-error shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-on-error-container">生成失败</p>
              <p className="text-xs text-on-error-container/70 mt-1">{task?.error || '未知错误'}</p>
            </div>
          </div>
        )}

        {/* 结果图片 */}
        {!isLoading && images.length > 0 && (
          <div className="mb-8">
            <div className={`grid gap-3 ${images.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-2xl border-0 bg-transparent p-0 text-left group transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0e0c]"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}
                  onClick={() => openPreview(images, idx)}
                  aria-label={`${t('history_preview')} ${idx + 1}`}
                  title={`${t('history_preview')} ${idx + 1}`}
                >
                  <RetryImage
                    src={img.image_url ?? ''}
                    alt={img.prompt ?? task?.prompt ?? ''}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-x-0 top-0 h-0.5 gradient-genesis opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-end p-3 opacity-0 group-hover:opacity-100">
                    <span className="text-white text-[11px] font-medium bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                      {t('history_preview')}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <a
                href={`/api/tasks/${taskId}/download`}
                download
                className="flex items-center gap-1.5 rounded-full border border-[#E3FF74]/30 text-[#E3FF74] px-4 py-2 text-sm hover:bg-[#E3FF74]/[0.06] transition-colors"
              >
                <Download size={13} />
                下载全部
              </a>
              <button
                type="button"
                onClick={() => navigate('/create')}
                className="flex items-center gap-1.5 rounded-full border border-outline-variant/50 px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50 transition-colors"
              >
                <RotateCcw size={13} />
                重新生成
              </button>
            </div>
          </div>
        )}

        {/* 操作台子功能 Segment Control */}
        {!isLoading && (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1a1917] backdrop-blur-sm overflow-hidden">
            <div className="flex border-b border-[rgba(255,255,255,0.08)]">
              {(Object.keys(TAB_LABELS) as WorkspaceTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3.5 text-sm font-medium transition-all duration-200 ${
                    activeTab === tab
                      ? 'text-[#E3FF74] border-b-2 border-[#E3FF74] bg-[rgba(227,255,116,0.06)]'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04]'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'quick' && <QuickCreateTab prompt={task?.prompt ?? ''} />}
              {activeTab === 'advanced' && <AdvancedCreateTab prompt={task?.prompt ?? ''} />}
              {activeTab === 'marketing' && <MarketingTab images={images} />}
            </div>
          </div>
        )}
      </div>

      {previewImages && (
        <ImagePreviewModal
          images={previewImages}
          initialIndex={previewIndex}
          onClose={() => setPreviewImages(null)}
        />
      )}
    </div>
  );
}

function QuickCreateTab({ prompt }: { prompt: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">上传图片，选择平台模板快速生成变体。</p>
      <div className="rounded-2xl border-2 border-dashed border-[rgba(255,255,255,0.1)] flex items-center justify-center h-32 text-sm text-on-surface-variant hover:border-[rgba(0,212,240,0.4)] hover:text-[#E3FF74] transition-colors cursor-pointer">
        点击或拖拽上传参考图
      </div>
      {prompt && (
        <div className="text-xs text-on-surface-variant/70 bg-[rgba(255,255,255,0.04)] rounded-xl p-3 border border-[rgba(255,255,255,0.06)]">
          <span className="text-on-surface-variant font-medium">当前提示词：</span>{prompt}
        </div>
      )}
    </div>
  );
}

function AdvancedCreateTab({ prompt }: { prompt: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">自定义提示词、尺寸和风格参考图，精细控制生成效果。</p>
      <button
        type="button"
        onClick={() => {
          window.sessionStorage.setItem('aethergenix_pending_prompt', prompt);
          window.location.href = '/create';
        }}
        className="rounded-full bg-[#f0ede8] text-[#1a1917] px-6 py-2.5 text-sm font-semibold hover:brightness-110 transition-all shadow-[0_0_16px_rgba(0,212,240,0.2)]"
      >
        用当前提示词去创作页
      </button>
    </div>
  );
}

function MarketingTab({ images }: { images: HistoryItem[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">选择一张生成图，AI 自动分析商品并生成配套营销文案和排版。</p>
      {images.length === 0 ? (
        <p className="text-xs text-on-surface-variant/60">请先完成图片生成</p>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {images.map((img) => (
            <img
              key={img.id}
              src={img.image_url ?? ''}
              alt=""
              className="h-16 w-16 rounded-xl object-cover cursor-pointer border-2 border-transparent hover:border-[#00D4F0] transition-colors"
            />
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={images.length === 0}
        className="rounded-full bg-[#f0ede8] text-[#1a1917] px-6 py-2.5 text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-40 shadow-[0_0_16px_rgba(139,92,246,0.2)]"
      >
        生成营销文案
      </button>
    </div>
  );
}
