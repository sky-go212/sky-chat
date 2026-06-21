import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SESSION_KEY, ADMIN_SECRET_KEY, API_BASE } from '../utils/constants.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    const adminToken = localStorage.getItem(ADMIN_SECRET_KEY);
    if (adminToken) {
      setUser({ role: 'admin', token: adminToken });
      setLoading(false);
      return;
    }
    if (token) {
      fetch(`${API_BASE}/api/auth/session`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.valid) setUser({ ...data.session, token });
          else localStorage.removeItem(SESSION_KEY);
        })
        .catch(() => localStorage.removeItem(SESSION_KEY))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (code) => {
    const res = await fetch(`${API_BASE}/api/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.toUpperCase() })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Kode tidak valid');
    if (data.role === 'admin') {
      localStorage.setItem(ADMIN_SECRET_KEY, data.token);
      setUser({ role: 'admin', token: data.token });
    } else {
      localStorage.setItem(SESSION_KEY, data.token);
      setUser({ ...data.session, token: data.token });
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) {
      fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ADMIN_SECRET_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus di dalam AuthProvider');
  return ctx;
}
