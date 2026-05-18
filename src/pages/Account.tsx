import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, LogIn, RefreshCw, UserCircle, Wallet } from 'lucide-react';
import { AccountInfo, formatBalance, getAccount } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import AvatarBadge from '../components/AvatarBadge';
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
  const balanceStatusClass = loadError ? 'text-secondary' : balanceReady ? 'text-primary' : 'text-white/45';

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-8 sm:px-6 lg:justify-center lg:py-14">
      <header className="mb-7">
        <p className="mb-3 text-sm font-semibold text-primary">AetherGenix</p>
        <h1 className="text-3xl font-bold text-on-surface sm:text-5xl">{t('recharge_title')}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant">{t('recharge_desc')}</p>
      </header>

      {!authenticated ? (
        <section className="border border-primary/25 bg-primary/5 px-5 py-7 text-center sm:px-8">
          <LogIn className="mx-auto mb-4 text-primary" size={30} />
          <h2 className="text-xl font-bold text-on-surface">{t('recharge_login_required')}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-on-surface-variant">{t('recharge_login_desc')}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button className="btn-primary w-full sm:w-auto" type="button" onClick={() => openAuthModal('login')}>
              <LogIn size={16} />
              {t('top_login')}
            </button>
            <button className="btn-ghost w-full sm:w-auto" type="button" onClick={() => openAuthModal('register')}>
              {t('top_register')}
            </button>
          </div>
        </section>
      ) : (
        <section className="border border-white/10 bg-surface/75 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-7">
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
                <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <UserCircle size={14} />
                  {t('account_logged_in_identity')}
                </div>
                <div className="truncate text-base font-bold text-on-surface">{displayName}</div>
                {displayEmail ? <div className="truncate text-sm text-on-surface-variant">{displayEmail}</div> : null}
              </div>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 border border-white/10 px-4 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-36"
              disabled={loading}
              type="button"
              onClick={() => loadAccount().catch(() => undefined)}
            >
              <RefreshCw className={loading ? 'animate-spin' : undefined} size={16} />
              {loading ? t('recharge_refreshing') : loadError ? t('recharge_balance_retry') : t('recharge_refresh')}
            </button>
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-sm font-semibold text-on-surface-variant">{t('recharge_current_balance')}</p>
            <div className="mt-3 break-all text-5xl font-bold leading-none text-secondary sm:text-6xl">{balanceValue}</div>
            <div className={`mt-4 inline-flex items-center gap-2 text-sm ${balanceStatusClass}`}>
              {loading ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : loadError || !balanceReady ? (
                <AlertCircle size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              {balanceStatusText}
            </div>
          </div>

          <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-on-surface-variant">{t('recharge_external_desc')}</p>

          <div className="mt-6">
            {externalRechargeUrl ? (
              <a
                className="inline-flex h-12 w-full items-center justify-center gap-2 bg-secondary px-5 text-sm font-bold text-white transition-opacity hover:opacity-90 sm:w-auto sm:min-w-48"
                href={externalRechargeUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Wallet size={16} />
                {t('account_recharge_action')}
                <ExternalLink size={16} />
              </a>
            ) : (
              <div className="border border-secondary/25 bg-secondary/10 p-4 text-sm leading-6 text-on-surface">
                {t('recharge_external_missing')}
              </div>
            )}
          </div>

          {externalRechargeUrl ? (
            <p className="mt-3 text-xs leading-5 text-white/45">{t('recharge_open_external_note')}</p>
          ) : null}
        </section>
      )}
    </div>
  );
}
