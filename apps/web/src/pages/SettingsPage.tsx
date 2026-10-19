import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { LogOut, Store, KeyRound, Copy, Check, Users, Crown, Scissors, ShieldCheck, RefreshCw } from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, unlinkOrganization } = useAuth();
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
    <div className="space-y-6 max-w-2xl mx-auto select-none pb-24">
      <PageHeader
        title="Configuración del Salón"
        subtitle="Gestión de cuenta, credenciales, equipo y accesos al sistema."
        badge="Preferencias & Seguridad"
        badgeVariant="gold"
      />

      {/* Tarjeta de Código de Invitación para Empleados (SOLO ADMIN) */}
      {isAdmin && (
        <Card variant="glass" className="border-amber-400/30 bg-neutral-900/60 shadow-lg">
          <CardHeader className="pb-3 border-b border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F5E5C4] to-[#D4AF37] text-neutral-950 flex items-center justify-center shadow-xs font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Código de Conexión del Equipo</CardTitle>
                  <p className="text-xs text-neutral-400 mt-0.5">Acceso exclusivo para tus estilistas</p>
                </div>
              </div>
              <Badge variant="gold" dot>Activo</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              Tus estilistas y empleados deben ingresar este código al iniciar sesión en su dispositivo para vincularse de forma segura a tu salón:
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-950/80 border border-amber-400/30 shadow-inner">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#F5E5C4] tracking-wider block">
                  Código de Enlace VIP
                </span>
                <span className="font-mono text-2xl font-black text-white tracking-widest break-all">
                  {localJoinCode}
                </span>
              </div>
              <Button
                onClick={copyCode}
                variant="gold"
                size="sm"
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                {copied ? '¡Copiado!' : 'Copiar Código'}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Los empleados con este enlace solo pueden facturar y ver sus métricas propias.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información de la Cuenta */}
      <Card variant="glass">
        <CardHeader className="pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-800/80 text-[#F5E5C4] flex items-center justify-center border border-white/10">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Perfil & Organización</CardTitle>
              <p className="text-xs text-neutral-400 mt-0.5">Ficha de salón y permisos vigentes</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
            <div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Salón / Negocio</div>
              <div className="font-editorial text-xl font-bold text-white mt-0.5">{salonName}</div>
            </div>
            <Badge variant={isAdmin ? 'gold' : 'glam'} dot>
              {isAdmin ? 'Dueña / Admin' : 'Estilista'}
            </Badge>
          </div>

          <div className="pb-3.5 border-b border-white/[0.08]">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Correo Electrónico</div>
            <div className="font-semibold text-white text-sm mt-0.5">{user?.email}</div>
          </div>

          <div className="pb-3.5 border-b border-white/[0.08]">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">Rol Asignado en GlamOS</div>
            <div className="mt-1.5">
              {isAdmin ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-950/40 text-[#F5E5C4] border border-amber-400/30">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Administrador General (Acceso Total: Finanzas, Inventario, Reportes)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-800 text-neutral-200 border border-white/10">
                  <Scissors className="w-4 h-4 text-neutral-300 shrink-0" />
                  <span>Estilista / Colaborador (Terminal POS & Métricas Propias)</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">ID de Conexión del Salón</div>
            <div className="font-mono text-xs break-all bg-neutral-900/90 p-3 rounded-2xl mt-1.5 border border-white/10 text-neutral-300 shadow-inner">
              {user?.org || 'Modo Local / Autónomo (Offline-First)'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          className="w-full sm:w-auto border-amber-400/30 text-[#F5E5C4] hover:bg-white/[0.06]"
          onClick={() => {
            unlinkOrganization();
            navigate('/onboarding');
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2 text-amber-400" />
          Cambiar de Salón o Vincular Código
        </Button>

        <Button
          variant="destructive"
          className="w-full sm:w-auto"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión Segura
        </Button>
      </div>
    </div>
  );
}
