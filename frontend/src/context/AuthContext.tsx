import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../lib/api';
import type { AuthResponse, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: FormData) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'smart_library_auth';

const getStoredAuth = (): { token: string; user: User } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { token?: string; user?: User };
    if (!parsed.token || !parsed.user) return null;

    return { token: parsed.token, user: parsed.user };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const storedAuth = typeof window !== 'undefined' ? getStoredAuth() : null;
  const [user, setUser] = useState<User | null>(storedAuth?.user ?? null);
  const [token, setToken] = useState<string | null>(storedAuth?.token ?? null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  const persist = (auth: AuthResponse) => {
    setToken(auth.token);
    setUser(auth.user);
    setAuthToken(auth.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  };

  const refreshMe = async () => {
    if (!token) return;
    const { data } = await api.get('/api/auth/me');
    setUser(data.user);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token,
        user: data.user,
      })
    );
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password });
    persist(data);
  };

  const register = async (payload: FormData) => {
    const { data } = await api.post<AuthResponse>('/api/auth/register', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    persist(data);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshMe,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

