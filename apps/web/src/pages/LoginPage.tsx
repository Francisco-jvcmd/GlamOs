import { useAuth } from '../auth/auth-context';
import { Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { Capacitor } from '@capacitor/core';
import { GlamOSLogo } from '../components/GlamOSLogo';

const GOOGLE_CLIENT_ID =
  '205191300160-5nuvhdo94rkp84q7h1j663af3e35s893.apps.googleusercontent.com';

/** SVG Google "G" icon */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" className="mr-3 flex-shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialized = useRef(false);

  // Inicializar Google Sign-In con el Web Client ID
  useEffect(() => {
    const init = async () => {
      if (initialized.current) return;
      try {
        await GoogleSignIn.initialize({
          clientId: GOOGLE_CLIENT_ID,
          redirectUrl: Capacitor.isNativePlatform()
            ? undefined
            : window.location.origin + '/login',
        });
        initialized.current = true;

        // Soporte para retorno de OAuth en navegador web
        if (!Capacitor.isNativePlatform()) {
          const url = new URL(window.location.href);
          if (url.searchParams.has('code') || url.searchParams.has('state')) {
            try {
              setIsLoading(true);
              const result = await GoogleSignIn.handleRedirectCallback();
              if (result.idToken) {
                await login(result.idToken, 'web');
              }
            } catch (callbackErr: any) {
              console.error('Redirect callback error:', callbackErr);
              setErrorMessage('Error al completar el acceso vía web.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      } catch (err) {
        console.error('GoogleSignIn.initialize() failed:', err);
      }
    };

    init();
  }, [login]);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    try {
      setIsLoading(true);

      if (!initialized.current) {
        await GoogleSignIn.initialize({
          clientId: GOOGLE_CLIENT_ID,
          redirectUrl: Capacitor.isNativePlatform()
            ? undefined
            : window.location.origin + '/login',
        });
        initialized.current = true;
      }

      if (Capacitor.isNativePlatform()) {
        const result = await GoogleSignIn.signIn();
        if (result.idToken) {
          // El método login gestionará tanto la conexión al backend como el modo Offline Resiliente
          await login(result.idToken, 'android');
        } else {
          setErrorMessage('No se recibió la autorización de Google.');
        }
      } else {
        await GoogleSignIn.signIn();
      }
    } catch (err: any) {
      console.error('Error during Google Sign-In:', err);
      if (err?.code === 'SIGN_IN_CANCELED') {
        setIsLoading(false);
        return;
      }
      setErrorMessage(
        err.message?.includes('network') || err.message?.includes('fetch')
          ? 'Conexión limitada. Accediendo en modo local...'
          : `Aviso de acceso: ${err.message || 'Intente nuevamente'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-[#FAF6F0] px-4 py-8 select-none">
      {/* 1. Luxurious Ambient Gradients (Haute Beauté Glow) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#FDE68A]/40 to-[#FB7185]/30 blur-3xl" />
        <div className="absolute top-1/2 -left-48 w-[28rem] h-[28rem] rounded-full bg-gradient-to-tr from-[#FDA4AF]/30 via-[#F6D365]/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full bg-gradient-to-t from-[#E11D48]/15 via-[#FBBF24]/20 to-transparent blur-3xl" />
      </div>

      {/* 2. Main Luxury Card Container */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md">
        {/* Emblem & Branding */}
        <div className="mb-6">
          <GlamOSLogo size={112} />
        </div>

        {/* Haute Frosted Glass Panel */}
        <div className="relative rounded-3xl bg-white/75 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_20px_50px_rgba(159,18,57,0.08)] border border-amber-200/50">
          {/* Subtle gold corner accents */}
          <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-amber-300/60 rounded-tl-sm" />
          <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-amber-300/60 rounded-tr-sm" />
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-amber-300/60 rounded-bl-sm" />
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-amber-300/60 rounded-br-sm" />

          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Gestión Integral de Belleza
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-3 font-serif" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              Bienvenida a tu Salón
            </h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Ingresa para gestionar citas, ventas, inventario y tus clientes VIP.
            </p>
          </div>

          {/* Error / Status Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary Action Button: Google Sign-In with Haute Metallic Trim */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="group relative w-full h-14 flex items-center justify-center px-6 rounded-2xl bg-white hover:bg-amber-50/40 active:scale-[0.98] transition-all duration-200 shadow-[0_8px_20px_rgba(217,119,6,0.12)] hover:shadow-[0_12px_28px_rgba(217,119,6,0.2)] border-2 border-amber-300/70 disabled:opacity-60 disabled:pointer-events-none"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-amber-200/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {isLoading ? (
              <div className="flex items-center gap-3 text-amber-900 font-semibold text-sm">
                <svg
                  className="animate-spin h-5 w-5 text-amber-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Accediendo a tu espacio...</span>
              </div>
            ) : (
              <div className="flex items-center font-semibold text-gray-800 text-sm tracking-wide">
                <GoogleIcon />
                <span>Continuar con Google</span>
              </div>
            )}
          </button>

          {/* Luxury Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
            <span className="text-[10px] text-amber-800/50 uppercase tracking-[0.2em] font-medium">
              Offline First Architecture
            </span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
          </div>

          {/* Value Props Pills */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100/80">
              <span className="text-base block mb-0.5">⚡</span>
              <p className="text-[11px] font-bold text-gray-800">100% Offline</p>
              <p className="text-[10px] text-gray-500">Opera sin internet</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100/80">
              <span className="text-base block mb-0.5">🔒</span>
              <p className="text-[11px] font-bold text-gray-800">Cifrado Local</p>
              <p className="text-[10px] text-gray-500">Tus datos en tu móvil</p>
            </div>
          </div>
        </div>

        {/* Luxury Footer */}
        <div className="text-center mt-6 text-xs text-amber-900/60 tracking-wider">
          <p className="font-medium">GlamOS Haute Couture Edition · v0.1.0</p>
        </div>
      </div>
    </div>
  );
}
