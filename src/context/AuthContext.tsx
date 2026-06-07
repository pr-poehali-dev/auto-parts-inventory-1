import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authMe, authLogout } from '@/api';

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, token: null, loading: true,
  login: () => {}, setUser: () => {}, logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('pk_token');
    if (!saved) { setLoading(false); return; }
    authMe(saved)
      .then((data: { user: User }) => { setToken(saved); setUser(data.user); })
      .catch(() => localStorage.removeItem('pk_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = (t: string, u: User) => {
    localStorage.setItem('pk_token', t);
    setToken(t); setUser(u);
  };

  const logout = () => {
    if (token) authLogout(token).catch(() => {});
    localStorage.removeItem('pk_token');
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
