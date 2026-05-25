interface CountChipsProps {
  value: number;
  onChange: (n: number) => void;
  options?: number[];
}

export function CountChips({ value, onChange, options = [1, 2, 4] }: CountChipsProps) {
  return (
    <div className="flex gap-2">
      {options.map((n) => {
        const isSelected = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-150"
            style={{
              width: 36,
              height: 36,
              border: isSelected
                ? '1.5px solid var(--ag-lime)'
                : '1.5px solid rgba(255,255,255,0.1)',
              background: isSelected
                ? 'rgba(227,255,116,0.08)'
                : 'rgba(255,255,255,0.03)',
              color: isSelected ? 'var(--ag-lime)' : 'rgba(240,237,232,0.5)',
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
