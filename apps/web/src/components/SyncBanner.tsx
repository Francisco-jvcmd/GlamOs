import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff, CheckCircle2, X } from 'lucide-react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useAuth } from '../auth/auth-context';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { Capacitor } from '@capacitor/core';

const GOOGLE_CLIENT_ID =
  '205191300160-5nuvhdo94rkp84q7h1j663af3e35s893.apps.googleusercontent.com';

/**
 * Banner flotante que muestra el estado de sincronización.
 * - Si está en modo offline y la API está disponible → muestra botón de reconexión
 * - Si está sincronizando → muestra indicador animado brevemente
 * - Si no hay internet → muestra badge discreto
 */
export function SyncBanner() {
  const { syncState, isApiReachable, forceRecheck } = useSyncStatus();
  const { login, syncOfflineSessionWithCloud } = useAuth();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // No mostrar nada si la sesión es real y está sincronizando
  if (syncState === 'online_syncing' && !showSuccess) return null;

  // Mostrar toast de éxito breve
  if (showSuccess) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl text-sm font-semibold animate-in fade-in slide-in-from-top-3 duration-300">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Datos sincronizados con la nube ✓
      </div>
    );
  }

  // No hay internet
  if (syncState === 'api_unreachable' && !dismissed) {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800/90 text-white text-xs font-medium shadow-lg backdrop-blur-sm">
        <WifiOff className="w-3.5 h-3.5 text-gray-400" />
        <span>Sin conexión — trabajando sin internet</span>
        <button onClick={() => setDismissed(true)} className="ml-1 text-gray-400 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Modo offline pero API disponible → ACCIÓN REQUERIDA
  if ((syncState === 'offline_mode' || syncState === 'reconnecting') && isApiReachable && !dismissed) {
    const handleReconnect = async () => {
      setIsReconnecting(true);
      try {
        const synced = await syncOfflineSessionWithCloud();
        if (synced) {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3500);
          return;
        }

        if (!Capacitor.isNativePlatform()) {
          // Web: iniciar flujo Google OAuth que al completarse llama a login()
          await GoogleSignIn.initialize({
            clientId: GOOGLE_CLIENT_ID,
            redirectUrl: window.location.origin + '/login',
          });
          await GoogleSignIn.signIn();
        } else {
          // Android: flujo nativo directo
          const result = await GoogleSignIn.signIn();
          if (result.idToken) {
            await login(result.idToken, 'android');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3500);
          }
        }
      } catch (err: any) {
        console.warn('Error durante reconexión:', err);
        forceRecheck();
      } finally {
        setIsReconnecting(false);
      }
    };

    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-amber-300 shadow-xl shadow-amber-100/50 text-sm max-w-sm w-[calc(100%-2rem)]">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
          <CloudOff className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-xs">Conexión restaurada</p>
          <p className="text-[11px] text-gray-500">Tus datos offline serán sincronizados con la nube</p>
        </div>
        <button
          onClick={handleReconnect}
          disabled={isReconnecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F6D365] to-[#E11D48] text-white text-xs font-bold shadow-sm hover:shadow-md transition-all shrink-0 disabled:opacity-60"
        >
          {isReconnecting ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Wifi className="w-3 h-3" />
          )}
          {isReconnecting ? 'Conectando...' : 'Sincronizar'}
        </button>
        <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
