import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getDatabase } from '../db/database';
import { setupSync, startSync, cancelSync, triggerSync } from '../db/sync';
import { ensureUuid } from '../lib/utils';
import { syncGoogleUserWithNeon, pullAllDataFromNeon, uploadLocalDataToNeon } from '../db/neon';

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
  unlinkOrganization: () => void;
  syncOfflineSessionWithCloud: () => Promise<boolean>;
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

  const syncOfflineSessionWithCloud = async (): Promise<boolean> => {
    try {
      const storedTokens = localStorage.getItem('glamos_tokens');
      const localOrg = localStorage.getItem('glamos_local_org_id') || user?.org;
      const localOrgName = localStorage.getItem('glamos_local_org_name') || 'Mi Salón';
      const localRole = (localStorage.getItem('glamos_local_role') as any) || user?.role || 'OWNER_ADMIN';

      let email = user?.email || 'estilista@glamos.app';
      let sub = user?.sub;

      if (!sub && storedTokens) {
        try {
          const parsed = JSON.parse(storedTokens);
          const decoded = decodeJwt(parsed.access_token);
          email = decoded.email || email;
          sub = decoded.sub;
        } catch {}
      }

      const res = await fetch(`${API_URL}/auth/sync-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          full_name: email.split('@')[0],
          google_sub: sub,
          organization_id: localOrg ? ensureUuid(localOrg) : undefined,
          business_name: localOrgName,
          role: localRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const validTokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        };
        localStorage.setItem('glamos_tokens', JSON.stringify(validTokens));
        localStorage.removeItem('glamos_offline_mode');
        setTokens(validTokens);

        const decoded = decodeJwt(data.access_token);
        setUser(decoded);

        window.dispatchEvent(new Event('glamos_auth_changed'));

        // Iniciar replicación en vivo RxDB <-> Neon
        try {
          const db = await getDatabase();
          await setupSync(db);
          startSync();
          triggerSync();
        } catch (dbSyncErr) {
          console.warn('Replicación de BD en proceso:', dbSyncErr);
        }

        console.log('✨ ¡Sesión offline vinculada exitosamente con Neon en la nube!');
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Servidor en espera o sin conexión:', err);
      return false;
    }
  };

  useEffect(() => {
    const storedTokens = localStorage.getItem('glamos_tokens');
    const isOffline = localStorage.getItem('glamos_offline_mode') === 'true';

    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens);
        setTokens(parsed);
        let decoded = decodeJwt(parsed.access_token);

        // Sanear contaminación de demo en cuentas reales de Google
        const isDemoEmail = decoded.email === 'duena.vip@glamos.app' || decoded.email === 'estilista.vip@glamos.app';
        if (!isDemoEmail && decoded.org === '00000000-0000-4000-a000-000000000001') {
          const userSpecificOrg = localStorage.getItem(`glamos_user_org_${decoded.email}`);
          if (!userSpecificOrg) {
            decoded.org = null;
            // Actualizar token sin la org demo
            try {
              const parts = parsed.access_token.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                payload.org = null;
                parsed.access_token = `${parts[0]}.${btoa(JSON.stringify(payload)).replace(/=/g, '')}.${parts[2]}`;
                localStorage.setItem('glamos_tokens', JSON.stringify(parsed));
              }
            } catch {}
          }
        }

        setUser(decoded);

        // Si estaba en modo offline, intentar enlazar silenciosamente con Neon
        if (isOffline) {
          syncOfflineSessionWithCloud().catch(() => {});
        } else if (decoded.org) {
          getDatabase().then((db) => {
            setupSync(db).then(() => startSync());
          }).catch(console.error);
        }

        // Sincronización serverless bidireccional inmediata con Neon PostgreSQL (PC <-> Teléfono)
        const userEmail = decoded.email?.trim().toLowerCase();
        if (userEmail && userEmail !== 'duena.vip@glamos.app' && userEmail !== 'estilista.vip@glamos.app') {
          syncGoogleUserWithNeon({ email: userEmail, sub: decoded.sub })
            .then(async (neonSession) => {
              if (neonSession?.organization_id) {
                if (decoded.org !== neonSession.organization_id) {
                  decoded.org = neonSession.organization_id;
                  setUser({ ...decoded });
                }
                localStorage.setItem(`glamos_user_org_${userEmail}`, neonSession.organization_id);
                localStorage.setItem('glamos_local_org_id', neonSession.organization_id);
                if (neonSession.business_name) {
                  localStorage.setItem('glamos_local_org_name', neonSession.business_name);
                }
                // Primero asegurar que la organización y los datos locales de la PC estén en Neon
                await uploadLocalDataToNeon(neonSession.organization_id);
                // Luego descargar cualquier actualización fresca
                await pullAllDataFromNeon(neonSession.organization_id);
              }
            })
            .catch(console.warn);
        } else if (decoded.org) {
          const validOrg = decoded.org;
          uploadLocalDataToNeon(validOrg).then(() => {
            pullAllDataFromNeon(validOrg);
          }).catch(() => {});
        }
      } catch {
        localStorage.removeItem('glamos_tokens');
      }
    }
    setIsLoading(false);

    // Auto-sincronizar cuando el navegador detecta que volvió internet
    const handleOnline = () => {
      const currentOrg = localStorage.getItem('glamos_local_org_id') || user?.org;
      if (currentOrg) {
        pullAllDataFromNeon(currentOrg).catch(() => {});
        uploadLocalDataToNeon(currentOrg).catch(() => {});
      }
      syncOfflineSessionWithCloud().catch(() => {});
      triggerSync();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
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

      const email = googleClaims.email || 'estilista@glamos.app';
      const isDemoAccount = email === 'duena.vip@glamos.app' || email === 'estilista.vip@glamos.app';

      // Aislar organización y rol por usuario específico (Evita que cuentas de Google hereden el salón demo)
      const userOrgKey = `glamos_user_org_${email}`;
      const userRoleKey = `glamos_user_role_${email}`;
      let existingUserOrg = isDemoAccount
        ? (googleClaims.org || '00000000-0000-4000-a000-000000000001')
        : localStorage.getItem(userOrgKey);
      let existingUserRole = isDemoAccount
        ? (googleClaims.role || 'OWNER_ADMIN')
        : ((localStorage.getItem(userRoleKey) as any) || googleClaims.role || 'EMPLOYEE');

      // Sincronización Serverless Directa con Neon (Válido para cualquier celular o PC en el mundo)
      if (!isDemoAccount) {
        try {
          const neonSession = await syncGoogleUserWithNeon({
            email,
            sub: googleClaims.sub,
            name: googleClaims.name,
          });
          if (neonSession?.organization_id) {
            existingUserOrg = neonSession.organization_id;
            existingUserRole = neonSession.role || 'OWNER_ADMIN';
            localStorage.setItem(userOrgKey, existingUserOrg);
            localStorage.setItem(userRoleKey, existingUserRole);
            localStorage.setItem('glamos_local_org_id', existingUserOrg);
            if (neonSession.business_name) {
              localStorage.setItem('glamos_local_org_name', neonSession.business_name);
            }
            // Descargar de inmediato todos los datos de Neon al teléfono o PC
            await pullAllDataFromNeon(existingUserOrg);
            uploadLocalDataToNeon(existingUserOrg).catch(() => {});
          }
        } catch (neonErr) {
          console.warn('Neon sync en login advertencia:', neonErr);
        }
      }

      const offlineUser: JwtPayload = {
        sub: googleClaims.sub || 'offline_user',
        email,
        role: existingUserRole,
        org: existingUserOrg || null,
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
    localStorage.removeItem('glamos_local_org_id');
    localStorage.removeItem('glamos_local_role');
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

    if (user?.email) {
      localStorage.setItem(`glamos_user_org_${user.email}`, orgId);
      localStorage.setItem(`glamos_user_role_${user.email}`, role);
    }

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

  const unlinkOrganization = () => {
    localStorage.removeItem('glamos_local_org_id');
    localStorage.removeItem('glamos_local_role');
    if (user?.email) {
      localStorage.removeItem(`glamos_user_org_${user.email}`);
      localStorage.removeItem(`glamos_user_role_${user.email}`);
    }

    const stored = localStorage.getItem('glamos_tokens');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const parts = parsed.access_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          payload.role = 'EMPLOYEE';
          payload.org = null;
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
      setUser({ ...user, org: null, role: 'EMPLOYEE' });
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
        unlinkOrganization,
        syncOfflineSessionWithCloud,
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
