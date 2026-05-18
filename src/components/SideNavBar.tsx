import { Link, useLocation } from 'react-router-dom';
import { Heart, History, PenLine, UserCircle, type LucideIcon } from 'lucide-react';
import { useSite } from '../site';
import { isAccountCenterPath } from './AccountCenterHeader';

type NavItem = { name: string; path: string; icon: LucideIcon };

function renderNavItem(item: NavItem, isActive: boolean) {
  return (
    <Link
      key={item.path}
      to={item.path}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        isActive
          ? 'bg-[rgba(227,255,116,0.08)] text-[#E3FF74] border border-[rgba(227,255,116,0.15)]'
          : 'text-[#8a8680] hover:bg-white/[0.04] hover:text-[#f0ede8] border border-transparent'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 inset-y-2.5 w-0.5 rounded-full bg-[#E3FF74]" />
      )}
      <item.icon size={16} />
      {item.name}
    </Link>
  );
}

export default function SideNavBar() {
  const location = useLocation();
  const { t } = useSite();

  const mainItems: NavItem[] = [
    { name: t('side_create'), path: '/create', icon: PenLine },
    { name: t('side_history'), path: '/history', icon: History },
    { name: t('side_favorites'), path: '/favorites', icon: Heart },
  ];

  const accountItem: NavItem = { name: t('account_center_title'), path: '/account', icon: UserCircle };

  return (
    <aside className="hidden lg:flex fixed left-0 top-16 h-[calc(100vh-64px)] w-60 flex-col border-r border-white/[0.05] bg-[#111110] py-4 z-40">
      <nav className="flex-1 flex flex-col px-3">
        <div className="flex flex-col gap-0.5">
          {mainItems.map((item) => renderNavItem(item, location.pathname === item.path))}
        </div>

        <div className="my-4 border-t border-white/[0.05]" />

        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#4a4844]">
          {t('account_center_area')}
        </p>
        <div className="flex flex-col gap-0.5">
          {renderNavItem(accountItem, isAccountCenterPath(location.pathname))}
        </div>
      </nav>
    </aside>
  );
}
