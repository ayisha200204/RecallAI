import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('recallai_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('recallai_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          setUser(res.data.user);
          localStorage.setItem('recallai_user', JSON.stringify(res.data.user));
        } catch (err) {
          console.warn('Failed to restore user session:', err.message);
          setToken(null);
          setUser(null);
          localStorage.removeItem('recallai_token');
          localStorage.removeItem('recallai_user');
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('recallai_token', newToken);
    localStorage.setItem('recallai_user', JSON.stringify(newUser));
    return newUser;
  };

  const register = async (name, email, password, studyGoals) => {
    const res = await api.post('/auth/register', { name, email, password, studyGoals });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('recallai_token', newToken);
    localStorage.setItem('recallai_user', JSON.stringify(newUser));
    return newUser;
  };

  const demoLogin = async () => {
    const res = await api.post('/demo/login');
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('recallai_token', newToken);
    localStorage.setItem('recallai_user', JSON.stringify(newUser));
    return newUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('recallai_token');
    localStorage.removeItem('recallai_user');
  };

  const updateGoals = async (goals) => {
    const res = await api.put('/auth/goals', goals);
    setUser(res.data.user);
    localStorage.setItem('recallai_user', JSON.stringify(res.data.user));
    return res.data.user;
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/profile');
      setUser(res.data.user);
      localStorage.setItem('recallai_user', JSON.stringify(res.data.user));
    } catch (e) {
      console.warn('Could not refresh profile:', e.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        demoLogin,
        logout,
        updateGoals,
        refreshUser,
      }}
    >
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
