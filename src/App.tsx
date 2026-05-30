import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import TopNavBar from './components/TopNavBar';
import SideNavBar from './components/SideNavBar';
import BottomTabBar from './components/BottomTabBar';
import Explore from './pages/Explore';
import Create from './pages/Create';
import StudioPage from './studio/StudioPage';
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

const USE_STUDIO_CREATE = true;

function RootRedirect() {
  const { viewer, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={viewer?.authenticated ? '/create' : '/explore'} replace />;
}

export default function App() {
  const location = useLocation();
  const studioMode = location.pathname.startsWith('/studio');

  return (
    <div className="min-h-screen bg-background text-on-background overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
      {studioMode ? null : <TopNavBar />}
      {studioMode ? null : <SideNavBar />}
      <main className={studioMode ? 'min-h-screen' : 'pt-16 lg:pl-60 pb-16 lg:pb-0'}>
        <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/create" element={USE_STUDIO_CREATE ? <Navigate to="/studio" replace /> : <Create />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/workspace/:taskId" element={<Workspace />} />
            <Route path="/history" element={<History />} />
            <Route path="/config" element={<Config />} />
            <Route path="/account" element={<Account />} />
            <Route path="/billing" element={<Navigate to="/account" replace />} />
            <Route path="/recharge" element={<Recharge />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/design-system" element={<DesignSystem />} />
            {/* 旧路由兼容重定向 */}
            <Route path="/login" element={<Navigate to="/explore" replace />} />
            <Route path="/register" element={<Navigate to="/explore" replace />} />
            <Route path="/ecommerce" element={<Navigate to="/create" replace />} />
        </Routes>
      </main>
      {studioMode ? null : <BottomTabBar />}
      {studioMode ? null : <AnnouncementModal />}
      {studioMode ? null : <AuthModal />}
      {studioMode ? null : <TaskDrawer />}
      {studioMode ? null : <TaskToastStack />}
    </div>
  );
}
