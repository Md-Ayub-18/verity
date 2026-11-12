import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('verity_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Computed state for Kids Mode: true if account_type === 'child' or preview mode is on
  const isKidsMode = Boolean(
    user && (user.account_type === 'child' || user.is_kids_mode || user.kids_preview_mode)
  );

  useEffect(() => {
    const token = localStorage.getItem('verity_token');
    if (token) {
      api.getMe()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('verity_user', JSON.stringify(userData));
        })
        .catch(() => {
          localStorage.removeItem('verity_token');
          localStorage.removeItem('verity_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener('verity_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('verity_auth_expired', handleAuthExpired);
  }, []);

  const login = async (usernameOrEmail, password, rememberMe = true) => {
    const res = await api.login({
      username_or_email: usernameOrEmail,
      password,
      remember_me: rememberMe,
    });
    localStorage.setItem('verity_token', res.access_token);
    localStorage.setItem('verity_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const register = async (formData) => {
    const res = await api.register(formData);
    localStorage.setItem('verity_token', res.access_token);
    localStorage.setItem('verity_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await api.logoutCurrent();
    } catch (_) {
      // Ignore if token already invalid
    }
    localStorage.removeItem('verity_token');
    localStorage.removeItem('verity_user');
    setUser(null);
  };

  const logoutAll = async () => {
    try {
      await api.logoutAll();
    } catch (_) {
      // Ignore if token already invalid
    }
    localStorage.removeItem('verity_token');
    localStorage.removeItem('verity_user');
    setUser(null);
  };

  const [kidsModalMode, setKidsModalMode] = useState(null); // 'lock' | 'unlock' | null

  const updateUser = (updated) => {
    setUser(updated);
    localStorage.setItem('verity_user', JSON.stringify(updated));
  };

  const toggleKidsMode = async () => {
    if (!user) return;
    if (user.account_type === 'child') {
      alert('Kids Mode is mandatory for child accounts and cannot be disabled.');
      return;
    }
    if (!isKidsMode) {
      // Enable Kids Mode right away; exiting later requires the present-time password
      try {
        const res = await api.toggleKidsMode({});
        updateUser(res.user);
      } catch (err) {
        alert(err.message || 'Could not enable Kids Mode');
      }
      return;
    }
    setKidsModalMode('unlock');
  };

  const confirmLockKidsMode = async (customCode) => {
    const res = await api.toggleKidsMode({ custom_code: customCode });
    updateUser(res.user);
    setKidsModalMode(null);
    return res.generated_code;
  };

  const confirmUnlockKidsMode = async (unlockCode) => {
    const res = await api.toggleKidsMode({
      unlock_code: unlockCode,
      tz_offset_minutes: new Date().getTimezoneOffset(),
    });
    updateUser(res.user);
    setKidsModalMode(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isKidsMode,
        kidsModalMode,
        setKidsModalMode,
        login,
        register,
        logout,
        logoutAll,
        updateUser,
        toggleKidsMode,
        confirmLockKidsMode,
        confirmUnlockKidsMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
