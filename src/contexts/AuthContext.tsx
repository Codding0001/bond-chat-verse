
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  displayName: string;
  userNumber: string; // 6-digit unique number
  bio: string;
  profilePicture: string;
  coinBalance: number;
  isOnline: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  updateCoins: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Generate random 6-digit user number
  const generateUserNumber = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const login = async (email: string, password: string) => {
    // Simulate API call
    const mockUser: User = {
      id: '1',
      email,
      displayName: 'John Doe',
      userNumber: '123456',
      bio: 'Hello there! I am using ChatApp.',
      profilePicture: '',
      coinBalance: 100,
      isOnline: true,
    };
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const register = async (email: string, password: string, displayName: string) => {
    // Simulate API call
    const newUser: User = {
      id: Date.now().toString(),
      email,
      displayName,
      userNumber: generateUserNumber(),
      bio: 'Hello there! I am using ChatApp.',
      profilePicture: '',
      coinBalance: 50, // Starting coins
      isOnline: true,
    };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const updateCoins = (amount: number) => {
    if (user) {
      const updatedUser = { ...user, coinBalance: user.coinBalance + amount };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      updateProfile,
      updateCoins
    }}>
      {children}
    </AuthContext.Provider>
  );
};
