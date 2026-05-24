import { TextInputControl } from './design-system';

export default function CompactInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="min-w-0">
      <span className="mb-0.5 block text-[10px] font-medium text-on-surface-variant">{label}</span>
      <TextInputControl
        className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 text-xs text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
