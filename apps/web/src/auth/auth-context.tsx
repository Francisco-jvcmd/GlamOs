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
  setOrganization: (orgId: string, role: 'OWNER_ADMIN' | 'EMPLOYEE') => void;
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
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, platform }),
      });

      if (!res.ok) throw new Error('Servidor retornó error de autenticación');
      const data = await res.json();

      const newTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      };
      localStorage.setItem('glamos_tokens', JSON.stringify(newTokens));
      localStorage.removeItem('glamos_offline_mode');
      setTokens(newTokens);

      const decoded = decodeJwt(data.access_token);
      setUser(decoded);

      if (decoded.org) {
        const db = await getDatabase();
        await setupSync(db);
        startSync();
      }
    } catch (networkErr: any) {
      console.warn('Backend no disponible o sin conexión. Activando Modo Offline-First:', networkErr);

      // Decodificamos el token criptográfico emitido directamente por Google
      let googleClaims: any = {};
      try {
        googleClaims = decodeJwt(idToken);
      } catch (e) {
        console.error('Error al decodificar Google idToken:', e);
      }

      const existingLocalOrg = localStorage.getItem('glamos_local_org_id');
      const existingLocalRole = (localStorage.getItem('glamos_local_role') as any) || googleClaims.role || 'EMPLOYEE';

      const offlineUser: JwtPayload = {
        sub: googleClaims.sub || 'offline_user',
        email: googleClaims.email || 'estilista@glamos.app',
        role: existingLocalRole,
        org: existingLocalOrg || null, // Si es nuevo, es null para que vaya a /onboarding
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90, // 90 días offline
        iat: Math.floor(Date.now() / 1000),
      };

      // Generar JWT local sintetizado para que el resto de la app funcione sin alterar contratos
      const fakeHeader = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const fakePayload = btoa(JSON.stringify(offlineUser));
      const offlineJwt = `${fakeHeader}.${fakePayload}.glamos_offline_sig`;

      const offlineTokens = {
        access_token: offlineJwt,
        refresh_token: 'glamos_offline_rt',
      };

      localStorage.setItem('glamos_tokens', JSON.stringify(offlineTokens));
      localStorage.setItem('glamos_offline_mode', 'true');
      setTokens(offlineTokens);
      setUser(offlineUser);

      // Inicializar base de datos local Dexie/RxDB
      try {
        await getDatabase();
      } catch (dbErr) {
        console.error('Error inicializando Dexie local:', dbErr);
      }
    }
  };

  const logout = () => {
    cancelSync().catch(console.error);
    localStorage.removeItem('glamos_tokens');
    localStorage.removeItem('glamos_offline_mode');
    setTokens(null);
    setUser(null);
    window.location.href = '/login';
  };

  const refreshAccessToken = async () => {
    const isOffline = localStorage.getItem('glamos_offline_mode') === 'true';
    if (isOffline && tokens?.access_token) {
      return tokens.access_token;
    }

    if (!tokens?.refresh_token) throw new Error('No refresh token');

    try {
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
    } catch (e) {
      if (tokens?.access_token) return tokens.access_token;
      throw e;
    }
  };

  const setOrganization = (orgId: string, role: 'OWNER_ADMIN' | 'EMPLOYEE') => {
    localStorage.setItem('glamos_local_org_id', orgId);
    localStorage.setItem('glamos_local_role', role);

    const stored = localStorage.getItem('glamos_tokens');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const parts = parsed.access_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          payload.role = role;
          payload.org = orgId;
          const updatedToken = `${parts[0]}.${btoa(JSON.stringify(payload)).replace(/=/g, '')}.${parts[2]}`;
          parsed.access_token = updatedToken;
          localStorage.setItem('glamos_tokens', JSON.stringify(parsed));
          setTokens(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (user) {
      setUser({ ...user, org: orgId, role });
    }
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
        setOrganization,
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
