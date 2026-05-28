import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ViewerInfo, getSession } from './api';

type AuthContextValue = {
  viewer: ViewerInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setViewer: (viewer: ViewerInfo | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<ViewerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const session = await getSession();
      setViewer(session);
    } catch {
      setViewer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  // 401 自愈（#95）：任意 API 401 时 api.ts 派 aether:session-expired，这里刷新一次
  // viewer，让 UI 从"以为登录中"切回登录态真相。AuthModalProvider 同时会弹登录框。
  useEffect(() => {
    const handler = () => { refresh().catch(() => undefined); };
    window.addEventListener('aether:session-expired', handler);
    return () => window.removeEventListener('aether:session-expired', handler);
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({
    viewer,
    loading,
    refresh,
    setViewer,
  }), [viewer, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
