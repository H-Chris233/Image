import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CloudUpload, Download, ImageIcon, Loader2, PackagePlus, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { generateEcommerceImages, getAccount, type AccountInfo, type ImageTask } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import RechargeGate from '../components/RechargeGate';
import { CreateFlowWizard, type WizardResult } from '../components/ecommerce/CreateFlowWizard';
import { CreditEstimate } from '../components/ecommerce/CreditEstimate';
import { SCENE_CATALOG, type SceneTemplate } from '../components/ecommerce/sceneCatalog';
import { storeLastProductImage } from '../components/ecommerce/productImageSession';
import { useNotifier } from '../notifications';
import { providerImageSize } from '../imageOptions';
import { useTasks } from '../tasks';

const PROMPT_TRANSFER_KEY = 'aethergenix_pending_prompt';
const SCENE_TRANSFER_KEY = 'aethergenix_pending_scene';
const FAST_IMAGE_COST = 0.134;

type SubmittedRun = {
  id: string;
  sceneName: string;
  count: number;
};

type GenerationRun = {
  taskId: string;
  sceneName: string;
  count: number;
  task: ImageTask | undefined;
};

type PendingScenePayload = {
  customerKey?: unknown;
  sceneKey?: unknown;
  prompt?: unknown;
};

function normalizeCount(value: string | number): number {
  return Math.max(1, Math.min(4, Number(value) || 1));
}

function estimateFastGenerationCost(imageCount: number) {
  if (!Number.isFinite(imageCount) || imageCount <= 0) {
    return null;
  }
  return FAST_IMAGE_COST * imageCount;
}

function hasInsufficientCredits(balance: AccountInfo['balance'] | null, expectedCost: number | null) {
  if (expectedCost === null || !balance?.ok || typeof balance.remaining !== 'number') {
    return false;
  }
  return balance.remaining < expectedCost;
}

function parsePendingScene(value: string | null): PendingScenePayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as PendingScenePayload;
    }
  } catch {
    return null;
  }
  return null;
}

function findPendingSceneTemplate(payload: PendingScenePayload | null): SceneTemplate | null {
  if (!payload || typeof payload.customerKey !== 'string' || typeof payload.sceneKey !== 'string') {
    return null;
  }
  return SCENE_CATALOG.find((scene) => (
    scene.customerKey === payload.customerKey && scene.sceneKey === payload.sceneKey
  )) ?? null;
}

