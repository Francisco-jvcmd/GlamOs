import { useAuth } from '../auth/auth-context';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { Capacitor } from '@capacitor/core';

export function LoginPage() {
  const { user, login } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleLogin = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await GoogleSignIn.signIn();
        if (result.idToken) {
          await login(result.idToken, 'android');
        } else {
          alert('No se recibió token de Google.');
        }
      } else {
        alert('En entorno web de desarrollo, use la app nativa en Android o configure Google Identity Services.');
      }
    } catch (err: any) {
      console.error('Error during Google Sign-In:', err);
      alert('Error en inicio de sesión con Google: ' + (err.message || 'Error desconocido'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-rose-100 to-rose-200 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-3xl font-bold text-white">G</span>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">GlamOS</CardTitle>
          <p className="text-gray-500 mt-2">Sistema de Gestión para Salones</p>
        </CardHeader>
        <CardContent className="pt-6">
          <Button 
            className="w-full h-12 text-base font-medium" 
            onClick={handleGoogleLogin}
          >
            Iniciar sesión con Google
          </Button>
          
          <p className="text-center text-sm text-gray-400 mt-6">
            Versión 0.1.0 (Offline First)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
