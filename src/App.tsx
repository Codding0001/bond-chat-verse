
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import AuthGuard from "./components/AuthGuard";
import BottomNavigation from "./components/BottomNavigation";
import HomePage from "./pages/HomePage";
import ChatsPage from "./pages/ChatsPage";
import ChatDetailPage from "./pages/ChatDetailPage";
import CallsPage from "./pages/CallsPage";
import GiftsPage from "./pages/GiftsPage";
import WalletPage from "./pages/WalletPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import ReportUserPage from "./pages/ReportUserPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import BanAppealPage from "./pages/BanAppealPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <AuthGuard>
              <div className="min-h-screen bg-background">
                <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/chats" element={<ChatsPage />} />
                  <Route path="/chats/:chatId" element={<ChatDetailPage />} />
                  <Route path="/calls" element={<CallsPage />} />
                  <Route path="/gifts" element={<GiftsPage />} />
                  <Route path="/wallet" element={<WalletPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/report-user" element={<ReportUserPage />} />
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/ban-appeal" element={<BanAppealPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <BottomNavigation />
              </div>
            </AuthGuard>
          </BrowserRouter>
        </SettingsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
