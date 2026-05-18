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
    try { await logoutAccount(); }
    finally {
      await refresh();
      setAccount(await getAccount().catch(() => null));
      window.location.href = '/';
    }
  }

  const viewerLabel = viewer?.authenticated
    ? (viewer.user?.username || viewer.user?.email || 'USER')
    : t('home_guest', { value: viewer?.guest_id?.slice(0, 8) || '--' });

  const navCls = scrolled
    ? 'bg-[rgba(17,17,16,0.95)] border-b border-[rgba(255,255,255,0.06)]'
    : 'bg-[rgba(17,17,16,0.7)] border-b border-transparent';

  return (
    <header className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between h-16 px-4 shrink-0 backdrop-blur-[20px] transition-all duration-300 ${navCls}`}>

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <img alt="AetherGenix" className="h-8 w-8 rounded-xl" src={aethergenixLogo} />
        <span className="text-base font-semibold tracking-tight font-display text-[#f0ede8] hidden sm:block">
          AetherGenix
        </span>
      </div>

      {/* 右侧 */}
      <div className="flex items-center gap-1">

        {/* 主题 */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8a8680] hover:text-[#f0ede8] hover:bg-white/5 transition-colors"
          type="button"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* 任务 */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#8a8680] hover:text-[#f0ede8] hover:bg-white/5 transition-colors"
          type="button"
          onClick={openDrawer}
        >
          <ListTodo size={15} />
          {activeCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E3FF74] px-1 text-[9px] font-bold text-[#1a1917]">
              {activeCount}
            </span>
          )}
        </button>

        {/* 公告 */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#8a8680] hover:text-[#f0ede8] hover:bg-white/5 transition-colors"
          type="button"
          onClick={openAnnouncement}
        >
          <Bell size={15} />
          {siteSettings?.announcement.enabled && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#E3FF74]" />
          )}
        </button>

        {/* 桌面端账户 */}
        <div className="hidden lg:flex items-center gap-2 ml-2">
          {viewer?.authenticated ? (
            <>
              <div className="text-right mr-1">
                <div className="text-[11px] text-[#8a8680] leading-none mb-0.5">{viewerLabel}</div>
                <div className="text-sm font-semibold text-[#f0ede8] tabular-nums leading-none">
                  {formatBalance(account?.balance)}
                </div>
              </div>
              <button
                className="btn-ghost h-8 px-3 text-xs"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut size={13} />
                {t('top_logout')}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                className="btn-ghost h-9"
                type="button"
                onClick={() => openAuthModal('login')}
              >
                {t('top_login')}
              </button>
              <button
                className="btn-primary h-9"
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
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8a8680] hover:text-[#f0ede8] hover:bg-white/5 lg:hidden"
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
        >
          {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* 移动端菜单 */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-50 border-b border-white/[0.06] bg-[rgba(17,17,16,0.97)] backdrop-blur-xl px-4 py-4 lg:hidden animate-fade-in">
          <div className="mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
            <div className="text-[11px] text-[#8a8680]">{t('top_owner')}</div>
            <div className="mt-1 text-sm font-semibold text-[#f0ede8]">{viewerLabel}</div>
            {viewer?.authenticated && (
              <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                <span className="text-xs text-[#8a8680]">{t('top_credits')}</span>
                <span className="text-sm font-bold text-[#E3FF74]">{formatBalance(account?.balance)}</span>
              </div>
            )}
          </div>

          {viewer?.authenticated ? (
            <button
              className="btn-ghost w-full h-11 justify-center"
              type="button"
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              disabled={loggingOut}
            >
              <LogOut size={16} />
              {t('top_logout')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 h-11 justify-center" type="button"
                onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }}>
                {t('top_login')}
              </button>
              <button className="btn-primary flex-1 h-11 justify-center" type="button"
                onClick={() => { openAuthModal('register'); setMobileMenuOpen(false); }}>
                {t('top_register')}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
