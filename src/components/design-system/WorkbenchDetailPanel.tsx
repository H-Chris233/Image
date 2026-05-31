import type { ReactNode } from 'react';
import { cx } from './cx';

export type WorkbenchDetailPanelProps = {
  eyebrow: string;
  title?: string | null;
  description?: string | null;
  emptyDescription: string;
  actions?: string[];
  icon?: ReactNode;
  className?: string;
};

export function WorkbenchDetailPanel({
  eyebrow,
  title,
  description,
  emptyDescription,
  actions = [],
  icon,
  className,
}: WorkbenchDetailPanelProps) {
  const hasContent = Boolean(title);

  return (
    <section className={cx('ds-workbench-detail-panel ds-panel-enter', className)}>
      <div className="ds-workbench-panel-eyebrow">
        {icon}
        {eyebrow}
      </div>
      {hasContent ? (
        <div className="mt-3 text-sm">
          <div className="ds-workbench-detail-title">{title}</div>
          {description ? <div className="ds-workbench-detail-description">{description}</div> : null}
          {actions.length ? (
            <div className="ds-workbench-action-list">
              {actions.map((action) => (
                <span key={action} className="ds-workbench-action-chip">
                  {action}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="ds-workbench-empty-copy">{emptyDescription}</p>
      )}
    </section>
  );
}
