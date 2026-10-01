import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axiosClient from '../api/axiosClient';

export interface User {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  role: string;
  department: string;
  avatar_url: string | null;
}

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
      const token = localStorage.getItem('admin_access_token');
      if (token) {
        try {
          const userData = await axiosClient.get<any, User>('/users/me');
          if (userData.role !== 'Admin') {
            throw new Error('Not an admin');
          }
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user profile or unauthorized', error);
          localStorage.removeItem('admin_access_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('admin_access_token', token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await axiosClient.post('/logout');
    } catch (error) {
      console.error('Logout failed on server', error);
    } finally {
      localStorage.removeItem('admin_access_token');
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
      {!loading && children}
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
