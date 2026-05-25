import { Navigate, Routes, Route } from 'react-router-dom';
import TopNavBar from './components/TopNavBar';
import SideNavBar from './components/SideNavBar';
import BottomTabBar from './components/BottomTabBar';
import { ThemeProvider } from './components/ThemeProvider';
import Create from './pages/Create';
import Explore from './pages/Explore';
import Workspace from './pages/Workspace';
import History from './pages/History';
import Favorites from './pages/Favorites';
import Config from './pages/Config';
import Account from './pages/Account';
import Recharge from './pages/Recharge';
import Tasks from './pages/Tasks';
import Ecommerce from './pages/Ecommerce';
import AnnouncementModal from './components/AnnouncementModal';
import AuthModal from './components/AuthModal';
import TaskDrawer from './components/TaskDrawer';
import TaskToastStack from './components/TaskToastStack';
import { useAuth } from './auth';

function RootRedirect() {
  const { viewer, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={viewer?.authenticated ? '/create' : '/explore'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-on-background overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
        <TopNavBar />
        <SideNavBar />
        <main className="pt-16 lg:pl-60 pb-16 lg:pb-0">
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/create" element={<Create />} />
            <Route path="/workspace/:taskId" element={<Workspace />} />
            <Route path="/history" element={<History />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/config" element={<Config />} />
            <Route path="/account" element={<Account />} />
            <Route path="/billing" element={<Navigate to="/account" replace />} />
            <Route path="/recharge" element={<Recharge />} />
            <Route path="/tasks" element={<Tasks />} />
            {/* 旧路由兼容重定向 */}
            <Route path="/login" element={<Navigate to="/explore" replace />} />
            <Route path="/register" element={<Navigate to="/explore" replace />} />
            <Route path="/ecommerce" element={<Ecommerce />} />
          </Routes>
        </main>
        <BottomTabBar />
        <AnnouncementModal />
        <AuthModal />
        <TaskDrawer />
        <TaskToastStack />
      </div>
    </ThemeProvider>
  );
}
