import { Link, useLocation } from 'react-router-dom';
import { CreditCard, Heart, History, PenLine, Settings, UserCircle, Wallet, type LucideIcon } from 'lucide-react';
import { useAuth } from '../auth';
import { useSite } from '../site';

type NavItem = { name: string; path: string; icon: LucideIcon };

function renderNavItem(item: NavItem, isActive: boolean) {
  return (
    <Link
      key={item.path}
      to={item.path}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-[rgba(0,212,240,0.1)] text-[#00D4F0] border border-[rgba(0,212,240,0.2)]'
          : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-transparent'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-gradient-to-b from-[#00D4F0] to-[#8B5CF6]" />
      )}
      <item.icon size={17} />
      {item.name}
    </Link>
  );
}

export default function SideNavBar() {
  const location = useLocation();
  const { viewer } = useAuth();
  const { t } = useSite();

  const mainItems: NavItem[] = [
    { name: t('side_create'), path: '/create', icon: PenLine },
    { name: t('side_history'), path: '/history', icon: History },
    ...(viewer?.authenticated ? [{ name: t('side_favorites'), path: '/favorites', icon: Heart }] : []),
  ];

  const accountItems: NavItem[] = [
    { name: t('side_recharge'), path: '/recharge', icon: Wallet },
    { name: t('side_billing'), path: '/billing', icon: CreditCard },
    { name: t('side_account'), path: '/account', icon: UserCircle },
    { name: t('side_config'), path: '/config', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-16 h-[calc(100vh-64px)] w-60 flex-col border-r border-outline-variant bg-surface py-4 z-40">
      <nav className="flex-1 flex flex-col px-3">
        <div className="flex flex-col gap-0.5">
          {mainItems.map((item) => renderNavItem(item, location.pathname === item.path))}
        </div>

        <div className="my-4 border-t border-outline-variant/50" />

        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50">
          账户
        </p>
        <div className="flex flex-col gap-0.5">
          {accountItems.map((item) => renderNavItem(item, location.pathname === item.path))}
        </div>
      </nav>
    </aside>
  );
}
