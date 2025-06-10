
import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, profile, session, loading } = useAuth();

  useEffect(() => {
    // Set user as online when authenticated
    if (user && profile && session) {
      const updateOnlineStatus = async () => {
        try {
          await fetch('https://fvsqmmfmfhrpdodzltjy.supabase.co/rest/v1/profiles', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2c3FtbWZtZmhycGRvZHpsdGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzODg2MzQsImV4cCI6MjA2NDk2NDYzNH0.S7l636TFCZICSBSr-sq-Pc2PbbYiEXb66mZFSkP1WrQ',
              'Authorization': `Bearer ${session.access_token}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              is_online: true,
              updated_at: new Date().toISOString()
            })
          });
        } catch (error) {
          console.error('Error updating online status:', error);
        }
      };

      updateOnlineStatus();

      // Set up beforeunload to mark user offline
      const handleBeforeUnload = () => {
        navigator.sendBeacon(
          'https://fvsqmmfmfhrpdodzltjy.supabase.co/rest/v1/profiles',
          JSON.stringify({ is_online: false })
        );
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [user, profile, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
