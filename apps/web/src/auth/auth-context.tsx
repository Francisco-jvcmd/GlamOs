import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getDatabase } from '../db/database';
import { setupSync, startSync, cancelSync } from '../db/sync';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  org: string | null;   // organization_id
  exp: number;
  iat: number;
}

interface Tokens {
  access_token: string;
  refresh_token: string;
}

interface AuthContextType {
  user: JwtPayload | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (idToken: string, platform: 'web' | 'android') => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeJwt(token: string): JwtPayload {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
  return JSON.parse(jsonPayload);
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedTokens = localStorage.getItem('glamos_tokens');
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens);
        setTokens(parsed);
        const decoded = decodeJwt(parsed.access_token);
        setUser(decoded);
        // Init sync if user has an organization
        if (decoded.org) {
          getDatabase().then((db) => {
            setupSync(db).then(() => startSync());
          }).catch(console.error);
        }
      } catch {
        localStorage.removeItem('glamos_tokens');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (idToken: string, platform: 'web' | 'android') => {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken, platform }),
    });

    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();

    const newTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
    localStorage.setItem('glamos_tokens', JSON.stringify(newTokens));
    setTokens(newTokens);

    const decoded = decodeJwt(data.access_token);
    setUser(decoded);

    if (decoded.org) {
      const db = await getDatabase();
      await setupSync(db);
      startSync();
    }
  };

  const logout = () => {
    cancelSync().catch(console.error);
    localStorage.removeItem('glamos_tokens');
    setTokens(null);
    setUser(null);
    window.location.href = '/login';
  };

  const refreshAccessToken = async () => {
    if (!tokens?.refresh_token) throw new Error('No refresh token');

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });

    if (!res.ok) {
      logout();
      throw new Error('Refresh failed');
    }

    const data = await res.json();
    const newTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokens.refresh_token,
    };
    localStorage.setItem('glamos_tokens', JSON.stringify(newTokens));
    setTokens(newTokens);
    setUser(decodeJwt(data.access_token));
    return data.access_token;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
