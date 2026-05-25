import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, ImagePlus, Loader2, Maximize2, Paperclip, PencilLine, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import {
  analyzeEcommerceProduct,
  cancelImageTask,
  deleteHistory,
  editHistoryImage,
  formatDate,
  generateEcommercePublishCopy,
  generateEcommerceImages,
  getAccount,
  getConfig,
  getHistory,
  removeBackground,
  taskDownloadUrl,
  type AccountInfo,
  type EcommerceAnalyzeResult,
  type EcommercePublishCopyResult,
  type EcommerceRecommendedPlan,
  HistoryItem,
} from '../api';
import { BackgroundRemovalPreview } from '../components/ecommerce/BackgroundRemovalPreview';
import { BatchResultPanel, type BatchResult } from '../components/ecommerce/BatchResultPanel';
import { CountChips } from '../components/ecommerce/CountChips';
import { CreditEstimate } from '../components/ecommerce/CreditEstimate';
import { FormatPicker } from '../components/ecommerce/FormatPicker';
import { GenerationProgress } from '../components/ecommerce/GenerationProgress';
import { ResultPanel } from '../components/ecommerce/ResultPanel';
import { SampleGallery } from '../components/ecommerce/SampleGallery';
import { TemplatePicker } from '../components/ecommerce/TemplatePicker';
import CompactInput from '../components/CompactInput';
import GenerationSelect from '../components/GenerationSelect';
import ImagePreviewModal from '../components/ImagePreviewModal';
import ModelBadge from '../components/ModelBadge';
import PromptEditorModal from '../components/PromptEditorModal';
import RetryImage from '../components/RetryImage';
import { copyTextToClipboard } from '../clipboard';
import { groupHistoryItems, HistoryGroup, mergeHistoryItems } from '../historyGroups';
import { useGenerationMetrics } from '../hooks/useGenerationMetrics';
import {
  ASPECT_RATIO_OPTIONS,
  IMAGE_COUNT_OPTIONS,
  isSupportedImagePreset,
  normalizeImageScale,
  providerImageSize,
  QUALITY_OPTIONS,
  SIZE_LABELS,
  SIZE_OPTIONS,
} from '../imageOptions';
import { createReferenceEntry, DEFAULT_REFERENCE_ROLE, REFERENCE_ROLE_OPTIONS, ReferenceImageEntry } from '../referenceImages';
import { useAuth } from '../auth';
import { useNotifier } from '../notifications';
import { useSite } from '../site';
import { useTasks } from '../tasks';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const STYLE_TEMPLATES = [
  {
    id: 'white_bg',
    emoji: '⬜',
    name: '纯白底图',
    desc: '电商标准白底，主图必备',
    style: '纯白色背景，产品居中，边缘干净，专业电商白底风格，无阴影',
    scenarios: '电商平台商品主图，白底背景',
    previewGradient: 'linear-gradient(135deg, #f8f8f6 0%, #e8e5e0 100%)',
    exampleImageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&auto=format&q=80',
  },
  {
    id: 'minimal_gradient',
    emoji: '🌫',
    name: '简约渐变',
    desc: '淡雅渐变，高级质感',
    style: '简约淡色渐变背景，高级干净，极简现代感',
    scenarios: '品牌官网展示，高端电商场景图',
    previewGradient: 'linear-gradient(135deg, #dce8f8 0%, #ede6f8 50%, #f8e6f0 100%)',
    exampleImageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop&auto=format&q=80',
  },
  {
    id: 'indoor_scene',
    emoji: '🛋',
    name: '室内生活',
    desc: '居家氛围，种草利器',
    style: '温馨真实室内生活场景，自然日光，高质感生活气息',
    scenarios: '室内生活场景，桌面摆拍，沙发旁，生活化陈设',
    previewGradient: 'linear-gradient(135deg, #3d2a20 0%, #6b4a35 55%, #9a7055 100%)',
    exampleImageUrl: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&h=400&fit=crop&auto=format&q=80',
  },
  {
    id: 'outdoor_nature',
    emoji: '🌿',
    name: '户外自然',
    desc: '清新自然光，格调提升',
    style: '自然户外场景，清新明亮，真实自然光',
    scenarios: '户外自然场景，草地、石板路、木质桌面等自然背景',
    previewGradient: 'linear-gradient(135deg, #1a4a2e 0%, #2d8a4a 55%, #52c875 100%)',
    exampleImageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=400&fit=crop&auto=format&q=80',
  },
  {
    id: 'commercial_poster',
    emoji: '🎯',
    name: '商业海报',
    desc: '视觉冲击，促销利器',
    style: '商业海报风格，高对比度，视觉冲击感强，现代设计感',
    scenarios: '活动促销海报，品牌主视觉，详情页 banner',
    previewGradient: 'linear-gradient(135deg, #0d0d0b 0%, #242220 55%, #E3FF74 100%)',
    exampleImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format&q=80',
  },
  {
    id: 'festive',
    emoji: '🎁',
    name: '节日氛围',
    desc: '暖色氛围，大促必备',
    style: '节日喜庆氛围，温暖橙红色调，活动感强，礼物感',
    scenarios: '节假日大促场景，礼品礼盒展示，年节活动',
    previewGradient: 'linear-gradient(135deg, #6b1200 0%, #cc3300 50%, #ff8c00 100%)',
    exampleImageUrl: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=400&h=400&fit=crop&auto=format&q=80',
  },
];

const TEMPLATE_KEYWORDS: Record<string, string[]> = {
  white_bg: ['白底', '白色', '纯白', '白背景', 'white', 'clean', '干净', '纯色', '简单背景'],
  minimal_gradient: ['渐变', '极简', '简约', '高级', '淡色', 'gradient', 'minimal', '现代', '质感'],
  indoor_scene: ['室内', '家居', '生活', '桌面', '居家', 'indoor', '自然光', '咖啡', '陈设', '摆拍'],
  outdoor_nature: ['户外', '自然', '绿色', '森林', '草地', 'outdoor', 'nature', '阳光', '清新', '树木'],
  commercial_poster: ['海报', '商业', '广告', '时尚', 'poster', '促销', '视觉', '冲击', '大气', '品牌'],
  festive: ['节日', '节庆', '氛围', '喜庆', '圣诞', '新年', '春节', 'festive', 'holiday', '大促', '礼物'],
};

function pickRecommendedTemplateIds(styleSuggestions: string[]): string[] {
  if (!styleSuggestions.length) return [];
  const text = styleSuggestions.join(' ').toLowerCase();
  return Object.entries(TEMPLATE_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => text.includes(kw.toLowerCase())))
    .map(([id]) => id)
    .slice(0, 3);
}

const FREEMIUM_CHIP_STYLE = {
  borderColor: 'rgba(227,255,116,0.3)',
  background: 'rgba(227,255,116,0.05)',
} as const;

const FREEMIUM_DOT_STYLE = { backgroundColor: 'var(--ag-lime)' } as const;
const FREEMIUM_TEXT_STYLE = { color: 'var(--ag-lime)' } as const;

