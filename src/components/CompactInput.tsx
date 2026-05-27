export default function CompactInput({
  label,
  value,
  onChange,
  title,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
}) {
  return (
    <label className="min-w-0" title={title}>
      <span className="mb-0.5 flex items-center gap-1 text-[10px] font-medium text-on-surface-variant">
        {label}
        {title && (
          <span className="cursor-help text-white/25" title={title}>?</span>
        )}
      </span>
      <input
        className="h-9 w-full rounded-lg border border-outline-variant bg-surface-container-low px-2 text-xs text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        title={title}
      />
    </label>
  );
}
