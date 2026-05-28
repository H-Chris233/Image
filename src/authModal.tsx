import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type AuthTab = 'login' | 'register';
export type AuthModalActionContext = 'generate' | 'reuse-prompt' | 'history' | 'favorites';

type AuthModalContextValue = {
  open: boolean;
  tab: AuthTab;
  pendingPath: string | null;
  actionContext: AuthModalActionContext | null;
  openAuthModal: (tab?: AuthTab, pendingPath?: string | null, actionContext?: AuthModalActionContext | null) => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AuthTab>('login');
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [actionContext, setActionContext] = useState<AuthModalActionContext | null>(null);

  const openAuthModal = useCallback((
    t: AuthTab = 'login',
    path: string | null = null,
    context: AuthModalActionContext | null = null,
  ) => {
    setTab(t);
    setPendingPath(path);
    setActionContext(context);
    setOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setOpen(false);
  }, []);

  // 401 自愈（#95）：session 过期时弹登录框，pendingPath 保留当前路径，登录成功后留在原页面。
  useEffect(() => {
    const handler = () => {
      const path = typeof window !== 'undefined' ? window.location.pathname : null;
      openAuthModal('login', path);
    };
    window.addEventListener('aether:session-expired', handler);
    return () => window.removeEventListener('aether:session-expired', handler);
  }, [openAuthModal]);

  const value = useMemo<AuthModalContextValue>(
    () => ({ open, tab, pendingPath, actionContext, openAuthModal, closeAuthModal }),
    [open, tab, pendingPath, actionContext, openAuthModal, closeAuthModal],
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be inside AuthModalProvider');
  return ctx;
}
