import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LogOut, Store, KeyRound, Copy, Check, Users, Crown, Scissors } from 'lucide-react';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const localJoinCode = localStorage.getItem('glamos_local_join_code') || 'GLAM-8842-A';
  const salonName = localStorage.getItem('glamos_local_org_name') || 'Mi Salón Glamour';
  const isAdmin = user?.role === 'OWNER_ADMIN';

  const copyCode = () => {
    navigator.clipboard.writeText(localJoinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-serif" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          Configuración del Salón
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Gestión de cuenta, roles y accesos.</p>
      </div>

      {/* Tarjeta de Código de Invitación para Empleados (SOLO ADMIN) */}
      {isAdmin && (
        <Card className="border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/60 to-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-900 text-base">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Código de Invitación para Empleados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-600 leading-relaxed">
              Tus estilistas y empleados deben ingresar este código al iniciar sesión en su teléfono para vincularse a tu salón:
            </p>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-amber-200 shadow-inner">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
                  Código de Conexión
                </span>
                <span className="font-mono text-2xl font-black text-gray-900 tracking-widest">
                  {localJoinCode}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F6D365] to-[#D97706] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm hover:shadow transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                {copied ? '¡Copiado!' : 'Copiar Código'}
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-amber-800/70 pt-1">
              <Users className="w-4 h-4" />
              <span>Los empleados con este código solo podrán facturar y ver sus propias métricas.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información de la Cuenta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="w-5 h-5 text-gray-500" />
            Perfil & Organización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Salón / Negocio</div>
              <div className="font-bold text-gray-800 text-sm mt-0.5">{salonName}</div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
              {isAdmin ? '👑 Dueño / Admin' : '✂️ Empleado'}
            </span>
          </div>

          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Correo Electrónico</div>
            <div className="font-medium text-gray-800 text-sm mt-0.5">{user?.email}</div>
          </div>

          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Rol Asignado</div>
            <div className="flex items-center gap-2 mt-1">
              {isAdmin ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  Administrador General (Acceso Total: Finanzas, Inventario, Reportes)
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                  <Scissors className="w-3.5 h-3.5 text-rose-600" />
                  Estilista / Empleado (Terminal POS & Métricas Propias)
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">ID de Conexión del Salón</div>
            <div className="font-mono text-xs break-all bg-gray-50 p-2.5 rounded-lg mt-1 border border-gray-200 text-gray-600">
              {user?.org || 'Modo Local / Autónomo'}
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
