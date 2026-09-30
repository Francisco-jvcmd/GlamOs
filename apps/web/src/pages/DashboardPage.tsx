import { useMemo } from 'react';
import { useAuth } from '../auth/auth-context';
import { PlusCircle, Package, Cake, TrendingUp, Users, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { formatCurrency } from '../lib/utils';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { docs: sales, loading: salesLoading } = useCollection('sales');
  const { docs: clients, loading: clientsLoading } = useCollection('clients');

  // Total ventas: usar final_total (columna del esquema SQL y RxDB)
  const totalSales = sales.reduce(
    (acc, sale) => acc + (sale.final_total || 0),
    0
  );

  // Cálculo de cumpleaños en tiempo real 100% local en Dexie (próximos 3 días)
  const upcomingBirthdays = useMemo(() => {
    if (!clients || clients.length === 0) return [];
    const today = new Date();

    return clients.filter((c) => {
      if (!c.birth_date || c.deleted_at) return false;

      // Usar split para evitar distorsiones de timezone en cadenas YYYY-MM-DD
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

  const firstName = user?.email?.split('@')[0] || 'Usuario';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting},{' '}
            <span className="bg-gradient-to-r from-[#C6426E] to-[#E8A87C] bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Resumen de tu salón</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#E8A87C] to-[#C6426E] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-rose-200/50">
          {firstName[0]?.toUpperCase()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Total Sales */}
        <div className="bg-gradient-to-br from-[#C6426E] to-[#E8A87C] rounded-2xl p-4 text-white shadow-lg shadow-rose-200/30 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-80 uppercase tracking-wide">
              Ventas Totales
            </span>
          </div>
          <div className="text-3xl font-bold">
            {salesLoading ? '...' : formatCurrency(totalSales)}
          </div>
        </div>

        {/* Sales Count */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {salesLoading ? '...' : sales.length}
          </div>
          <span className="text-xs text-gray-400">Ventas registradas</span>
        </div>

        {/* Clients */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-orange-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {clientsLoading ? '...' : clients.length}
          </div>
          <span className="text-xs text-gray-400">Clientes activos</span>
        </div>
      </div>

      {/* Birthdays Card */}
      {!clientsLoading && upcomingBirthdays.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
              <Cake className="w-4 h-4 text-pink-500" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">
              Cumpleaños Próximos
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
                <span className="text-sm font-medium text-gray-700">
                  {c.full_name}
                </span>
                <span className="text-xs bg-rose-50 text-rose-500 px-2 py-1 rounded-lg font-medium">
                  🎂 {c.birth_date}
                </span>
              </div>
            ))}
            {upcomingBirthdays.length > 3 && (
              <p className="text-xs text-gray-400 pt-1">
                +{upcomingBirthdays.length - 3} más
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/sales/new')}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#C6426E] to-[#E8A87C] text-white shadow-lg shadow-rose-200/30 hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-sm">Nueva Venta</span>
              <p className="text-xs opacity-80">Registrar venta</p>
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
              <p className="text-xs text-gray-400">Ajustar stock</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/clients')}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 text-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-sm">Clientes</span>
              <p className="text-xs text-gray-400">Gestionar clientes</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/sales')}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 text-gray-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-left">
              <span className="font-semibold text-sm">Historial</span>
              <p className="text-xs text-gray-400">Ver ventas</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
