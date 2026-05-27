import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Download, ImageIcon, Images, Layers3, Loader2, Maximize2, PackagePlus, PenLine, RefreshCw, Sparkles, Upload, WandSparkles, X } from 'lucide-react';
import { generateEcommerceImages, getAccount, type AccountInfo } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import { CreateFlowWizard, type WizardResult } from '../components/ecommerce/CreateFlowWizard';
import { CountChips } from '../components/ecommerce/CountChips';
import { CreditEstimate } from '../components/ecommerce/CreditEstimate';
import { FormatPicker } from '../components/ecommerce/FormatPicker';
import { useNotifier } from '../notifications';
import { providerImageSize } from '../imageOptions';
import { useTasks } from '../tasks';

const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';
const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp';

type CreateMode = 'launcher' | 'product';

type ProductAsset = {
  file: File;
  previewUrl: string;
  categoryName: string;
  categoryNameEn: string;
};

type ProductStrategy = {
  productCategory: string;
  productCategoryEn: string;
  sceneDescription: string;
  sceneTemplateIds: string[];
  aspectRatio: string;
  imageCount: number;
  humanModel: string;
  background: string;
};

const PRODUCT_CATEGORIES = [
  { name: '其他商品', nameEn: 'Other' },
  { name: '美妆护肤', nameEn: 'Beauty & Skincare' },
  { name: '服装鞋包', nameEn: 'Fashion & Apparel' },
  { name: '食品饮料', nameEn: 'Food & Beverage' },
  { name: '家居家具', nameEn: 'Home & Furniture' },
  { name: '3C 数码', nameEn: 'Tech & Electronics' },
  { name: '消费品包装', nameEn: 'Consumer Packaged Goods' },
  { name: '户外运动', nameEn: 'Sports & Outdoor' },
];

const HUMAN_MODELS = [
  { id: 'none', label: 'None', prompt: '' },
  { id: 'hands', label: '手持', prompt: 'include a natural hand model holding or presenting the product' },
  { id: 'lifestyle', label: '生活模特', prompt: 'include a subtle lifestyle human model without stealing focus from the product' },
];

const BACKGROUNDS = [
  {
    id: 'studio',
    label: '棚拍',
    prompt: 'clean studio background with controlled soft lighting',
    preview: 'linear-gradient(135deg,rgba(255,255,255,0.88),rgba(196,190,181,0.92))',
  },
  {
    id: 'home',
    label: '家居',
    prompt: 'warm home interior background with natural light',
    preview: 'linear-gradient(135deg,rgba(120,86,54,0.88),rgba(226,197,158,0.9))',
  },
  {
    id: 'nature',
    label: '自然',
    prompt: 'fresh outdoor natural background with greenery and daylight',
    preview: 'linear-gradient(135deg,rgba(28,92,60,0.9),rgba(157,205,146,0.86))',
  },
  {
    id: 'none',
    label: 'None',
    prompt: 'minimal background, product remains the only hero subject',
    preview: 'linear-gradient(135deg,rgba(245,244,239,0.9),rgba(220,216,207,0.92))',
  },
];

const SCENE_TEMPLATES = [
  {
    id: 'white_bg',
    name: '纯白底图',
    desc: '电商标准主图',
    style: 'pure white ecommerce background, centered product, clean edge, subtle studio shadow',
    preview: 'linear-gradient(135deg,#fafafa,#dedbd2)',
  },
  {
    id: 'minimal_gradient',
    name: '简约渐变',
    desc: '高级品牌质感',
    style: 'minimal soft gradient background, premium clean product photography, refined composition',
    preview: 'linear-gradient(135deg,#dce8f8,#f1e1ef)',
  },
  {
    id: 'indoor_scene',
    name: '室内生活',
    desc: '种草场景图',
    style: 'warm indoor lifestyle scene, natural daylight, product integrated into a real home setting',
    preview: 'linear-gradient(135deg,#3d2a20,#9a7055)',
  },
  {
    id: 'outdoor_nature',
    name: '户外自然',
    desc: '自然光氛围',
    style: 'fresh outdoor natural scene, daylight, greenery, clean commercial product framing',
    preview: 'linear-gradient(135deg,#1a4a2e,#52c875)',
  },
  {
    id: 'commercial_poster',
    name: '商业海报',
    desc: '投放主视觉',
    style: 'commercial advertising poster style, strong contrast, bold product hero composition',
    preview: 'linear-gradient(135deg,#0d0d0b,#E3FF74)',
  },
  {
    id: 'product_closeup',
    name: '产品特写',
    desc: '材质细节',
    style: 'macro product close-up, detailed material texture, premium lighting, crisp focus',
    preview: 'linear-gradient(135deg,#171717,#727272)',
  },
];

