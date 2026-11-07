import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { clearAuthToken, getAuthToken, setAuthToken } from '../lib/authToken';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check current session on app load
  const checkAuth = useCallback(async () => {
    if (!getAuthToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/auth/me');
      if (response.data?.success && response.data?.user) {
        setUser(response.data.user);
      } else {
        clearAuthToken();
        setUser(null);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuthToken();
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.success && response.data?.user && response.data?.token) {
        setAuthToken(response.data.token);
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      }
      throw new Error(
        response.data?.message || 'Login response did not include an authentication token.'
      );
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Login failed. Please try again.';
      setError(message);
      throw new Error(message);
    }
  };

  // Logout handler
  const logout = async () => {
    clearAuthToken();
    setUser(null);
    setError(null);
  };

  // Change password handler
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to change password';
      throw new Error(message);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    changePassword,
    refetchUser: checkAuth,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
