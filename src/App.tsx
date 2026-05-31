import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import TopNavBar from './components/TopNavBar';
import SideNavBar from './components/SideNavBar';
import BottomTabBar from './components/BottomTabBar';
import StudioPage from './studio/StudioPage';
import { InspirationSurface } from './studio/inspiration/InspirationSurface';
import Workspace from './pages/Workspace';
import History from './pages/History';
import Config from './pages/Config';
import Account from './pages/Account';
import Recharge from './pages/Recharge';
import Tasks from './pages/Tasks';
import DesignSystem from './pages/DesignSystem';
import AnnouncementModal from './components/AnnouncementModal';
import AuthModal from './components/AuthModal';
import TaskDrawer from './components/TaskDrawer';
import TaskToastStack from './components/TaskToastStack';
import { useAuth } from './auth';
import {
  ASSETS_ROUTE,
  CREATE_ROUTE,
  EXPLORE_ROUTE,
  REDRAW_ROUTE,
  STUDIO_COMPAT_ROUTE,
  USER_ROUTE,
  isStudioEntryRoute,
  isStudioShellRoute,
} from './studio/app/studioRoutes';
import { useAssetSummary } from './studio/assets/useAssetSummary';

function RootRedirect() {
  const { viewer, loading } = useAuth();
  const authenticated = Boolean(viewer?.authenticated);
  const assetSummary = useAssetSummary(authenticated);

  if (loading || (authenticated && assetSummary.loading)) return null;
  if (!authenticated) return <Navigate to={EXPLORE_ROUTE} replace />;
  return <Navigate to={assetSummary.hasAssets ? ASSETS_ROUTE : CREATE_ROUTE} replace />;
}

export default function App() {
  const location = useLocation();
  const entryMode = isStudioEntryRoute(location.pathname);
  const workbenchMode = isStudioShellRoute(location.pathname);
  const designSystemMode = location.pathname === '/design-system';
  const topNavHidden = designSystemMode;
  const sideNavHidden = entryMode || workbenchMode || designSystemMode;
  const chromeHidden = designSystemMode;
  const mainClassName = designSystemMode
    ? 'min-h-screen'
    : workbenchMode
      ? 'pt-16 min-h-screen'
      : sideNavHidden
      ? 'pt-16 pb-16 lg:pb-0'
      : 'pt-16 lg:pl-60 pb-16 lg:pb-0';

  return (
    <div
      className={`min-h-screen bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container ${
        designSystemMode ? '' : 'overflow-x-hidden'
      }`}
    >
      {topNavHidden ? null : <TopNavBar />}
      {sideNavHidden ? null : <SideNavBar />}
      <main className={mainClassName}>
        <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path={`${EXPLORE_ROUTE}/*`} element={<InspirationSurface />} />
            <Route path={`${CREATE_ROUTE}/*`} element={<StudioPage />} />
            <Route path={`${ASSETS_ROUTE}/*`} element={<StudioPage />} />
            <Route path={`${REDRAW_ROUTE}/*`} element={<StudioPage />} />
            <Route path={`${USER_ROUTE}/*`} element={<StudioPage />} />
            <Route path={`${STUDIO_COMPAT_ROUTE}/*`} element={<StudioPage />} />
            <Route path="/workspace/:taskId" element={<Workspace />} />
            <Route path="/history" element={<History />} />
            <Route path="/config" element={<Config />} />
            <Route path="/account" element={<Account />} />
            <Route path="/billing" element={<Navigate to="/account" replace />} />
            <Route path="/recharge" element={<Recharge />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/design-system" element={<DesignSystem />} />
            {/* 旧路由兼容重定向 */}
            <Route path="/login" element={<Navigate to={EXPLORE_ROUTE} replace />} />
            <Route path="/register" element={<Navigate to={EXPLORE_ROUTE} replace />} />
            <Route path="/ecommerce" element={<Navigate to={CREATE_ROUTE} replace />} />
        </Routes>
      </main>
      {sideNavHidden ? null : <BottomTabBar />}
      {chromeHidden ? null : <AnnouncementModal />}
      {chromeHidden ? null : <AuthModal />}
      {chromeHidden ? null : <TaskDrawer />}
      {chromeHidden ? null : <TaskToastStack />}
    </div>
  );
}
