import { useEffect, useRef, useState } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Box, CheckCircle2, ImagePlus, Layers, LogIn, RefreshCw, SlidersHorizontal, UserCircle, Wallet } from 'lucide-react';
import { AccountInfo, formatBalance, getAccount } from '../../api';
import { useAuth } from '../../auth';
import { useAuthModal } from '../../authModal';
import AvatarBadge from '../../components/AvatarBadge';
import { Button, StatusPill, useRevealScope, WorkbenchCard, WorkbenchComposerPanel, WorkbenchDetailPanel } from '../../components/design-system';
import { studioLocation, type StudioLocation } from './studioLocation';
import { navItemById } from './studioNav';
import { EXPLORE_ROUTE } from './studioRoutes';
import { locationToPath, parseStudioPath } from './studioUrl';
import { demoPanelFor, type StudioDemoPanel, type StudioDemoT3 } from './studioDemoTree';
import { StudioShell } from '../shell/StudioShell';
import { CreateTemplateWorkspace } from '../create/CreateTemplateWorkspace';
import { CreateEditorWorkbench } from '../create/CreateEditorWorkbench';
import { templateFromLocation } from '../create/createTemplateResolver';
import { RedrawWorkspace } from '../redraw/RedrawWorkspace';
import { AssetLibraryWorkspace } from '../assets/AssetLibraryWorkspace';
import { UserWorkspace } from '../user/UserWorkspace';
import { InspirationWorkspace } from '../inspiration/InspirationSurface';

export function StudioApp({ initialLocation }: { initialLocation: StudioLocation }) {
  const [location, setLocation] = useState(initialLocation);
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  // Mirror a navigation onto the URL so the surface + sub-tab are shareable and
  // survive refresh/back/forward. Editor/selection state stays in component state.
  function applyLocation(next: StudioLocation) {
    if (next.t1 === 'inspiration') {
      navigate(EXPLORE_ROUTE);
      return;
    }
    setLocation(next);
    const demo = new URLSearchParams(routerLocation.search).get('demo');
    const search = demo ? `?demo=${demo}` : '';
    const path = locationToPath(next);
    if (path !== routerLocation.pathname || search !== routerLocation.search) {
      navigate(`${path}${search}`);
    }
  }

  // Keep state in sync when the URL changes outside of applyLocation
  // (browser back/forward, manual edit, deep link).
  useEffect(() => {
    const parsed = parseStudioPath(routerLocation.pathname);
    if (!parsed) return;
    const current = locationRef.current;
    if (current.t1 === parsed.t1 && current.t2 === parsed.t2) return;
    setLocation(studioLocation('studio', parsed.t1, parsed.t2));
  }, [routerLocation.pathname]);

  const createEditing = location.t1 === 'create' && Boolean(location.t3 || location.composer);

  if (createEditing) {
    return (
      <CreateEditorWorkbench
        location={location}
        template={templateFromLocation(location, location.t2)}
        onLocationChange={applyLocation}
        onClose={() => applyLocation({ ...location, t3: null, composer: null })}
      />
    );
  }

  return (
    <StudioShell location={location} onLocationChange={applyLocation}>
      <Stage location={location} onLocationChange={applyLocation} />
    </StudioShell>
  );
}

