import { useCollection } from '../hooks/useCollection';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { Search } from 'lucide-react';
import { Input } from '../components/ui/Input';

export function InventoryPage() {
  const { docs: products, loading } = useCollection('products');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar producto..." />
        </div>
      </div>

      {loading ? (
        <div>Cargando...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border">
          No hay productos en el inventario. Usa la API o admin para agregarlos.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <Card key={product.id} className="p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-4">SKU: {product.sku || 'N/A'}</p>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div className="font-medium">{formatCurrency(product.price)}</div>
                <Badge variant={product.current_stock <= product.min_stock_level ? 'warning' : 'success'}>
                  {product.current_stock} un.
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
