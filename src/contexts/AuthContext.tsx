import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, AuthState } from '@/types/auth';
import { authApi } from '@/lib/api';
import { getStoredUser, setStoredUser, clearAppStorage } from '@/lib/storage';

export type LoginOptions = { email: string; password: string };

interface AuthContextType extends AuthState {
  login: (options: LoginOptions) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  /* 
   * MOCK USER FOR DEVELOPMENT - Bypassing Login
   * This sets the user as a STUDENT.
   */
  // const [state, setState] = useState<AuthState>({
  //   user: {
  //     id: 'mock-student-id',
  //     name: 'Student User',
  //     email: 'student@example.com',
  //     role: 'STUDENT',
  //     permissions: [
  //       'student:read',
  //       'test:view_results',
  //       'result:read',
  //       'result:create',
  //       'result:update'
  //       // Add more permissions as needed for student access
  //     ]
  //   },
  //   token: 'mock-token',
  //   isAuthenticated: true,
  //   isLoading: false,
  // });

  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Disabled actual auth check effect for now
  useEffect(() => {
    authApi
      .me()
      .then(({ user }) => {
        setStoredUser(user);
        setState({
          user: user as User,
          token: null,
          isAuthenticated: true,
          isLoading: false,
        });
      })
      .catch(() => {
        setStoredUser(null);
        setState(prev => ({ ...prev, user: null, isAuthenticated: false, isLoading: false }));
      });
  }, []);

  const login = useCallback(async (options: LoginOptions) => {
    try {
      const { user } = await authApi.login(options);
      setStoredUser(user);
      setState({
        user: user as User,
        token: null,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAppStorage();
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
