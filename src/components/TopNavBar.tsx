import { useEffect, useState } from 'react';
import { Bell, ListTodo, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { AccountInfo, formatBalance, getAccount, logoutAccount } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import { useSite } from '../site';
import { useTasks } from '../tasks';
import { useTheme } from './ThemeProvider';
import aethergenixLogo from '../../aethergenix.svg';

export default function TopNavBar() {
  const { viewer, refresh } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { siteSettings, openAnnouncement, t } = useSite();
  const { activeCount, openDrawer } = useTasks();
  const { theme, toggleTheme } = useTheme();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    getAccount().then(setAccount).catch(() => setAccount(null));
  }, [viewer?.owner_id]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const navBg = scrolled
    ? 'bg-[rgba(20,18,16,0.96)] border-b border-[rgba(0,212,240,0.15)]'
    : 'bg-[rgba(20,18,16,0.82)] border-b border-transparent';

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between h-16 px-4 shrink-0 backdrop-blur-[20px] saturate-150 transition-all duration-300 ${navBg}`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <img alt="AetherGenix" className="h-8 w-8 rounded-xl object-contain" src={aethergenixLogo} />
        <span className="text-lg font-bold tracking-tight font-display text-gradient-genesis hidden sm:block">
          AetherGenix
        </span>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-1.5">
        {/* 主题切换 */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container/60 transition-colors"
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? '切换浅色' : '切换深色'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* 任务队列 */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container/60 transition-colors"
          type="button"
          onClick={openDrawer}
          title={t('top_tasks')}
        >
          <ListTodo size={16} />
          {activeCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full gradient-genesis px-1.5 py-0.5 text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        {/* 公告 */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container/60 transition-colors"
          type="button"
          onClick={openAnnouncement}
          title={t('top_announcement')}
        >
          <Bell size={16} />
          {siteSettings?.announcement.enabled && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--color-ag-cyan)]" />
          )}
        </button>

        {/* 桌面端：账户信息 or 登录按钮 */}
        <div className="hidden lg:flex items-center gap-2 ml-1">
          {viewer?.authenticated ? (
            <>
              <div className="text-right text-xs mr-1">
                <div className="text-on-surface-variant text-[11px]">{viewerLabel}</div>
                <div className="font-semibold text-on-surface tabular-nums">
                  {formatBalance(account?.balance)}
                </div>
              </div>
              <button
                className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface transition-colors"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut size={14} />
                {t('top_logout')}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                className="flex h-9 items-center rounded-xl border border-outline-variant/50 px-4 text-xs font-medium text-on-surface-variant hover:bg-surface-container/60 transition-colors"
                type="button"
                onClick={() => openAuthModal('login')}
              >
                {t('top_login')}
              </button>
              <button
                className="flex h-9 items-center rounded-xl gradient-genesis px-4 text-xs font-semibold text-white hover:brightness-110 transition-all"
                type="button"
                onClick={() => openAuthModal('register')}
              >
                {t('top_register')}
              </button>
            </div>
          )}
        </div>

        {/* 移动端汉堡 */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container/60 lg:hidden"
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* 移动端菜单 */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-50 border-b border-outline-variant/50 bg-[rgba(20,18,16,0.96)] backdrop-blur-xl px-4 py-4 shadow-lg lg:hidden animate-fade-in">
          <div className="mb-4 rounded-2xl bg-surface-container/60 p-4">
            <div className="text-xs text-on-surface-variant">{t('top_owner')}</div>
            <div className="mt-1 text-sm font-semibold text-on-surface">{viewerLabel}</div>
            {viewer?.authenticated && (
              <div className="mt-3 flex items-center justify-between border-t border-outline-variant/50 pt-3">
                <span className="text-xs text-on-surface-variant">{t('top_credits')}</span>
                <span className="text-sm font-bold text-gradient-genesis">
                  {formatBalance(account?.balance)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {viewer?.authenticated ? (
              <button
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant/50 text-sm text-on-surface hover:bg-surface-container/60 transition-colors"
                type="button"
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                disabled={loggingOut}
              >
                <LogOut size={16} />
                {t('top_logout')}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  className="flex-1 flex h-11 items-center justify-center rounded-xl border border-outline-variant/50 text-sm text-on-surface hover:bg-surface-container/60 transition-colors"
                  type="button"
                  onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }}
                >
                  {t('top_login')}
                </button>
                <button
                  className="flex-1 flex h-11 items-center justify-center rounded-xl gradient-genesis text-sm font-semibold text-white hover:brightness-110 transition-all"
                  type="button"
                  onClick={() => { openAuthModal('register'); setMobileMenuOpen(false); }}
                >
                  {t('top_register')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
