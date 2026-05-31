import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from './cx';

export type MotionTreeNavChild = {
  id: string;
  label: string;
  description?: string;
};

export type MotionTreeNavItem = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  children: MotionTreeNavChild[];
};

export type MotionTreeNavProps = {
  items: MotionTreeNavItem[];
  activeItemId: string;
  activeChildId: string | null;
  onItemSelect: (item: MotionTreeNavItem) => void;
  onChildSelect: (item: MotionTreeNavItem, child: MotionTreeNavChild) => void;
  className?: string;
};

export function MotionTreeNav({
  items,
  activeItemId,
  activeChildId,
  onItemSelect,
  onChildSelect,
  className,
}: MotionTreeNavProps) {
  return (
    <nav className={cx('ds-motion-tree', className)} aria-label="Primary sections">
      {items.map((item) => {
        const expanded = item.id === activeItemId;
        return (
          <section key={item.id} className="ds-motion-tree-section" data-expanded={expanded}>
            <button
              type="button"
              aria-expanded={expanded}
              className="ds-motion-tree-trigger"
              onClick={() => onItemSelect(item)}
            >
              <span className="ds-motion-tree-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.label}</span>
                {item.description ? (
                  <span className="mt-0.5 block truncate text-[11px] font-normal text-[#6f6961]">
                    {item.description}
                  </span>
                ) : null}
              </span>
              <ChevronDown size={14} className="ds-motion-tree-chev" aria-hidden="true" />
            </button>

            <div className="ds-motion-tree-children">
              <div className="ds-motion-tree-children-inner">
                {item.children.map((child, index) => (
                  <button
                    key={child.id}
                    type="button"
                    aria-current={expanded && activeChildId === child.id ? 'page' : undefined}
                    className="ds-motion-tree-child"
                    style={{ '--motion-tree-child-index': index } as React.CSSProperties}
                    onClick={() => onChildSelect(item, child)}
                  >
                    <span className="block font-semibold">{child.label}</span>
                    {child.description ? (
                      <span className="ds-motion-tree-child-description mt-0.5 block truncate text-[11px]">
                        {child.description}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </nav>
  );
}
