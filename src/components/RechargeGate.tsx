import { useEffect, useId, useRef } from 'react';
import { AlertCircle, Wallet } from 'lucide-react';
import type { BalanceInfo } from '../api';
import { formatBalance } from '../api';
import { Button, Surface } from './design-system';

export interface RechargeGateProps {
  open: boolean;
  onClose: () => void;
  balance: BalanceInfo | null;
  expectedCost?: number | null;
  onRecharge: () => void;
}

function formatExpectedCost(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value.toFixed(4);
}

export default function RechargeGate({
  open,
  onClose,
  balance,
  expectedCost = null,
  onRecharge,
}: RechargeGateProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const rechargeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const costText = formatExpectedCost(expectedCost);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => rechargeButtonRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = [rechargeButtonRef.current, closeButtonRef.current].filter(
        (element): element is HTMLButtonElement => Boolean(element) && !element.disabled,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/65 px-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-6 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <Surface
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        as="div"
        padding="lg"
        role="dialog"
        tone="raised"
        className="w-full max-w-md rounded-xl border-white/[0.12] bg-surface-container-low shadow-[0_28px_90px_rgba(0,0,0,0.52)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E3FF74]/25 bg-[#E3FF74]/10 text-[#E3FF74]">
            <Wallet size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full border border-[#E3FF74]/20 bg-[#E3FF74]/10 px-2.5 text-xs font-semibold text-[#E3FF74]">
              <AlertCircle size={13} aria-hidden="true" />
              <span className="truncate">Credits</span>
            </p>
            <h2
              id={titleId}
              className="mt-3 break-words text-xl font-bold leading-tight text-on-surface [overflow-wrap:anywhere] sm:text-2xl"
            >
              余额不足，无法继续生成
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-on-surface-variant">
              充值后即可继续提交生成任务。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8680]">当前余额</p>
            <p className="mt-2 font-display text-3xl font-bold leading-none text-[#E3FF74]">
              {formatBalance(balance ?? undefined)}
              <span className="ml-2 align-middle text-sm font-semibold text-on-surface-variant">credits</span>
            </p>
          </div>

          {costText ? (
            <div className="rounded-xl border border-secondary/25 bg-secondary/[0.08] px-4 py-3 text-sm font-semibold text-on-surface">
              本次生成预计消耗 {costText} credits
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            ref={closeButtonRef}
            variant="ghost"
            className="h-11 rounded-lg"
            type="button"
            onClick={onClose}
          >
            稍后再说
          </Button>
          <Button
            ref={rechargeButtonRef}
            variant="lime"
            iconStart={<Wallet size={15} aria-hidden="true" />}
            className="h-11 rounded-lg"
            type="button"
            onClick={onRecharge}
          >
            立即充值
          </Button>
        </div>
      </Surface>
    </div>
  );
}
