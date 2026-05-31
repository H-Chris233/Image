import type { ReactNode } from 'react';
import { cx } from './cx';

export type StickyMorphHeaderProps = {
  brand: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  className?: string;
  navClassName?: string;
};

export function StickyMorphHeader({
  brand,
  kicker,
  actions,
  className,
  navClassName,
}: StickyMorphHeaderProps) {
  return (
    <>
      <div className="ds-sticky-morph-sentinel" aria-hidden="true" />
      <header className={cx('ds-sticky-morph-header', className)}>
        <div className={cx('ds-sticky-morph-nav', navClassName)}>
          <div className="min-w-0">
            {brand}
            {kicker ? <div className="ds-sticky-morph-kicker">{kicker}</div> : null}
          </div>
          {actions ? <div className="ds-sticky-morph-actions">{actions}</div> : null}
        </div>
      </header>
    </>
  );
}
