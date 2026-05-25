import { Search, X } from 'lucide-react';

interface HistorySearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function HistorySearchBar({ value, onChange, placeholder = '搜索商品名称…' }: HistorySearchBarProps) {
  return (
    <div className="relative flex-1">
      <Search
        size={13}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
        style={{ color: 'rgba(240,237,232,0.35)' }}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full border border-white/10 bg-black pl-8 pr-8 text-[11px] text-white/80 outline-none placeholder:text-white/25 focus:border-primary"
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          style={{ color: 'rgba(240,237,232,0.4)' }}
          onClick={() => onChange('')}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
