import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CreditCard, Heart, History, LogOut, MoreHorizontal, PenLine, Settings, UserCircle, Wallet, X } from 'lucide-react';
import { AccountInfo, formatBalance, getAccount, logoutAccount } from '../api';
import { useAuth } from '../auth';
import { useAuthModal } from '../authModal';
import { useSite } from '../site';

export default function BottomTabBar() {
  const location = useLocation();
  const { viewer, refresh } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { t } = useSite();
  const [moreOpen, setMoreOpen] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getAccount().then(setAccount).catch(() => setAccount(null));
  }, [viewer?.owner_id]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logoutAccount(); }
    finally {
      await refresh();
      setAccount(await getAccount().catch(() => null));
      setMoreOpen(false);
      window.location.href = '/';
    }
  }

  const viewerLabel = viewer?.authenticated
    ? (viewer.user?.username || viewer.user?.email || 'USER')
    : t('home_guest', { value: viewer?.guest_id?.slice(0, 8) || '--' });

  const mainTabs = [
    { name: t('side_create'), path: '/create', icon: PenLine },
    { name: t('side_history'), path: '/history', icon: History },
    ...(viewer?.authenticated ? [{ name: t('side_favorites'), path: '/favorites', icon: Heart }] : []),
  ];

  const moreItems = [
    { name: t('side_recharge'), path: '/recharge', icon: Wallet },
    { name: t('side_billing'), path: '/billing', icon: CreditCard },
    { name: t('side_account'), path: '/account', icon: UserCircle },
    { name: t('side_config'), path: '/config', icon: Settings },
  ];

  const isMoreActive = moreItems.some((item) => location.pathname === item.path);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 bg-[#111110] border-t border-white/[0.05] px-2 pb-[env(safe-area-inset-bottom,0px)]">
        {mainTabs.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 min-w-0 transition-colors ${
                isActive ? 'text-[#E3FF74]' : 'text-[#8a8680]'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium truncate">{item.name}</span>
            </Link>
          );
        })}

        <button
          className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
            isMoreActive || moreOpen ? 'text-[#E3FF74]' : 'text-[#8a8680]'
          }`}
          type="button"
          aria-label={moreOpen ? t('mobile_menu_close') : t('top_more')}
          onClick={() => setMoreOpen((v) => !v)}
        >
          {moreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          <span className="text-[10px] font-medium">{t('top_more')}</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto bg-[#111110]/95 pb-24 backdrop-blur-sm animate-fade-in lg:hidden">
          <div className="flex min-h-full flex-col gap-2 p-4 pt-6">
            <div className="mb-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4">
              <div className="text-[11px] text-[#8a8680]">{t('top_owner')}</div>
              <div className="mt-1 truncate text-sm font-semibold text-[#f0ede8]">{viewerLabel}</div>
              {viewer?.authenticated && (
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className="text-xs text-[#8a8680]">{t('top_credits')}</span>
                  <span className="text-sm font-bold text-[#E3FF74]">{formatBalance(account?.balance)}</span>
                </div>
              )}
            </div>

            {moreItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border border-[rgba(227,255,116,0.12)] bg-[rgba(227,255,116,0.08)] text-[#E3FF74]'
                      : 'border border-transparent text-[#8a8680] hover:bg-white/[0.04] hover:text-[#f0ede8]'
                  }`}
                  onClick={() => setMoreOpen(false)}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              );
            })}

            <div className="mt-2 border-t border-white/[0.06] pt-4">
              {viewer?.authenticated ? (
                <button
                  className="btn-ghost h-11 w-full justify-center"
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut size={16} />
                  {t('top_logout')}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    className="btn-ghost h-11 flex-1 justify-center"
                    type="button"
                    onClick={() => { openAuthModal('login'); setMoreOpen(false); }}
                  >
                    {t('top_login')}
                  </button>
                  <button
                    className="btn-primary h-11 flex-1 justify-center"
                    type="button"
                    onClick={() => { openAuthModal('register'); setMoreOpen(false); }}
                  >
                    {t('top_register')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
