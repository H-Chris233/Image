import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CreditCard, Heart, History, MoreHorizontal, PenLine, Settings, UserCircle, Wallet, X } from 'lucide-react';
import { useAuth } from '../auth';
import { useSite } from '../site';

export default function BottomTabBar() {
  const location = useLocation();
  const { viewer } = useAuth();
  const { t } = useSite();
  const [moreOpen, setMoreOpen] = useState(false);

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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 bg-surface border-t border-outline-variant px-2 pb-[env(safe-area-inset-bottom,0px)]">
        {mainTabs.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 min-w-0 transition-colors ${
                isActive ? 'text-primary' : 'text-on-surface-variant'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium truncate">{item.name}</span>
            </Link>
          );
        })}

        <button
          className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
            isMoreActive || moreOpen ? 'text-primary' : 'text-on-surface-variant'
          }`}
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
        >
          {moreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          <span className="text-[10px] font-medium">{t('top_more')}</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-40 bg-surface/95 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col gap-2 p-4 pt-6">
            {moreItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                  onClick={() => setMoreOpen(false)}
                >
                  <item.icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
