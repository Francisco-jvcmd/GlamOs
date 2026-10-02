import { useState } from 'react';
import { useCollection } from '../hooks/useCollection';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../auth/auth-context';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../lib/utils';
import { Package, Search, Plus, PlusCircle, MinusCircle, AlertTriangle, Edit2, Trash2 } from 'lucide-react';

export function InventoryPage() {
  const { user } = useAuth();
  const db = useDatabase();
  const { docs: products, loading } = useCollection('products');

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [minStockAlert, setMinStockAlert] = useState('5');

  const filteredProducts = products.filter((p: any) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleOpenModal = (product?: any) => {
    if (product) {
      setEditingProductId(product.id);
      setName(product.name);
      setSku(product.sku || '');
      setUnitCost((product.unit_cost || 0).toString());
      setUnitPrice((product.unit_price || 0).toString());
      setCurrentStock((product.current_stock || 0).toString());
      setMinStockAlert((product.min_stock_alert || 5).toString());
    } else {
      setEditingProductId(null);
      setName('');
      setSku('');
      setUnitCost('');
      setUnitPrice('');
      setCurrentStock('10');
      setMinStockAlert('5');
    }
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unitPrice || !db) return;

    const orgId = user?.org || 'default_org';
    const now = new Date().toISOString();

    try {
      if (editingProductId) {
        const doc = await db.products.findOne(editingProductId).exec();
        if (doc) {
          await doc.patch({
            name: name.trim(),
            sku: sku.trim() || null,
            unit_cost: parseFloat(unitCost) || 0,
            unit_price: parseFloat(unitPrice),
            current_stock: parseInt(currentStock, 10) || 0,
            min_stock_alert: parseInt(minStockAlert, 10) || 5,
            updated_at: now,
          });
        }
      } else {
        const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        await db.products.insert({
          id,
          organization_id: orgId,
          name: name.trim(),
          sku: sku.trim() || null,
          unit_cost: parseFloat(unitCost) || 0,
          unit_price: parseFloat(unitPrice),
          current_stock: parseInt(currentStock, 10) || 0,
          min_stock_alert: parseInt(minStockAlert, 10) || 5,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        // Registrar movimiento de stock inicial
        await db.stock_movements.insert({
          id: 'sm_' + Date.now(),
          organization_id: orgId,
          product_id: id,
          delta: parseInt(currentStock, 10) || 0,
          reason: 'PURCHASE',
          reference_id: null,
          created_at: now,
          updated_at: now,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error al guardar producto:', err);
      alert('Error al guardar el producto en el inventario.');
    }
  };

  const handleAdjustStock = async (product: any, delta: number) => {
    if (!db) return;
    const newStock = Math.max(0, (product.current_stock || 0) + delta);
    const now = new Date().toISOString();

    try {
      const doc = await db.products.findOne(product.id).exec();
      if (doc) {
        await doc.patch({
          current_stock: newStock,
          updated_at: now,
        });

        await db.stock_movements.insert({
          id: 'sm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
          organization_id: user?.org || 'default_org',
          product_id: product.id,
          delta,
          reason: 'MANUAL_ADJUST',
          reference_id: null,
          created_at: now,
          updated_at: now,
        });
      }
    } catch (err) {
      console.error('Error ajustando stock:', err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!db || !window.confirm('¿Deseas dar de baja este producto del inventario?')) return;
    try {
      const doc = await db.products.findOne(id).exec();
      if (doc) {
        await doc.patch({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error eliminando producto:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold font-serif text-gray-900"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Inventario & Stock
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Control de insumos, cosméticos profesionales y productos de reventa.
          </p>
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold text-xs shadow-md hover:shadow-lg flex items-center gap-2 px-5 py-2.5 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o código SKU..."
          className="pl-10 h-11 bg-white rounded-xl border-amber-200/60 text-sm focus:ring-amber-500"
        />
      </div>

      {/* Listado de Productos */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando inventario...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-14 bg-white/70 backdrop-blur-md rounded-2xl border border-amber-200/50 p-6">
          <Package className="w-12 h-12 text-amber-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base">No hay productos en inventario</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Registra los tintes, shampoos, aceites y tratamientos de tu salón para controlar stock y costos.
          </p>
          <Button
            onClick={() => handleOpenModal()}
            className="mt-4 bg-gradient-to-r from-[#F6D365] to-[#E11D48] text-white text-xs font-bold rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Registrar Primer Producto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product: any) => {
            const isLowStock = product.current_stock <= (product.min_stock_alert || 5);
            const unitPriceVal = product.unit_price || 0;
            const unitCostVal = product.unit_cost || 0;
            const margin = unitPriceVal - unitCostVal;

            return (
              <Card
                key={product.id}
                className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-amber-100/80 bg-white/80 backdrop-blur-sm rounded-2xl"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{product.name}</h3>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">SKU: {product.sku || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Precios & Margen */}
                  <div className="grid grid-cols-2 gap-2 mt-4 p-2.5 rounded-xl bg-gray-50/80 border border-gray-100 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">Costo Compra</span>
                      <span className="font-mono font-medium text-gray-700">{formatCurrency(unitCostVal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Precio Venta</span>
                      <span className="font-mono font-bold text-emerald-700">{formatCurrency(unitPriceVal)}</span>
                    </div>
                  </div>
                </div>

                {/* Stock Control */}
                <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">Stock:</span>
                    <Badge variant={isLowStock ? 'warning' : 'success'} className="font-mono text-xs">
                      {isLowStock && <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                      {product.current_stock} un.
                    </Badge>
                  </div>

                  {/* Quick +/- buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAdjustStock(product, -1)}
                      className="p-1 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
                      title="Restar 1 unidad"
                    >
                      <MinusCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAdjustStock(product, 1)}
                      className="p-1 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                      title="Sumar 1 unidad"
                    >
                      <PlusCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-amber-200/60 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-xl font-bold font-serif text-gray-900"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {editingProductId ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Producto *
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Tratamiento Capilar Olaplex No. 3"
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Código SKU / Barras
                </label>
                <Input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="OLA-003"
                  className="h-11 rounded-xl font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Costo Compra ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    placeholder="45000"
                    className="h-11 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Precio Venta ($) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="75000"
                    className="h-11 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Stock Inicial (un.)
                  </label>
                  <Input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    placeholder="10"
                    className="h-11 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Alerta Stock Mínimo
                  </label>
                  <Input
                    type="number"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(e.target.value)}
                    placeholder="5"
                    className="h-11 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold rounded-xl shadow-md"
                >
                  {editingProductId ? 'Guardar Cambios' : 'Registrar Producto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
