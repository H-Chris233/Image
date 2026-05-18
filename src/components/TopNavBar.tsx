import { useEffect, useState } from 'react';
import { Bell, ListTodo, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { AccountInfo, formatBalance, getAccount, logoutAccount } from '../api';
import { useAuth } from '../auth';
import { useSite } from '../site';
import { useTasks } from '../tasks';
import { useTheme } from './ThemeProvider';
import aethergenixLogo from '../../aethergenix.svg';

export default function TopNavBar() {
  const { viewer, refresh } = useAuth();
  const { siteSettings, openAnnouncement, t } = useSite();
  const { activeCount, openDrawer } = useTasks();
  const { theme, toggleTheme } = useTheme();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getAccount().then(setAccount).catch(() => setAccount(null));
  }, [viewer?.owner_id]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutAccount();
    } finally {
      await refresh();
      const refreshed = await getAccount().catch(() => null);
      setAccount(refreshed);
      window.location.href = '/';
    }
  }

  const viewerLabel = viewer?.authenticated
    ? (viewer.user?.username || viewer.user?.email || 'USER')
    : t('home_guest', { value: viewer?.guest_id?.slice(0, 8) || '--' });

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between h-16 bg-surface/80 backdrop-blur-lg border-b border-outline-variant px-4 shrink-0">
      <div className="flex items-center gap-3">
        <img alt="AetherGenix" className="h-9 w-9 rounded-lg object-contain" src={aethergenixLogo} />
        <span className="text-lg font-bold text-on-surface tracking-tight">AetherGenix</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          type="button"
          onClick={openDrawer}
          title={t('top_tasks')}
        >
          <ListTodo size={16} />
          {activeCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-on-primary">
              {activeCount}
            </span>
          ) : null}
        </button>

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          type="button"
          onClick={openAnnouncement}
          title={t('top_announcement')}
        >
          <Bell size={16} />
          {siteSettings?.announcement.enabled ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-secondary" /> : null}
        </button>

        <div className="relative">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-container transition-colors lg:hidden"
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          <div className="hidden lg:flex items-center gap-2">
            {viewer?.authenticated ? (
              <>
                <div className="text-right text-xs mr-1">
                  <div className="text-on-surface-variant">{viewerLabel}</div>
                  <div className="font-semibold text-on-surface">{formatBalance(account?.balance)}</div>
                </div>
                <button
                  className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut size={14} />
                  {t('top_logout')}
                </button>
              </>
            ) : (
              <a
                className="flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary hover:bg-primary/90 transition-colors"
                href="/login"
              >
                {t('top_login')}
              </a>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-x-0 top-16 z-50 border-b border-outline-variant bg-surface px-4 py-4 shadow-lg lg:hidden animate-fade-in">
          <div className="mb-4 rounded-xl bg-surface-container p-4">
            <div className="text-xs text-on-surface-variant">{t('top_owner')}</div>
            <div className="mt-1 text-sm font-semibold text-on-surface">{viewerLabel}</div>
            <div className="mt-3 flex items-center justify-between border-t border-outline-variant pt-3">
              <span className="text-xs text-on-surface-variant">{t('top_credits')}</span>
              <span className="text-sm font-bold text-primary">{formatBalance(account?.balance)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {viewer?.authenticated ? (
              <button
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant text-sm text-on-surface hover:bg-surface-container transition-colors"
                type="button"
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                disabled={loggingOut}
              >
                <LogOut size={16} />
                {t('top_logout')}
              </button>
            ) : (
              <div className="flex gap-2">
                <a
                  className="flex-1 flex h-11 items-center justify-center rounded-xl border border-outline-variant text-sm text-on-surface hover:bg-surface-container transition-colors"
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('top_login')}
                </a>
                <a
                  className="flex-1 flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors"
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('top_register')}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