export default function Create() {
  const location = useLocation();
  const navigate = useNavigate();
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { addTask, tasks } = useTasks();
  const { notifyError, notifyInfo } = useNotifier();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [initialScene, setInitialScene] = useState('');
  const [initialSceneTemplate, setInitialSceneTemplate] = useState<SceneTemplate | null>(null);
  const [lastResult, setLastResult] = useState<WizardResult | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [rechargeGateOpen, setRechargeGateOpen] = useState(false);
  const [rechargeGateExpectedCost, setRechargeGateExpectedCost] = useState<number | null>(null);
  // 始终指向最新的 completeAndGenerate，供 location.state effect 调用，
  // 避免 effect 闭包捕获到陈旧的 account / isOutOfCredits。
  const completeRef = useRef<((result: WizardResult) => Promise<void>) | null>(null);

  const isOutOfCredits = Boolean(
    viewer?.authenticated &&
    account?.balance?.ok === true &&
    typeof account.balance.remaining === 'number' &&
    account.balance.remaining <= 0,
  );

  const runs = useMemo<GenerationRun[]>(
    () => submitted.map((entry) => ({
      taskId: entry.id,
      sceneName: entry.sceneName,
      count: entry.count,
      task: tasks.find((task) => task.id === entry.id),
    })),
    [submitted, tasks],
  );

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

  // 灵感「用此场景」带入：登录后自动打开向导，优先保留场景身份，再兼容旧提示词入口。
  // 必须先确认已登录再清空 sessionStorage，否则未登录用户路过本页会把提示词吞掉。
  useEffect(() => {
    if (!viewer?.authenticated) return;
    const pendingScene = parsePendingScene(window.sessionStorage.getItem(SCENE_TRANSFER_KEY));
    const pendingTemplate = findPendingSceneTemplate(pendingScene);
    if (pendingScene) {
      window.sessionStorage.removeItem(SCENE_TRANSFER_KEY);
      window.sessionStorage.removeItem(PROMPT_TRANSFER_KEY);
      const fallbackPrompt = typeof pendingScene.prompt === 'string' ? pendingScene.prompt : '';
      if (pendingTemplate || fallbackPrompt) {
        setInitialSceneTemplate(pendingTemplate);
        setInitialScene(pendingTemplate ? '' : fallbackPrompt);
        setShowWizard(true);
        return;
      }
    }

    const pendingPrompt = window.sessionStorage.getItem(PROMPT_TRANSFER_KEY);
    if (!pendingPrompt) return;
    window.sessionStorage.removeItem(PROMPT_TRANSFER_KEY);
    setInitialSceneTemplate(null);
    setInitialScene(pendingPrompt);
    setShowWizard(true);
  }, [viewer?.authenticated]);

  // 从 Explore 的向导跳转过来，携带 wizardResult：直接生成。
  useEffect(() => {
    const state = location.state as { wizardResult?: WizardResult } | null;
    if (!state?.wizardResult) return;
    const result = state.wizardResult;
    navigate('/create', { replace: true, state: null });
    void completeRef.current?.(result);
  }, [location.state, navigate]);

  async function runGeneration(result: WizardResult) {
    if (!viewer?.authenticated) {
      openAuthModal('login', '/create', 'generate');
      return;
    }

    const count = normalizeCount(result.imageCount);
    const expectedCost = estimateFastGenerationCost(count);
    if (isOutOfCredits || hasInsufficientCredits(account?.balance ?? null, expectedCost)) {
      openRechargeGate(expectedCost);
      return;
    }

    setLoading(true);
    notifyInfo('正在提交商品图生成任务');
    try {
      await storeLastProductImage(result.productImage);
      // 模板优先：模板 prompt 作视觉风格、用户补充需求作额外要求，走单图直出，不再调 AI 改写。
      const task = await generateEcommerceImages(
        {
          style: result.selectedTemplate.prompt,
          extra_requirements: result.brief || undefined,
          size: providerImageSize('FAST', result.aspectRatio),
          aspect_ratio: result.aspectRatio,
          quality: 'auto',
          n: count,
        },
        [{ file: result.productImage, primary: true }],
      );
      addTask(task);
      setSubmitted((current) => [
        { id: task.id, sceneName: result.selectedTemplate.label, count },
        ...current,
      ]);
      notifyInfo('已提交，结果会实时显示在下方');
      getAccount().then((data) => setAccount(data)).catch(() => undefined);
      navigate(`/workspace/${task.id}`);
    } catch (error) {
      notifyError(error);
    } finally {
      setLoading(false);
    }
  }

  async function completeAndGenerate(result: WizardResult) {
    setLastResult(result);
    setShowWizard(false);
    setInitialScene('');
    setInitialSceneTemplate(null);
    await runGeneration(result);
  }

  function handleStartCreate() {
    if (!viewer?.authenticated) {
      openAuthModal('login', '/create', 'generate');
      return;
    }
    if (isOutOfCredits) {
      openRechargeGate(null);
      return;
    }
    setShowWizard(true);
  }

  function handleRegenerate() {
    if (lastResult) void runGeneration(lastResult);
  }

  function openRechargeGate(expectedCost: number | null) {
    setRechargeGateExpectedCost(expectedCost);
    setRechargeGateOpen(true);
  }

  function handleCloseRechargeGate() {
    setRechargeGateOpen(false);
    if (viewer?.authenticated) {
      getAccount().then((data) => setAccount(data)).catch(() => undefined);
    }
  }

  function handleRecharge() {
    setRechargeGateOpen(false);
    navigate('/recharge');
  }

  completeRef.current = completeAndGenerate;

  const hasRuns = runs.length > 0;

  return (
    <div className="mx-auto min-h-screen max-w-screen-2xl px-4 pb-28 pt-6 lg:pb-8">
      {showWizard ? (
        <CreateFlowWizard
          onComplete={completeAndGenerate}
          onClose={() => { setShowWizard(false); setInitialScene(''); setInitialSceneTemplate(null); }}
          initialSceneDescription={initialScene || undefined}
          initialSceneTemplate={initialSceneTemplate}
          balance={account?.balance ?? null}
        />
      ) : null}

      <RechargeGate
        open={rechargeGateOpen}
        onClose={handleCloseRechargeGate}
        balance={account?.balance ?? null}
        expectedCost={rechargeGateExpectedCost}
        onRecharge={handleRecharge}
      />

      <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E3FF74]">Create</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#f0ede8] sm:text-3xl">创建商品图</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            一个向导走完：选类目、传商品图、描述场景，点生成即可，结果实时显示在下方。
          </p>
        </div>
        {hasRuns ? (
          <button
            type="button"
            onClick={handleStartCreate}
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-[#E3FF74] px-5 text-sm font-bold text-[#14120f] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/40"
          >
            <PackagePlus size={16} />
            新建创作
          </button>
        ) : null}
      </div>

      {hasRuns ? (
        <ResultView
          runs={runs}
          loading={loading}
          canRegenerate={Boolean(lastResult)}
          balance={account?.balance ?? null}
          regenerateCount={lastResult ? normalizeCount(lastResult.imageCount) : 0}
          onRegenerate={handleRegenerate}
          onNewCreation={handleStartCreate}
        />
      ) : (
        <CreateHero loading={loading} hasPrompt={Boolean(initialScene)} onStart={handleStartCreate} />
      )}
    </div>
  );
}

