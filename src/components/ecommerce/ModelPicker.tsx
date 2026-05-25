interface ModelOption {
  id: string;
  name: string;
  quality: string;
  costPerImage: number;
  speed: 'fast' | 'medium' | 'slow';
  badge?: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'standard',
    name: '标准',
    quality: 'auto',
    costPerImage: 0.04,
    speed: 'fast',
    badge: '推荐',
  },
  {
    id: 'hd',
    name: '高清',
    quality: 'hd',
    costPerImage: 0.08,
    speed: 'medium',
    badge: '最高质',
  },
];

interface ModelPickerProps {
  value: string;
  onChange: (quality: string) => void;
  batchMode?: boolean;
}

export function ModelPicker({ value, onChange, batchMode = false }: ModelPickerProps) {
  const selected = MODEL_OPTIONS.find((m) => m.quality === value) ?? MODEL_OPTIONS[0];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-white/35">生成质量</div>
      <div className="flex gap-2">
        {MODEL_OPTIONS.map((option) => {
          const isActive = selected.quality === option.quality;
          return (
            <button
              key={option.id}
              type="button"
              className="flex flex-1 flex-col items-start gap-0.5 border px-3 py-2 text-left transition-colors"
              style={{
                borderColor: isActive ? 'var(--ag-lime)' : 'rgba(255,255,255,0.12)',
                background: isActive ? 'rgba(227,255,116,0.06)' : 'transparent',
              }}
              onClick={() => onChange(option.quality)}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className="text-[11px] font-bold"
                  style={{ color: isActive ? 'var(--ag-lime)' : 'rgba(240,237,232,0.7)' }}
                >
                  {option.name}
                </span>
                {option.badge && (
                  <span
                    className="text-[8px] uppercase tracking-widest"
                    style={{ color: isActive ? 'var(--ag-lime)' : 'rgba(240,237,232,0.3)' }}
                  >
                    {option.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px]" style={{ color: 'rgba(240,237,232,0.4)' }}>
                ~${option.costPerImage.toFixed(2)}/张 · {option.speed === 'fast' ? '快速' : '慢速'}
              </span>
            </button>
          );
        })}
      </div>
      {batchMode && selected.quality === 'hd' && (
        <div className="text-[10px]" style={{ color: 'rgba(255,165,80,0.8)' }}>
          建议批量模式使用「标准」质量以节省积分
        </div>
      )}
    </div>
  );
}
