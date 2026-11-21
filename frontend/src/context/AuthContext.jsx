// Authentication Context providing global user state and login or logout actions.
// Uses plain React useState, useEffect, and createContext to manage session state.

import { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredTokens, setStoredTokens, clearStoredTokens } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem('theme');
    } catch {
      savedTheme = null;
    }
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply the selected theme to the document and remember the user's choice.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // The document theme still applies when browser storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystemTheme = (event) => {
      let savedTheme = null;
      try {
        savedTheme = localStorage.getItem('theme');
      } catch {
        savedTheme = null;
      }
      if (!savedTheme) {
        setTheme(event.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', followSystemTheme);
    return () => mediaQuery.removeEventListener('change', followSystemTheme);
  }, []);

  // Check for an existing session token on initial mount and fetch user details
  useEffect(() => {
    async function loadUser() {
      const { access } = getStoredTokens();
      if (!access) {
        setLoading(false);
        return;
      }

      try {
        const userData = await api.get('/auth/me/');
        setUser(userData);
      } catch {
        // If token verification fails, clear stored credentials
        clearStoredTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  // Submit login credentials to backend, save tokens, and update current user
  const login = async (email, password) => {
    const data = await api.post('/auth/login/', { email, password });
    setStoredTokens(data.access, data.refresh);
    setUser(data.user);
    return data.user;
  };

  // Submit registration details, save returned tokens, and set user state
  const register = async (email, displayName, password) => {
    const data = await api.post('/auth/register/', {
      email,
      display_name: displayName,
      password,
    });
    setStoredTokens(data.access, data.refresh);
    setUser(data.user);
    return data.user;
  };

  // Log out by removing tokens and resetting user state to null
  const logout = () => {
    clearStoredTokens();
    setUser(null);
  };

  // Permanently delete the user account and associated photos
  const deleteAccount = async () => {
    await api.delete('/auth/me');
    clearStoredTokens();
    setUser(null);
  };

  // Save profile changes and keep the shared user state in sync.
  const updateProfile = async (displayName) => {
    const updatedUser = await api.patch('/auth/me/', { display_name: displayName });
    setUser(updatedUser);
    return updatedUser;
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    updateProfile,
    deleteAccount,
    theme,
    toggleTheme,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to access authentication state anywhere in the application
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
