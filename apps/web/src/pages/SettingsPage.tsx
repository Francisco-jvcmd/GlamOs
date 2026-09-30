import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LogOut, Store } from 'lucide-react';

export function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-gray-500" />
            Información de la Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-gray-500">Email</div>
            <div className="font-medium">{user?.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Rol</div>
            <div className="font-medium">{user?.role}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Organización</div>
            <div className="font-mono text-sm break-all bg-gray-50 p-2 rounded mt-1 border">
              {user?.org || 'Sin organización (Modo offline)'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full sm:w-auto flex gap-2" onClick={logout}>
        <LogOut className="w-4 h-4" />
        Cerrar Sesión
      </Button>
    </div>
  );
}
