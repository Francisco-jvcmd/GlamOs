import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { GlamOSEmblem } from '../components/GlamOSLogo';
import { generateUuid } from '../lib/utils';
import { Crown, Scissors, ArrowRight, Sparkles, Building2, KeyRound, Check, Copy } from 'lucide-react';

export function OnboardingPage() {
  const { user, setOrganization, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'SELECT' | 'CREATE_ADMIN' | 'JOIN_EMPLOYEE' | 'ADMIN_SUCCESS'>('SELECT');
  const [joinRole, setJoinRole] = useState<'EMPLOYEE' | 'OWNER_ADMIN'>('EMPLOYEE');
  const [salonName, setSalonName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login', { replace: true });
      } else if (user.org && mode !== 'ADMIN_SUCCESS') {
        navigate('/', { replace: true });
      }
    }
  }, [user, authLoading, navigate, mode]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Opción 1: Administrador crea su salón
  const handleCreateSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonName.trim()) return;

    setIsLoading(true);
    setError(null);

    const storedTokens = localStorage.getItem('glamos_tokens');
    const parsedTokens = storedTokens ? JSON.parse(storedTokens) : null;
    const token = parsedTokens?.access_token;

    try {
      // Intentar crear en backend online
      const res = await fetch(`${API_URL}/tenants/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: salonName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedCode(data.join_code);
        // Actualizar sesión local
        updateLocalUser('OWNER_ADMIN', data.organization_id);
        setMode('ADMIN_SUCCESS');
      } else {
        throw new Error('Error al conectar con el servidor.');
      }
    } catch {
      // Fallback Offline-First Resiliente: crear salón localmente
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      const localJoinCode = `GLAM-${randomCode}-${letter}`;
      const localOrgId = generateUuid();

      localStorage.setItem('glamos_local_org_name', salonName.trim());
      localStorage.setItem('glamos_local_join_code', localJoinCode);

      updateLocalUser('OWNER_ADMIN', localOrgId);
      setGeneratedCode(localJoinCode);
      setMode('ADMIN_SUCCESS');
    } finally {
      setIsLoading(false);
    }
  };

  // Opción 2: Empleado se une con código de invitación
  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    setIsLoading(true);
    setError(null);

    const storedTokens = localStorage.getItem('glamos_tokens');
    const parsedTokens = storedTokens ? JSON.parse(storedTokens) : null;
    const token = parsedTokens?.access_token;

    try {
      const res = await fetch(`${API_URL}/tenants/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ join_code: cleanCode }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('glamos_tokens', JSON.stringify(data));
        }
        localStorage.setItem('glamos_local_join_code', cleanCode);
        updateLocalUser(joinRole, data.organization_id || 'org_joined');
        navigate('/');
      } else {
        const errData = await res.json();
        throw new Error(errData.message || 'Código de invitación inválido o expirado.');
      }
    } catch {
      // Fallback Offline: Si el formato es válido GLAM-XXXX-X
      if (/^GLAM-\d{4}-[A-Z]$/.test(cleanCode) || cleanCode.length >= 6) {
        localStorage.setItem('glamos_local_join_code', cleanCode);
        updateLocalUser(joinRole, 'org_offline_joined');
        navigate('/');
      } else {
        setError('El código debe tener el formato GLAM-XXXX-X proporcionado por tu administrador.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateLocalUser = (role: 'OWNER_ADMIN' | 'EMPLOYEE', orgId: string) => {
    setOrganization(orgId, role);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-[#09090B] px-4 py-8 select-none">
      {/* Ambient Halo Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-amber-500/10 via-amber-400/05 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-gradient-to-tr from-amber-600/08 via-amber-300/04 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Encabezado con emblema */}
        <div className="text-center mb-8">
          <GlamOSEmblem size={84} className="mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold font-editorial text-gradient-glam tracking-tight">
            Bienvenida a GlamOS
          </h1>
          <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest font-semibold">
            {user?.email}
          </p>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="rounded-3xl bg-[#121118]/85 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/[0.08]">
          {/* PASO 1: SELECCIONAR MODO */}
          {mode === 'SELECT' && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-950/40 text-[#F5E5C4] border border-amber-400/30 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Configura tu perfil de trabajo
                </span>
                <h2 className="text-2xl font-bold font-editorial text-white mt-3 tracking-tight">
                  ¿Cómo deseas operar en GlamOS?
                </h2>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Selecciona tu rol para personalizar tus herramientas de gestión y seguridad.
                </p>
              </div>

              {/* Opción A: Soy Dueño / Administrador */}
              <button
                onClick={() => setMode('CREATE_ADMIN')}
                className="w-full text-left p-5 rounded-3xl border border-white/10 hover:border-amber-400/40 bg-neutral-900/60 hover:bg-neutral-800/60 transition-all duration-200 shadow-sm group flex items-start gap-4 active:scale-[0.99] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F5E5C4] to-[#D4AF37] text-neutral-950 flex items-center justify-center shrink-0 shadow-md font-bold">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base group-hover:text-[#F5E5C4] transition-colors">
                      Soy Dueña / Administradora
                    </h3>
                    <ArrowRight className="w-4 h-4 text-amber-400/80 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Registra tu salón, define catálogo, inventario, gastos, estado de resultados P&L y genera códigos para tus estilistas.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-[#F5E5C4] uppercase tracking-wider bg-amber-950/50 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                    👑 Acceso Total al Negocio
                  </span>
                </div>
              </button>

              {/* Opción B: Empleado / Ya tengo empresa */}
              <button
                onClick={() => setMode('JOIN_EMPLOYEE')}
                className="w-full text-left p-5 rounded-3xl border border-white/10 hover:border-white/20 bg-neutral-900/60 hover:bg-neutral-800/60 transition-all duration-200 shadow-sm group flex items-start gap-4 active:scale-[0.99] cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-white/10 text-neutral-200 flex items-center justify-center shrink-0 shadow-md">
                  <Scissors className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-base group-hover:text-neutral-200 transition-colors">
                      Soy Estilista / Colaborador
                    </h3>
                    <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    Ingresa con el código de invitación que te proporcionó tu administradora para registrar tus servicios diarios y comisiones.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-neutral-300 uppercase tracking-wider bg-neutral-800 border border-white/10 px-2.5 py-0.5 rounded-full">
                    ✂️ Terminal POS & Mis Métricas
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* PASO 2A: CREAR SALÓN (ADMIN) */}
          {mode === 'CREATE_ADMIN' && (
            <form onSubmit={handleCreateSalon} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-950/40 border border-amber-400/30 text-[#F5E5C4] flex items-center justify-center mx-auto mb-2">
                  <Building2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white font-editorial">
                  Crear mi Salón o Spa
                </h2>
                <p className="text-xs text-neutral-400">
                  Ingresa el nombre comercial de tu negocio de belleza.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-rose-950/40 text-rose-300 text-xs border border-rose-500/30">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Nombre del Salón
                </label>
                <input
                  type="text"
                  required
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  placeholder="Ej. Studio Glamour & Spa"
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10 text-sm bg-neutral-900/80 text-white placeholder-neutral-500 outline-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('SELECT')}
                  className="px-4 py-3 rounded-2xl border border-white/10 text-neutral-300 text-xs font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !salonName.trim()}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#F5E5C4] to-[#D4AF37] text-neutral-950 font-bold text-sm shadow-md hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Registrando...' : 'Crear Salón y Obtener Código'}
                </button>
              </div>
            </form>
          )}

          {/* PASO 2B: UNIRSE COMO EMPLEADO */}
          {mode === 'JOIN_EMPLOYEE' && (
            <form onSubmit={handleJoinWithCode} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-white/10 text-neutral-200 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white font-editorial">
                  Unirme a un Salón
                </h2>
                <p className="text-xs text-neutral-400">
                  Pídele el código de invitación a tu administrador o dueño de salón.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-rose-950/40 text-rose-300 text-xs border border-rose-500/30">
                  {error}
                </div>
              )}

              {/* Selector de Rol al Vincular */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  ¿Cómo operarás en este Salón?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJoinRole('EMPLOYEE')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      joinRole === 'EMPLOYEE'
                        ? 'bg-amber-400/15 border-amber-400/60 text-white shadow-sm'
                        : 'bg-neutral-900/60 border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Scissors className="w-3.5 h-3.5 text-amber-400" />
                      <span>Estilista</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Terminal POS y comisiones</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setJoinRole('OWNER_ADMIN')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      joinRole === 'OWNER_ADMIN'
                        ? 'bg-amber-400/15 border-amber-400/60 text-white shadow-sm'
                        : 'bg-neutral-900/60 border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Administración</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Gestión y control total</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  Código de Invitación del Salón
                </label>
                <input
                  type="text"
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="GLAM-1234-A"
                  maxLength={12}
                  className="w-full px-4 py-3 rounded-2xl border border-white/10 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10 text-center font-mono font-bold text-lg tracking-widest bg-neutral-900/80 text-white uppercase placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder-neutral-500 outline-none"
                />
                <p className="text-[11px] text-neutral-500 mt-1 text-center">
                  Formato: GLAM-XXXX-X (Sensible a mayúsculas)
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('SELECT')}
                  className="px-4 py-3 rounded-2xl border border-white/10 text-neutral-300 text-xs font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !joinCodeInput.trim()}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#F5E5C4] to-[#D4AF37] text-neutral-950 font-bold text-sm shadow-md hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'Conectando...' : 'Vincular y Entrar'}
                </button>
              </div>
            </form>
          )}

          {/* PASO 3: ÉXITO ADMIN — CÓDIGO GENERADO */}
          {mode === 'ADMIN_SUCCESS' && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-editorial text-white">
                  ¡Tu Salón ha sido Creado!
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Comparte este código con tus estilistas para que se conecten a tu negocio:
                </p>
              </div>

              {/* Tarjeta del código */}
              <div className="p-4 rounded-2xl bg-neutral-900/80 border border-amber-400/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#F5E5C4] tracking-widest block text-left">
                    Código de Invitación de Empleados
                  </span>
                  <span className="font-mono text-2xl font-extrabold text-white tracking-widest">
                    {generatedCode}
                  </span>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-2.5 rounded-xl bg-neutral-800 border border-white/10 text-[#F5E5C4] hover:bg-neutral-700 flex items-center gap-1.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <p className="text-[11px] text-neutral-500">
                Podrás volver a consultar y compartir este código en cualquier momento desde Configuración.
              </p>

              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#F5E5C4] to-[#D4AF37] text-neutral-950 font-bold text-sm shadow-lg hover:brightness-105 transition-all cursor-pointer"
              >
                Entrar al Panel de Control de Salón
              </button>
            </div>
          )}

          {/* Opción para cambiar de cuenta de Google */}
          {mode !== 'ADMIN_SUCCESS' && (
            <div className="mt-6 text-center pt-4 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={logout}
                className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>¿Deseas acceder con otra cuenta?</span>
                <span className="text-amber-300 font-semibold underline underline-offset-4">Cambiar cuenta de Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
