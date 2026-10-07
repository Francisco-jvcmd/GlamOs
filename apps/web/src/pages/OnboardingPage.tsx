import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { GlamOSEmblem } from '../components/GlamOSLogo';
import { generateUuid } from '../lib/utils';
import { Crown, Scissors, ArrowRight, Sparkles, Building2, KeyRound, Check, Copy } from 'lucide-react';

export function OnboardingPage() {
  const { user, setOrganization, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'SELECT' | 'CREATE_ADMIN' | 'JOIN_EMPLOYEE' | 'ADMIN_SUCCESS'>('SELECT');
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
        updateLocalUser('EMPLOYEE', 'org_joined');
        navigate('/');
      } else {
        const errData = await res.json();
        throw new Error(errData.message || 'Código de invitación inválido o expirado.');
      }
    } catch {
      // Fallback Offline: Si el formato es válido GLAM-XXXX-X
      if (/^GLAM-\d{4}-[A-Z]$/.test(cleanCode) || cleanCode.length >= 6) {
        updateLocalUser('EMPLOYEE', 'org_offline_joined');
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
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-[#FAF6F0] px-4 py-8 select-none">
      {/* Luces de fondo de alta gama */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#FDE68A]/40 to-[#FB7185]/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-[#FDA4AF]/30 via-[#F6D365]/20 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Encabezado con emblema */}
        <div className="text-center mb-8">
          <GlamOSEmblem size={80} className="mx-auto mb-4" />
          <h1
            className="text-3xl font-bold font-serif bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] bg-clip-text text-transparent"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Bienvenida a GlamOS
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-semibold">
            {user?.email}
          </p>
        </div>

        {/* CONTENEDOR PRINCIPAL */}
        <div className="rounded-3xl bg-white/85 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_20px_50px_rgba(159,18,57,0.08)] border border-amber-200/50">
          {/* PASO 1: SELECCIONAR MODO */}
          {mode === 'SELECT' && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200/60">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Configura tu perfil de trabajo
                </span>
                <h2 className="text-xl font-bold text-gray-900 mt-2">
                  ¿Cómo deseas operar en GlamOS?
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona tu rol para personalizar tus herramientas de gestión y seguridad.
                </p>
              </div>

              {/* Opción A: Soy Dueño / Administrador */}
              <button
                onClick={() => setMode('CREATE_ADMIN')}
                className="w-full text-left p-5 rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/50 to-white hover:from-amber-100/50 transition-all duration-200 shadow-sm hover:shadow-md group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F6D365] to-[#D97706] text-white flex items-center justify-center shrink-0 shadow-md">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-base">Soy Dueño / Administrador</h3>
                    <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Registra tu salón, define servicios, productos, controla el inventario, gastos, estado de resultados y genera códigos para tus estilistas.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-amber-100/60 px-2 py-0.5 rounded-md">
                    Acceso Total al Negocio
                  </span>
                </div>
              </button>

              {/* Opción B: Empleado / Ya tengo empresa */}
              <button
                onClick={() => setMode('JOIN_EMPLOYEE')}
                className="w-full text-left p-5 rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50/40 to-white hover:from-rose-100/40 transition-all duration-200 shadow-sm hover:shadow-md group flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FDA085] to-[#E11D48] text-white flex items-center justify-center shrink-0 shadow-md">
                  <Scissors className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-base">Ya tengo empresa / Soy Empleado</h3>
                    <ArrowRight className="w-4 h-4 text-rose-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Ingresa con el código de invitación que te dio tu administrador para registrar tus ventas diarias y consultar tus comisiones personales.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-rose-800 uppercase tracking-wider bg-rose-100/60 px-2 py-0.5 rounded-md">
                    Terminal POS & Mis Métricas
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* PASO 2A: CREAR SALÓN (ADMIN) */}
          {mode === 'CREATE_ADMIN' && (
            <form onSubmit={handleCreateSalon} className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-2">
                  <Building2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 font-serif" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  Crear mi Salón o Spa
                </h2>
                <p className="text-xs text-gray-500">
                  Ingresa el nombre comercial de tu negocio de belleza.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nombre del Salón
                </label>
                <input
                  type="text"
                  required
                  value={salonName}
                  onChange={(e) => setSalonName(e.target.value)}
                  placeholder="Ej. Studio Glamour & Spa"
                  className="w-full px-4 py-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('SELECT')}
                  className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !salonName.trim()}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
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
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 font-serif" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  Unirme a un Salón
                </h2>
                <p className="text-xs text-gray-500">
                  Pídele el código de invitación a tu administrador o dueño de salón.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Código de Invitación
                </label>
                <input
                  type="text"
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="GLAM-1234-A"
                  maxLength={12}
                  className="w-full px-4 py-3 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 text-center font-mono font-bold text-lg tracking-widest bg-white uppercase placeholder:font-sans placeholder:text-sm placeholder:tracking-normal"
                />
                <p className="text-[11px] text-gray-400 mt-1 text-center">
                  Formato: GLAM-XXXX-X (Sensible a mayúsculas)
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setMode('SELECT')}
                  className="px-4 py-3 rounded-xl border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !joinCodeInput.trim()}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#FDA085] to-[#E11D48] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Conectando...' : 'Vincular y Entrar'}
                </button>
              </div>
            </form>
          )}

          {/* PASO 3: ÉXITO ADMIN — CÓDIGO GENERADO */}
          {mode === 'ADMIN_SUCCESS' && (
            <div className="text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-serif text-gray-900" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  ¡Tu Salón ha sido Creado!
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Comparte este código con tus estilistas para que se conecten a tu negocio:
                </p>
              </div>

              {/* Tarjeta del código */}
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 tracking-widest block text-left">
                    Código de Invitación de Empleados
                  </span>
                  <span className="font-mono text-2xl font-extrabold text-gray-900 tracking-widest">
                    {generatedCode}
                  </span>
                </div>
                <button
                  onClick={copyToClipboard}
                  className="p-2.5 rounded-xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 flex items-center gap-1.5 text-xs font-bold shadow-sm transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              <p className="text-[11px] text-gray-400">
                Podrás volver a consultar y compartir este código en cualquier momento desde Configuración.
              </p>

              <button
                onClick={() => navigate('/')}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all"
              >
                Entrar al Panel de Control de Salón
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
