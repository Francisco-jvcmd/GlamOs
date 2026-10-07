import { useEffect, useState, useCallback, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PING_INTERVAL_MS = 15_000; // revisar cada 15s
const PING_TIMEOUT_MS = 5_000;

export type SyncState =
  | 'offline_mode'     // sesión con JWT falso, sin sync
  | 'online_syncing'   // sesión real, sync activo
  | 'api_unreachable'  // sin internet o Render apagado
  | 'reconnecting';    // intentando reconectar

/**
 * Hook que monitorea en tiempo real si la API de Render está disponible
 * y si el usuario está en modo offline (JWT falso).
 * Expone el estado de sincronización y una función para forzar la reconexión.
 */
export function useSyncStatus() {
  const [syncState, setSyncState] = useState<SyncState>(() => {
    const isOffline = localStorage.getItem('glamos_offline_mode') === 'true';
    return isOffline ? 'offline_mode' : 'online_syncing';
  });
  const [isApiReachable, setIsApiReachable] = useState(false);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pingApi = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      const res = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const checkAndUpdateState = useCallback(async () => {
    const isOfflineMode = localStorage.getItem('glamos_offline_mode') === 'true';
    if (!isOfflineMode) {
      // Sesión real activa — solo verificar conectividad de fondo
      setSyncState('online_syncing');
      setIsApiReachable(true);
      return;
    }
    const reachable = await pingApi();
    setIsApiReachable(reachable);
    if (reachable) {
      setSyncState('offline_mode'); // API disponible pero sigue en modo offline → necesita re-login
    } else {
      setSyncState('api_unreachable');
    }
  }, [pingApi]);

  // Ping inicial y periódico
  useEffect(() => {
    checkAndUpdateState();
    pingRef.current = setInterval(checkAndUpdateState, PING_INTERVAL_MS);
    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
    };
  }, [checkAndUpdateState]);

  // Escuchar eventos de conexión del navegador
  useEffect(() => {
    const onOnline = () => checkAndUpdateState();
    const onOffline = () => {
      setIsApiReachable(false);
      setSyncState('api_unreachable');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [checkAndUpdateState]);

  // Escuchar cuando el auth-context limpia el modo offline (re-login exitoso)
  useEffect(() => {
    const onAuthChanged = () => {
      const isOfflineMode = localStorage.getItem('glamos_offline_mode') === 'true';
      if (!isOfflineMode) setSyncState('online_syncing');
    };
    window.addEventListener('glamos_auth_changed', onAuthChanged);
    return () => window.removeEventListener('glamos_auth_changed', onAuthChanged);
  }, []);

  const forceRecheck = useCallback(() => {
    setSyncState('reconnecting');
    checkAndUpdateState();
  }, [checkAndUpdateState]);

  return { syncState, isApiReachable, forceRecheck };
}
