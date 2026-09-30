import { useAuth } from '../auth/auth-context';
import { Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { Capacitor } from '@capacitor/core';

const GOOGLE_CLIENT_ID =
  '205191300160-5nuvhdo94rkp84q7h1j663af3e35s893.apps.googleusercontent.com';

/** Inline SVG Google "G" icon */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" className="mr-3 flex-shrink-0">
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

/** GlamOS scissors + circuit logo icon */
function GlamOSLogo() {
  return (
    <div className="relative mx-auto mb-6">
      {/* Outer glow ring */}
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#E8A87C] to-[#C6426E] p-[2px] shadow-2xl shadow-rose-300/40">
        <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center">
          <svg viewBox="0 0 64 64" width="52" height="52">
            {/* Scissors body */}
            <defs>
              <linearGradient id="ggrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E8A87C" />
                <stop offset="100%" stopColor="#C6426E" />
              </linearGradient>
            </defs>
            {/* Left ring */}
            <circle
              cx="22"
              cy="48"
              r="7"
              fill="none"
              stroke="url(#ggrad)"
              strokeWidth="3"
            />
            {/* Right ring */}
            <circle
              cx="42"
              cy="48"
              r="7"
              fill="none"
              stroke="url(#ggrad)"
              strokeWidth="3"
            />
            {/* Left blade */}
            <line
              x1="22"
              y1="41"
              x2="38"
              y2="16"
              stroke="url(#ggrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Right blade */}
            <line
              x1="42"
              y1="41"
              x2="26"
              y2="16"
              stroke="url(#ggrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Circuit nodes on right blade */}
            <circle cx="34" cy="28" r="2" fill="#C6426E" />
            <circle cx="30" cy="22" r="1.5" fill="#E8A87C" />
            {/* Circuit line */}
            <line
              x1="34"
              y1="28"
              x2="42"
              y2="26"
              stroke="#C6426E"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <circle cx="42" cy="26" r="1.5" fill="#C6426E" />
            {/* Digital pixels top */}
            <rect x="24" y="10" width="3" height="3" rx="0.5" fill="#E8A87C" opacity="0.7" />
            <rect x="28" y="8" width="2.5" height="2.5" rx="0.5" fill="#C6426E" opacity="0.5" />
            <rect x="32" y="11" width="2" height="2" rx="0.5" fill="#C6426E" opacity="0.3" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const initialized = useRef(false);

  // Initialize Google Sign-In once when the component mounts
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
        console.log('GoogleSignIn initialized successfully');

        // If we're on web and this is a redirect callback, handle it
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
    try {
      setIsLoading(true);

      // Ensure initialized
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
        // Android/iOS: signIn() returns a result directly
        const result = await GoogleSignIn.signIn();
        if (result.idToken) {
          await login(result.idToken, 'android');
        } else {
          alert('No se recibió token de Google.');
        }
      } else {
        // Web: signIn() redirects to Google OAuth page
        await GoogleSignIn.signIn();
      }
    } catch (err: any) {
      console.error('Error during Google Sign-In:', err);
      if (err?.code === 'SIGN_IN_CANCELED') return;
      alert(
        'Error en inicio de sesión con Google: ' +
          (err.message || 'Error desconocido'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-orange-50 p-4">
      {/* Decorative background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-rose-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <GlamOSLogo />

        {/* Brand name */}
        <h1 className="text-center text-4xl font-bold tracking-tight mb-1">
          <span className="bg-gradient-to-r from-[#C6426E] to-[#E8A87C] bg-clip-text text-transparent">
            Glam
          </span>
          <span className="text-gray-800">OS</span>
        </h1>
        <p className="text-center text-gray-400 text-sm mb-10 tracking-wide">
          Sistema de Gestión para Salones
        </p>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-rose-100/50 border border-white/60 p-8">
          <p className="text-center text-gray-600 text-sm mb-6">
            Ingresa con tu cuenta de Google para comenzar
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center h-13 px-6 py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50 disabled:pointer-events-none text-sm font-medium text-gray-700"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-rose-500"
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
                Conectando...
              </>
            ) : (
              <>
                <GoogleIcon />
                Iniciar sesión con Google
              </>
            )}
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-300 uppercase tracking-widest">
              seguro y rápido
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <p className="text-center text-xs text-gray-400 leading-relaxed">
            Tus datos están protegidos con cifrado de extremo a extremo y
            funcionan sin conexión.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 mt-8">
          Versión 0.1.0 · Offline First · Powered by GlamOS
        </p>
      </div>
    </div>
  );
}
