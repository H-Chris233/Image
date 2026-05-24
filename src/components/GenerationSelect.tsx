import { SelectControl } from './design-system';

export default function GenerationSelect({
  label,
  value,
  options,
  onChange,
  isOptionDisabled,
  getOptionLabel,
  disabled = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  isOptionDisabled?: (value: string) => boolean;
  getOptionLabel?: (value: string) => string;
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-0.5 block text-[10px] font-medium text-on-surface-variant">{label}</span>
      <SelectControl
        className="min-h-11 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 text-xs text-on-surface outline-none transition-colors focus:border-primary"
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option} disabled={isOptionDisabled?.(option) || false}>
            {getOptionLabel?.(option) || option}
          </option>
        ))}
      </SelectControl>
    </label>
  );
}
