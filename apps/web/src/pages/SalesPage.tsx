import { useCollection } from '../hooks/useCollection';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SalesPage() {
  const navigate = useNavigate();
  const { docs: sales, loading } = useCollection('sales', { sort: [{ created_at: 'desc' }] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        <Button onClick={() => navigate('/sales/new')} className="hidden md:flex gap-2">
          <PlusCircle className="w-4 h-4" />
          Nueva Venta
        </Button>
      </div>

      {loading ? (
        <div>Cargando...</div>
      ) : sales.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
          No hay ventas registradas
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map(sale => (
            <Card key={sale.id} className="p-4 flex items-center justify-between cursor-pointer hover:border-rose-200 transition-colors">
              <div>
                <div className="font-medium text-gray-900">{formatCurrency(sale.total_amount)}</div>
                <div className="text-sm text-gray-500">{formatDate(sale.created_at)}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={sale.status === 'COMPLETED' ? 'success' : 'destructive'}>
                  {sale.status === 'COMPLETED' ? 'Completado' : 'Anulado'}
                </Badge>
                <div className="text-xs text-gray-400">{sale.payment_method}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
