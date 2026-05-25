interface FormatOption {
  label: string;
  usage: string;
  size: string;
  aspectRatio: string;
  /** width : height ratio for the preview thumbnail, expressed as a fraction */
  previewW: number;
  previewH: number;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    label: '主图',
    usage: '淘宝/天猫',
    size: '1:1',
    aspectRatio: '1:1',
    previewW: 1,
    previewH: 1,
  },
  {
    label: '种草',
    usage: '小红书',
    size: '4:5',
    aspectRatio: '4:5',
    previewW: 4,
    previewH: 5,
  },
  {
    label: '横图',
    usage: '详情页',
    size: '16:9',
    aspectRatio: '16:9',
    previewW: 16,
    previewH: 9,
  },
  {
    label: '竖版',
    usage: '抖音',
    size: '9:16',
    aspectRatio: '9:16',
    previewW: 9,
    previewH: 16,
  },
];

/** Scale previewW/previewH so the larger dimension = maxPx */
function scaledDimensions(w: number, h: number, maxPx: number) {
  const scale = maxPx / Math.max(w, h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

interface FormatPickerProps {
  value: string;
  onChange: (aspectRatio: string) => void;
}

export function FormatPicker({ value, onChange }: FormatPickerProps) {
  return (
    <div className="flex gap-2">
      {FORMAT_OPTIONS.map((fmt) => {
        const isSelected = value === fmt.aspectRatio;
        const { width, height } = scaledDimensions(fmt.previewW, fmt.previewH, 36);

        return (
          <button
            key={fmt.aspectRatio}
            type="button"
            onClick={() => onChange(fmt.aspectRatio)}
            className="flex flex-1 flex-col items-center gap-2 rounded-xl px-2 py-2.5 transition-all duration-150"
            style={{
              border: isSelected
                ? '1.5px solid var(--ag-lime)'
                : '1.5px solid rgba(255,255,255,0.1)',
              background: isSelected
                ? 'rgba(227,255,116,0.06)'
                : 'rgba(255,255,255,0.02)',
            }}
          >
            {/* Aspect-ratio thumbnail */}
            <div className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
              <div
                style={{
                  width,
                  height,
                  borderRadius: 3,
                  background: isSelected
                    ? 'rgba(227,255,116,0.6)'
                    : 'rgba(255,255,255,0.15)',
                  border: isSelected
                    ? '1px solid rgba(227,255,116,0.85)'
                    : '1px solid rgba(255,255,255,0.2)',
                }}
              />
            </div>

            {/* Label */}
            <span
              className="text-[11px] font-semibold leading-none"
              style={{ color: isSelected ? 'var(--ag-lime)' : 'rgba(240,237,232,0.7)' }}
            >
              {fmt.label}
            </span>

            {/* Platform / usage context */}
            <span
              className="text-[9px] leading-none"
              style={{ color: isSelected ? 'rgba(227,255,116,0.7)' : 'rgba(255,255,255,0.35)' }}
            >
              {fmt.usage}
            </span>

            {/* Size tag */}
            <span
              className="font-mono text-[8px] leading-none"
              style={{ color: isSelected ? 'rgba(227,255,116,0.5)' : 'rgba(255,255,255,0.2)' }}
            >
              {fmt.size}
            </span>
          </button>
        );
      })}
    </div>
  );
}
