import type { ReactNode } from 'react';
import { cx } from './cx';

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: SegmentedControlOption<T>[];
  onChange: (value: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={className}>
      <div className="mb-1.5 text-xs font-medium text-on-surface-variant">{label}</div>
      <div className="grid rounded-2xl border border-white/[0.07] bg-[#171613] p-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => onChange(option.value)}
              className={cx(
                'min-h-11 min-w-0 rounded-xl px-3 py-2.5 text-left transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/25',
                'disabled:pointer-events-none disabled:opacity-40',
                active
                  ? 'bg-primary text-on-primary shadow-[0_10px_28px_rgba(240,237,232,0.12)]'
                  : 'text-on-surface-variant hover:bg-white/[0.05] hover:text-on-surface',
              )}
              aria-pressed={active}
            >
              <span className="block truncate font-display text-sm font-semibold leading-tight">{option.label}</span>
              {option.description ? (
                <span className={cx('mt-0.5 block truncate text-xs leading-tight', active ? 'opacity-60' : 'opacity-50')}>
                  {option.description}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
