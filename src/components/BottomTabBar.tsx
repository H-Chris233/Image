import { Link, useLocation } from 'react-router-dom';
import { Heart, History, PenLine, UserCircle } from 'lucide-react';
import { useSite } from '../site';
import { isAccountCenterPath } from './AccountCenterHeader';

export default function BottomTabBar() {
  const location = useLocation();
  const { t } = useSite();

  const tabs = [
    { name: t('bottom_create'), path: '/create', icon: PenLine },
    { name: t('bottom_history'), path: '/history', icon: History },
    { name: t('bottom_favorites'), path: '/favorites', icon: Heart },
    { name: t('bottom_me'), path: '/account', icon: UserCircle, isActive: isAccountCenterPath },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 bg-[#111110] border-t border-white/[0.05] px-2 pb-[env(safe-area-inset-bottom,0px)]">
      {tabs.map((item) => {
        const isActive = item.isActive ? item.isActive(location.pathname) : location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors ${
              isActive ? 'text-[#E3FF74]' : 'text-[#8a8680]'
            }`}
          >
            <item.icon size={20} />
            <span className="max-w-full truncate text-[10px] font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
