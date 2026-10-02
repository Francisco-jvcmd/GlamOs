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
  DollarSign,
  Crown,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { formatCurrency } from '../lib/utils';

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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isAdmin
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              {isAdmin ? <Crown className="w-3 h-3" /> : <Scissors className="w-3 h-3" />}
              {isAdmin ? 'Dueño / Administrador' : 'Estilista / Colaborador'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {greeting},{' '}
            <span
              className="font-serif italic font-bold bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] bg-clip-text text-transparent"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {firstName}
            </span>
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {isAdmin ? 'Control general y finanzas de tu salón' : 'Panel de facturación rápida y tus métricas'}
          </p>
        </div>

        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F6D365] via-[#FDA085] to-[#E11D48] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-rose-200/50">
          {firstName[0]?.toUpperCase()}
        </div>
      </div>

      {/* DASHBOARD PARA ESTILISTA / EMPLEADO */}
      {!isAdmin ? (
        <div className="space-y-6">
          {/* Métricas del Estilista */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-[#FDA085] to-[#E11D48] rounded-2xl p-5 text-white shadow-lg shadow-rose-200/40">
              <span className="text-xs uppercase font-bold tracking-wider opacity-85 block mb-1">
                Mis Ventas de Hoy
              </span>
              <div className="text-3xl font-black font-mono">
                {salesLoading ? '...' : formatCurrency(myTodayTotal)}
              </div>
              <span className="text-[11px] opacity-80 mt-1 block">
                {myTodaySales.length} servicios facturados hoy
              </span>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-xs text-gray-400 uppercase font-semibold block mb-1">
                  Servicios Realizados
                </span>
                <div className="text-2xl font-bold text-gray-900 font-mono">
                  {myTodaySales.length}
                </div>
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">Jornada activa</span>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-xs text-gray-400 uppercase font-semibold block mb-1">
                  Propinas de Hoy
                </span>
                <div className="text-2xl font-bold text-amber-600 font-mono">
                  {formatCurrency(myTodayTips)}
                </div>
              </div>
              <span className="text-[11px] text-gray-400">Total acumulado</span>
            </div>
          </div>

          {/* Botón Principal para Empleado: Facturar Servicio */}
          <button
            onClick={() => navigate('/sales/new')}
            className="w-full p-5 rounded-2xl bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white shadow-xl hover:shadow-2xl transition-all duration-200 flex items-center justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <PlusCircle className="w-7 h-7" />
              </div>
              <div className="text-left">
                <span className="font-bold text-lg block">Nueva Venta / Cobro de Servicio</span>
                <p className="text-xs opacity-90">Selecciona cliente, servicio o producto y emite el recibo</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform mr-2" />
          </button>

          {/* Mis ventas recientes */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Mis Servicios Recientes</h3>
            {mySales.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                Aún no has registrado ventas. Toca en "Nueva Venta" para comenzar.
              </p>
            ) : (
              <div className="space-y-2">
                {mySales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 border border-gray-100 text-xs"
                  >
                    <div>
                      <span className="font-bold text-gray-800">Venta #{sale.id.slice(0, 8)}</span>
                      <span className="text-[11px] text-gray-400 block">{sale.created_at?.slice(0, 10)}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-gray-900 block">
                        {formatCurrency(sale.final_total)}
                      </span>
                      <span className="text-[10px] text-rose-600 font-semibold uppercase">{sale.payment_method}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DASHBOARD PARA ADMINISTRADOR / DUEÑO */
        <div className="space-y-6">
          {/* Stats Cards Admin */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Total Sales */}
            <div className="bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#047857] rounded-2xl p-4 text-white shadow-lg col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 opacity-80" />
                <span className="text-xs font-bold opacity-90 uppercase tracking-wider">
                  Ventas del Salón
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono">
                {salesLoading ? '...' : formatCurrency(totalSales)}
              </div>
              <span className="text-[11px] opacity-80 mt-1 block">
                {sales.length} ventas consolidadas
              </span>
            </div>

            {/* Sales Count */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-rose-500" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 font-mono">
                {salesLoading ? '...' : sales.length}
              </div>
              <span className="text-xs text-gray-400">Tickets registrados</span>
            </div>

            {/* Clients */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-amber-500" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 font-mono">
                {clientsLoading ? '...' : clients.length}
              </div>
              <span className="text-xs text-gray-400">Clientes en cartera</span>
            </div>
          </div>

          {/* Cumpleaños próximos */}
          {!clientsLoading && upcomingBirthdays.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
                  <Cake className="w-4 h-4 text-pink-500" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">
                  Cumpleaños de Clientes (Próximos 3 días)
                </h3>
                <span className="ml-auto text-xs bg-pink-50 text-pink-600 px-2 py-0.5 rounded-full font-medium">
                  {upcomingBirthdays.length}
                </span>
              </div>
              <div className="space-y-2">
                {upcomingBirthdays.slice(0, 3).map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm font-medium text-gray-700">{c.full_name}</span>
                    <span className="text-xs bg-rose-50 text-rose-500 px-2 py-1 rounded-lg font-medium">
                      🎂 {c.birth_date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones Rápidas Admin */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Módulos de Gestión
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/sales/new')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white shadow-lg shadow-rose-200/30 hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-sm">Nueva Venta</span>
                  <p className="text-xs opacity-80">Terminal POS</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/finance')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-amber-200/70 text-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-sm">Finanzas & P&L</span>
                  <p className="text-xs text-gray-400">Gastos y ganancias</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/services')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 text-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-sm">Servicios</span>
                  <p className="text-xs text-gray-400">Catálogo y precios</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/inventory')}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 text-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Package className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-sm">Inventario</span>
                  <p className="text-xs text-gray-400">Stock y costos</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
