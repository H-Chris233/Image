import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface CustomStyleTemplate {
  id: string;
  name: string;
  desc: string;
  style: string;
  scenarios: string;
  savedAt: string;
}

const STORAGE_KEY = 'ag_custom_templates';

export function loadCustomTemplates(): CustomStyleTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomStyleTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplates(templates: CustomStyleTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

interface CustomStyleModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (template: CustomStyleTemplate) => void;
}

export function CustomStyleModal({ open, onClose, onSave }: CustomStyleModalProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [style, setStyle] = useState('');
  const [scenarios, setScenarios] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setDesc('');
      setStyle('');
      setScenarios('');
    }
  }, [open]);

  if (!open) return null;

  function handleSave() {
    if (!name.trim() || !style.trim()) return;
    const template: CustomStyleTemplate = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      desc: desc.trim() || style.trim().slice(0, 20),
      style: style.trim(),
      scenarios: scenarios.trim(),
      savedAt: new Date().toISOString(),
    };
    onSave(template);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md border border-white/15 bg-black p-5 shadow-[0_8px_48px_rgba(0,0,0,0.7)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black tracking-tight text-white">新建自定义风格</h3>
          <button type="button" className="text-white/40 hover:text-white/80" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-[9px] uppercase tracking-widest text-white/40">
              风格名称 <span style={{ color: 'var(--ag-lime)' }}>*</span>
            </span>
            <input
              className="h-9 w-full border border-white/10 bg-black/60 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary"
              placeholder="如：北欧极简"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[9px] uppercase tracking-widest text-white/40">简介</span>
            <input
              className="h-9 w-full border border-white/10 bg-black/60 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary"
              placeholder="一句话描述风格特点"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={40}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[9px] uppercase tracking-widest text-white/40">
              风格描述（Style Prompt）<span style={{ color: 'var(--ag-lime)' }}>*</span>
            </span>
            <textarea
              className="h-20 w-full resize-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary"
              placeholder="如：简约北欧风，原木色调，白色背景，干净明亮"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[9px] uppercase tracking-widest text-white/40">场景描述（Scenarios）</span>
            <input
              className="h-9 w-full border border-white/10 bg-black/60 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary"
              placeholder="如：北欧家居场景，木质桌面，白色砖墙"
              value={scenarios}
              onChange={(e) => setScenarios(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="h-9 border border-white/15 px-4 text-[11px] uppercase tracking-widest text-white/50 hover:border-white/30 hover:text-white/80"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="h-9 bg-primary px-5 text-[11px] font-black uppercase tracking-widest text-black hover:bg-white disabled:opacity-40"
            disabled={!name.trim() || !style.trim()}
            onClick={handleSave}
          >
            保存风格
          </button>
        </div>
      </div>
    </div>
  );
}