export default function Ecommerce() {
  const { viewer } = useAuth();
  const { t } = useSite();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  useEffect(() => {
    if (!viewer?.authenticated) { setAccount(null); return; }
    let cancelled = false;
    getAccount()
      .then((data) => { if (!cancelled) setAccount(data); })
      .catch(() => { if (!cancelled) setAccount(null); });
    return () => { cancelled = true; };
  }, [viewer?.authenticated, viewer?.owner_id]);
  const isOutOfCredits = Boolean(
    viewer?.authenticated &&
    account?.balance?.ok === true &&
    typeof account.balance.remaining === 'number' &&
    account.balance.remaining <= 0,
  );
  const { addTask, closeDrawer, taskHistoryItems } = useTasks();
  const { notifyError, notifySuccess, notifyInfo } = useNotifier();
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<{ name: string; url: string } | null>(null);
  const [productReferenceRole, setProductReferenceRole] = useState(DEFAULT_REFERENCE_ROLE);
  const [productReferenceNote, setProductReferenceNote] = useState('');
  const [productReferences, setProductReferences] = useState<ReferenceImageEntry[]>([]);
  const [productReferencePreviews, setProductReferencePreviews] = useState<{ id: string; name: string; url: string }[]>([]);
  const [form, setForm] = useState({
    productName: '',
    materials: '',
    sellingPoints: '',
    scenarios: '',
    platform: '淘宝/抖音',
    style: '高级、干净、统一电商详情页',
    extraRequirements: '',
  });
  const [imageScale, setImageScale] = useState('FAST');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageQuality, setImageQuality] = useState('auto');
  const [imageCount, setImageCount] = useState('4');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<{
    imageUrl?: string | null;
    images?: { id?: string; url: string; prompt?: string | null; title?: string | null; subtitle?: string | null }[];
    initialIndex?: number;
    prompt: string;
    referenceUrl?: string | null;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editReferences, setEditReferences] = useState<ReferenceImageEntry[]>([]);
  const [editReferencePreviews, setEditReferencePreviews] = useState<{ id: string; name: string; url: string }[]>([]);
  const [publishCopies, setPublishCopies] = useState<Record<string, EcommercePublishCopyResult>>({});
  const [publishCopyLoadingKey, setPublishCopyLoadingKey] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<EcommerceAnalyzeResult | null>(null);
  const recommendedTemplateIds = analysisResult
    ? pickRecommendedTemplateIds(analysisResult.analysis?.style_suggestions ?? [])
    : [];
  const [selectedPlan, setSelectedPlan] = useState<EcommerceRecommendedPlan | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editReferenceDragging, setEditReferenceDragging] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [latestImages, setLatestImages] = useState<string[]>([]);
  const [awaitingTaskId, setAwaitingTaskId] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  // Ref kept in sync so the polling effect can read the latest value without adding
  // batchResults to its dependency array (which would cause re-entry after every update).
  const batchResultsRef = useRef<BatchResult[]>([]);
  const [removedBgUrl, setRemovedBgUrl] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const { markSubmitStart, markSubmitSuccess, markSubmitFailed, markFirstValue } = useGenerationMetrics({
    awaitingTaskId,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editReferenceInputRef = useRef<HTMLInputElement>(null);
  const productReferenceInputRef = useRef<HTMLInputElement>(null);
  const historySectionRef = useRef<HTMLElement>(null);
  const seenTaskIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then((config) => {
        if (cancelled) return;
        setImageQuality(config.default_quality || 'auto');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupportedImagePreset(imageScale, aspectRatio)) {
      setImageScale('2K');
    }
  }, [aspectRatio, imageScale]);

  useEffect(() => {
    if (!selectedPlan) return;
    const count = Math.max(1, Math.min(9, Number(imageCount) || 4));
    if (selectedPlan.image_count !== count) {
      setSelectedPlan(null);
    }
  }, [imageCount, selectedPlan]);

  useEffect(() => {
    if (!productImage) {
      setProductPreview(null);
      return;
    }
    const preview = { name: productImage.name, url: URL.createObjectURL(productImage) };
    setProductPreview(preview);
    return () => URL.revokeObjectURL(preview.url);
  }, [productImage]);

  useEffect(() => {
    const previews = productReferences.map((reference) => ({
      id: reference.id,
      name: reference.file.name,
      url: URL.createObjectURL(reference.file),
    }));
    setProductReferencePreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [productReferences]);

  useEffect(() => {
    const previews = editReferences.map((reference) => ({
      id: reference.id,
      name: reference.file.name,
      url: URL.createObjectURL(reference.file),
    }));
    setEditReferencePreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [editReferences]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await getHistory({ limit: 100 });
      setHistoryItems(data.items.filter((item) => Boolean(item.task_request?.ecommerce)));
    } catch (err) {
      notifyError(err);
    } finally {
      setHistoryLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    loadHistory().catch(() => undefined);
  }, [loadHistory]);

  // 记录挂载时已有的 task_id，避免初始 taskHistoryItems 填充时误更新结果面板
  useEffect(() => {
    seenTaskIds.current = new Set(taskHistoryItems.map((item) => item.task_id ?? item.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅执行一次

  // Keep batchResultsRef in sync after every render
  useEffect(() => {
    batchResultsRef.current = batchResults;
  });

  // 监听新完成的电商任务，将结果内联展示在结果面板
  useEffect(() => {
    if (!awaitingTaskId) return;
    const newEcomItems = taskHistoryItems.filter(
      (item) => Boolean(item.task_request?.ecommerce) && !seenTaskIds.current.has(item.task_id ?? item.id),
    );
    if (newEcomItems.length === 0) return;
    const taskItems = newEcomItems.filter((item) => item.task_id === awaitingTaskId);
    if (taskItems.length === 0) return;
    const urls = taskItems
      .filter((item) => item.image_url)
      .sort((a, b) => (a.batch_index || 0) - (b.batch_index || 0))
      .map((item) => item.image_url as string);
    if (urls.length > 0) {
      markFirstValue(awaitingTaskId, urls.length);
      setLatestImages(urls);
      setAwaitingTaskId(null);
      setRemovedBgUrl(null);
      taskItems.forEach((item) => seenTaskIds.current.add(item.task_id ?? item.id));
      if (viewer?.authenticated) {
        getAccount()
          .then((data) => setAccount(data))
          .catch(() => undefined);
      }
    }
  }, [taskHistoryItems, awaitingTaskId, markFirstValue, viewer?.authenticated]);

  // 监听批量任务完成
  // batchResultsRef is kept in sync via render assignment; reading it here avoids adding
  // batchResults to deps (which would cause re-entry after every setBatchResults call).
  useEffect(() => {
    if (!batchResultsRef.current.some((r) => r.status === 'pending' && r.taskId)) return;
    const newItems = taskHistoryItems.filter(
      (item) => Boolean(item.task_request?.ecommerce) && !seenTaskIds.current.has(item.task_id ?? item.id),
    );
    if (newItems.length === 0) return;
    // Collect IDs to mark outside the updater to avoid side-effects in a pure function
    const toMark: string[] = [];
    setBatchResults((current) =>
      current.map((result) => {
        if (result.status !== 'pending' || !result.taskId) return result;
        const taskItems = newItems.filter((item) => item.task_id === result.taskId);
        const urls = taskItems
          .filter((item) => item.image_url)
          .sort((a, b) => (a.batch_index || 0) - (b.batch_index || 0))
          .map((item) => item.image_url as string);
        if (urls.length === 0) return result;
        taskItems.forEach((item) => toMark.push(item.task_id ?? item.id));
        return { ...result, status: 'success', imageUrls: urls };
      }),
    );
    toMark.forEach((id) => seenTaskIds.current.add(id));
    if (toMark.length > 0 && viewer?.authenticated) {
      getAccount()
        .then((data) => setAccount(data))
        .catch(() => undefined);
    }
  }, [taskHistoryItems, viewer?.authenticated]);

  const mergedHistory = mergeHistoryItems([
    ...taskHistoryItems.filter((item) => Boolean(item.task_request?.ecommerce)),
    ...historyItems,
  ]);
  const groups = groupHistoryItems(mergedHistory).filter((group) => group.isEcommerce);
  const selectedGroup = groups.find((group) => group.key === selectedGroupKey) || null;

  const selectImageFile = useCallback(
    (files: File[]) => {
      const image = files.find((file) => IMAGE_TYPES.includes(file.type));
      if (!image) {
        notifyError(t('home_ref_image_invalid'));
        return;
      }
      setProductImage(image);
      setAnalysisResult(null);
      setSelectedPlan(null);
      const readyMessage = t('home_ecom_image_ready');
      notifySuccess(readyMessage);
    },
    [notifyError, notifySuccess, t],
  );

  const addEditReferenceFiles = useCallback(
    (files: File[]) => {
      const images = files.filter((file) => IMAGE_TYPES.includes(file.type));
      if (images.length === 0) {
        notifyError(t('home_ref_image_invalid'));
        return;
      }
      setEditReferences((current) => [...current, ...images.map((file) => createReferenceEntry(file, '风格参考'))].slice(0, 6));
    },
    [notifyError, t],
  );

  const addProductReferenceFiles = useCallback(
    (files: File[]) => {
      const images = files.filter((file) => IMAGE_TYPES.includes(file.type));
      if (images.length === 0) {
        notifyError(t('home_ref_image_invalid'));
        return;
      }
      setProductReferences((current) => [...current, ...images.map((file) => createReferenceEntry(file, '侧面'))].slice(0, 8));
      setAnalysisResult(null);
      setSelectedPlan(null);
    },
    [notifyError, t],
  );

  function handleProductImageChange(event: ChangeEvent<HTMLInputElement>) {
    selectImageFile(Array.from(event.target.files || []));
    event.target.value = '';
  }

  function handleEditReferenceChange(event: ChangeEvent<HTMLInputElement>) {
    addEditReferenceFiles(Array.from(event.target.files || []));
    event.target.value = '';
  }

  function handleProductReferenceChange(event: ChangeEvent<HTMLInputElement>) {
    addProductReferenceFiles(Array.from(event.target.files || []));
    event.target.value = '';
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    selectImageFile(Array.from(event.dataTransfer.files || []));
  }

  function handleEditReferenceDragOver(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setEditReferenceDragging(true);
  }

  function handleEditReferenceDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setEditReferenceDragging(false);
    addEditReferenceFiles(Array.from(event.dataTransfer.files || []));
  }

  function updateProductReference(index: number, patch: Partial<Pick<ReferenceImageEntry, 'role' | 'note'>>) {
    setProductReferences((current) =>
      current.map((reference, currentIndex) => (currentIndex === index ? { ...reference, ...patch } : reference)),
    );
  }

  function updateEditReference(index: number, patch: Partial<Pick<ReferenceImageEntry, 'role' | 'note'>>) {
    setEditReferences((current) =>
      current.map((reference, currentIndex) => (currentIndex === index ? { ...reference, ...patch } : reference)),
    );
  }

  function resetEcommerceForm() {
    setProductImage(null);
    setProductReferenceRole(DEFAULT_REFERENCE_ROLE);
    setProductReferenceNote('');
    setProductReferences([]);
    setForm({
      productName: '',
      materials: '',
      sellingPoints: '',
      scenarios: '',
      platform: '淘宝/抖音',
      style: '高级、干净、统一电商详情页',
      extraRequirements: '',
    });
    setAnalysisResult(null);
    setSelectedPlan(null);
    setSelectedTemplate(null);
    setSelectedGroupKey(null);
    setEditingItem(null);
    setEditPrompt('');
    setEditReferences([]);
    notifyInfo(t('ecom_form_reset'));
  }

  async function handleCancelGeneration() {
    if (!awaitingTaskId) return;
    try {
      await cancelImageTask(awaitingTaskId);
      notifyInfo('生成已取消');
    } catch (err) {
      notifyError(err);
    } finally {
      setAwaitingTaskId(null);
    }
  }

  async function handleRemoveBg() {
    if (!latestImages[0] || removingBg) return;
    setRemovingBg(true);
    try {
      const response = await fetch(latestImages[0], { credentials: 'include' });
      if (!response.ok) throw new Error(response.statusText);
      const blob = await response.blob();
      const file = new File([blob], 'product.png', { type: blob.type || 'image/png' });
      const result = await removeBackground(file);
      setRemovedBgUrl(result.url);
    } catch (err) {
      notifyError(err);
    } finally {
      setRemovingBg(false);
    }
  }

  function applyStyleTemplate(templateId: string) {
    const tpl = STYLE_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setSelectedTemplate(templateId);
    setForm((current) => ({
      ...current,
      style: tpl.style,
      scenarios: tpl.scenarios,
    }));
    setAnalysisResult(null);
    setSelectedPlan(null);
  }

  async function handleSubmit() {
    if (!productImage || loading) {
      if (!productImage) notifyError(t('home_ecom_missing_image'));
      return;
    }
    if (!viewer?.authenticated) {
      notifyError(t('ecom_generation_login_required'));
      return;
    }
    if (isOutOfCredits) {
      notifyError('免费额度已用完，升级继续');
      return;
    }
    setLoading(true);
    const sentMessage = t('home_ecom_sent');
    notifyInfo(sentMessage);
    markSubmitStart({
      imageCount: Math.max(1, Math.min(9, Number(imageCount) || 4)),
      aspectRatio,
      imageScale,
      imageQuality,
      hasReferences: productReferences.length > 0,
      usedTemplate: selectedTemplate,
      usedAnalysisPlan: selectedPlan !== null,
    });
    try {
      const task = await generateEcommerceImages(
        {
          product_name: form.productName,
          materials: form.materials,
          selling_points: form.sellingPoints,
          scenarios: form.scenarios,
          platform: form.platform,
          style: form.style,
          extra_requirements: form.extraRequirements,
          size: providerImageSize(imageScale, aspectRatio),
          aspect_ratio: aspectRatio,
          quality: imageQuality,
          n: Math.max(1, Math.min(9, Number(imageCount) || 4)),
          selected_plan: selectedPlan,
          analysis: analysisResult?.analysis || null,
        },
        [
          {
            file: productImage,
            role: productReferenceRole,
            note: productReferenceNote,
            primary: true,
          },
          ...productReferences.map((reference) => ({
            file: reference.file,
            role: reference.role,
            note: reference.note,
          })),
        ],
      );
      markSubmitSuccess(task.id);
      setSelectedPlan(null);
      addTask(task);
      closeDrawer(); // addTask 内部会打开抽屉，立即关闭以保持用户在当前页
      setLatestImages([]);       // 清空上次结果，ResultPanel 进入 skeleton 状态
      setAwaitingTaskId(task.id); // 标记正在等待此任务的结果
      notifyInfo('✓ 正在生成…结果将显示在下方');
    } catch (err) {
      markSubmitFailed(err);
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleBatchSubmit() {
    if (!productImage || loading) {
      if (!productImage) notifyError(t('home_ecom_missing_image'));
      return;
    }
    if (!viewer?.authenticated) {
      notifyError(t('ecom_generation_login_required'));
      return;
    }
    if (isOutOfCredits) {
      notifyError('免费额度已用完，升级继续');
      return;
    }
    if (selectedTemplateIds.length === 0) {
      notifyError('请选择至少一个风格模板');
      return;
    }

    setLoading(true);
    notifyInfo(`正在提交 ${selectedTemplateIds.length} 个生成任务…`);

    const basePayload = {
      product_name: form.productName,
      materials: form.materials,
      selling_points: form.sellingPoints,
      platform: form.platform,
      extra_requirements: form.extraRequirements,
      size: providerImageSize(imageScale, aspectRatio),
      aspect_ratio: aspectRatio,
      quality: imageQuality,
      n: Math.max(1, Math.min(4, Number(imageCount) || 2)),
      selected_plan: selectedPlan,
      analysis: analysisResult?.analysis || null,
    };

    const references = [
      { file: productImage, role: productReferenceRole, note: productReferenceNote, primary: true as const },
      ...productReferences.map((ref) => ({ file: ref.file, role: ref.role, note: ref.note })),
    ];

    // Capture template IDs at submission time to ensure stable ordering
    const submittedIds = [...selectedTemplateIds];

    const settled = await Promise.allSettled(
      submittedIds.map(async (templateId) => {
        const tpl = STYLE_TEMPLATES.find((t) => t.id === templateId);
        if (!tpl) throw new Error(`Unknown template: ${templateId}`);
        const task = await generateEcommerceImages(
          { ...basePayload, style: tpl.style, scenarios: tpl.scenarios },
          references,
        );
        return { templateId, task };
      }),
    );

    settled.forEach((s) => {
      if (s.status === 'fulfilled') addTask(s.value.task);
    });
    closeDrawer();

    // Single setBatchResults call — all taskIds populated upfront so polling guard works immediately
    const finalResults: BatchResult[] = submittedIds.map((templateId, idx) => {
      const tpl = STYLE_TEMPLATES.find((t) => t.id === templateId)!;
      const s = settled[idx];
      if (s.status === 'fulfilled') {
        return { templateId, templateName: tpl.name, taskId: s.value.task.id, status: 'pending', imageUrls: [] };
      }
      return { templateId, templateName: tpl.name, taskId: null, status: 'error', imageUrls: [], error: '提交失败' };
    });
    setBatchResults(finalResults);

    const successCount = settled.filter((s) => s.status === 'fulfilled').length;
    notifyInfo(`✓ 已提交 ${successCount}/${submittedIds.length} 个任务，正在生成…`);
    setLoading(false);
  }

  async function handleAnalyzeProduct() {
    if (!productImage || analyzing) {
      if (!productImage) notifyError(t('home_ecom_missing_image'));
      return;
    }
    if (!viewer?.authenticated) {
      notifyError(t('ecom_generation_login_required'));
      return;
    }
    setAnalyzing(true);
    notifyInfo(t('ecom_analyzing'));
    try {
      const result = await analyzeEcommerceProduct(
        {
          product_name: form.productName,
          materials: form.materials,
          selling_points: form.sellingPoints,
          scenarios: form.scenarios,
          platform: form.platform,
          style: form.style,
          extra_requirements: form.extraRequirements,
          size: providerImageSize(imageScale, aspectRatio),
          aspect_ratio: aspectRatio,
          image_count: Math.max(1, Math.min(9, Number(imageCount) || 4)),
        },
        [
          {
            file: productImage,
            role: productReferenceRole,
            note: productReferenceNote,
            primary: true,
          },
          ...productReferences.map((reference) => ({
            file: reference.file,
            role: reference.role,
            note: reference.note,
          })),
        ],
      );
      setAnalysisResult(result);
      setSelectedPlan(null);
      setForm((current) => ({
        productName: current.productName || result.form.product_name || '',
        materials: current.materials || result.form.materials || '',
        sellingPoints: current.sellingPoints || result.form.selling_points || '',
        scenarios: current.scenarios || result.form.scenarios || '',
        platform: current.platform || result.form.platform || '淘宝/抖音',
        style: current.style || result.form.style || '高级、干净、统一电商详情页',
        extraRequirements: current.extraRequirements || result.form.extra_requirements || '',
      }));
      if (result.form.image_count) setImageCount(String(Math.max(1, Math.min(9, result.form.image_count))));
      notifySuccess(t('ecom_analysis_ready'));
    } catch (err) {
      notifyError(err);
    } finally {
      setAnalyzing(false);
    }
  }

  function applyPlan(plan: EcommerceRecommendedPlan) {
    const count = Math.max(1, Math.min(9, plan.image_count || Number(imageCount) || 4));
    const normalizedPlan = { ...plan, image_count: count, screens: plan.screens.slice(0, count) };
    setForm((current) => ({
      productName: current.productName || analysisResult?.form.product_name || '',
      materials: normalizedPlan.materials || current.materials,
      sellingPoints: normalizedPlan.selling_points || current.sellingPoints,
      scenarios: normalizedPlan.scenarios || current.scenarios,
      platform: normalizedPlan.platform || current.platform,
      style: normalizedPlan.style || current.style,
      extraRequirements: normalizedPlan.extra_requirements || current.extraRequirements,
    }));
    setSelectedPlan(normalizedPlan);
    setImageCount(String(count));
    notifySuccess(t('ecom_plan_applied'));
  }

  async function handleDeleteGroup(group: HistoryGroup) {
    const ids = group.items.map((item) => item.id);
    await Promise.all(ids.map((id) => deleteHistory(id)));
    setHistoryItems((current) => current.filter((item) => !ids.includes(item.id)));
    if (selectedGroupKey === group.key) setSelectedGroupKey(null);
  }

  async function handleDeleteItem(item: HistoryItem) {
    await deleteHistory(item.id);
    setHistoryItems((current) => current.filter((historyItem) => historyItem.id !== item.id));
  }

  async function openProject(group: HistoryGroup) {
    const ecommerce = group.first.task_request?.ecommerce;
    if (ecommerce) {
      setForm({
        productName: ecommerce.product_name || '',
        materials: ecommerce.materials || '',
        sellingPoints: ecommerce.selling_points || '',
        scenarios: ecommerce.scenarios || '',
        platform: ecommerce.platform || '淘宝/抖音',
        style: ecommerce.style || '高级、干净、统一电商详情页',
        extraRequirements: ecommerce.extra_requirements || '',
      });
    }
    setImageScale(normalizeImageScale(group.first.size));
    setAspectRatio(group.first.aspect_ratio || '1:1');
    setImageQuality(group.first.quality || 'auto');
    setImageCount(String(Math.max(1, Math.min(9, group.images.length || group.items.length || 1))));
    setSelectedGroupKey(group.key);
    notifyInfo(t('ecom_form_restored'));

    if (!group.first.input_image_url) {
      setProductImage(null);
      return;
    }
    try {
      const response = await fetch(group.first.input_image_url, { credentials: 'include' });
      if (!response.ok) throw new Error(response.statusText);
      const blob = await response.blob();
      const contentType = blob.type || 'image/png';
      const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : contentType.includes('webp') ? 'webp' : 'png';
      const productName = ecommerce?.product_name?.trim() || group.title || 'product';
      const file = new File([blob], `${productName}.${extension}`, { type: contentType });
      setProductImage(file);
      const referenceNotes = group.first.task_request?.reference_notes || [];
      const primaryNote = referenceNotes.find((note) => note.primary) || referenceNotes[0];
      setProductReferenceRole(primaryNote?.role || DEFAULT_REFERENCE_ROLE);
      setProductReferenceNote(primaryNote?.note || '');
    } catch {
      setProductImage(null);
    }
  }

  function beginEdit(item: HistoryItem) {
    setEditingItem(item);
    setEditPrompt(item.prompt);
    setEditReferences([]);
  }

  async function submitEdit() {
    if (!editingItem || !editPrompt.trim()) return;
    setLoading(true);
    try {
      const task = await editHistoryImage(editingItem.id, {
        prompt: editPrompt.trim(),
        size: editingItem.size,
        aspect_ratio: editingItem.aspect_ratio,
        quality: editingItem.quality,
      }, editReferences.map((reference) => ({
        file: reference.file,
        role: reference.role,
        note: reference.note,
      })));
      addTask(task);
      setEditingItem(null);
      setEditPrompt('');
      setEditReferences([]);
      const editMessage = t('home_message_edit_sent');
      notifyInfo(editMessage);
    } catch (err) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }

  async function copyPrompt(prompt: string) {
    await copyTextToClipboard(prompt);
    const copiedMessage = t('home_prompt_copied');
    notifySuccess(copiedMessage);
  }

  async function copyPublishText(text: string) {
    await copyTextToClipboard(text);
    const copiedMessage = t('ecom_publish_copied');
    notifySuccess(copiedMessage);
  }

  async function generatePublishCopy(group: HistoryGroup) {
    const ecommerce = group.first.task_request?.ecommerce;
    setPublishCopyLoadingKey(group.key);
    try {
      const copy = await generateEcommercePublishCopy({
        product_name: ecommerce?.product_name || group.title,
        materials: ecommerce?.materials || '',
        selling_points: ecommerce?.selling_points || '',
        scenarios: ecommerce?.scenarios || '',
        platform: ecommerce?.platform || '',
        style: ecommerce?.style || '',
        extra_requirements: ecommerce?.extra_requirements || '',
        image_count: group.images.length || group.items.length || 1,
        size: group.first.size,
        aspect_ratio: group.first.aspect_ratio,
      });
      setPublishCopies((current) => ({ ...current, [group.key]: copy }));
      const generatedMessage = t('ecom_publish_generated');
      notifySuccess(generatedMessage);
    } catch (err) {
      notifyError(err);
    } finally {
      setPublishCopyLoadingKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
            <span className="h-[1px] w-4 bg-secondary" />
            {t('ecom_tag')}
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-on-surface md:text-5xl">{t('ecom_title')}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ModelBadge />
            <p className="text-sm text-white/50">{t('ecom_subtitle')}</p>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1" style={FREEMIUM_CHIP_STYLE}>
            <span className="h-1.5 w-1.5 rounded-full" style={FREEMIUM_DOT_STYLE} aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={FREEMIUM_TEXT_STYLE}>Free Tier</span>
            <span className="text-[11px] text-white/55">
              {isOutOfCredits ? '本月免费额度已用完' : '每月 5 次免费生成 · 无需信用卡'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:w-[320px]">
          <Link className="flex h-10 items-center justify-center border border-primary/35 text-xs font-bold uppercase tracking-widest text-primary hover:bg-primary/10" to="/create">
            {t('home_tab_general')}
          </Link>
          <button className="h-10 border border-secondary bg-secondary/15 text-xs font-bold uppercase tracking-widest text-secondary" type="button">
            {t('home_tab_ecommerce')}
          </button>
        </div>
      </div>

      {selectedGroup ? (
        <section ref={historySectionRef}>
          <button
            className="mb-4 flex h-10 items-center gap-2 border border-primary/25 px-4 text-xs uppercase tracking-widest text-primary hover:bg-primary/10"
            type="button"
            onClick={() => setSelectedGroupKey(null)}
          >
            <ArrowLeft size={14} />
            {t('ecom_back_projects')}
          </button>
          <ProjectDetail
            group={selectedGroup}
            onPreview={setPreviewItem}
            onDeleteItem={(item) => handleDeleteItem(item).catch(notifyError)}
            onEdit={beginEdit}
            onCopy={(prompt) => copyPrompt(prompt).catch(() => undefined)}
            onCopyText={(text) => copyPublishText(text).catch(() => undefined)}
            publishCopy={publishCopies[selectedGroup.key] || null}
            publishCopyLoading={publishCopyLoadingKey === selectedGroup.key}
            onGeneratePublishCopy={() => generatePublishCopy(selectedGroup)}
            t={t}
          />
        </section>
      ) : (
        <div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-6 lg:items-start">
          {/* Left column: config + AI analysis — Step 2 */}
          <div className="mb-8 space-y-3 lg:mb-0">
      <section
        className={`flex flex-col gap-4 border bg-black/55 p-3 transition-colors ${
          dragging ? 'border-secondary bg-secondary/10' : 'border-primary/20'
        }`}
        onDragEnter={handleDragOver}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input ref={fileInputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProductImageChange} />
        <input
          ref={productReferenceInputRef}
          className="hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={handleProductReferenceChange}
        />

        {/* ① 选择场景风格 — Template-First Step 4 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ag-lime)' }}>
              ① 选择场景风格
            </div>
            <button
              type="button"
              onClick={() => {
                setBatchMode((m) => !m);
                setSelectedTemplateIds([]);
              }}
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-all duration-150"
              style={{
                border: batchMode ? '1px solid var(--ag-lime)' : '1px solid rgba(255,255,255,0.15)',
                color: batchMode ? 'var(--ag-lime)' : 'rgba(255,255,255,0.4)',
                background: batchMode ? 'rgba(227,255,116,0.08)' : 'transparent',
              }}
            >
              批量
            </button>
          </div>
          <TemplatePicker
            templates={STYLE_TEMPLATES}
            value={batchMode ? null : selectedTemplate}
            onChange={batchMode ? () => undefined : applyStyleTemplate}
            recommendedIds={recommendedTemplateIds}
            multiSelect={batchMode}
            selectedIds={selectedTemplateIds}
            onMultiChange={setSelectedTemplateIds}
          />
        </div>

        {/* ② 上传商品图 */}
        <div>
          <div className="mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--ag-lime)' }}>
            ② 上传商品图
          </div>
          <div className="relative">
            <button
              className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden border border-dashed border-primary/25 bg-black hover:bg-primary/5 sm:aspect-auto sm:h-40"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              {productPreview ? (
                <>
                  <RetryImage alt={productPreview.name} className="h-full w-full object-cover opacity-90" src={productPreview.url} />
                  <span className="absolute bottom-0 left-0 right-0 truncate bg-black/75 px-2 py-1 text-[9px] text-white/70">{productPreview.name}</span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/40 group-hover:text-primary">
                  <ImagePlus size={24} />
                  <span className="text-[10px] uppercase tracking-widest">{t('home_ecom_upload_tip')}</span>
                </div>
              )}
            </button>
            {productPreview ? (
              <button
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center border border-white/15 bg-black/80 text-white/80 hover:border-error hover:text-error"
                type="button"
                onClick={() => {
                  setProductImage(null);
                  setAnalysisResult(null);
                  setSelectedPlan(null);
                  const removedMessage = t('home_ecom_image_removed');
                  notifyInfo(removedMessage);
                }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          {!productPreview && (
            <button
              type="button"
              className="mt-1.5 w-full text-[9px] text-white/35 transition-colors hover:text-primary"
              onClick={() => notifyInfo('示例商品功能即将上线，请上传您的商品图开始体验')}
            >
              → 没有商品图？先用示例体验
            </button>
          )}
          {productPreview ? (
            <div className="mt-2 grid grid-cols-1 gap-1.5">
              <label className="block">
                <span className="mb-0.5 block text-[8px] uppercase tracking-widest text-white/35">{t('reference_role')}</span>
                <select
                  className="h-8 w-full border border-white/10 bg-black px-2 text-[10px] text-primary outline-none focus:border-primary"
                  value={productReferenceRole}
                  onChange={(event) => setProductReferenceRole(event.target.value)}
                >
                  {REFERENCE_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-0.5 block text-[8px] uppercase tracking-widest text-white/35">{t('reference_note')}</span>
                <input
                  className="h-8 w-full border border-white/10 bg-black px-2 text-[10px] text-white/75 outline-none placeholder:text-white/25 focus:border-primary"
                  value={productReferenceNote}
                  onChange={(event) => setProductReferenceNote(event.target.value)}
                  placeholder={t('reference_note_placeholder')}
                />
              </label>
            </div>
          ) : null}
        </div>

        {/* 输出格式 */}
        <div>
          <div className="mb-2 text-[9px] font-bold uppercase tracking-widest text-white/35">{t('home_aspect_ratio')}</div>
          <FormatPicker value={aspectRatio} onChange={setAspectRatio} />
        </div>

        {/* 生成数量 */}
        <div className="flex items-center gap-4">
          <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">{t('home_image_count')}</div>
          <CountChips
            value={parseInt(imageCount, 10)}
            onChange={(n) => setImageCount(String(n))}
          />
        </div>

        {/* 参数 */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="min-w-0">
            <span className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-on-surface-variant">
              <span className="font-bold leading-none" style={{ color: 'var(--ag-lime)' }}>★</span>
              {t('home_ecom_product_name')}
            </span>
            <input
              className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 text-xs text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
              value={form.productName}
              onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))}
              placeholder="如：手冲咖啡壶"
            />
          </label>
          <CompactInput label={t('home_ecom_platform')} value={form.platform} onChange={(value) => setForm((current) => ({ ...current, platform: value }))} />
          <CompactInput label={t('home_ecom_style')} value={form.style} onChange={(value) => setForm((current) => ({ ...current, style: value }))} />
          <GenerationSelect label={t('home_size')} value={imageScale} onChange={setImageScale} options={SIZE_OPTIONS} getOptionLabel={(option) => SIZE_LABELS[option] || option} isOptionDisabled={(option) => !isSupportedImagePreset(option, aspectRatio)} />

          {/* Advanced options toggle */}
          <div className="col-span-2">
            <button
              type="button"
              className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors"
              style={{ color: showAdvanced ? 'rgba(240,237,232,0.6)' : 'rgba(240,237,232,0.35)' }}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <span
                className="inline-block transition-transform duration-200"
                style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                ▶
              </span>
              高级选项
            </button>
          </div>

          {showAdvanced && (
            <>
              <CompactInput label={t('home_ecom_materials')} value={form.materials} onChange={(value) => setForm((current) => ({ ...current, materials: value }))} />
              <CompactInput label={t('home_ecom_selling_points')} value={form.sellingPoints} onChange={(value) => setForm((current) => ({ ...current, sellingPoints: value }))} />
              <CompactInput label={t('home_ecom_scenarios')} value={form.scenarios} onChange={(value) => setForm((current) => ({ ...current, scenarios: value }))} />
              <GenerationSelect label={t('home_quality')} value={imageQuality} onChange={setImageQuality} options={QUALITY_OPTIONS} />
              <label className="col-span-2 min-w-0">
                <span className="mb-0.5 block truncate text-[8px] uppercase tracking-[0.18em] text-white/40">{t('home_ecom_extra')}</span>
                <input
                  className="h-9 w-full border border-primary/20 bg-black px-2 text-xs text-primary outline-none focus:border-primary"
                  value={form.extraRequirements}
                  onChange={(event) => setForm((current) => ({ ...current, extraRequirements: event.target.value }))}
                />
              </label>
            </>
          )}
          <div className="col-span-2 min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[9px] uppercase tracking-widest text-white/35">{t('ecom_edit_references')}</div>
              <button
                className="flex h-8 shrink-0 items-center gap-2 border border-primary/35 px-3 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10"
                type="button"
                onClick={() => productReferenceInputRef.current?.click()}
              >
                <Paperclip size={13} />
                {t('ecom_add_reference')}
              </button>
            </div>
            {productReferencePreviews.length > 0 ? (
              <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                {productReferencePreviews.map((preview, index) => (
                  <ReferenceImageEditor
                    key={preview.id}
                    preview={preview}
                    role={productReferences[index]?.role || ''}
                    note={productReferences[index]?.note || ''}
                    onRoleChange={(role) => updateProductReference(index, { role })}
                    onNoteChange={(note) => updateProductReference(index, { note })}
                    onRemove={() => {
                      setProductReferences((current) => current.filter((_, currentIndex) => currentIndex !== index));
                      setAnalysisResult(null);
                      setSelectedPlan(null);
                    }}
                    onPreview={() => setPreviewItem({ imageUrl: preview.url, prompt: preview.name })}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/35">{t('ecom_edit_reference_tip')}</div>
            )}
          </div>
        </div>

        {/* 生成按钮 — 4b: disabled 状态提示 */}
        <div className="flex flex-col gap-2">
          <button
            className="btn-commerce w-full h-12"
            type="button"
            disabled={
              loading ||
              !productImage ||
              isOutOfCredits ||
              (batchMode && selectedTemplateIds.length === 0)
            }
            onClick={batchMode ? () => { handleBatchSubmit().catch(() => undefined); } : handleSubmit}
            title={
              !productImage
                ? '请先上传商品图（步骤②）'
                : isOutOfCredits
                ? '免费额度已用完，升级继续 →'
                : batchMode && selectedTemplateIds.length === 0
                ? '请选择至少一个风格模板'
                : undefined
            }
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : !productImage ? (
              <>请先上传商品图 ↑</>
            ) : isOutOfCredits ? (
              <>额度已用完 · 升级继续 →</>
            ) : batchMode ? (
              <>✦ 批量生成{selectedTemplateIds.length > 0 ? ` (${selectedTemplateIds.length})` : ''}</>
            ) : (
              <>✦ 生成场景图 ({imageCount})</>
            )}
          </button>
          {(loading || awaitingTaskId !== null) && !batchMode && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <GenerationProgress
                active={loading || awaitingTaskId !== null}
                onCancel={awaitingTaskId ? () => void handleCancelGeneration() : undefined}
              />
            </div>
          )}
          <CreditEstimate
            balance={account?.balance ?? null}
            imageCount={parseInt(imageCount, 10)}
            quality={imageQuality}
          />
          <button
            className="btn-commerce-secondary"
            type="button"
            disabled={loading || analyzing}
            onClick={resetEcommerceForm}
          >
            <RefreshCw size={14} />
            {t('ecom_reset_form')}
          </button>
        </div>
      </section>

            <details className="group border border-secondary/20 bg-black/55 open:pb-4">
              <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 [&::-webkit-details-marker]:hidden sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
                  <Sparkles size={14} />
                  {t('ecom_ai_designer')}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="flex h-8 items-center justify-center gap-2 bg-secondary px-3 text-[10px] font-black uppercase tracking-widest text-black hover:bg-white disabled:opacity-50"
                    type="button"
                    disabled={analyzing || !productImage}
                    onClick={(e) => { e.preventDefault(); handleAnalyzeProduct(); }}
                  >
                    {analyzing ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    {analyzing ? t('ecom_analyzing') : t('ecom_analyze_product')}
                  </button>
                  <span className="text-white/30 transition-transform group-open:rotate-180">▾</span>
                </div>
              </summary>
              <div className="px-4">
                {analysisResult ? (
                  <EcommerceAnalysisPanel result={analysisResult} onApplyPlan={applyPlan} t={t} />
                ) : (
                  <div className="border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs leading-6 text-white/45">{t('ecom_analysis_empty')}</div>
                )}
              </div>
            </details>
          </div>
          {/* Right column: ResultPanel + history — Step 2 */}
          <div className="space-y-6">
            <ResultPanel
              images={latestImages}
              loading={awaitingTaskId !== null}
              expectedCount={parseInt(imageCount, 10)}
              onPreview={(url, index) =>
                setPreviewItem({ imageUrl: url, prompt: `生成图 ${index + 1}` })
              }
              onRetry={latestImages.length > 0 ? () => { handleSubmit().catch(() => undefined); } : undefined}
              onDownload={(url) => window.open(url, '_blank')}
              uploadedImageUrl={productPreview?.url}
              selectedTemplateName={selectedTemplate ? STYLE_TEMPLATES.find((t) => t.id === selectedTemplate)?.name : undefined}
            />

            {latestImages.length > 0 && (
              <BackgroundRemovalPreview
                originalUrl={latestImages[0]}
                removedUrl={removedBgUrl}
                removing={removingBg}
                onRemove={() => void handleRemoveBg()}
              />
            )}

            {batchResults.length > 0 && (
              <BatchResultPanel
                results={batchResults}
                onPreview={(url) => setPreviewItem({ imageUrl: url, prompt: '批量生成图' })}
                onDownload={(url) => window.open(url, '_blank')}
                onClose={() => setBatchResults([])}
              />
            )}

            <section ref={historySectionRef}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight text-white">{t('ecom_projects')}</h2>
                <button className="flex h-9 items-center gap-2 border border-white/10 px-3 text-[10px] uppercase tracking-widest text-white/60 hover:border-primary hover:text-primary" type="button" onClick={() => loadHistory().catch(() => undefined)}>
                  {historyLoading ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
                  {t('config_sync_cases')}
                </button>
              </div>
              {groups.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {groups.map((group) => (
                    <ProjectCard
                      key={group.key}
                      group={group}
                      onOpen={() => openProject(group).catch(notifyError)}
                      onDelete={() => handleDeleteGroup(group).catch(notifyError)}
                      t={t}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-primary/20 bg-black/50 p-5">
                  {historyLoading ? (
                    <div className="flex min-h-[200px] items-center justify-center text-sm text-white/45">
                      {t('home_loading_feed')}
                    </div>
                  ) : (
                    <SampleGallery
                      title="效果示例"
                      subtitle="上传商品图，一键生成专业场景图，首次生成后将在此展示"
                    />
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

          <ImagePreviewModal
        imageUrl={previewItem?.imageUrl || null}
        images={previewItem?.images}
        initialIndex={previewItem?.initialIndex || 0}
        alt={previewItem?.prompt || 'preview'}
        subtitle={previewItem?.referenceUrl ? `${previewItem.prompt}\n\n${t('ecom_reference_image')}: ${previewItem.referenceUrl}` : previewItem?.prompt}
        onClose={() => setPreviewItem(null)}
      />
      <PromptEditorModal
        open={Boolean(editingItem)}
        value={editPrompt}
        onChange={setEditPrompt}
        onClose={() => {
          setEditingItem(null);
          setEditPrompt('');
          setEditReferences([]);
        }}
        onCopy={() => copyPrompt(editPrompt).catch(() => undefined)}
      />
      {editingItem ? (
        <div className="fixed bottom-4 left-3 right-3 z-[230] flex flex-col gap-2 sm:left-auto sm:right-5 sm:w-[420px]">
          <div
            className={`border bg-black/95 p-3 shadow-[0_0_24px_rgba(0,0,0,0.45)] backdrop-blur ${
              editReferenceDragging ? 'border-secondary bg-secondary/10' : 'border-primary/30'
            }`}
            onDragEnter={handleEditReferenceDragOver}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setEditReferenceDragging(false);
            }}
            onDragOver={handleEditReferenceDragOver}
            onDrop={handleEditReferenceDrop}
          >
            <input
              ref={editReferenceInputRef}
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleEditReferenceChange}
            />
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-secondary">{t('ecom_edit_references')}</div>
                <div className="mt-1 text-xs leading-5 text-white/55">{t('ecom_edit_reference_tip')}</div>
              </div>
              <button
                className="flex h-9 shrink-0 items-center gap-2 border border-primary/35 px-3 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10"
                type="button"
                onClick={() => editReferenceInputRef.current?.click()}
              >
                <Paperclip size={13} />
                {t('ecom_add_reference')}
              </button>
            </div>
            {editReferencePreviews.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {editReferencePreviews.map((preview, index) => (
                  <ReferenceImageEditor
                    key={preview.id}
                    preview={preview}
                    role={editReferences[index]?.role || ''}
                    note={editReferences[index]?.note || ''}
                    onRoleChange={(role) => updateEditReference(index, { role })}
                    onNoteChange={(note) => updateEditReference(index, { note })}
                    onRemove={() => setEditReferences((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    onPreview={() => setPreviewItem({ imageUrl: preview.url, prompt: preview.name })}
                    t={t}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-40"
            type="button"
            disabled={loading || !editPrompt.trim()}
            onClick={submitEdit}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <PencilLine size={16} />}
            {t('ecom_edit_this_image')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EcommerceAnalysisPanel({
  result,
  onApplyPlan,
  t,
}: {
  result: EcommerceAnalyzeResult;
  onApplyPlan: (plan: EcommerceRecommendedPlan) => void;
  t: (key: any, vars?: Record<string, string | number>) => string;
}) {
  const analysis = result.analysis || {};
  const chips = [
    ...(analysis.colors || []),
    ...(analysis.details || []),
    ...(analysis.selling_points || []),
    ...(analysis.use_scenarios || []),
  ].filter(Boolean);
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
      <div className="border border-white/10 bg-white/[0.03] p-3">
        <div className="mb-2 text-[9px] uppercase tracking-widest text-white/35">{t('ecom_analysis_summary')}</div>
        <div className="space-y-3 text-xs leading-6 text-white/70">
          <SummaryLine label={t('ecom_analysis_type')} value={analysis.product_type || result.form.product_name} />
          <SummaryLine label={t('ecom_analysis_appearance')} value={analysis.appearance} />
          <SummaryLine label={t('ecom_analysis_material')} value={analysis.visible_material || result.form.materials} />
          <SummaryLine label={t('ecom_analysis_constraints')} value={analysis.generation_constraints} />
        </div>
        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.slice(0, 14).map((chip) => (
              <span key={chip} className="border border-secondary/20 bg-secondary/10 px-2 py-1 text-[10px] text-secondary">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {result.plans.map((plan) => (
          <button
            key={plan.name}
            className="flex min-h-[240px] flex-col border border-primary/20 bg-black p-3 text-left transition-colors hover:border-secondary hover:bg-secondary/5"
            type="button"
            onClick={() => onApplyPlan(plan)}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-base font-black leading-6 text-white">{plan.name}</h3>
              <span className="shrink-0 border border-secondary/30 px-2 py-1 text-[9px] uppercase tracking-widest text-secondary">x{plan.image_count}</span>
            </div>
            <div className="mb-3 line-clamp-2 text-xs leading-5 text-white/55">{plan.reason || plan.style}</div>
            <div className="mb-3 flex flex-wrap gap-1.5 text-[9px] uppercase tracking-widest text-white/35">
              <span>{plan.platform}</span>
              <span>{plan.style}</span>
            </div>
            <div className="space-y-1.5">
              {plan.screens.map((screen, index) => (
                <div key={`${plan.name}-${screen.title}-${index}`} className="border border-white/10 bg-white/[0.03] px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 text-[10px] font-bold text-primary">{index + 1}. {screen.title}</div>
                    {screen.layout_type ? (
                      <span className="shrink-0 border border-white/10 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-white/35">
                        {layoutTypeLabel(screen.layout_type)}
                      </span>
                    ) : null}
                  </div>
                  <div className="line-clamp-1 text-[10px] text-white/45">{screen.visual_goal || screen.copy}</div>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-3 text-center text-[10px] font-black uppercase tracking-widest text-secondary">{t('ecom_apply_plan')}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function layoutTypeLabel(layoutType: string) {
  const labels: Record<string, string> = {
    hero: '主视觉',
    social_cover: '封面',
    model_fit: '模特',
    scene_lifestyle: '场景',
    material_closeup: '材质',
    detail_callout: '细节',
    spec_table: '参数',
    size_chart: '尺码',
    multi_angle: '多角度',
    comparison: '对比',
    conversion: '转化',
  };
  return labels[layoutType] || layoutType;
}

function SummaryLine({ label, value }: { label: string; value: unknown }) {
  const text = Array.isArray(value) ? value.join('、') : String(value || '').trim();
  if (!text) return null;
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest text-white/35">{label}</div>
      <div>{text}</div>
    </div>
  );
}

function ProjectCard({ group, onOpen, onDelete, t }: { key?: string; group: HistoryGroup; onOpen: () => void; onDelete: () => void; t: (key: any, vars?: Record<string, string | number>) => string }) {
  return (
    <div className="overflow-hidden border border-primary/25 bg-black transition-colors hover:border-secondary/50">
      <button className="grid w-full grid-cols-3 gap-1 bg-black p-1 text-left" type="button" onClick={onOpen}>
        {group.images.slice(0, 9).map((image) => (
          <div key={image.id} className="aspect-square overflow-hidden bg-black">
            <RetryImage alt={group.title} className="h-full w-full object-cover opacity-95" loading="lazy" src={image.url} />
          </div>
        ))}
      </button>
      <div className="border-t border-white/10 bg-surface-container-low/80 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-lg font-black text-white">{group.title}</h3>
          <span className="shrink-0 text-[10px] uppercase tracking-widest text-secondary">x{group.images.length}</span>
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-white/40">
          <span>{formatDate(group.createdAt)}</span>
          <span>{group.first.size}</span>
          {group.first.aspect_ratio ? <span>{group.first.aspect_ratio}</span> : null}
        </div>
        <p className="mb-3 line-clamp-2 text-sm text-white/65">{group.taskPrompt}</p>
        <div className="grid grid-cols-[1fr_44px] gap-2">
          <button className="h-10 bg-primary text-xs font-black uppercase tracking-widest text-black hover:bg-white" type="button" onClick={onOpen}>
            {t('ecom_open_project')}
          </button>
          <button className="flex h-10 items-center justify-center border border-error/25 bg-error/5 text-error hover:bg-error/15" type="button" onClick={onDelete}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ReferenceImageEditor({
  preview,
  role,
  note,
  onRoleChange,
  onNoteChange,
  onRemove,
  onPreview,
  t,
}: {
  key?: string;
  preview: { id: string; name: string; url: string };
  role: string;
  note: string;
  onRoleChange: (role: string) => void;
  onNoteChange: (note: string) => void;
  onRemove: () => void;
  onPreview: () => void;
  t: (key: any, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="grid w-52 shrink-0 grid-cols-[64px_1fr] gap-2 border border-white/10 bg-black p-1.5">
      <div className="relative h-24 overflow-hidden border border-white/10 bg-black">
        <button className="h-full w-full cursor-zoom-in" type="button" onClick={onPreview}>
          <RetryImage alt={preview.name} className="h-full w-full object-cover" src={preview.url} />
        </button>
        <button
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center border border-white/15 bg-black/80 text-white/80 hover:border-error hover:text-error"
          type="button"
          onClick={onRemove}
        >
          <X size={12} />
        </button>
      </div>
      <div className="min-w-0">
        <label className="mb-1 block">
          <span className="mb-0.5 block text-[8px] uppercase tracking-widest text-white/35">{t('reference_role')}</span>
          <select
            className="h-7 w-full border border-white/10 bg-black px-1 text-[10px] text-primary outline-none focus:border-primary"
            value={role}
            onChange={(event) => onRoleChange(event.target.value)}
          >
            {REFERENCE_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[8px] uppercase tracking-widest text-white/35">{t('reference_note')}</span>
          <input
            className="h-7 w-full border border-white/10 bg-black px-1 text-[10px] text-white/75 outline-none placeholder:text-white/25 focus:border-primary"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder={t('reference_note_placeholder')}
          />
        </label>
      </div>
    </div>
  );
}

function ProjectDetail({
  group,
  onPreview,
  onDeleteItem,
  onEdit,
  onCopy,
  onCopyText,
  publishCopy,
  publishCopyLoading,
  onGeneratePublishCopy,
  t,
}: {
  group: HistoryGroup;
  onPreview: (item: { imageUrl?: string | null; images?: { id?: string; url: string; prompt?: string | null; title?: string | null; subtitle?: string | null }[]; initialIndex?: number; prompt: string; referenceUrl?: string | null }) => void;
  onDeleteItem: (item: HistoryItem) => void;
  onEdit: (item: HistoryItem) => void;
  onCopy: (prompt: string) => void;
  onCopyText: (text: string) => void;
  publishCopy: EcommercePublishCopyResult | null;
  publishCopyLoading: boolean;
  onGeneratePublishCopy: () => void;
  t: (key: any, vars?: Record<string, string | number>) => string;
}) {
  const referenceUrl = group.first.input_image_url;
  const referenceNotes = group.first.task_request?.reference_notes || [];
  return (
    <>
      <div className="mb-5 grid grid-cols-1 gap-4 border border-primary/20 bg-black/50 p-4 md:grid-cols-[160px_1fr]">
        <button
          className="flex h-40 items-center justify-center overflow-hidden border border-dashed border-secondary/30 bg-black text-xs uppercase tracking-widest text-white/35"
          type="button"
          disabled={!referenceUrl}
          onClick={() => onPreview({ imageUrl: referenceUrl || null, prompt: t('ecom_reference_image') })}
        >
          {referenceUrl ? <RetryImage alt={t('ecom_reference_image')} className="h-full w-full object-cover" src={referenceUrl} /> : t('ecom_no_reference')}
        </button>
        <div className="min-w-0">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-secondary">{t('ecom_project_detail')}</div>
          <h2 className="text-3xl font-black tracking-tight text-white">{group.title}</h2>
          <p className="mt-3 line-clamp-4 text-sm text-white/70">{group.taskPrompt}</p>
          {group.first.task_id && group.images.length > 1 ? (
            <a
              className="mt-4 inline-flex h-9 items-center gap-2 border border-primary/30 px-3 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10"
              href={taskDownloadUrl(group.first.task_id)}
              title={t('history_download_zip')}
            >
              <Download size={13} />
              {t('history_download_zip')}
            </a>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-white/40">
            <span>{group.first.model}</span>
            <span>{group.first.size}</span>
            {group.first.aspect_ratio ? <span>{group.first.aspect_ratio}</span> : null}
            <span>{group.first.quality}</span>
            <span>x{group.images.length}</span>
          </div>
          {referenceNotes.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {referenceNotes.slice(0, 6).map((note) => (
                <div key={`${note.index}-${note.url || note.role}`} className="border border-white/10 bg-white/[0.03] p-2">
                  <div className="mb-1 text-[9px] uppercase tracking-widest text-secondary">
                    {t('ecom_reference_image')} {Number(note.index) + 1} · {note.role}
                  </div>
                  <div className="line-clamp-2 text-xs leading-5 text-white/55">{note.note || t('reference_note_placeholder')}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-5 border border-primary/20 bg-black/55 p-4">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
              <Sparkles size={14} />
              {t('ecom_publish_material')}
            </div>
            <p className="text-xs text-white/45">{t('ecom_publish_hint')}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 md:w-[360px]">
            <button
              className="flex h-10 items-center justify-center gap-2 bg-secondary text-[10px] font-black uppercase tracking-widest text-black hover:bg-white disabled:opacity-50"
              type="button"
              disabled={publishCopyLoading}
              onClick={onGeneratePublishCopy}
            >
              {publishCopyLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
              {publishCopy ? t('ecom_regenerate_publish') : t('ecom_generate_publish')}
            </button>
          </div>
        </div>
        {publishCopy ? (
          <div>
            <div className="mb-3 grid grid-cols-3 gap-2 md:w-[300px]">
              <button className="h-9 border border-primary/30 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10" type="button" onClick={() => onCopyText(publishCopy.title)}>
                {t('ecom_copy_title')}
              </button>
              <button className="h-9 border border-primary/30 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10" type="button" onClick={() => onCopyText(publishCopy.body)}>
                {t('ecom_copy_body')}
              </button>
              <button className="h-9 border border-secondary bg-secondary/15 text-[10px] font-black uppercase tracking-widest text-secondary hover:bg-secondary hover:text-black" type="button" onClick={() => onCopyText(`${publishCopy.title}\n\n${publishCopy.body}`)}>
                {t('ecom_copy_all')}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
              <div className="border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-[9px] uppercase tracking-widest text-white/35">{t('ecom_publish_title')}</div>
                <p className="text-sm font-bold leading-6 text-white">{publishCopy.title}</p>
              </div>
              <div className="border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 text-[9px] uppercase tracking-widest text-white/35">{t('ecom_publish_body')}</div>
                <p className="whitespace-pre-wrap text-xs leading-6 text-white/75">{publishCopy.body}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs leading-6 text-white/45">{t('ecom_publish_empty')}</div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {group.images.map((image, index) => (
          <div key={image.id} className="overflow-hidden border border-white/10 bg-black">
            <button
              className="block w-full cursor-zoom-in bg-black text-left"
              type="button"
              onClick={() => onPreview({
                images: group.images.map((galleryImage, galleryIndex) => ({
                  id: galleryImage.id,
                  url: galleryImage.url,
                  prompt: galleryImage.prompt,
                  title: `${group.title}-${galleryIndex + 1}`,
                })),
                initialIndex: index,
                prompt: image.prompt,
                referenceUrl,
              })}
            >
              <RetryImage alt={`${group.title}-${index + 1}`} className="block h-auto w-full opacity-95 hover:opacity-100" loading="lazy" src={image.url} />
            </button>
            <div className="border-t border-white/10 bg-surface-container-low/80 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-widest text-secondary">{t('ecom_screen_index', { value: index + 1 })}</div>
                <div className="text-[10px] text-white/30">ID:{image.id.slice(0, 4).toUpperCase()}</div>
              </div>
              <p className="mb-3 line-clamp-4 text-sm text-white/75">{image.prompt}</p>
              <div className="grid grid-cols-[44px_44px_44px_1fr] gap-2">
                <button
                  className="flex h-10 items-center justify-center border border-white/15 bg-white/5 text-white/75 hover:border-primary hover:text-primary"
                  type="button"
                  onClick={() => onPreview({
                    images: group.images.map((galleryImage, galleryIndex) => ({
                      id: galleryImage.id,
                      url: galleryImage.url,
                      prompt: galleryImage.prompt,
                      title: `${group.title}-${galleryIndex + 1}`,
                    })),
                    initialIndex: index,
                    prompt: image.prompt,
                    referenceUrl,
                  })}
                >
                  <Maximize2 size={14} />
                </button>
                <a className="flex h-10 items-center justify-center border border-white/15 bg-white/5 text-white/75 hover:border-primary hover:text-primary" href={image.url} download>
                  <Download size={14} />
                </a>
                <button className="flex h-10 items-center justify-center border border-error/20 bg-error/5 text-error hover:bg-error/15" type="button" onClick={() => onDeleteItem(image.item)}>
                  <Trash2 size={14} />
                </button>
                <button className="flex h-10 min-w-0 items-center justify-center gap-2 bg-primary px-3 text-xs font-black uppercase text-black hover:bg-white" type="button" onClick={() => onEdit(image.item)}>
                  <PencilLine size={14} />
                  {t('ecom_edit_this_image')}
                </button>
              </div>
              <button className="mt-2 h-9 w-full border border-secondary/30 text-[10px] font-bold uppercase tracking-widest text-secondary hover:bg-secondary/10" type="button" onClick={() => onCopy(image.prompt)}>
                {t('home_clone_prompt')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
