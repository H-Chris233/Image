import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { CloudUpload, X } from 'lucide-react';
import type { BalanceInfo } from '../../api';
import { CreditEstimate } from './CreditEstimate';

type Step = 'category' | 'upload' | 'scene';

export interface WizardCategory {
  id: string;
  name: string;
  nameEn: string;
  imageUrl: string;
  sceneTemplate: string;
}

const CATEGORIES: WizardCategory[] = [
  {
    id: 'beauty',
    name: '美妆护肤',
    nameEn: 'Beauty & Skincare',
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=160&h=160&fit=crop&auto=format&q=70',
    sceneTemplate: '将产品置于大理石台面上，搭配精致花卉与柔和散射自然光，营造高级护肤品的奢华质感。背景简洁，浅米色或白色调，展现产品的精致细节与品牌调性。',
  },
  {
    id: 'fashion',
    name: '服装鞋包',
    nameEn: 'Fashion & Apparel',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=160&h=160&fit=crop&auto=format&q=70',
    sceneTemplate: '服装产品平铺或悬挂展示，干净的白色或浅灰背景，专业棚拍布光，突出面料质感与版型结构。光线均匀，还原衣物真实色彩与细节。',
  },
  {
    id: 'food',
    name: '食品饮料',
    nameEn: 'Food & Beverage',
    imageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=160&h=160&fit=crop&auto=format&q=70',
    sceneTemplate: '产品置于木质或石板台面，搭配食材配料与道具，构成丰富美食场景。温暖自然光从侧方打入，营造食欲感与真实感，背景虚化突出产品主体。',
  },
  {
    id: 'home',
    name: '家居家具',
    nameEn: 'Home & Furniture',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=160&h=160&fit=crop&auto=format&q=70',
    sceneTemplate: '产品在真实家居环境中自然陈列，温馨的室内场景配以自然日光，搭配绿植与生活道具，展现产品融入生活的质感与使用场景。',
  },
  {
    id: 'tech',
    name: '3C 数码',
    nameEn: 'Tech & Electronics',
    imageUrl: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=160&h=160&fit=crop&auto=format&q=70',
    sceneTemplate: '产品在深色哑光台面展示，侧方冷色调硬光勾勒产品轮廓，营造科技感与高级感。极简背景，突出产品工业设计与精密细节。',
  },
  {
    id: 'jewelry',
    name: '珠宝配饰',
    nameEn: 'Jewelry & Accessories',
    imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=160&h=160&fit=crop&auto=format&q=70',
    sceneTemplate: '珠宝产品在反光亚克力或镜面台面展示，搭配精美绸缎与花瓣，柔和散射光勾勒光泽与切割面，背景纯净衬托奢华气质。',
  },
  {
    id: 'cpg',
    name: '消费品包装',
    nameEn: 'Consumer Packaged Goods',
    imageUrl: 'https://images.unsplash.com/photo-1585737374067-7c64dd9b59f0?w=160&h=160&fit=crop&auto=format&q=70',
    sceneTemplate: '包装产品以整洁专业的方式展示，干净白色背景或品牌色调简约渐变背景，清晰呈现包装设计细节与产品信息。',
  },
  {
    id: 'outdoor',
    name: '户外运动',
    nameEn: 'Sports & Outdoor',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=160&h=160&fit=crop&auto=format&q=70',
    sceneTemplate: '产品在自然户外场景中展示，强烈自然光线营造活力感，搭配山地或森林背景，展现产品的专业性能与运动精神。',
  },
];

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1', desc: '正方形' },
  { value: '4:3', label: '4:3', desc: '横版' },
  { value: '3:4', label: '3:4', desc: '竖版' },
  { value: '16:9', label: '16:9', desc: '横幅' },
];

const COUNT_OPTIONS = ['2', '4'];
const ACCEPTED = 'image/png,image/jpeg,image/webp';
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const STEP_PROGRESS: Record<Step, number> = {
  category: 33,
  upload: 66,
  scene: 100,
};

export interface WizardResult {
  category: WizardCategory;
  productImage: File;
  sceneDescription: string;
  aspectRatio: string;
  imageCount: string;
}

interface Props {
  onComplete: (result: WizardResult) => void;
  onClose: () => void;
  initialSceneDescription?: string;
  // 用于在第三步生成按钮上方展示估价；从父组件 Create.tsx 的 account?.balance 透传。
  balance?: BalanceInfo | null;
}

