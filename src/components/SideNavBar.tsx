import { Link, useLocation } from 'react-router-dom';
import { CreditCard, Heart, History, Home, ImagePlus, Settings, UserCircle, Wallet } from 'lucide-react';
import { useAuth } from '../auth';
import { useSite } from '../site';

export default function SideNavBar() {
  const location = useLocation();
  const { viewer } = useAuth();
  const { t } = useSite();

  const navItems = [
    { name: t('home_tab_general'), path: '/', icon: Home },
    { name: t('side_ecommerce'), path: '/ecommerce', icon: ImagePlus },
    { name: t('side_history'), path: '/history', icon: History },
    ...(viewer?.authenticated ? [{ name: t('side_favorites'), path: '/favorites', icon: Heart }] : []),
    { name: t('side_account'), path: '/account', icon: UserCircle },
    { name: t('side_config'), path: '/config', icon: Settings },
    { name: t('side_billing'), path: '/billing', icon: CreditCard },
    { name: t('side_recharge'), path: '/recharge', icon: Wallet },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-16 h-[calc(100vh-64px)] w-60 flex-col border-r border-outline-variant bg-surface py-4 z-40">
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
