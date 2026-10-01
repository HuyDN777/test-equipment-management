import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axiosClient from '../api/axiosClient';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      try {
        if (token) {
          const userData = await axiosClient.get<any, User>('/users/me');
          if (userData.role !== 'Employee') {
            localStorage.removeItem('access_token');
          } else {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile', error);
        localStorage.removeItem('access_token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (token: string, userData: User) => {
    if (userData.role !== 'Employee') {
      throw new Error('Cổng này chỉ dành cho nhân viên');
    }
    localStorage.setItem('access_token', token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await axiosClient.post('/logout');
    } catch (error) {
      console.error('Logout failed on server', error);
    } finally {
      localStorage.removeItem('access_token');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await axiosClient.get<any, User>('/users/me');
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user profile', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
          Đang kiểm tra phiên đăng nhập...
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