const DEFAULT_SCENE_TEMPLATE_IDS = SCENE_TEMPLATES.slice(0, 3).map((item) => item.id);

const WORKFLOWS = [
  {
    id: 'product-images',
    title: '商品场景图',
    description: '上传商品图，生成主图、种草图和详情页素材。',
    icon: PackagePlus,
    active: true,
  },
  {
    id: 'marketing-ad',
    title: '营销广告图',
    description: '围绕卖点生成投放海报和活动视觉。',
    icon: Layers3,
    active: false,
  },
  {
    id: 'text-image',
    title: '文生图',
    description: '从提示词生成通用视觉草稿。',
    icon: WandSparkles,
    active: false,
  },
  {
    id: 'image-editor',
    title: 'AI 改图',
    description: '替换背景、重绘局部、延展图片。',
    icon: PenLine,
    active: false,
  },
];

export default function Create() {
  const location = useLocation();
  const navigate = useNavigate();
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { addTask, openDrawer } = useTasks();
  const { notifyError, notifyInfo } = useNotifier();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [mode, setMode] = useState<CreateMode>('launcher');
  const [showWizard, setShowWizard] = useState(false);
  const [asset, setAsset] = useState<ProductAsset | null>(null);
  const [strategy, setStrategy] = useState<ProductStrategy>({
    productCategory: PRODUCT_CATEGORIES[0].name,
    productCategoryEn: PRODUCT_CATEGORIES[0].nameEn,
    sceneDescription: '',
    sceneTemplateIds: DEFAULT_SCENE_TEMPLATE_IDS,
    aspectRatio: '1:1',
    imageCount: 2,
    humanModel: 'none',
    background: 'studio',
  });
  const [loading, setLoading] = useState(false);
  const [transferredPrompt, setTransferredPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!viewer?.authenticated) {
      setAccount(null);
      return;
    }
    let cancelled = false;
    getAccount()
      .then((data) => { if (!cancelled) setAccount(data); })
      .catch(() => { if (!cancelled) setAccount(null); });
    return () => { cancelled = true; };
  }, [viewer?.authenticated, viewer?.owner_id]);

  useEffect(() => {
    const state = location.state as { wizardResult?: WizardResult } | null;
    if (!state?.wizardResult) return;
    applyWizardResult(state.wizardResult);
    navigate('/create', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    const pendingPrompt = window.sessionStorage.getItem(PROMPT_TRANSFER_KEY);
    if (!pendingPrompt) return;
    setTransferredPrompt(pendingPrompt);
    window.sessionStorage.removeItem(PROMPT_TRANSFER_KEY);
  }, []);

  useEffect(() => {
    return () => {
      if (asset?.previewUrl) URL.revokeObjectURL(asset.previewUrl);
    };
  }, [asset?.previewUrl]);

  const canGenerate = Boolean(asset && strategy.sceneDescription.trim() && !loading);
  const selectedWorkflow = asset ? '商品场景图' : '选择工作流';
  const isOutOfCredits = Boolean(
    viewer?.authenticated &&
    account?.balance?.ok === true &&
    typeof account.balance.remaining === 'number' &&
    account.balance.remaining <= 0,
  );

  function applyWizardResult(result: WizardResult) {
    setAsset((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return {
        file: result.productImage,
        previewUrl: URL.createObjectURL(result.productImage),
        categoryName: result.category.name,
        categoryNameEn: result.category.nameEn,
      };
    });
    setStrategy({
      productCategory: result.category.name,
      productCategoryEn: result.category.nameEn,
      sceneDescription: result.sceneDescription,
      sceneTemplateIds: DEFAULT_SCENE_TEMPLATE_IDS,
      aspectRatio: result.aspectRatio,
      imageCount: Math.max(1, Math.min(4, Number(result.imageCount) || 2)),
      humanModel: 'none',
      background: 'studio',
    });
    setShowWizard(false);
    setMode('product');
  }

  function handleStartProductFlow() {
    if (!viewer?.authenticated) {
      openAuthModal('login', '/create', 'generate');
      return;
    }
    if (isOutOfCredits) {
      notifyError('免费额度已用完，升级继续');
      return;
    }
    setShowWizard(true);
  }

  function handleReplaceAsset(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAsset((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        categoryName: current?.categoryName || '商品',
        categoryNameEn: current?.categoryNameEn || 'Product',
      };
    });
    setMode('product');
  }

  function handleRemoveAsset() {
    setAsset((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    setStrategy({
      productCategory: PRODUCT_CATEGORIES[0].name,
      productCategoryEn: PRODUCT_CATEGORIES[0].nameEn,
      sceneDescription: '',
      sceneTemplateIds: DEFAULT_SCENE_TEMPLATE_IDS,
      aspectRatio: '1:1',
      imageCount: 2,
      humanModel: 'none',
      background: 'studio',
    });
    setMode('launcher');
  }

  async function handleGenerate() {
    if (!asset) {
      notifyError('请先上传商品图');
      return;
    }
    if (!viewer?.authenticated) {
      openAuthModal('login', '/create', 'generate');
      return;
    }
    if (!strategy.sceneDescription.trim()) {
      notifyError('请补充场景描述');
      return;
    }
    const selectedScenes = SCENE_TEMPLATES.filter((template) => strategy.sceneTemplateIds.includes(template.id));
    if (selectedScenes.length === 0) {
      notifyError('请至少选择一个场景模板');
      return;
    }

    setLoading(true);
    notifyInfo(`正在提交 ${selectedScenes.length} 套商品图生成任务`);
    try {
      const humanModel = HUMAN_MODELS.find((model) => model.id === strategy.humanModel);
      const background = BACKGROUNDS.find((item) => item.id === strategy.background);
      const baseExtraRequirements = [
        '从 /create 商品图工作流提交',
        humanModel?.prompt,
        background?.prompt,
      ].filter(Boolean).join('；');

      const settled = await Promise.allSettled(
        selectedScenes.map((scene) => generateEcommerceImages(
          {
            product_name: asset.file.name.replace(/\.[^.]+$/, ''),
            scenarios: `${strategy.productCategoryEn} / ${scene.name}`,
            platform: '淘宝/抖音',
            style: `${strategy.sceneDescription}\n\nScene template: ${scene.style}`,
            extra_requirements: `${baseExtraRequirements}；scene template: ${scene.name} - ${scene.desc}`,
            size: providerImageSize('FAST', strategy.aspectRatio),
            aspect_ratio: strategy.aspectRatio,
            quality: 'auto',
            n: Math.max(1, Math.min(4, strategy.imageCount)),
          },
          [{ file: asset.file, primary: true }],
        )),
      );

      settled.forEach((result) => {
        if (result.status === 'fulfilled') addTask(result.value);
      });
      openDrawer();
      const successCount = settled.filter((result) => result.status === 'fulfilled').length;
      if (successCount === 0) {
        const firstError = settled.find((result) => result.status === 'rejected');
        throw firstError && firstError.status === 'rejected' ? firstError.reason : new Error('生成任务提交失败');
      }
      notifyInfo(`已提交 ${successCount}/${selectedScenes.length} 套商品图，结果会进入任务中心和历史记录`);
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-screen-2xl px-4 pb-28 pt-6 lg:pb-8">
      {showWizard ? (
        <CreateFlowWizard
          onComplete={applyWizardResult}
          onClose={() => setShowWizard(false)}
        />
      ) : null}

      <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E3FF74]">Create</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#f0ede8] sm:text-3xl">创建图片生产任务</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            先选择生产意图，再上传商品图和配置场景。当前主路径对齐商品图片生产工作流。
          </p>
        </div>
        <div className="flex min-h-10 w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-white/60">
          <Sparkles size={14} className="text-[#E3FF74]" />
          {selectedWorkflow}
        </div>
      </div>

      {mode === 'launcher' ? (
        <WorkflowLauncher
          transferredPrompt={transferredPrompt}
          onStartProductFlow={handleStartProductFlow}
        />
      ) : (
        <ProductWorkbench
          asset={asset}
          canGenerate={canGenerate}
          fileInputRef={fileInputRef}
          loading={loading}
          strategy={strategy}
          onBack={() => setMode('launcher')}
          onGenerate={handleGenerate}
          onRemoveAsset={handleRemoveAsset}
          onReplaceAsset={handleReplaceAsset}
          onStrategyChange={setStrategy}
          onUploadClick={() => fileInputRef.current?.click()}
          account={account}
        />
      )}
    </div>
  );
}

function WorkflowLauncher({
  transferredPrompt,
  onStartProductFlow,
}: {
  transferredPrompt: string;
  onStartProductFlow: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.42fr)]">
      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#f0ede8]">选择要创建的内容</h2>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">Workflows</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {WORKFLOWS.map((workflow) => {
            const Icon = workflow.icon;
            return (
              <button
                key={workflow.id}
                type="button"
                onClick={workflow.active ? onStartProductFlow : undefined}
                disabled={!workflow.active}
                className={`min-h-40 rounded-lg border p-4 text-left transition-colors ${
                  workflow.active
                    ? 'border-[#E3FF74]/35 bg-[#191713] hover:border-[#E3FF74]/70 hover:bg-[#E3FF74]/[0.06]'
                    : 'cursor-not-allowed border-white/10 bg-white/[0.025] opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-[#E3FF74]">
                    <Icon size={18} />
                  </div>
                  {workflow.active ? (
                    <ArrowRight size={16} className="mt-1 text-[#E3FF74]" />
                  ) : (
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                      Soon
                    </span>
                  )}
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#f0ede8]">{workflow.title}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{workflow.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="min-w-0 rounded-lg border border-white/10 bg-[#14120f] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#f0ede8]">
          <ImageIcon size={16} className="text-[#E3FF74]" />
          从灵感复用
        </div>
        {transferredPrompt ? (
          <div className="rounded-lg border border-[#E3FF74]/20 bg-[#E3FF74]/[0.05] p-3">
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-[#f0ede8]/85 [overflow-wrap:anywhere]">
              {transferredPrompt}
            </p>
          </div>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 text-center">
            <Images size={22} className="mb-3 text-white/30" />
            <p className="text-sm text-on-surface-variant">从探索页复用提示词后，会出现在这里。</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function ProductWorkbench({
  asset,
  canGenerate,
  fileInputRef,
  loading,
  strategy,
  onBack,
  onGenerate,
  onRemoveAsset,
  onReplaceAsset,
  onStrategyChange,
  onUploadClick,
  account,
}: {
  asset: ProductAsset | null;
  canGenerate: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  strategy: ProductStrategy;
  onBack: () => void;
  onGenerate: () => void;
  onRemoveAsset: () => void;
  onReplaceAsset: (event: ChangeEvent<HTMLInputElement>) => void;
  onStrategyChange: (strategy: ProductStrategy) => void;
  onUploadClick: () => void;
  account: AccountInfo | null;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={onReplaceAsset}
        className="sr-only"
      />

      <aside className="min-w-0 rounded-lg border border-white/10 bg-[#14120f] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#f0ede8]">商品资产</h2>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-white/45 transition-colors hover:text-[#E3FF74]"
          >
            切换工作流
          </button>
        </div>

        {asset ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-black/25">
              <img src={asset.previewUrl} alt="商品资产预览" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="mt-3 min-w-0">
              <p className="truncate text-sm font-semibold text-[#f0ede8]">{asset.file.name}</p>
              <p className="mt-1 text-xs text-white/45">{asset.categoryName} · 原图可用于生成</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onUploadClick}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs font-semibold text-white/75 transition-colors hover:border-[#E3FF74]/40 hover:text-[#E3FF74]"
              >
                <Upload size={14} />
                替换
              </button>
              <button
                type="button"
                onClick={onRemoveAsset}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs font-semibold text-white/60 transition-colors hover:border-error/40 hover:text-error"
              >
                <X size={14} />
                移除
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onUploadClick}
            className="flex min-h-64 w-full flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-center transition-colors hover:border-[#E3FF74]/45"
          >
            <Upload size={24} className="mb-3 text-[#E3FF74]" />
            <span className="text-sm font-semibold text-[#f0ede8]">上传商品图</span>
            <span className="mt-1 text-xs text-white/45">PNG / JPEG / WEBP</span>
          </button>
        )}
      </aside>

      <ScenePreviewBoard asset={asset} strategy={strategy} />

      <aside className="min-w-0 rounded-lg border border-white/10 bg-[#14120f] p-4">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-[#f0ede8]">生成策略</h2>
          <p className="mt-1 text-xs leading-5 text-white/45">AI 场景描述、比例和数量会一起提交生成。</p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">Product Category</span>
            <select
              value={strategy.productCategoryEn}
              onChange={(event) => {
                const category = PRODUCT_CATEGORIES.find((item) => item.nameEn === event.target.value) ?? PRODUCT_CATEGORIES[0];
                onStrategyChange({
                  ...strategy,
                  productCategory: category.name,
                  productCategoryEn: category.nameEn,
                });
              }}
              className="h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm font-semibold text-[#f0ede8] outline-none transition-colors focus:border-[#E3FF74]/50"
            >
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category.nameEn} value={category.nameEn} className="bg-[#14120f] text-[#f0ede8]">
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-white/40">Scene Description</span>
            <textarea
              value={strategy.sceneDescription}
              onChange={(event) => onStrategyChange({ ...strategy, sceneDescription: event.target.value })}
              rows={7}
              className="w-full resize-none rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-[#f0ede8] outline-none transition-colors placeholder:text-white/25 focus:border-[#E3FF74]/50"
              placeholder="描述商品所处的拍摄场景、光线、背景和氛围"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/40">Scene Templates</span>
              <span className="text-[10px] font-semibold text-[#E3FF74]/75">默认素材包</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SCENE_TEMPLATES.map((template) => {
                const selected = strategy.sceneTemplateIds.includes(template.id);
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      const nextIds = selected
                        ? strategy.sceneTemplateIds.filter((id) => id !== template.id)
                        : [...strategy.sceneTemplateIds, template.id];
                      onStrategyChange({ ...strategy, sceneTemplateIds: nextIds });
                    }}
                    className={`overflow-hidden rounded-lg border text-left transition-colors ${
                      selected ? 'border-[#E3FF74]/70 bg-[#E3FF74]/[0.04]' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                    }`}
                    aria-pressed={selected}
                  >
                    <span className="block h-9" style={{ background: template.preview }} />
                    <span className="block min-w-0 px-2 py-2">
                      <span className={`block truncate text-xs font-bold ${selected ? 'text-[#E3FF74]' : 'text-[#f0ede8]/75'}`}>
                        {template.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-white/38">{template.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-white/40">Aspect Ratio</div>
            <FormatPicker
              value={strategy.aspectRatio}
              onChange={(aspectRatio) => onStrategyChange({ ...strategy, aspectRatio })}
            />
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-white/40">Number of Images</div>
            <CountChips
              value={strategy.imageCount}
              onChange={(imageCount) => onStrategyChange({ ...strategy, imageCount })}
              options={[2, 4]}
            />
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-white/40">Human Models</div>
            <div className="grid grid-cols-3 gap-2">
              {HUMAN_MODELS.map((model) => {
                const selected = strategy.humanModel === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => onStrategyChange({ ...strategy, humanModel: model.id })}
                    className={`h-10 rounded-lg border text-xs font-semibold transition-colors ${
                      selected
                        ? 'border-[#E3FF74]/70 bg-[#E3FF74]/10 text-[#E3FF74]'
                        : 'border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white/80'
                    }`}
                  >
                    {model.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-white/40">Background</div>
            <div className="grid grid-cols-4 gap-2">
              {BACKGROUNDS.map((background) => {
                const selected = strategy.background === background.id;
                return (
                  <button
                    key={background.id}
                    type="button"
                    onClick={() => onStrategyChange({ ...strategy, background: background.id })}
                    className={`min-h-16 overflow-hidden rounded-lg border text-left transition-colors ${
                      selected ? 'border-[#E3FF74]/70' : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <span className="block h-9" style={{ background: background.preview }} />
                    <span className={`block truncate px-2 py-1.5 text-[10px] font-semibold ${selected ? 'text-[#E3FF74]' : 'text-white/55'}`}>
                      {background.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <CreditEstimate
            balance={account?.balance ?? null}
            imageCount={Math.max(1, strategy.sceneTemplateIds.length) * strategy.imageCount}
            quality="auto"
          />
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#E3FF74] text-sm font-bold text-[#14120f] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          生成 {Math.max(1, strategy.sceneTemplateIds.length)} 套 / {Math.max(1, strategy.sceneTemplateIds.length) * strategy.imageCount} 张商品图
        </button>
      </aside>
    </div>
  );
}

function ScenePreviewBoard({ asset, strategy }: { asset: ProductAsset | null; strategy: ProductStrategy }) {
  const ratio = useMemo(() => {
    const [w, h] = strategy.aspectRatio.split(':').map(Number);
    if (!w || !h) return '1 / 1';
    return `${w} / ${h}`;
  }, [strategy.aspectRatio]);
  const background = BACKGROUNDS.find((item) => item.id === strategy.background) ?? BACKGROUNDS[0];
  const humanModel = HUMAN_MODELS.find((item) => item.id === strategy.humanModel) ?? HUMAN_MODELS[0];
  const sceneQueue = SCENE_TEMPLATES.filter((item) => strategy.sceneTemplateIds.includes(item.id));

  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-[#10100e] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#f0ede8]">Scene Preview Board</h2>
          <p className="mt-1 text-xs text-white/45">生成前确认商品、场景和画幅。</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-white/45">
          <Maximize2 size={14} />
          {strategy.aspectRatio}
        </div>
      </div>

      <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(227,255,116,0.08),rgba(254,110,0,0.05),rgba(255,255,255,0.02))] p-4">
        <div
          className="relative flex w-full max-w-[680px] items-center justify-center overflow-hidden rounded-md border border-white/15 bg-[#ded8cc]"
          style={{ aspectRatio: ratio }}
        >
          <div className="absolute inset-0" style={{ background: background.preview }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.42),transparent_28%)]" />
          <div className="absolute bottom-[12%] left-[12%] right-[12%] h-[18%] rounded-[50%] bg-black/10 blur-2xl" />

          {humanModel.id !== 'none' ? (
            <div className="absolute bottom-[18%] right-[16%] z-0 flex h-[38%] w-[18%] items-end justify-center opacity-70">
              <div className="h-full w-full rounded-t-full bg-black/18 blur-[1px]" />
            </div>
          ) : null}

          {asset ? (
            <img
              src={asset.previewUrl}
              alt="当前商品在场景预览中的位置"
              className="relative z-10 max-h-[62%] max-w-[58%] object-contain drop-shadow-[0_24px_34px_rgba(0,0,0,0.22)]"
            />
          ) : (
            <div className="relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-lg border border-dashed border-black/20 bg-white/45 text-center text-black/45">
              <ImageIcon size={22} />
              <span className="mt-2 text-xs font-semibold">等待商品图</span>
            </div>
          )}

          <div className="absolute left-4 top-4 z-20 rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">
            {strategy.productCategoryEn}
          </div>
          <div className="absolute right-4 top-4 z-20 rounded-full bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
            {background.label} · {humanModel.label}
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-20 rounded-md border border-white/25 bg-black/45 p-3 backdrop-blur">
            <p className="line-clamp-2 text-xs leading-5 text-white/82">
              {strategy.sceneDescription || '上传商品并选择场景后，AI 自动生成的拍摄方案会在这里预览。'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {sceneQueue.map((scene, index) => (
          <div key={scene.id} className="flex h-12 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#E3FF74]/10 text-xs font-bold text-[#E3FF74]">
              {index + 1}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#f0ede8]">{scene.name}</p>
              <p className="truncate text-[10px] text-white/35">{strategy.aspectRatio} · 每套 {strategy.imageCount} 张</p>
            </div>
          </div>
        ))}
        {sceneQueue.length === 0 ? (
          <div className="flex h-12 items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-white/38">
            请选择至少一个场景模板
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-semibold text-white/35">
          <RefreshCw size={13} />
          相似图
        </button>
        <button type="button" disabled className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-semibold text-white/35">
          <Download size={13} />
          下载全部
        </button>
      </div>
    </section>
  );
}
