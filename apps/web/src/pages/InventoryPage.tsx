import { useState, useEffect } from 'react';
import { useCollection } from '../hooks/useCollection';
import { useDatabase } from '../hooks/useDatabase';
import { getDatabase } from '../db/database';
import { uploadLocalDataToNeon, pullAllDataFromNeon } from '../db/neon';
import { useAuth } from '../auth/auth-context';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { formatCurrency, generateUuid, ensureUuid } from '../lib/utils';
import {
  Package,
  Search,
  Plus,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  Boxes,
} from 'lucide-react';

export function InventoryPage() {
  const { user } = useAuth();
  const db = useDatabase();
  const { docs: products, loading } = useCollection('products');

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sincronización automática con la nube al entrar a Inventario
  useEffect(() => {
    if (user?.org) {
      uploadLocalDataToNeon(user.org).catch(() => {});
      pullAllDataFromNeon(user.org).catch(() => {});
    }
  }, [user?.org]);

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

  const criticalStockProducts = products.filter(
    (p: any) => !p.deleted_at && p.current_stock <= (p.min_stock_alert || 5),
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
    if (!name.trim() || !unitPrice) return;

    const orgId = ensureUuid(user?.org);
    const now = new Date().toISOString();
    const productId = editingProductId ? ensureUuid(editingProductId) : generateUuid();

    const productData = {
      id: productId,
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
    };

    try {
      try {
        const cached = localStorage.getItem('glamos_local_products');
        let currentList = cached ? JSON.parse(cached) : [];
        if (editingProductId) {
          currentList = currentList.map((p: any) => p.id === editingProductId ? { ...p, ...productData } : p);
        } else {
          currentList.unshift(productData);
        }
        localStorage.setItem('glamos_local_products', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_products'));
      } catch (cacheErr) {
        console.warn('Error guardando producto en caché:', cacheErr);
      }

      try {
        let activeDb = db;
        if (!activeDb) activeDb = await getDatabase().catch(() => null);
        if (activeDb?.products) {
          if (editingProductId) {
            const doc = await activeDb.products.findOne(editingProductId).exec();
            if (doc) {
              await doc.patch(productData);
            } else {
              await activeDb.products.insert(productData);
            }
          } else {
            await activeDb.products.insert(productData);
            if (activeDb.stock_movements) {
              await activeDb.stock_movements.insert({
                id: generateUuid(),
                organization_id: orgId,
                product_id: productId,
                delta: parseInt(currentStock, 10) || 0,
                reason: 'PURCHASE',
                reference_id: null,
                created_at: now,
                updated_at: now,
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn('Aviso sincronizando producto en RxDB:', dbErr);
      }

      if (user?.org) {
        uploadLocalDataToNeon(user.org).catch(console.warn);
      }

      setIsModalOpen(false);
      setSuccessMessage(editingProductId ? '¡Producto actualizado correctamente!' : '¡Producto agregado al inventario!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Error al guardar producto:', err);
      setSuccessMessage('Producto guardado en sesión local.');
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  const handleAdjustStock = async (product: any, delta: number) => {
    const newStock = Math.max(0, (product.current_stock || 0) + delta);
    const now = new Date().toISOString();

    try {
      const cached = localStorage.getItem('glamos_local_products');
      if (cached) {
        const currentList = JSON.parse(cached).map((p: any) =>
          p.id === product.id ? { ...p, current_stock: newStock, updated_at: now } : p
        );
        localStorage.setItem('glamos_local_products', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_products'));
      }
    } catch {}

    try {
      let activeDb = db;
      if (!activeDb) activeDb = await getDatabase().catch(() => null);
      if (activeDb?.products) {
        const doc = await activeDb.products.findOne(product.id).exec();
        if (doc) {
          await doc.patch({ current_stock: newStock, updated_at: now });
          if (activeDb.stock_movements) {
            await activeDb.stock_movements.insert({
              id: generateUuid(),
              organization_id: ensureUuid(user?.org),
              product_id: product.id,
              delta,
              reason: 'MANUAL_ADJUST',
              reference_id: null,
              created_at: now,
              updated_at: now,
            });
          }
        }
      }
      if (user?.org) {
        uploadLocalDataToNeon(user.org).catch(console.warn);
      }
    } catch (err) {
      console.error('Error ajustando stock:', err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Deseas dar de baja este producto del inventario?')) return;
    try {
      const cached = localStorage.getItem('glamos_local_products');
      if (cached) {
        const currentList = JSON.parse(cached).filter((p: any) => p.id !== id);
        localStorage.setItem('glamos_local_products', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_products'));
      }
      let activeDb = db;
      if (!activeDb) activeDb = await getDatabase().catch(() => null);
      if (activeDb?.products) {
        const doc = await activeDb.products.findOne(id).exec();
        if (doc) {
          await doc.patch({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
      if (user?.org) {
        uploadLocalDataToNeon(user.org).catch(console.warn);
      }
      setSuccessMessage('Producto dado de baja del inventario.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error eliminando producto:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative select-none pb-24">
      {/* Toast Notificación */}
      {successMessage && (
        <Toast
          message={successMessage}
          subtitle="Inventario actualizado"
          type="success"
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Inventario & Stock"
        subtitle="Control de insumos profesionales, cosméticos y productos de reventa."
        badge="Control de Insumos"
        badgeVariant="gold"
        icon={<Boxes className="w-3.5 h-3.5 text-amber-600" />}
        actions={
          <Button
            onClick={() => handleOpenModal()}
            variant="glam"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        }
      />

      {/* Banner de Alerta de Stock Mínimo Crítico */}
      {criticalStockProducts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[#1A1207]/90 border border-amber-400/40 shadow-lg backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                  <span>¡Alerta de Reabastecimiento Necesario!</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {criticalStockProducts.length} {criticalStockProducts.length === 1 ? 'producto crítico' : 'productos críticos'}
                  </span>
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                  Hay productos que alcanzaron o están por debajo del nivel de alerta mínima:{' '}
                  <span className="text-amber-200 font-semibold">
                    {criticalStockProducts.map((p: any) => `${p.name} (${p.current_stock}/${p.min_stock_alert || 5})`).join(', ')}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="max-w-md">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre o código SKU..."
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Listado de Productos */}
      {loading ? (
        <div className="text-center py-16 text-neutral-500 text-sm font-medium">Cargando inventario...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900/40 backdrop-blur-xl rounded-3xl border border-dashed border-white/10 p-8 space-y-3">
          <Package className="w-12 h-12 text-[#F5E5C4]/60 mx-auto" />
          <h3 className="font-editorial text-2xl font-bold text-white">No hay productos en inventario</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Registra los tintes, shampoos, aceites y tratamientos de tu salón para controlar stock y costos.
          </p>
          <Button
            onClick={() => handleOpenModal()}
            variant="glam"
            className="mt-2"
          >
            <Plus className="w-4 h-4 mr-2" /> Registrar Primer Producto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product: any) => {
            const isLowStock = product.current_stock <= (product.min_stock_alert || 5);
            const unitPriceVal = product.unit_price || 0;
            const unitCostVal = product.unit_cost || 0;

            return (
              <Card
                key={product.id}
                variant="glass"
                interactive
                className="p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-neutral-800/80 border border-white/10 text-[#F5E5C4] flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-snug group-hover:text-[#F5E5C4] transition-colors">{product.name}</h3>
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">SKU: {product.sku || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="p-1.5 text-neutral-400 hover:text-[#F5E5C4] rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-xl hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Precios & Costos */}
                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-2xl bg-neutral-900/60 border border-white/[0.06] text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase font-semibold block">Costo Compra</span>
                      <span className="font-editorial text-sm font-semibold text-neutral-300">{formatCurrency(unitCostVal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Precio Venta</span>
                      <span className="font-editorial text-sm font-bold text-emerald-300">{formatCurrency(unitPriceVal)}</span>
                    </div>
                  </div>
                </div>

                {/* Stock Control */}
                <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-400">Stock:</span>
                    <Badge variant={isLowStock ? 'warning' : 'success'} dot={isLowStock}>
                      {isLowStock && <AlertTriangle className="w-3 h-3 mr-0.5 inline" />}
                      {product.current_stock} un.
                    </Badge>
                  </div>

                  {/* Quick +/- buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAdjustStock(product, -1)}
                      className="p-1.5 rounded-xl hover:bg-white/[0.06] text-neutral-400 hover:text-rose-400 transition-colors active:scale-95 cursor-pointer"
                      title="Restar 1 unidad"
                    >
                      <MinusCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAdjustStock(product, 1)}
                      className="p-1.5 rounded-xl hover:bg-white/[0.06] text-neutral-400 hover:text-emerald-400 transition-colors active:scale-95 cursor-pointer"
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
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProductId ? 'Editar Producto' : 'Nuevo Producto'}
        subtitle="Registra las existencias, precio y alerta de stock mínimo."
        icon={<Package className="w-5 h-5" />}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <Input
            label="Nombre del Producto *"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Tratamiento Capilar Olaplex No. 3"
          />

          <Input
            label="Código SKU / Barras"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="OLA-003"
            className="font-mono uppercase"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Costo Compra ($)"
              type="number"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="45000"
              className="font-mono"
            />
            <Input
              label="Precio Venta ($) *"
              type="number"
              step="0.01"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="75000"
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Stock Inicial (un.)"
              type="number"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              placeholder="10"
              className="font-mono"
            />
            <Input
              label="Alerta Stock Mínimo"
              type="number"
              value={minStockAlert}
              onChange={(e) => setMinStockAlert(e.target.value)}
              placeholder="5"
              className="font-mono"
            />
          </div>

          <div className="pt-3 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="glam"
              className="flex-1"
            >
              {editingProductId ? 'Guardar Cambios' : 'Registrar Producto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
