import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { useCollection } from '../hooks/useCollection';
import { useDatabase } from '../hooks/useDatabase';
import { getDatabase } from '../db/database';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, generateUuid, ensureUuid } from '../lib/utils';
import { Plus, Search, Tag, Scissors, Edit2, Trash2 } from 'lucide-react';

export function ServicesPage() {
  const { user } = useAuth();
  const db = useDatabase();
  const { docs: services, loading } = useCollection('services');

  const isAdmin = user?.role === 'OWNER_ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [isSaving, setIsSaving] = useState(false);

  const filteredServices = services.filter((s: any) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleOpenModal = (service?: any) => {
    if (service) {
      setEditingServiceId(service.id);
      setName(service.name);
      setBasePrice(service.base_price.toString());
      setDiscountPercentage((service.active_discount_percentage || 0).toString());
    } else {
      setEditingServiceId(null);
      setName('');
      setBasePrice('');
      setDiscountPercentage('0');
    }
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !basePrice) return;

    const orgId = ensureUuid(user?.org);
    const now = new Date().toISOString();
    const serviceId = editingServiceId ? ensureUuid(editingServiceId) : generateUuid();

    const serviceData = {
      id: serviceId,
      organization_id: orgId,
      name: name.trim(),
      base_price: parseFloat(basePrice),
      active_discount_percentage: parseInt(discountPercentage, 10) || 0,
      discount_starts_at: null,
      discount_ends_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    try {
      setIsSaving(true);

      // 1. Guardar de forma inmediata en caché local (0ms de retraso)
      try {
        const cached = localStorage.getItem('glamos_local_services');
        let currentList = cached ? JSON.parse(cached) : [];
        if (editingServiceId) {
          currentList = currentList.map((s: any) => s.id === editingServiceId ? { ...s, ...serviceData } : s);
        } else {
          currentList.unshift(serviceData);
        }
        localStorage.setItem('glamos_local_services', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_services'));
      } catch (cacheErr) {
        console.warn('Error guardando en caché local:', cacheErr);
      }

      // 2. Persistir en RxDB
      try {
        let activeDb = db;
        if (!activeDb) {
          activeDb = await getDatabase().catch(() => null);
        }
        if (activeDb?.services) {
          if (editingServiceId) {
            const doc = await activeDb.services.findOne(editingServiceId).exec();
            if (doc) {
              await doc.patch(serviceData);
            } else {
              await activeDb.services.insert(serviceData);
            }
          } else {
            await activeDb.services.insert(serviceData);
          }
        }
      } catch (dbErr) {
        console.warn('Aviso sincronizando en RxDB:', dbErr);
      }

      setIsModalOpen(false);
      setSuccessMessage(editingServiceId ? '¡Servicio actualizado correctamente!' : '¡Servicio guardado con éxito!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Error al guardar servicio:', err);
      setSuccessMessage('El servicio fue guardado en tu sesión local.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este servicio del catálogo?')) return;
    try {
      const cached = localStorage.getItem('glamos_local_services');
      if (cached) {
        const currentList = JSON.parse(cached).filter((s: any) => s.id !== id);
        localStorage.setItem('glamos_local_services', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_services'));
      }

      let activeDb = db;
      if (!activeDb) activeDb = await getDatabase().catch(() => null);
      if (activeDb?.services) {
        const doc = await activeDb.services.findOne(id).exec();
        if (doc) {
          await doc.patch({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
      setSuccessMessage('Servicio eliminado del catálogo.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error al eliminar servicio:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative select-none pb-24">
      {/* Toast Notificación */}
      {successMessage && (
        <Toast
          message={successMessage}
          subtitle="Catálogo sincronizado"
          type="success"
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Catálogo de Servicios"
        subtitle="Menú de tratamientos, corte, colorimetría, peinados y spa del salón."
        badge="Menú Haute Couture"
        badgeVariant="gold"
        icon={<Scissors className="w-3.5 h-3.5 text-amber-600" />}
        actions={
          isAdmin ? (
            <Button
              onClick={() => handleOpenModal()}
              variant="glam"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Servicio
            </Button>
          ) : undefined
        }
      />

      {/* Buscador */}
      <div className="max-w-md">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por corte, balayage, keratina..."
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Grid de Servicios */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm font-medium">Cargando catálogo...</div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-white/80 backdrop-blur-xl rounded-3xl border border-dashed border-amber-200 p-8 space-y-3">
          <Scissors className="w-12 h-12 text-amber-300 mx-auto" />
          <h3 className="font-editorial text-2xl font-bold text-gray-900">Aún no hay servicios registrados</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {isAdmin
              ? 'Comienza agregando los servicios de tu salón para que tus estilistas puedan facturar rápidamente.'
              : 'El administrador aún no ha configurado los servicios del salón.'}
          </p>
          {isAdmin && (
            <Button
              onClick={() => handleOpenModal()}
              variant="glam"
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" /> Agregar Primer Servicio
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service: any) => (
            <Card
              key={service.id}
              variant="glass"
              interactive
              className="p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-950 text-base leading-snug">{service.name}</h3>
                      <span className="text-[10px] text-gray-400 font-mono">SER-#{service.id.slice(0, 6)}</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenModal(service)}
                        className="p-1.5 text-gray-400 hover:text-amber-700 rounded-xl hover:bg-amber-50/80 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50/80 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {service.active_discount_percentage > 0 && (
                  <div className="mt-3">
                    <Badge variant="glam">
                      <Tag className="w-3 h-3 mr-1" />
                      {service.active_discount_percentage}% OFF Promoción
                    </Badge>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-amber-100/70 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">
                    Precio Base
                  </span>
                  <div className="text-xl font-black text-gray-950 font-editorial">
                    {formatCurrency(service.base_price)}
                  </div>
                </div>

                {service.active_discount_percentage > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-rose-600 uppercase tracking-wider font-bold block">
                      Con Descuento
                    </span>
                    <div className="text-lg font-black text-rose-600 font-editorial">
                      {formatCurrency(
                        service.base_price * (1 - service.active_discount_percentage / 100),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Servicio */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingServiceId ? 'Editar Servicio' : 'Nuevo Servicio'}
        subtitle="Configura el tratamiento, nombre y precio del servicio."
        icon={<Scissors className="w-5 h-5" />}
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <Input
            label="Nombre del Servicio *"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Balayage Iluminado + Tonalización"
          />

          <Input
            label="Precio Base ($) *"
            type="number"
            step="0.01"
            required
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="Ej. 120000"
            className="font-mono"
          />

          <Input
            label="Descuento Promocional (%)"
            type="number"
            min="0"
            max="100"
            value={discountPercentage}
            onChange={(e) => setDiscountPercentage(e.target.value)}
            placeholder="0"
            helperText="Rebaja promocional temporal (ej. 10% OFF). Deja en 0 si no aplica."
            className="font-mono"
          />

          <div className="pt-3 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="flex-1"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              variant="glam"
              className="flex-1"
            >
              {isSaving ? 'Guardando...' : editingServiceId ? 'Guardar Cambios' : 'Crear Servicio'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
