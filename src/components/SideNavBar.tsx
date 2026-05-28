import { Link, useLocation } from 'react-router-dom';
import { ListTodo, PenLine, UserCircle, type LucideIcon } from 'lucide-react';
import { useSite } from '../site';
import { useTasks } from '../tasks';
import { isAccountCenterPath } from './AccountCenterHeader';

type NavItem = { name: string; path: string; icon: LucideIcon; badge?: number };

function renderNavItem(item: NavItem, isActive: boolean) {
  return (
    <Link
      key={item.path}
      to={item.path}
      aria-current={isActive ? 'page' : undefined}
      className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3FF74]/35 ${
        isActive
          ? 'bg-[rgba(227,255,116,0.08)] text-[#E3FF74] border border-[rgba(227,255,116,0.15)]'
          : 'text-[#8a8680] hover:bg-white/[0.04] hover:text-[#f0ede8] border border-transparent'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 inset-y-2.5 w-0.5 rounded-full bg-[#E3FF74]" />
      )}
      <item.icon aria-hidden="true" size={16} />
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {item.badge && item.badge > 0 ? (
        <span className="ml-auto rounded-full bg-[#E3FF74] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#1a1917]">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export default function SideNavBar() {
  const location = useLocation();
  const { t } = useSite();
  const { activeCount } = useTasks();

  const mainItems: NavItem[] = [
    { name: t('side_create'), path: '/create', icon: PenLine },
    { name: t('side_tasks'), path: '/tasks', icon: ListTodo, badge: activeCount },
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
