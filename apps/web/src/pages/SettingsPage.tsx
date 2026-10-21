import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { LogOut, Store, KeyRound, Copy, Check, Users, Crown, Scissors, ShieldCheck, RefreshCw, User, Sparkles, Cpu, ExternalLink, Eye, EyeOff, AlertCircle, Zap } from 'lucide-react';
import { getStoredGeminiApiKey, saveStoredGeminiApiKey } from '../lib/gemini';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, unlinkOrganization } = useAuth();
  const [copied, setCopied] = useState(false);

  const defaultInitialName = useMemo(() => {
    if (user?.email) {
      const stored = localStorage.getItem(`glamos_user_name_${user.email}`);
      if (stored) return stored;
      const part = user.email.split('@')[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return localStorage.getItem('glamos_user_display_name') || 'José';
  }, [user]);

  const [displayName, setDisplayName] = useState(defaultInitialName);
  const [nameSaved, setNameSaved] = useState(false);

  const handleSaveName = () => {
    const clean = displayName.trim();
    if (!clean) return;
    if (user?.email) {
      localStorage.setItem(`glamos_user_name_${user.email}`, clean);
    }
    localStorage.setItem('glamos_user_display_name', clean);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  };

  // Google Gemini API Key (100% Gratis)
  const [geminiApiKey, setGeminiApiKey] = useState(() => getStoredGeminiApiKey());
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiKeySaved, setGeminiKeySaved] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [geminiStatusMsg, setGeminiStatusMsg] = useState('');

  const handleSaveGeminiKey = () => {
    saveStoredGeminiApiKey(geminiApiKey);
    setGeminiKeySaved(true);
    setGeminiStatus('idle');
    setTimeout(() => setGeminiKeySaved(false), 2500);
  };

  const handleTestGeminiKey = async () => {
    const keyToTest = geminiApiKey.trim();
    if (!keyToTest) return;
    setTestingGemini(true);
    setGeminiStatus('idle');
    setGeminiStatusMsg('');

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${keyToTest}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hola' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      if (res.ok) {
        saveStoredGeminiApiKey(keyToTest);
        setGeminiStatus('success');
        setGeminiStatusMsg('¡Conexión verificada! Google Gemini 2.0 Flash está activo y listo.');
      } else {
        const errorData = await res.json().catch(() => ({}));
        setGeminiStatus('error');
        setGeminiStatusMsg(errorData.error?.message || 'Error al validar la clave con Google. Revisa que esté bien copiada.');
      }
    } catch (err: any) {
      setGeminiStatus('error');
      setGeminiStatusMsg(err?.message || 'No se pudo conectar con Google. Revisa tu conexión a internet.');
    } finally {
      setTestingGemini(false);
    }
  };

  const handleRemoveGeminiKey = () => {
    setGeminiApiKey('');
    saveStoredGeminiApiKey('');
    setGeminiStatus('idle');
  };

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

      {/* Inteligencia Artificial · Google AI Studio (Gemini - 100% Gratis) */}
      <Card variant="glass" className="border-amber-400/30 bg-neutral-900/60 shadow-lg">
        <CardHeader className="pb-3 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400/20 to-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-400/30 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Google AI Studio (Gemini 2.0)</CardTitle>
                <p className="text-xs text-neutral-400 mt-0.5">Motor de Visión Biometría y Diseño de Uñas IA (100% Gratis de por vida)</p>
              </div>
            </div>
            <Badge variant={geminiApiKey.trim() ? 'gold' : 'outline'} dot>
              {geminiApiKey.trim() ? 'Conectado' : 'Sin Configurar'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-400/20 text-xs text-neutral-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#F5E5C4]">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>¿Por qué es 100% gratis?</span>
            </div>
            <p className="leading-relaxed">
              Google AI Studio ofrece un nivel <strong>completamente gratuito</strong> de hasta <strong>1,500 peticiones diarias</strong> (15 por minuto) del modelo <code>gemini-2.0-flash</code>. 
              <strong> No requiere ingresar tarjeta de crédito</strong> ni realizar pagos.
            </p>
            <div className="pt-1">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 underline font-semibold text-xs transition-colors"
              >
                <span>Obtener mi Clave de API Gratis en Google AI Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                Clave de API de Google (Google AI Studio Key)
              </label>
              {geminiKeySaved && (
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" /> Guardada en este dispositivo
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => {
                    setGeminiApiKey(e.target.value);
                    setGeminiStatus('idle');
                    setGeminiKeySaved(false);
                  }}
                  placeholder="Pega aquí tu clave: AIzaSy..."
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white font-mono text-xs placeholder:text-neutral-600 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Button
                variant="gold"
                size="sm"
                onClick={handleSaveGeminiKey}
                disabled={!geminiApiKey.trim()}
              >
                Guardar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTestGeminiKey}
                disabled={!geminiApiKey.trim() || testingGemini}
                className="border-amber-400/30 text-amber-300 hover:bg-amber-400/10"
              >
                {testingGemini ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
                {testingGemini ? 'Probando...' : 'Probar'}
              </Button>
            </div>
          </div>

          {/* Feedback de Estado de Conexión */}
          {geminiStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{geminiStatusMsg}</span>
            </div>
          )}

          {geminiStatus === 'error' && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Error de conexión con Google:</span>
                <span className="text-neutral-300 block">{geminiStatusMsg}</span>
              </div>
            </div>
          )}

          {geminiApiKey.trim() && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleRemoveGeminiKey}
                className="text-[11px] text-neutral-500 hover:text-rose-400 underline transition-colors"
              >
                Eliminar clave guardada
              </button>
            </div>
          )}
        </CardContent>
      </Card>

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

          {/* Nombre Personalizado para Tickets y Comprobantes */}
          <div className="pb-3.5 border-b border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold">
                Nombre del Profesional / Emisor del Ticket
              </div>
              {nameSaved && (
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" /> Guardado
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setNameSaved(false);
                  }}
                  placeholder="Ej. José, Carolina, Andrea..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-neutral-900/90 border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/40"
                />
              </div>
              <Button
                onClick={handleSaveName}
                variant="gold"
                size="sm"
                disabled={!displayName.trim()}
              >
                Guardar
              </Button>
            </div>
            <p className="text-[11px] text-neutral-400">
              Este nombre se imprimirá como <strong>"Atendido por: {displayName || 'Tu Nombre'}"</strong> en cada ticket y comprobante de venta.
            </p>
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
