
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
};

export default AuthGuard;
