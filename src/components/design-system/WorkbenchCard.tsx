import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cx } from './cx';

export type WorkbenchCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  description: string;
  icon?: ReactNode;
  active?: boolean;
  actionLabel?: string;
  actionIcon?: ReactNode;
  motionIndex?: number;
};

export function WorkbenchCard({
  title,
  description,
  icon,
  active = false,
  actionLabel = '打开',
  actionIcon = <ArrowRight size={13} aria-hidden="true" />,
  motionIndex = 0,
  className,
  style,
  type = 'button',
  ...props
}: WorkbenchCardProps) {
  return (
    <button
      type={type}
      data-active={active}
      className={cx('ds-workbench-card ds-motion-card group', className)}
      style={{ '--workbench-card-index': motionIndex, ...style } as CSSProperties}
      {...props}
    >
      {icon ? (
        <span className="ds-workbench-card-icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="ds-workbench-card-title">{title}</span>
      <span className="ds-workbench-card-description">{description}</span>
      <span className="ds-workbench-card-action">
        {actionLabel}
        {actionIcon}
      </span>
    </button>
  );
}
