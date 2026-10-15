import { useMemo } from 'react';
import { useAuth } from '../auth/auth-context';
import {
  PlusCircle,
  Package,
  Cake,
  TrendingUp,
  Users,
  Receipt,
  Scissors,
  Crown,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { formatCurrency } from '../lib/utils';
import { MetricCard } from '../components/ui/MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'OWNER_ADMIN';

  const { docs: sales, loading: salesLoading } = useCollection('sales');
  const { docs: clients, loading: clientsLoading } = useCollection('clients');

  // Filtro de ventas del día de hoy
  const todayStr = new Date().toISOString().split('T')[0];

  // Ventas del salón (solo para Admin)
  const totalSales = useMemo(() => {
    return sales.reduce((acc, sale) => acc + (sale.final_total || 0), 0);
  }, [sales]);

  // Ventas propias del empleado (filtradas por user.sub)
  const mySales = useMemo(() => {
    return sales.filter((s) => s.employee_id === user?.sub || s.employee_id === user?.email);
  }, [sales, user]);

  const myTodaySales = useMemo(() => {
    return mySales.filter((s) => s.created_at?.startsWith(todayStr));
  }, [mySales, todayStr]);

  const myTodayTotal = useMemo(() => {
    return myTodaySales.reduce((acc, sale) => acc + (sale.final_total || 0), 0);
  }, [myTodaySales]);

  const myTodayTips = useMemo(() => {
    return myTodaySales.reduce((acc, sale) => acc + (sale.tip_amount || 0), 0);
  }, [myTodaySales]);

  // Cumpleaños próximos (solo para Admin o equipo)
  const upcomingBirthdays = useMemo(() => {
    if (!clients || clients.length === 0) return [];
    const today = new Date();

    return clients.filter((c) => {
      if (!c.birth_date || c.deleted_at) return false;
      const parts = c.birth_date.split('-');
      if (parts.length < 3) return false;
      const bMonth = parseInt(parts[1], 10);
      const bDay = parseInt(parts[2], 10);

      for (let i = 0; i <= 3; i++) {
        const target = new Date();
        target.setDate(today.getDate() + i);
        if (target.getMonth() + 1 === bMonth && target.getDate() === bDay) {
          return true;
        }
      }
      return false;
    });
  }, [clients]);

  const firstName = user?.email?.split('@')[0] || 'Estilista';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-7 max-w-6xl mx-auto select-none">
      {/* ── EDITORIAL GREETING & AMBIENT PROFILE ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant={isAdmin ? 'gold' : 'glam'} dot>
              {isAdmin ? <Crown className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5" />}
              {isAdmin ? 'Dueña / Administradora General' : 'Estilista Profesional'}
            </Badge>
            <span className="text-neutral-600 text-xs hidden sm:inline">·</span>
            <span className="text-[11px] font-semibold text-neutral-400 hidden sm:inline uppercase tracking-wider">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-editorial text-white tracking-tight leading-tight">
            {greeting},{' '}
            <span className="text-gradient-glam italic">
              {firstName}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 font-normal">
            {isAdmin
              ? 'Resumen ejecutivo de recaudación, flujo de caja y cartera VIP.'
              : 'Terminal de cobro inmediato, tus comisiones y métricas de la jornada.'}
          </p>
        </div>

        {/* Quick Action Button in Header */}
        <div className="shrink-0">
          <Button
            onClick={() => navigate('/sales/new')}
            variant="glam"
            size="default"
            className="w-full sm:w-auto shadow-md"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            <span>Cobrar Servicio / Venta</span>
          </Button>
        </div>
      </div>

      {/* ── DASHBOARD PARA ESTILISTA / EMPLEADO ──────────────────────────── */}
      {!isAdmin ? (
        <div className="space-y-6">
          {/* Métricas del Estilista (Hero Card + Glass Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Mis Ventas de Hoy"
              value={salesLoading ? '...' : formatCurrency(myTodayTotal)}
              subtitle={`${myTodaySales.length} servicios facturados hoy`}
              icon={<TrendingUp className="w-4 h-4" />}
              variant="hero"
            />

            <MetricCard
              label="Servicios Realizados"
              value={myTodaySales.length}
              subtitle="Jornada activa en salón"
              icon={<Scissors className="w-4 h-4" />}
              variant="glass"
            />

            <MetricCard
              label="Propinas de Hoy"
              value={formatCurrency(myTodayTips)}
              subtitle="Fondo voluntario acumulado"
              icon={<Sparkles className="w-4 h-4" />}
              variant="gold"
            />
          </div>

          {/* Banner de Cobro Rápido con Alta Joyería */}
          <div
            onClick={() => navigate('/sales/new')}
            className="p-6 rounded-3xl bg-neutral-900/80 text-white border border-amber-400/30 shadow-xl shadow-black/40 hover:border-amber-400/60 transition-all duration-300 cursor-pointer flex items-center justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 flex items-center justify-center shrink-0 shadow-lg shadow-black/30 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-amber-200 transition-colors">
                    Terminal de Nueva Venta & Cobro
                  </span>
                  <Badge variant="gold" className="hidden sm:inline-flex">0ms Latencia</Badge>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Selecciona cliente VIP, añade servicios de corte o balayage, productos y emite el recibo.
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-amber-200 group-hover:translate-x-1 group-hover:bg-white/20 transition-all shrink-0 ml-3">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          {/* Mis Servicios Recientes */}
          <Card variant="glass">
            <CardHeader className="pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mis Servicios Recientes</CardTitle>
                  <p className="text-xs text-neutral-400 mt-0.5">Últimos cobros registrados por tu usuario</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/sales')}
                >
                  Ver Todo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {mySales.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 space-y-2">
                  <Scissors className="w-8 h-8 mx-auto text-amber-400/50 stroke-1" />
                  <p className="text-xs font-semibold text-neutral-300">Aún no has registrado servicios hoy</p>
                  <p className="text-[11px] text-neutral-500">Pulsa en "Cobrar Servicio" para registrar tu primera venta.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mySales.slice(0, 5).map((sale) => (
                    <div
                      key={sale.id}
                      onClick={() => navigate('/sales')}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-amber-400/40 hover:bg-white/[0.06] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20 flex items-center justify-center font-bold text-xs shrink-0">
                          #{sale.id.slice(0, 4)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white group-hover:text-amber-200">
                            Ticket #{sale.id.slice(0, 8).toUpperCase()}
                          </div>
                          <span className="text-[10px] text-neutral-400 block mt-0.5">
                            {sale.created_at?.slice(0, 10)} · {sale.payment_method}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-editorial text-base font-extrabold text-white block">
                          {formatCurrency(sale.final_total)}
                        </span>
                        <span className="text-[10px] font-bold text-amber-400 uppercase">
                          {sale.payment_method}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── DASHBOARD PARA ADMINISTRADOR / DUEÑA ─────────────────────────── */
        <div className="space-y-6">
          {/* Métricas Principales Admin (Cohesive Smoked Glass Trio) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Ventas del Salón"
              value={salesLoading ? '...' : formatCurrency(totalSales)}
              subtitle={`${sales.length} ventas consolidadas en caja`}
              icon={<TrendingUp className="w-4 h-4" />}
              variant="hero"
            />

            <MetricCard
              label="Tickets Emitidos"
              value={salesLoading ? '...' : sales.length}
              subtitle="Transacciones completadas"
              icon={<Receipt className="w-4 h-4" />}
              variant="glass"
            />

            <MetricCard
              label="Clientes VIP en Cartera"
              value={clientsLoading ? '...' : clients.length}
              subtitle="Fichas activas registradas"
              icon={<Users className="w-4 h-4" />}
              variant="gold"
            />
          </div>

          {/* Alerta de Cumpleaños VIP de Alta Joyería */}
          {!clientsLoading && upcomingBirthdays.length > 0 && (
            <Card variant="glass" className="border-amber-400/25 bg-gradient-to-r from-amber-950/20 via-neutral-900/80 to-neutral-950 shadow-lg">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
                    <Cake className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-editorial text-lg font-bold text-white">
                        Cumpleaños VIP (Próximos 3 días)
                      </h3>
                      <Badge variant="glam">{upcomingBirthdays.length}</Badge>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Felicita a tus clientas por WhatsApp y ofréceles una cortesía especial.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {upcomingBirthdays.slice(0, 3).map((c: any) => (
                    <div
                      key={c.id}
                      onClick={() => navigate('/clients')}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 shadow-xs text-xs flex items-center gap-2 cursor-pointer hover:border-amber-400/40 transition-colors"
                    >
                      <span className="font-bold text-neutral-200">{c.full_name}</span>
                      <span className="text-[10px] text-amber-300 font-bold bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                        🎂 {c.birth_date}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Módulos de Gestión de Alta Gama (4 Cards Interactivas) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-interface">
                Módulos de Gestión & Operaciones
              </h2>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Acceso Total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: POS Terminal (Signature Champagne Gold Highlight) */}
              <div
                onClick={() => navigate('/sales/new')}
                className="p-5 rounded-3xl bg-gradient-to-br from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 shadow-[0_10px_30px_rgba(212,175,55,0.25)] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-950/20 flex items-center justify-center text-neutral-950 backdrop-blur-md">
                    <PlusCircle className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="mt-6">
                  <h3 className="font-editorial text-xl font-bold text-neutral-950 tracking-tight">
                    Nueva Venta
                  </h3>
                  <p className="text-xs text-neutral-900/80 font-medium mt-0.5">Terminal POS y cobro rápido</p>
                </div>
              </div>

              {/* Card 2: Finanzas */}
              <div
                onClick={() => navigate('/finance')}
                className="p-5 rounded-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/[0.08] shadow-lg hover:border-amber-400/40 hover:bg-neutral-900/90 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06] text-amber-300 flex items-center justify-center border border-white/10 group-hover:border-amber-400/30">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="mt-6">
                  <h3 className="font-editorial text-xl font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                    Finanzas & P&L
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Gastos fijos, margen y utilidad</p>
                </div>
              </div>

              {/* Card 3: Servicios */}
              <div
                onClick={() => navigate('/services')}
                className="p-5 rounded-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/[0.08] shadow-lg hover:border-amber-400/40 hover:bg-neutral-900/90 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06] text-amber-300 flex items-center justify-center border border-white/10 group-hover:border-amber-400/30">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="mt-6">
                  <h3 className="font-editorial text-xl font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                    Servicios
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Menú de cortes, tintes y spa</p>
                </div>
              </div>

              {/* Card 4: Inventario */}
              <div
                onClick={() => navigate('/inventory')}
                className="p-5 rounded-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/[0.08] shadow-lg hover:border-amber-400/40 hover:bg-neutral-900/90 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06] text-amber-300 flex items-center justify-center border border-white/10 group-hover:border-amber-400/30">
                    <Package className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="mt-6">
                  <h3 className="font-editorial text-xl font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                    Inventario & Stock
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Cosméticos y control de insumos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
