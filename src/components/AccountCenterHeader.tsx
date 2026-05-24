import { Settings, UserCircle, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSite } from '../site';

type AccountCenterTab = {
  icon: LucideIcon;
  key: 'overview' | 'settings';
  label: string;
  path: string;
};

type AccountCenterHeaderProps = {
  current?: AccountCenterTab['key'];
};

export const ACCOUNT_CENTER_PATHS = ['/account', '/recharge', '/config'];

export function isAccountCenterPath(pathname: string) {
  return ACCOUNT_CENTER_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function AccountCenterHeader({ current }: AccountCenterHeaderProps) {
  const location = useLocation();
  const { t } = useSite();

  const tabs: AccountCenterTab[] = [
    { key: 'overview', label: t('account_center_overview'), path: '/account', icon: UserCircle },
    { key: 'settings', label: t('account_center_settings'), path: '/config', icon: Settings },
  ];

  return (
    <header className="mb-6 border-b border-white/10 pb-5">
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
          <span className="h-[1px] w-4 bg-secondary" />
          {t('account_center_area')}
        </div>
        <h1 className="text-4xl font-bold tracking-tighter text-on-surface md:text-5xl">{t('account_center_title')}</h1>
        <p className="mt-3 max-w-3xl text-xs leading-6 text-on-surface-variant">{t('account_center_desc')}</p>
      </div>

      <nav className="grid grid-cols-2 gap-1 sm:flex" aria-label={t('account_center_title')}>
        {tabs.map((tab) => {
          const active = current ? current === tab.key : location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex h-11 min-w-0 items-center justify-center gap-1.5 border px-2 text-xs font-bold transition-colors sm:min-w-[112px] sm:gap-2 sm:px-4 ${
                active
                  ? 'border-secondary/50 bg-secondary/15 text-secondary'
                  : 'border-white/10 bg-white/[0.03] text-on-surface-variant hover:border-secondary/30 hover:text-secondary'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
