import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LogIn, RefreshCw, UserCircle, Wallet } from 'lucide-react';
import { AccountInfo, formatBalance, getAccount } from '../../api';
import { useAuth } from '../../auth';
import { useAuthModal } from '../../authModal';
import AvatarBadge from '../../components/AvatarBadge';
import { Button, SelectControl, SkeletonBlock, StatusPill, Surface, SurfaceState } from '../../components/design-system';
import { CUSTOMERS } from '../../components/ecommerce/sceneCatalog';
import { CREATE_TEMPLATES } from '../create/createTemplates';
import { STUDIO_ASPECT_RATIO_OPTIONS, STUDIO_COUNT_OPTIONS, useStudioPreferences } from '../preferences/useStudioPreferences';
import type { StudioLocation } from '../app/studioLocation';

export function UserWorkspace({ location }: { location: StudioLocation }) {
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

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <AccountSummary
        account={account}
        loading={loading}
        loadError={loadError}
        authenticated={authenticated}
        viewerName={viewer?.user?.username || viewer?.user?.email || '访客'}
        viewerEmail={viewer?.user?.email || ''}
        guestId={viewer?.guest_id}
        onRefresh={() => loadAccount().catch(() => undefined)}
        onLogin={() => openAuthModal('login', '/user')}
        onRegister={() => openAuthModal('register', '/user')}
      />
      {location.t2 === 'preferences' ? <PreferencesPanel /> : null}
      {location.t2 === 'settings' ? (
        <SurfaceState
          kind="info"
          title="设置会使用真实偏好保存"
          description="当前可用设置先落在偏好面板；导出格式、水印和隐私需要后端策略后再开放。"
        />
      ) : null}
      {location.t2 === 'balance' ? (
        <Surface tone="subtle" padding="md">
          <div className="text-xs font-bold text-on-surface-variant">额度说明</div>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">余额来自账户接口；刷新账户会重新同步可用额度和任务统计。</p>
        </Surface>
      ) : null}
    </section>
  );
}

function AccountSummary({
  account,
  loading,
  loadError,
  authenticated,
  viewerName,
  viewerEmail,
  guestId,
  onRefresh,
  onLogin,
  onRegister,
}: {
  account: AccountInfo | null;
  loading: boolean;
  loadError: boolean;
  authenticated: boolean;
  viewerName: string;
  viewerEmail: string;
  guestId?: string;
  onRefresh: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  const displayName = account?.user.username || account?.user.name || viewerName;
  const displayEmail = account?.user.email || viewerEmail;
  const balanceReady = Boolean(account?.balance.ok && account.balance.remaining !== null && !Number.isNaN(account.balance.remaining));
  const balanceValue = balanceReady ? formatBalance(account?.balance) : '--';
  const balanceTone = loadError ? 'error' : balanceReady ? 'success' : loading ? 'running' : 'neutral';
  const balanceStatus = loading ? '同步中' : loadError ? '同步失败' : balanceReady ? '已更新' : authenticated ? '待同步' : '未登录';

  return (
    <Surface tone="lime" padding="md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <AvatarBadge
            className="h-12 w-12 shrink-0"
            textClassName="text-sm"
            name={displayName}
            email={displayEmail}
            guestId={guestId}
          />
          <div className="min-w-0">
            <StatusPill tone={authenticated ? 'success' : 'neutral'} size="sm" className="mb-1">
              {authenticated ? '已登录' : '未登录'}
            </StatusPill>
            <div className="truncate text-base font-bold text-on-surface">{displayName}</div>
            {displayEmail ? <div className="truncate text-sm text-on-surface-variant">{displayEmail}</div> : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
          <AccountMetric label="当前额度" value={balanceValue} icon={<Wallet size={15} />} tone="lime" loading={loading} error={loadError} />
          <AccountMetric label="成功任务" value={account?.stats.succeeded ?? 0} loading={loading} error={loadError} />
          <AccountMetric label="重绘次数" value={account?.stats.edits ?? 0} loading={loading} error={loadError} />
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
            onClick={onRefresh}
          >
            刷新账户
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="lime" size="sm" iconStart={<LogIn size={14} />} onClick={onLogin}>
              登录
            </Button>
            <Button variant="ghost" size="sm" onClick={onRegister}>
              注册
            </Button>
          </div>
        )}
      </div>
    </Surface>
  );
}

function AccountMetric({
  label,
  value,
  icon,
  tone = 'neutral',
  loading,
  error,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'lime';
  loading: boolean;
  error: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/20 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
        {icon ? <span className={tone === 'lime' ? 'text-lime' : 'text-on-surface-variant'}>{icon}</span> : null}
        {label}
      </div>
      {loading ? (
        <SkeletonBlock className="mt-3 h-8 w-24" />
      ) : (
        <div className={`mt-2 truncate font-display text-2xl font-bold ${error ? 'text-error' : tone === 'lime' ? 'text-lime' : 'text-on-surface'}`}>
          {error ? '--' : value}
        </div>
      )}
    </div>
  );
}

function PreferencesPanel() {
  const { preferences, updatePreferences, resetPreferences } = useStudioPreferences();
  const platforms = useMemo(() => unique(['通用', ...CREATE_TEMPLATES.flatMap((template) => template.platforms)]), []);

  return (
    <Surface tone="default" padding="md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-on-surface-variant">偏好</div>
          <h2 className="mt-1 font-display text-xl font-bold text-on-surface">默认生成参数</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={resetPreferences}>
          恢复默认
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <PreferenceSelect label="默认比例" value={preferences.aspectRatio} options={STUDIO_ASPECT_RATIO_OPTIONS} onChange={(value) => updatePreferences({ aspectRatio: value })} />
        <PreferenceSelect label="默认数量" value={String(preferences.count)} options={STUDIO_COUNT_OPTIONS.map(String)} onChange={(value) => updatePreferences({ count: Number(value) })} />
        <PreferenceSelect
          label="默认行业"
          value={preferences.industry}
          options={CUSTOMERS.map((customer) => customer.key)}
          labels={Object.fromEntries(CUSTOMERS.map((customer) => [customer.key, customer.label]))}
          onChange={(value) => updatePreferences({ industry: value })}
        />
        <PreferenceSelect label="默认平台" value={preferences.platform} options={platforms} onChange={(value) => updatePreferences({ platform: value })} />
      </div>
    </Surface>
  );
}

function PreferenceSelect({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
      <SelectControl value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </SelectControl>
    </label>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
