
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import AuthGuard from '@/components/AuthGuard';
import BottomNavigation from '@/components/BottomNavigation';
import HomePage from '@/pages/HomePage';
import ChatsPage from '@/pages/ChatsPage';
import ChatDetailPage from '@/pages/ChatDetailPage';
import CallsPage from '@/pages/CallsPage';
import ProfilePage from '@/pages/ProfilePage';
import GiftsPage from '@/pages/GiftsPage';
import WalletPage from '@/pages/WalletPage';
import SettingsPage from '@/pages/SettingsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import ReportUserPage from '@/pages/ReportUserPage';
import BanAppealPage from '@/pages/BanAppealPage';
import LoginPage from '@/pages/LoginPage';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <AuthGuard>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/chats" element={<ChatsPage />} />
                <Route path="/chats/:chatId" element={<ChatDetailPage />} />
                <Route path="/calls" element={<CallsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/gifts" element={<GiftsPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/report" element={<ReportUserPage />} />
                <Route path="/appeal" element={<BanAppealPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomNavigation />
            </AuthGuard>
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;