function CreateHero({ loading, hasPrompt, onStart }: { loading: boolean; hasPrompt: boolean; onStart: () => void }) {
  const steps = [
    { icon: PackagePlus, title: '选择模板', desc: '按客户类型与场景挑专家模板' },
    { icon: CloudUpload, title: '上传商品图', desc: 'PNG / JPEG / WEBP，白底图更稳' },
    { icon: Wand2, title: '微调并生成', desc: '调比例与数量，按模板风格一键出图' },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E3FF74]/20 bg-[#14120f]">
      <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)] lg:items-center">
        <div className="min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#E3FF74]/10 text-[#E3FF74]">
            <Sparkles size={22} />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-[#f0ede8] sm:text-3xl">用模板风格生成商品图</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">
            先按客户类型和场景挑一个专家模板，再上传商品图，按模板风格直接生成可继续编辑的结果。
          </p>
          {hasPrompt ? (
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#E3FF74]/25 bg-[#E3FF74]/[0.06] px-3 py-2 text-xs font-semibold text-[#E3FF74]">
              <Wand2 size={14} />
              已带入灵感提示词，向导里可直接编辑
            </div>
          ) : null}
          <button
            type="button"
            onClick={onStart}
            disabled={loading}
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#E3FF74] px-6 text-sm font-bold text-[#14120f] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/40"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            开始创作
            <ArrowRight size={16} />
          </button>
        </div>

        <ol className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E3FF74]/20 bg-[#E3FF74]/10 text-[#E3FF74]">
                <step.icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#f0ede8]">
                  <span className="mr-1.5 text-[#E3FF74]/70">{index + 1}.</span>
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-white/45">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ResultView({
  runs,
  loading,
  canRegenerate,
  balance,
  regenerateCount,
  onRegenerate,
  onNewCreation,
}: {
  runs: GenerationRun[];
  loading: boolean;
  canRegenerate: boolean;
  balance: AccountInfo['balance'] | null;
  regenerateCount: number;
  onRegenerate: () => void;
  onNewCreation: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0 space-y-3">
        {runs.map((run) => (
          <Fragment key={run.taskId}>
            <TaskResultRow run={run} expectedCount={run.count} />
          </Fragment>
        ))}
      </section>

      <aside className="min-w-0 space-y-4">
        <div className="rounded-lg border border-white/10 bg-[#14120f] p-4">
          <h2 className="text-sm font-bold text-[#f0ede8]">继续创作</h2>
          <p className="mt-1 text-xs leading-5 text-white/45">用相同设置再出一批，或开新向导换商品。</p>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={onRegenerate}
              disabled={!canRegenerate || loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] text-sm font-semibold text-white/80 transition-colors hover:border-[#E3FF74]/40 hover:text-[#E3FF74] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              相同设置重生成{regenerateCount > 0 ? ` · ${regenerateCount} 张` : ''}
            </button>
            <button
              type="button"
              onClick={onNewCreation}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#E3FF74] text-sm font-bold text-[#14120f] transition-opacity hover:opacity-90"
            >
              <PackagePlus size={15} />
              新建创作
            </button>
          </div>
        </div>

        {regenerateCount > 0 ? (
          <CreditEstimate
            balance={balance}
            imageCount={regenerateCount}
            sizeTier="FAST"
          />
        ) : null}
      </aside>
    </div>
  );
}

function TaskResultRow({ run, expectedCount }: { run: GenerationRun; expectedCount: number }) {
  const status = run.task?.status ?? 'queued';
  const isActive = status === 'queued' || status === 'running';
  const images = (run.task?.items ?? []).filter((item) => item.status === 'succeeded' && item.image_url);
  const placeholderCount = Math.max(1, expectedCount);

  const statusMeta: Record<string, { label: string; className: string }> = {
    queued: { label: '排队中', className: 'border-white/15 text-white/55' },
    running: { label: '生成中', className: 'border-[#E3FF74]/40 text-[#E3FF74]' },
    succeeded: { label: '已完成', className: 'border-[#E3FF74]/60 text-[#E3FF74]' },
    failed: { label: '失败', className: 'border-error/50 text-error' },
  };
  const meta = statusMeta[status] ?? statusMeta.queued;

  return (
    <div className="rounded-lg border border-white/10 bg-[#10100e] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold text-[#f0ede8]">{run.sceneName}</p>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.className}`}>
          {isActive ? <Loader2 size={11} className="animate-spin" /> : null}
          {meta.label}
        </span>
      </div>

      {status === 'failed' ? (
        <p className="rounded-md border border-error/30 bg-error/5 p-2 text-xs leading-5 text-error/90">
          {run.task?.error || '生成失败，请重试'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {images.length > 0
            ? images.map((item) => (
                <a
                  key={item.id}
                  href={item.image_url ?? undefined}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block aspect-square overflow-hidden rounded-md border border-white/10 bg-black/30"
                >
                  <img src={item.image_url ?? undefined} alt={run.sceneName} className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/45 group-hover:opacity-100">
                    <Download size={16} className="text-white" />
                  </span>
                </a>
              ))
            : Array.from({ length: placeholderCount }).map((_, index) => (
                <div
                  key={index}
                  className="flex aspect-square items-center justify-center rounded-md border border-white/10 bg-black/20"
                >
                  {isActive ? (
                    <Loader2 size={16} className="animate-spin text-white/30" />
                  ) : (
                    <ImageIcon size={16} className="text-white/20" />
                  )}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
