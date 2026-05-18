import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, AlertCircle, ArrowRight, CreditCard, Loader2, LogIn, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BalanceInfo, LedgerEntry, formatBalance, formatDate, getBalance, getLedger } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import { useNotifier } from '../notifications';
import { useSite } from '../site';

function WorkSurfaceState({
  accent = 'primary',
  action,
  description,
  icon,
  title,
}: {
  accent?: 'primary' | 'secondary' | 'error';
  action?: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  const accentClasses = {
    primary: 'border-primary/25 bg-primary/10 text-primary shadow-primary/10',
    secondary: 'border-secondary/25 bg-secondary/10 text-secondary shadow-secondary/10',
    error: 'border-error/25 bg-error/10 text-error shadow-error/10',
  }[accent];

  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-outline-variant/70 bg-surface/70 px-6 py-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${accentClasses}`}>
          {icon}
        </div>
        <h2 className="text-xl font-bold tracking-tight text-on-surface">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
        {action ? <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div> : null}
      </div>
    </div>
  );
}

export default function Billing() {
  const { viewer } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { t } = useSite();
  const { notifyError } = useNotifier();
  const [balance, setBalance] = useState<BalanceInfo>();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function loadBilling() {
    if (!viewer?.authenticated) {
      setBalance(undefined);
      setLedger([]);
      setLoadError(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const [balanceData, ledgerData] = await Promise.all([getBalance(), getLedger(50)]);
      setBalance(balanceData);
      setLedger(ledgerData.items);
    } catch (err) {
      setLoadError(true);
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBilling().catch(() => undefined);
  }, [viewer?.owner_id]);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 mb-10 border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-[10px] text-primary uppercase font-bold tracking-widest">
          <span className="w-4 h-[1px] bg-primary"></span> {t('billing_tag')}
        </div>
        <h1 className="text-4xl md:text-5xl text-on-surface font-bold tracking-tighter">{t('billing_title')}</h1>
      </div>

      {!viewer?.authenticated ? (
        <WorkSurfaceState
          accent="secondary"
          description={t('billing_login_desc')}
          icon={<LogIn size={24} />}
          title={t('billing_login_title')}
          action={(
            <button className="btn-primary" type="button" onClick={() => openAuthModal('login')}>
              <LogIn size={16} />
              {t('top_login')}
            </button>
          )}
        />
      ) : loadError && !balance && ledger.length === 0 ? (
        <WorkSurfaceState
          accent="error"
          description={t('billing_error_desc')}
          icon={<AlertCircle size={24} />}
          title={t('billing_error_title')}
          action={(
            <button className="btn-primary" type="button" onClick={() => loadBilling().catch(() => undefined)}>
              <RefreshCw size={16} />
              {t('billing_retry')}
            </button>
          )}
        />
      ) : loading && !balance && ledger.length === 0 ? (
        <WorkSurfaceState
          accent="primary"
          description={t('billing_recharge_desc')}
          icon={<Loader2 className="animate-spin" size={24} />}
          title={t('billing_loading')}
        />
      ) : (
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 rounded-2xl border border-secondary/30 bg-surface/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="flex items-center gap-2 text-secondary text-[10px] uppercase tracking-widest mb-6">
            <CreditCard size={16} /> {t('billing_remaining')}
          </div>
          <div className="text-5xl text-white font-black tracking-tighter">{formatBalance(balance)}</div>
          <div className="mt-4 text-xs text-white/40">{balance?.ok ? t('billing_synced') : t('billing_not_configured')}</div>
          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="mb-3 text-xs text-white/50">{t('billing_recharge_desc')}</div>
            <Link
              className="inline-flex items-center gap-2 border border-primary/30 px-5 py-3 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
              to="/recharge"
            >
              {t('billing_recharge')}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-primary/20 bg-surface/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="flex items-center gap-2 text-primary text-[10px] uppercase tracking-widest mb-6">
            <Activity size={16} /> {t('billing_local_ledger')}
          </div>
          <div className="divide-y divide-white/5">
            {ledger.length === 0 && (
              <div className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low/60 px-5 py-8 text-center">
                <div className="text-sm font-semibold text-on-surface">{t('billing_empty_title')}</div>
                <div className="mx-auto mt-2 max-w-sm text-sm leading-6 text-on-surface-variant">{t('billing_empty_desc')}</div>
              </div>
            )}
            {ledger.map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-white">
                    <span>{item.description}</span>
                    {isActualLedger(item) && (
                      <span className="border border-secondary/40 px-2 py-0.5 text-[9px] uppercase tracking-widest text-secondary">
                        {t('billing_actual')}
                      </span>
                    )}
                    {isEstimatedLedger(item) && (
                      <span className="border border-tertiary/40 px-2 py-0.5 text-[9px] uppercase tracking-widest text-tertiary">
                        {t('billing_estimated')}
                      </span>
                    )}
                  </div>
                  <div className="text-white/40 mt-1">{formatDate(item.created_at)}</div>
                </div>
                <div className="text-secondary flex items-center gap-2">
                  {item.amount.toFixed(4)} {item.currency}
                  <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}
    </div>
  );
}

function isEstimatedLedger(item: LedgerEntry) {
  const source = String(item.metadata?.cost_source || '');
  return source.startsWith('local_image_price');
}

function isActualLedger(item: LedgerEntry) {
  return item.metadata?.cost_source === 'sub2api_actual_cost';
}
