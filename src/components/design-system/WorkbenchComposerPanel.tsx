import type { MouseEventHandler, ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';

type WorkbenchComposerButtonVariant = 'primary' | 'ghost' | 'lime' | 'orange' | 'danger' | 'plain';
type WorkbenchComposerButtonSize = 'sm' | 'md' | 'lg';

export type WorkbenchComposerPrimaryAction = {
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  loading?: boolean;
  variant?: WorkbenchComposerButtonVariant;
  size?: WorkbenchComposerButtonSize;
  fullWidth?: boolean;
};

export type WorkbenchComposerPanelProps = {
  eyebrow?: string;
  title?: string;
  active?: boolean;
  emptyDescription: string;
  kind?: string | null;
  payload?: Record<string, unknown> | null;
  showPayloadPreview?: boolean;
  primaryAction?: WorkbenchComposerPrimaryAction;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function WorkbenchComposerPanel({
  eyebrow = '执行',
  title,
  active = false,
  emptyDescription,
  kind,
  payload,
  showPayloadPreview = false,
  primaryAction,
  icon = <Sparkles size={14} aria-hidden="true" />,
  children,
  className,
}: WorkbenchComposerPanelProps) {
  return (
    <section className={cx('ds-workbench-composer-panel ds-panel-enter', className)} data-active={active}>
      <div className="ds-workbench-panel-eyebrow">
        {icon}
        {eyebrow}
      </div>
      {active ? (
        <div className="mt-3 space-y-3">
          {title ?? kind ? <div className="ds-workbench-composer-kind">{title ?? kind}</div> : null}
          {payload && showPayloadPreview ? (
            <pre className="ds-workbench-composer-payload">
              {JSON.stringify(payload, null, 2)}
            </pre>
          ) : null}
          {children}
          {primaryAction ? (
            <Button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              loading={primaryAction.loading}
              variant={primaryAction.variant ?? 'primary'}
              size={primaryAction.size}
              fullWidth={primaryAction.fullWidth ?? true}
            >
              {primaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="ds-workbench-empty-copy">{emptyDescription}</p>
      )}
    </section>
  );
}
