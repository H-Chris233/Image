import { Routes, Route } from 'react-router-dom';
import TopNavBar from './components/TopNavBar';
import SideNavBar from './components/SideNavBar';
import BottomTabBar from './components/BottomTabBar';
import { ThemeProvider } from './components/ThemeProvider';
import Home from './pages/Home';
import Ecommerce from './pages/Ecommerce';
import History from './pages/History';
import Favorites from './pages/Favorites';
import Config from './pages/Config';
import Account from './pages/Account';
import Billing from './pages/Billing';
import Recharge from './pages/Recharge';
import Tasks from './pages/Tasks';
import Login from './pages/Login';
import Register from './pages/Register';
import AnnouncementModal from './components/AnnouncementModal';
import TaskDrawer from './components/TaskDrawer';
import TaskToastStack from './components/TaskToastStack';

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-on-background overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
        <TopNavBar />
        <SideNavBar />
        <main className="pt-16 lg:pl-60 pb-16 lg:pb-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/ecommerce" element={<Ecommerce />} />
            <Route path="/history" element={<History />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/config" element={<Config />} />
            <Route path="/account" element={<Account />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/recharge" element={<Recharge />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
        <BottomTabBar />
        <AnnouncementModal />
        <TaskDrawer />
        <TaskToastStack />
      </div>
    </ThemeProvider>
  );
}
