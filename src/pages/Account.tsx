import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, LogIn, RefreshCw, UserCircle, Wallet } from 'lucide-react';
import { AccountInfo, formatBalance, getAccount } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import AvatarBadge from '../components/AvatarBadge';
import {
  Button,
  StatusPill,
  Surface,
  SurfaceState,
} from '../components/design-system';
import { resolveExternalRechargeUrl } from '../rechargeDomain';
import { useSite } from '../site';

export default function Account() {
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { siteSettings, t } = useSite();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const externalRechargeUrl = useMemo(() => resolveExternalRechargeUrl(siteSettings), [siteSettings]);

  async function loadAccount() {
    if (!viewer?.authenticated) {
      setAccount(null);
      setLoadError(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      setAccount(await getAccount());
    } catch {
      setLoadError(true);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccount().catch(() => undefined);
  }, [viewer?.owner_id]);

  const authenticated = Boolean(account?.user.authenticated ?? viewer?.authenticated);
  const displayName = account?.user.username || account?.user.name || viewer?.user?.username || viewer?.user?.email || t('account_guest');
  const displayEmail = account?.user.email || viewer?.user?.email || '';
  const balanceReady = Boolean(account?.balance.ok && account.balance.remaining !== null && !Number.isNaN(account.balance.remaining));
  const balanceValue = balanceReady ? formatBalance(account?.balance) : '--';
  const balanceStatusText = loading
    ? t('recharge_balance_syncing')
    : loadError
      ? t('recharge_balance_sync_failed')
      : balanceReady
        ? t('recharge_balance_updated')
        : t('recharge_balance_pending');
  const balanceTone = loadError ? 'error' : balanceReady ? 'success' : loading ? 'running' : 'neutral';

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-8 text-on-surface sm:px-6 lg:justify-center lg:py-14">
      <header className="mb-7">
        <StatusPill tone="commercial" size="sm" className="mb-3">
          AetherGenix
        </StatusPill>
        <h1 className="font-display text-3xl font-bold leading-tight text-on-surface sm:text-5xl">
          {t('recharge_title')}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant">{t('recharge_desc')}</p>
      </header>

      {!authenticated ? (
        <SurfaceState
          kind="info"
          title={t('recharge_login_required')}
          description={t('recharge_login_desc')}
          action={{ label: t('top_login'), onClick: () => openAuthModal('login'), iconStart: <LogIn size={14} /> }}
          secondaryAction={{ label: t('top_register'), onClick: () => openAuthModal('register') }}
          className="min-h-[300px]"
        />
      ) : (
        <Surface padding="lg">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <AvatarBadge
                className="h-12 w-12 shrink-0"
                textClassName="text-sm"
                name={displayName}
                email={displayEmail}
                guestId={account?.viewer.guest_id || viewer?.guest_id}
              />
              <div className="min-w-0">
                <StatusPill tone="neutral" size="sm" className="mb-1">
                  <UserCircle size={13} />
                  {t('account_logged_in_identity')}
                </StatusPill>
                <div className="truncate text-base font-bold text-on-surface">{displayName}</div>
                {displayEmail ? <div className="truncate text-sm text-on-surface-variant">{displayEmail}</div> : null}
              </div>
            </div>
            <Button
              variant="ghost"
              size="lg"
              iconStart={<RefreshCw className={loading ? 'animate-spin' : undefined} size={16} />}
              disabled={loading}
              onClick={() => loadAccount().catch(() => undefined)}
              className="sm:shrink-0"
            >
              {loading ? t('recharge_refreshing') : loadError ? t('recharge_balance_retry') : t('recharge_refresh')}
            </Button>
          </div>

          <div className="border-t border-white/[0.08] pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-on-surface-variant">{t('recharge_current_balance')}</p>
                <div className="mt-3 break-all font-display text-5xl font-bold leading-none text-secondary sm:text-6xl">
                  {balanceValue}
                </div>
              </div>
              <StatusPill tone={balanceTone} className="sm:shrink-0">
                {loading ? (
                  <RefreshCw className="animate-spin" size={13} />
                ) : loadError || !balanceReady ? (
                  <AlertCircle size={13} />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                {balanceStatusText}
              </StatusPill>
            </div>
          </div>

          <p className="mt-6 border-t border-white/[0.08] pt-5 text-sm leading-6 text-on-surface-variant">
            {t('recharge_external_desc')}
          </p>

          <div className="mt-6">
            {externalRechargeUrl ? (
              <Button
                as="a"
                variant="orange"
                size="lg"
                href={externalRechargeUrl}
                rel="noreferrer"
                target="_blank"
                iconStart={<Wallet size={16} />}
                iconEnd={<ExternalLink size={16} />}
                className="w-full sm:w-auto sm:min-w-48"
              >
                {t('account_recharge_action')}
              </Button>
            ) : (
              <Surface tone="orange" padding="md" className="text-sm leading-6 text-on-surface">
                {t('recharge_external_missing')}
              </Surface>
            )}
          </div>

          {externalRechargeUrl ? (
            <p className="mt-3 text-xs leading-5 text-on-surface-variant">{t('recharge_open_external_note')}</p>
          ) : null}
        </Surface>
      )}
    </div>
  );
}
