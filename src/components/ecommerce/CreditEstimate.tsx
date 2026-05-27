import type { BalanceInfo } from '../../api';

interface CreditEstimateProps {
  balance: BalanceInfo | null;
  imageCount: number;
  quality: string;
}

const COST_PER_IMAGE: Record<string, number> = {
  hd: 0.08,
  high: 0.08,
  standard: 0.04,
  low: 0.02,
};

export function CreditEstimate({ balance, imageCount, quality }: CreditEstimateProps) {
  if (!balance?.ok || typeof balance.remaining !== 'number') return null;
  if (!Number.isFinite(imageCount) || imageCount <= 0) return null;

  const costPerImg = COST_PER_IMAGE[quality.toLowerCase()] ?? 0.04;
  const estimatedCost = costPerImg * imageCount;
  const afterBalance = balance.remaining - estimatedCost;
  const isInsufficient = afterBalance < 0;
  const isLow = !isInsufficient && balance.remaining < 0.5;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]" style={{ color: 'rgba(240,237,232,0.4)' }}>
      <span>余额 ${balance.remaining.toFixed(2)}</span>
      <span style={{ color: 'rgba(240,237,232,0.2)' }}>·</span>
      <span>预计消耗 ~${estimatedCost.toFixed(2)}</span>
      {isInsufficient && (
        <span className="font-semibold" style={{ color: '#ff6b6b' }}>⚠ 余额不足</span>
      )}
      {isLow && (
        <span className="font-semibold" style={{ color: '#ffa94d' }}>余额偏低</span>
      )}
    </div>
  );
}
