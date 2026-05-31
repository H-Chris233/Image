import type { ReactNode } from 'react';
import { cx } from './cx';

export interface SectionHeaderProps {
  /** Small uppercase-style label above the title. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Optional sub-line under the title. */
  description?: ReactNode;
  /** Status element (e.g. StatusPill) clustered beside the title — never stranded. */
  status?: ReactNode;
  /** Trailing action (e.g. Button), right-aligned. */
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
}

/**
 * Shared workspace section header: eyebrow + display title with an optional
 * status pill beside it and an optional trailing action. The status sits inside
 * the left cluster so it stays next to the title instead of floating to the far
 * edge; the action is the only element pushed right by justify-between.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  status,
  action,
  className,
  titleClassName,
}: SectionHeaderProps) {
  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <div className="min-w-0">
          {eyebrow ? <div className="text-xs font-bold text-on-surface-variant">{eyebrow}</div> : null}
          <h2 className={cx('font-display text-xl font-bold text-on-surface', eyebrow ? 'mt-1' : null, titleClassName)}>
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p> : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