export function CreateFlowWizard({ onComplete, onClose, initialSceneDescription, balance = null }: Props) {
  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<WizardCategory | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productPreviewUrl, setProductPreviewUrl] = useState<string | null>(null);
  const [sceneDescription, setSceneDescription] = useState(initialSceneDescription ?? '');
  // 复用进来的提示词、或用户手动改过的内容，不应被选类目时的模板文案覆盖。
  const [sceneTouched, setSceneTouched] = useState(Boolean(initialSceneDescription));
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageCount, setImageCount] = useState('2');
  const [dragging, setDragging] = useState(false);

  // 替换图片或向导卸载时回收旧的 object URL，避免内存泄漏。
  useEffect(() => {
    return () => {
      if (productPreviewUrl) URL.revokeObjectURL(productPreviewUrl);
    };
  }, [productPreviewUrl]);

  const applyFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) return;
    setProductImage(file);
    setProductPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleCategorySelect = useCallback((cat: WizardCategory) => {
    setSelectedCategory(cat);
    setSceneDescription((current) => (sceneTouched ? current : cat.sceneTemplate));
    setStep('upload');
  }, [sceneTouched]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    e.target.value = '';
  }, [applyFile]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  }, [applyFile]);

  const goBack = useCallback(() => {
    if (step === 'scene') setStep('upload');
    else if (step === 'upload') setStep('category');
  }, [step]);

  const handleGenerate = useCallback(() => {
    if (!selectedCategory || !productImage || !sceneDescription.trim()) return;
    onComplete({ category: selectedCategory, productImage, sceneDescription, aspectRatio, imageCount });
  }, [selectedCategory, productImage, sceneDescription, aspectRatio, imageCount, onComplete]);

  const fileInputId = 'wizard-product-image-input';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-400">

      {/* ── Step 1: Category Selection ── */}
      {step === 'category' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <span className="text-sm font-medium text-zinc-300">新建创作</span>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 items-center gap-1.5 rounded px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X size={14} />
              Exit
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar */}
            <div className="hidden w-56 shrink-0 overflow-y-auto border-r border-zinc-800 px-2 py-4 md:block">
              <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">商品图类型</p>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className="group/btn mb-0.5 flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left transition-colors hover:bg-zinc-800"
                >
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="h-7 w-7 shrink-0 rounded object-cover opacity-60 transition-opacity group-hover/btn:opacity-100"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-300 transition-colors group-hover/btn:text-zinc-100">{cat.name}</p>
                    <p className="truncate text-[10px] text-zinc-600">{cat.nameEn}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Right main area */}
            <div className="flex flex-1 flex-col overflow-y-auto p-6 md:p-8">
              <h2 className="mb-1 w-full text-base font-medium text-zinc-300 md:text-lg">
                你想创建什么？
              </h2>
              <p className="mb-6 text-sm text-zinc-500">选择商品类别，AI 将为你匹配最佳场景描述</p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className="group/card flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition-all hover:border-zinc-600 hover:bg-zinc-800"
                  >
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="h-14 w-14 shrink-0 rounded-md object-cover opacity-70 transition-all duration-200 group-hover/card:scale-105 group-hover/card:opacity-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-200">{cat.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{cat.nameEn}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-lime-500 opacity-0 transition-opacity group-hover/card:opacity-100">
                      创建 →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Step 2: Upload ── */}
      {step === 'upload' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <button
              type="button"
              onClick={goBack}
              className="flex min-h-11 items-center gap-1.5 rounded px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              ← 返回
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 items-center gap-1.5 rounded px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X size={14} />
              Exit
            </button>
          </div>

          {/* Progress bar */}
          <div className="relative h-1 w-full bg-zinc-800">
            <div
              className="h-full rounded-r-full bg-lime-400 transition-all duration-500 ease-in-out"
              style={{ width: `${STEP_PROGRESS[step]}%` }}
            />
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            {/* Left panel */}
            <div className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b border-zinc-800 p-6 md:w-72 md:border-b-0 md:border-r md:px-8 md:py-10">
              <div>
                <h1 className="text-2xl font-normal text-zinc-300">上传商品图</h1>
                <p className="mt-2 text-sm text-zinc-500">多角度图片可获得更好的效果</p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-zinc-400">示例商品图</h3>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3 md:grid-cols-2">
                  {CATEGORIES.slice(0, 6).map((cat) => (
                    <div
                      key={cat.id}
                      className="group/ex relative aspect-square overflow-hidden rounded-md border border-zinc-800 transition-all hover:border-lime-700"
                    >
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="h-full w-full object-cover opacity-50 transition-transform duration-200 group-hover/ex:scale-105 group-hover/ex:opacity-80"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {selectedCategory && (
                <div className="mt-auto pt-2">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600">{selectedCategory.name}</p>
                </div>
              )}
            </div>

            {/* Right panel: upload zone */}
            <div
              className="flex flex-1 flex-col items-center justify-center p-6 md:p-10"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                id={fileInputId}
                type="file"
                accept={ACCEPTED}
                onChange={handleFileChange}
                className="sr-only"
              />

              {productPreviewUrl ? (
                /* Preview state */
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <img
                      src={productPreviewUrl}
                      alt="商品预览"
                      className="max-h-64 max-w-xs rounded-lg object-contain shadow-lg"
                    />
                    <label
                      htmlFor={fileInputId}
                      className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-400 hover:text-zinc-200"
                      title="重新选择"
                    >
                      <X size={11} />
                    </label>
                  </div>
                  <p className="text-xs text-zinc-500">{productImage?.name}</p>
                  <button
                    type="button"
                    onClick={() => setStep('scene')}
                    className="flex h-12 w-56 items-center justify-center gap-2 rounded-lg bg-lime-500 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90"
                  >
                    下一步：配置场景 →
                  </button>
                  <label
                    htmlFor={fileInputId}
                    className="cursor-pointer text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                  >
                    重新选择图片
                  </label>
                </div>
              ) : (
                /* Drop zone state */
                <label
                  htmlFor={fileInputId}
                  className={`flex h-72 w-full max-w-lg cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-all duration-200 ${
                    dragging
                      ? 'border-lime-500 bg-lime-500/5 shadow-[0_0_0_4px_rgba(132,204,22,0.08)]'
                      : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900'
                  }`}
                >
                  <CloudUpload
                    size={32}
                    className={`mb-1 transition-colors ${dragging ? 'text-lime-400' : 'text-zinc-600'}`}
                  />
                  <p className="text-sm text-zinc-400">
                    拖放图片到此处 <span className="text-zinc-600">或</span>
                  </p>
                  <span className="text-sm font-semibold text-lime-500">选择文件上传</span>
                  <p className="mt-1 text-[11px] text-zinc-600">支持 PNG · JPEG · WEBP</p>
                </label>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Step 3: Scene Config + Generate ── */}
      {step === 'scene' && selectedCategory && productPreviewUrl && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <button
              type="button"
              onClick={goBack}
              className="flex min-h-11 items-center gap-1.5 rounded px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              ← 返回
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-11 items-center gap-1.5 rounded px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X size={14} />
              Exit
            </button>
          </div>

          {/* Progress bar */}
          <div className="relative h-1 w-full bg-zinc-800">
            <div
              className="h-full rounded-r-full bg-lime-400 transition-all duration-500 ease-in-out"
              style={{ width: `${STEP_PROGRESS[step]}%` }}
            />
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            {/* Left panel: controls */}
            <div className="flex w-full shrink-0 flex-col overflow-y-auto border-b border-zinc-800 md:w-[380px] md:border-b-0 md:border-r">
              <div className="flex-1 overflow-y-auto p-6 md:px-8 md:py-10">
                <h1 className="mb-1 text-2xl font-normal text-zinc-300">生成商品大片</h1>
                <p className="mb-6 text-sm text-zinc-500">AI 已根据类别生成场景描述，可直接编辑调整</p>

                {/* Scene description */}
                <div className="mb-5 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-300">场景描述</h2>
                  </div>
                  <div className="w-full space-y-3">
                    <textarea
                      className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 p-3 text-sm leading-relaxed text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-lime-600 focus:ring-1 focus:ring-lime-600/30 transition-colors"
                      rows={5}
                      value={sceneDescription}
                      onChange={(e) => { setSceneDescription(e.target.value); setSceneTouched(true); }}
                      placeholder="描述你希望的场景风格…"
                    />
                  </div>
                </div>

                {/* Aspect ratio */}
                <div className="mb-5 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h2 className="mb-3 text-sm font-semibold text-zinc-300">图片比例</h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ASPECT_RATIOS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setAspectRatio(r.value)}
                        className={`flex flex-col items-center rounded-md border py-2.5 text-xs transition-all ${
                          aspectRatio === r.value
                            ? 'border-lime-500 bg-lime-500/10 text-lime-400'
                            : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <span className="font-semibold">{r.label}</span>
                        <span className="mt-0.5 text-[10px] opacity-60">{r.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image count */}
                <div className="mb-5 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h2 className="mb-3 text-sm font-semibold text-zinc-300">生成数量</h2>
                  <div className="flex gap-2">
                    {COUNT_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setImageCount(c)}
                        className={`flex h-10 w-16 items-center justify-center rounded-md border text-sm font-semibold transition-all ${
                          imageCount === c
                            ? 'border-lime-500 bg-lime-500/10 text-lime-400'
                            : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sticky generate button */}
              <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950 p-4">
                {/* 估价：按钮上方让用户掏钱前先看到预计消耗（#109） */}
                <div className="mb-3">
                  <CreditEstimate balance={balance} imageCount={Number(imageCount)} sizeTier="FAST" />
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!sceneDescription.trim()}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-lime-500 text-sm font-semibold text-zinc-900 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  生成商品大片
                </button>
              </div>
            </div>

            {/* Right panel: preview */}
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
              <div className="flex flex-col items-center gap-2">
                <img
                  src={productPreviewUrl}
                  alt="商品预览"
                  className="max-h-48 max-w-[200px] rounded-lg object-contain opacity-90 shadow-md"
                />
                <p className="text-xs text-zinc-500">{selectedCategory.name}</p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-300">即将重塑你的商品大片</h2>
                <p className="text-sm text-zinc-500">配置好场景后点击生成</p>
              </div>

              {/* Output placeholders */}
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${Math.min(Number(imageCount), 2)}, 1fr)` }}
              >
                {Array.from({ length: Number(imageCount) }).map((_, i) => (
                  <div
                    key={i}
                    className="flex aspect-square w-24 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 sm:w-28"
                  >
                    <span className="text-xs text-zinc-700">{i + 1}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-zinc-600">生成后结果将显示在主界面</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
