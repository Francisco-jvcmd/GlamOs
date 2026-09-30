import { useMemo } from 'react';
import { useAuth } from '../auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlusCircle, Package, Cake } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ¡Hola, {user?.email?.split('@')[0]}!
        </h1>
        <p className="text-gray-500">Resumen de tu salón</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Ventas Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {salesLoading ? '...' : formatCurrency(totalSales)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Ventas Registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {salesLoading ? '...' : sales.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1">
              <Cake className="w-4 h-4 text-rose-500" />
              Próximos Cumpleaños (3 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <div className="text-sm text-gray-400">Cargando...</div>
            ) : upcomingBirthdays.length > 0 ? (
              <div className="space-y-1">
                {upcomingBirthdays.slice(0, 3).map((c: any) => (
                  <div
                    key={c.id}
                    className="text-sm font-medium text-gray-800 flex justify-between"
                  >
                    <span>{c.full_name}</span>
                    <span className="text-xs text-rose-500 font-semibold">
                      🎂 {c.birth_date}
                    </span>
                  </div>
                ))}
                {upcomingBirthdays.length > 3 && (
                  <p className="text-xs text-gray-400">
                    +{upcomingBirthdays.length - 3} más
                  </p>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                No hay cumpleaños cercanos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          className="h-16 text-lg justify-start px-6 gap-4"
          onClick={() => navigate('/sales/new')}
        >
          <PlusCircle className="w-6 h-6" />
          Nueva Venta
        </Button>
        <Button
          variant="outline"
          className="h-16 text-lg justify-start px-6 gap-4"
          onClick={() => navigate('/inventory')}
        >
          <Package className="w-6 h-6" />
          Ajustar Inventario
        </Button>
      </div>
    </div>
  );
}
