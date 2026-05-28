import type { BalanceInfo } from '../../api';

interface CreditEstimateProps {
  balance: BalanceInfo | null;
  imageCount: number;
  // 'FAST' | '1K' | '2K' | '4K'（与 providerImageSize 的 scale 一致）
  sizeTier: string;
}

// 与后端 `backend/app/settings.py` 的 image_price_* 默认对齐。
// 后端 `_image_ledger_amount`：FAST 与 1K 共用 image_price_1k。
// 如果运营覆盖了 IMAGE_PRICE_*_USD env，本前端估价会偏差，但量级和正确维度（按尺寸）已对。
const COST_PER_IMAGE_BY_TIER: Record<string, number> = {
  FAST: 0.134,
  '1K': 0.134,
  '2K': 0.201,
  '4K': 0.268,
};

export function CreditEstimate({ balance, imageCount, sizeTier }: CreditEstimateProps) {
  if (!balance?.ok || typeof balance.remaining !== 'number') return null;
  if (!Number.isFinite(imageCount) || imageCount <= 0) return null;

  const costPerImg = COST_PER_IMAGE_BY_TIER[sizeTier.toUpperCase()] ?? COST_PER_IMAGE_BY_TIER.FAST;
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