function Stage({
  location,
  onLocationChange,
}: {
  location: StudioLocation;
  onLocationChange: (next: StudioLocation) => void;
}) {
  const item = navItemById(location.t1);
  const child = item.children.find((entry) => entry.id === location.t2) ?? item.children[0];
  const panel = demoPanelFor(item.id, child?.id);
  const selectedItem = location.t3 ? panel.items.find((entry) => entry.id === location.t3?.id) : null;
  const revealScope = useRevealScope<HTMLDivElement>({
    trigger: 'mount',
    itemSelector: ':scope > *',
    deps: [location.t1, location.t2],
    y: 16,
    duration: 0.5,
    stagger: 0.08,
  });

  return (
    <div ref={revealScope} key={`${location.t1}-${location.t2}`} className="@container mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5 px-5 py-5">
      <header className="border-b border-white/[0.08] pb-4">
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label={`${item.label}分区`}>
          {item.children.map((entry) => {
            const active = entry.id === child?.id;
            return (
              <button
                key={entry.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                className={`ds-motion-press h-10 shrink-0 rounded-md border px-4 text-sm font-semibold transition ${
                  active
                    ? 'border-lime/45 bg-lime/15 text-lime'
                    : 'border-white/[0.08] bg-white/[0.035] text-[#aaa49a] hover:border-white/[0.16] hover:text-[#f4f0ea]'
                }`}
                onClick={() =>
                  onLocationChange({
                    ...location,
                    t2: entry.id,
                    t3: null,
                    composer: null,
                  })
                }
              >
                {entry.label}
              </button>
            );
          })}
        </nav>
      </header>

      {item.id === 'create' ? (
        <CreateTemplateWorkspace
          scenarioId={child?.id}
          location={location}
          onSelectItem={(demoItem) =>
            onLocationChange({
              ...location,
              t3: { kind: demoItem.kind, id: demoItem.id },
              composer: demoItem.composer
                ? {
                    kind: demoItem.composer,
                    preset: {
                      ...demoItem.preset,
                      t1: item.id,
                      t2: child?.id ?? '',
                    },
                  }
                : null,
            })
          }
          onClearSelection={() =>
            onLocationChange({
              ...location,
              t3: null,
              composer: null,
            })
          }
        />
      ) : item.id === 'redraw' ? (
        <RedrawWorkspace location={location} onLocationChange={onLocationChange} />
      ) : item.id === 'assets' ? (
        <AssetLibraryWorkspace location={location} onLocationChange={onLocationChange} />
      ) : item.id === 'user' ? (
        <UserWorkspace location={location} />
      ) : item.id === 'inspiration' ? (
        <InspirationWorkspace />
      ) : (
        <section className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_340px]">
          <WorkspaceBody
            t1={item.id}
            t2Label={child?.label ?? item.label}
            t2Description={child?.description}
            panel={panel}
            location={location}
            onSelectItem={(demoItem) =>
              onLocationChange({
                ...location,
                t3: { kind: demoItem.kind, id: demoItem.id },
                composer: demoItem.composer
                  ? {
                      kind: demoItem.composer,
                      preset: {
                        ...demoItem.preset,
                        t1: item.id,
                        t2: child?.id ?? '',
                      },
                    }
                  : null,
              })
            }
          />

          <aside className="space-y-4">
            <WorkbenchDetailPanel
              key={location.t3?.id ?? 'empty-detail'}
              eyebrow="详情"
              title={selectedItem?.title}
              description={selectedItem?.description}
              actions={selectedItem?.actions}
              emptyDescription="选择卡片查看详情。"
            />

            <WorkbenchComposerPanel
              key={location.composer?.kind ?? 'empty-composer'}
              active={Boolean(location.composer)}
              kind={location.composer?.kind}
              payload={location.composer?.preset}
              emptyDescription="选择后执行。"
            />
          </aside>
        </section>
      )}
    </div>
  );
}

function WorkspaceBody({
  t1,
  t2Label,
  t2Description,
  panel,
  location,
  onSelectItem,
}: {
  t1: string;
  t2Label: string;
  t2Description?: string;
  panel: StudioDemoPanel;
  location: StudioLocation;
  onSelectItem: (item: StudioDemoT3) => void;
}) {
  if (t1 === 'assets') {
    return <AssetGalleryTabs t2Label={t2Label} t2Description={t2Description} panel={panel} location={location} onSelectItem={onSelectItem} />;
  }

  if (t1 === 'redraw') {
    return <RedrawToolGroups t2Label={t2Label} t2Description={t2Description} panel={panel} location={location} onSelectItem={onSelectItem} />;
  }

  if (t1 === 'user') {
    return <UserSections t2Label={t2Label} t2Description={t2Description} panel={panel} location={location} onSelectItem={onSelectItem} />;
  }

  return <CreateWorkflowColumns t2Label={t2Label} t2Description={t2Description} panel={panel} location={location} onSelectItem={onSelectItem} />;
}

