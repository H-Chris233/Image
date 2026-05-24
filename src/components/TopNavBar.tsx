import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Check, Languages, ListTodo, LogOut } from 'lucide-react';
import { AccountInfo, formatBalance, getAccount, logoutAccount } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import { useSite } from '../site';
import { useTasks } from '../tasks';
import aethergenixLogo from '../../aethergenix.svg';
import { Button, IconButton } from './design-system';

export default function TopNavBar() {
  const location = useLocation();
  const { viewer, refresh } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { siteSettings, openAnnouncement, t, locale, setLocale } = useSite();
  const { activeCount, openDrawer } = useTasks();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageButtonRef = useRef<HTMLButtonElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getAccount().then(setAccount).catch(() => setAccount(null));
  }, [viewer?.owner_id]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setLanguageMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!languageMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (languageButtonRef.current?.contains(target) || languageMenuRef.current?.contains(target)) {
        return;
      }
      setLanguageMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setLanguageMenuOpen(false);
        languageButtonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [languageMenuOpen]);

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
  const taskButtonLabel = activeCount > 0
    ? `${t('top_tasks')}: ${t('tasks_active', { value: activeCount })}`
    : t('top_tasks');
  const homeLabel = t('explore_home_label');
  const showLanguageMenu = location.pathname !== '/config' && !location.pathname.startsWith('/config/');
  const localeOptions = [
    { value: 'zh-CN', label: t('lang_zh') },
    { value: 'en-US', label: t('lang_en') },
  ] as const;

  return (
    <header className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between h-16 px-4 shrink-0 backdrop-blur-[20px] transition-all duration-300 ${navCls}`}>

      {/* Logo */}
      <Link
        to="/explore"
        aria-label={homeLabel}
        title={homeLabel}
        data-testid="brand-home-link"
        className="group relative flex min-h-11 min-w-11 items-center gap-2.5 rounded-xl pr-2 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35"
      >
        <img alt="AetherGenix" className="h-8 w-8 rounded-xl" src={aethergenixLogo} />
        <span className="text-base font-semibold tracking-tight font-display text-[#f0ede8] hidden sm:block">
          AetherGenix
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-[calc(100%+8px)] z-[70] hidden whitespace-nowrap rounded-lg border border-white/[0.08] bg-[#1a1917]/95 px-2.5 py-1.5 text-xs font-medium text-[#E3FF74] opacity-0 shadow-xl shadow-black/30 backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 sm:block"
        >
          {homeLabel}
        </span>
      </Link>

      {/* 右侧 */}
      <div className="flex items-center gap-1">
        {showLanguageMenu && (
          <div className="relative">
            <IconButton
              ref={languageButtonRef}
              className="relative"
              icon={<Languages size={17} aria-hidden="true" />}
              label={t('lang_label')}
              aria-haspopup="menu"
              aria-expanded={languageMenuOpen}
              data-testid="shell-language-button"
              onClick={() => setLanguageMenuOpen((open) => !open)}
            />
            {languageMenuOpen && (
              <div
                ref={languageMenuRef}
                role="menu"
                aria-label={t('lang_label')}
                className="absolute right-0 top-[calc(100%+8px)] z-[60] w-48 rounded-xl border border-white/[0.08] bg-[#1a1917]/95 p-1 shadow-2xl shadow-black/30 backdrop-blur-xl"
                data-testid="shell-language-menu"
              >
                <div className="flex min-h-[36px] items-center gap-2 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8a8680]">
                  <Languages size={13} aria-hidden="true" />
                  {t('lang_label')}
                </div>
                {localeOptions.map((option) => {
                  const selected = locale === option.value;
                  return (
                    <Button
                      key={option.value}
                      className={`justify-between rounded-lg px-3 ${
                        selected
                          ? 'bg-[#E3FF74]/10 text-[#E3FF74]'
                          : 'text-[#f0ede8] hover:bg-white/[0.06]'
                      }`}
                      variant="plain"
                      fullWidth
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => {
                        setLocale(option.value);
                        setLanguageMenuOpen(false);
                        window.setTimeout(() => languageButtonRef.current?.focus(), 0);
                      }}
                    >
                      <span>{option.label}</span>
                      {selected && <Check size={14} aria-hidden="true" />}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 任务 */}
        <IconButton
          className="relative"
          variant={activeCount > 0 ? 'lime' : 'ghost'}
          icon={<ListTodo aria-hidden="true" size={15} />}
          label={taskButtonLabel}
          onClick={openDrawer}
        >
          {activeCount > 0 && (
            <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#E3FF74] px-1 text-[9px] font-bold text-[#1a1917]">
              {activeCount}
            </span>
          )}
        </IconButton>

        {/* 公告 */}
        <IconButton
          className="relative"
          icon={<Bell aria-hidden="true" size={15} />}
          label={t('top_announcement')}
          onClick={openAnnouncement}
        >
          {siteSettings?.announcement.enabled && (
            <span aria-hidden="true" className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#E3FF74]" />
          )}
        </IconButton>

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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                loading={loggingOut}
                iconStart={<LogOut aria-hidden="true" size={13} />}
              >
                {t('top_logout')}
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => openAuthModal('login')}
              >
                {t('top_login')}
              </Button>
              <Button
                onClick={() => openAuthModal('register')}
              >
                {t('top_register')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
