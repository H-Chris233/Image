import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, Wallet } from 'lucide-react';
import { BalanceInfo, formatBalance, getBalance } from '../api';
import { Button, StatusPill, Surface } from '../components/design-system';
import { resolveExternalRechargeUrl } from '../rechargeDomain';
import { useSite } from '../site';

export default function Recharge() {
  const { siteSettings } = useSite();
  const rechargeUrl = useMemo(() => resolveExternalRechargeUrl(siteSettings), [siteSettings]);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      setRefreshing(true);
      setRefreshFailed(false);
      try {
        const next = await getBalance();
        if (!cancelled) {
          setBalance(next);
        }
      } catch {
        if (!cancelled) {
          setRefreshFailed(true);
        }
      } finally {
        if (!cancelled) {
          setRefreshing(false);
        }
      }
    }

    refresh().catch(() => undefined);
    function onFocus() {
      refresh().catch(() => undefined);
    }
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const balanceReady = Boolean(balance?.ok && balance.remaining !== null && !Number.isNaN(balance.remaining));
  const balanceValue = balanceReady ? formatBalance(balance ?? undefined) : '--';
  const balanceTone = refreshFailed ? 'error' : balanceReady ? 'success' : refreshing ? 'running' : 'neutral';
  const balanceStatus = refreshing
    ? '余额同步中'
    : refreshFailed
      ? '余额暂不可用'
      : balanceReady
        ? '余额已更新'
        : '等待余额数据';
  const rechargeConfigured = Boolean(rechargeUrl);

  function openRechargeWindow() {
    if (!rechargeUrl) return;
    window.open(rechargeUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center px-4 py-8 text-on-surface sm:px-6 lg:py-14">
      <Surface padding="lg" className="overflow-hidden">
        <div className="mb-7">
          <StatusPill tone="commercial" size="sm" className="mb-3">
            AetherGenix
          </StatusPill>
          <h1 className="font-display text-3xl font-bold leading-tight text-on-surface sm:text-5xl">
            账户充值
          </h1>
          <p className="mt-4 text-sm leading-6 text-on-surface-variant">
            充值由合作伙伴提供，完成后返回此页面余额会自动更新
          </p>
        </div>

        <Surface tone="orange" padding="lg" className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-on-surface-variant">当前余额</p>
              <div className="mt-3 break-all font-display text-5xl font-bold leading-none text-secondary sm:text-6xl">
                {balanceValue}
              </div>
            </div>
            <StatusPill tone={balanceTone} className="sm:shrink-0">
              {refreshing ? (
                <RefreshCw className="animate-spin" size={13} />
              ) : refreshFailed || !balanceReady ? (
                <AlertCircle size={13} />
              ) : (
                <CheckCircle2 size={13} />
              )}
              {balanceStatus}
            </StatusPill>
          </div>
        </Surface>

        {!rechargeConfigured ? (
          <Surface tone="danger" padding="md" className="mb-5 text-sm leading-6 text-on-surface">
            充值入口暂未配置，请联系管理员
          </Surface>
        ) : null}

        <Button
          variant="lime"
          size="lg"
          iconStart={<Wallet size={16} />}
          iconEnd={<ExternalLink size={16} />}
          disabled={!rechargeConfigured}
          onClick={openRechargeWindow}
          className="w-full sm:w-auto sm:min-w-48"
        >
          前往充值
        </Button>

        <div className="mt-6 border-t border-white/[0.08] pt-5">
          <h2 className="text-sm font-semibold text-on-surface">常见问题</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
            <li>如何选择金额：请在合作伙伴充值站按页面提供的档位或自定义金额完成充值。</li>
            <li>支付方式：以合作伙伴充值站实际展示的可用方式为准。</li>
          </ul>
        </div>
      </Surface>
    </div>
  );
}