function SectionShell({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-white/[0.08] bg-white/[0.025] p-4" aria-label={label}>
        {description ? <div className="mb-3 flex justify-end text-sm text-[#8f897f]">{description}</div> : null}
        {children}
      </section>
    </div>
  );
}

function CreateWorkflowColumns({
  t2Label,
  t2Description,
  panel,
  location,
  onSelectItem,
}: WorkspaceRendererProps) {
  return (
    <SectionShell label={t2Label} description={t2Description}>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {panel.items.map((demoItem, index) => (
          <WorkbenchCard
            key={demoItem.id}
            title={demoItem.title}
            description={demoItem.description}
            icon={<T3Icon kind={demoItem.kind} />}
            active={location.t3?.id === demoItem.id}
            motionIndex={index}
            actionLabel="创建"
            onClick={() => onSelectItem(demoItem)}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function AssetGalleryTabs({
  t2Label,
  t2Description,
  panel,
  location,
  onSelectItem,
}: WorkspaceRendererProps) {
  return (
    <SectionShell label={t2Label} description={t2Description}>
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {panel.items.map((demoItem, index) => (
          <button
            key={demoItem.id}
            type="button"
            data-active={location.t3?.id === demoItem.id}
            className="ds-motion-card group overflow-hidden rounded-lg border border-white/[0.08] bg-[#181816] text-left transition hover:border-lime/45 data-[active=true]:border-lime/60"
            style={{ '--workbench-card-index': index } as React.CSSProperties}
            onClick={() => onSelectItem(demoItem)}
          >
            <span className="block aspect-[4/3] border-b border-white/[0.08] bg-[linear-gradient(135deg,#25251f,#111110_62%,#34372a)]" />
            <span className="block p-3">
              <span className="block text-sm font-bold text-[#f4f0ea]">{demoItem.title}</span>
              <span className="mt-1 block text-xs text-[#8f897f]">{demoItem.description}</span>
              <span className="mt-3 inline-flex text-xs font-bold text-lime">选资产</span>
            </span>
          </button>
        ))}
      </div>
    </SectionShell>
  );
}

function RedrawToolGroups({
  t2Label,
  t2Description,
  panel,
  location,
  onSelectItem,
}: WorkspaceRendererProps) {
  return (
    <SectionShell label={t2Label} description={t2Description}>
      <div className="grid gap-3 lg:grid-cols-2">
        {panel.items.map((demoItem, index) => (
          <WorkbenchCard
            key={demoItem.id}
            title={demoItem.title}
            description={demoItem.description}
            icon={<SlidersHorizontal size={17} />}
            active={location.t3?.id === demoItem.id}
            motionIndex={index}
            actionLabel="重绘"
            onClick={() => onSelectItem(demoItem)}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function UserSections({
  t2Label,
  t2Description,
  panel,
  location,
  onSelectItem,
}: WorkspaceRendererProps) {
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const authenticated = Boolean(viewer?.authenticated);

  async function loadAccount() {
    if (!authenticated) {
      setAccount(null);
      setLoadError(false);
      return;
    }

    setLoading(true);
    setLoadError(false);
    try {
      setAccount(await getAccount());
    } catch {
      setAccount(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccount().catch(() => undefined);
  }, [authenticated, viewer?.owner_id]);

  const displayName = account?.user.username || account?.user.name || viewer?.user?.username || viewer?.user?.email || '访客';
  const displayEmail = account?.user.email || viewer?.user?.email || '';
  const balanceReady = Boolean(account?.balance.ok && account.balance.remaining !== null && !Number.isNaN(account.balance.remaining));
  const balanceValue = balanceReady ? formatBalance(account?.balance) : '--';
  const balanceTone = loadError ? 'error' : balanceReady ? 'success' : loading ? 'running' : 'neutral';
  const balanceStatus = loading ? '同步中' : loadError ? '同步失败' : balanceReady ? '已更新' : authenticated ? '待同步' : '未登录';

  return (
    <SectionShell label={t2Label} description={t2Description}>
      <section className="mb-3 rounded-lg border border-lime/15 bg-lime/[0.06] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarBadge
              className="h-12 w-12 shrink-0"
              textClassName="text-sm"
              name={displayName}
              email={displayEmail}
              guestId={viewer?.guest_id}
            />
            <div className="min-w-0">
              <StatusPill tone={authenticated ? 'success' : 'neutral'} size="sm" className="mb-1">
                <UserCircle size={13} />
                {authenticated ? '已登录' : '未登录'}
              </StatusPill>
              <div className="truncate text-base font-bold text-[#f4f0ea]">{displayName}</div>
              {displayEmail ? <div className="truncate text-sm text-[#8f897f]">{displayEmail}</div> : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <AccountMetric label="当前额度" value={balanceValue} icon={<Wallet size={15} />} tone="lime" />
            <AccountMetric label="成功任务" value={account?.stats.succeeded ?? '--'} />
            <AccountMetric label="重绘次数" value={account?.stats.edits ?? '--'} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-3">
          <StatusPill tone={balanceTone}>
            {loading ? <RefreshCw className="animate-spin" size={13} /> : loadError || !balanceReady ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
            余额{balanceStatus}
          </StatusPill>

          {authenticated ? (
            <Button
              variant="ghost"
              size="sm"
              iconStart={<RefreshCw className={loading ? 'animate-spin' : undefined} size={14} />}
              disabled={loading}
              onClick={() => loadAccount().catch(() => undefined)}
            >
              刷新账户
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="lime" size="sm" iconStart={<LogIn size={14} />} onClick={() => openAuthModal('login', '/user')}>
                登录
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openAuthModal('register', '/user')}>
                注册
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-2">
        {panel.items.map((demoItem, index) => (
          <button
            key={demoItem.id}
            type="button"
            data-active={location.t3?.id === demoItem.id}
            className="ds-motion-card flex min-h-14 items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-left transition hover:border-lime/45 data-[active=true]:border-lime/60 data-[active=true]:bg-lime/10"
            style={{ '--workbench-card-index': index } as React.CSSProperties}
            onClick={() => onSelectItem(demoItem)}
          >
            <span className="grid h-9 w-9 place-items-center rounded-md bg-white/[0.05] text-lime">
              <UserCircle size={17} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#f4f0ea]">{demoItem.title}</span>
              <span className="mt-0.5 block truncate text-xs text-[#8f897f]">{demoItem.description}</span>
            </span>
            <span className="text-xs font-bold text-lime">打开</span>
          </button>
        ))}
      </div>
    </SectionShell>
  );
}

function AccountMetric({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'lime';
}) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8f897f]">
        {icon ? <span className={tone === 'lime' ? 'text-lime' : 'text-[#8f897f]'}>{icon}</span> : null}
        {label}
      </div>
      <div className={`mt-2 truncate font-display text-2xl font-bold ${tone === 'lime' ? 'text-lime' : 'text-[#f4f0ea]'}`}>
        {value}
      </div>
    </div>
  );
}

type WorkspaceRendererProps = {
  t2Label: string;
  t2Description?: string;
  panel: StudioDemoPanel;
  location: StudioLocation;
  onSelectItem: (item: StudioDemoT3) => void;
};

function T3Icon({ kind }: { kind: 'workflow' | 'scenario' | 'asset' | 'inspiration' }) {
  const Icon = kind === 'asset' ? Box : kind === 'scenario' ? Layers : ImagePlus;
  return <Icon size={17} />;
}
