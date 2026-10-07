import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { useCollection } from '../hooks/useCollection';
import { useDatabase } from '../hooks/useDatabase';
import { getDatabase } from '../db/database';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../lib/utils';
import { Sparkles, Plus, Search, Tag, Clock, Scissors, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

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

    const orgId = user?.org || 'default_org';
    const now = new Date().toISOString();
    const serviceId = editingServiceId || 'svc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

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

      // 1. Guardar de forma inmediata en caché local (0ms de retraso, reactividad total)
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

      // 2. Persistir en la base de datos local (RxDB / Dexie)
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

      // 3. Cerrar modal y mostrar mensaje amigable
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
      // 1. Eliminar de caché local al instante
      const cached = localStorage.getItem('glamos_local_services');
      if (cached) {
        const currentList = JSON.parse(cached).filter((s: any) => s.id !== id);
        localStorage.setItem('glamos_local_services', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_services'));
      }

      // 2. Marcar en RxDB
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
    <div className="space-y-6 max-w-5xl mx-auto relative">
      {/* Notificación Flotante Amigable y Elegante */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-950/20 border border-emerald-400/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide">{successMessage}</div>
            <div className="text-[10px] text-emerald-100">Catálogo actualizado</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold font-serif text-gray-900"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Catálogo de Servicios
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Menú de tratamientos, corte, colorimetría, peinados y spa.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold text-xs shadow-md hover:shadow-lg flex items-center gap-2 px-5 py-2.5 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Nuevo Servicio
          </Button>
        )}
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por corte, balayage, keratina..."
          className="pl-10 h-11 bg-white rounded-xl border-amber-200/60 text-sm focus:ring-amber-500"
        />
      </div>

      {/* Grid de Servicios */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando catálogo...</div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-14 bg-white/70 backdrop-blur-md rounded-2xl border border-amber-200/50 p-6">
          <Scissors className="w-12 h-12 text-amber-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base">Aún no hay servicios registrados</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {isAdmin
              ? 'Comienza agregando los servicios de tu salón para que tus estilistas puedan facturar rápidamente.'
              : 'El administrador aún no ha configurado los servicios del salón.'}
          </p>
          {isAdmin && (
            <Button
              onClick={() => handleOpenModal()}
              className="mt-4 bg-gradient-to-r from-[#F6D365] to-[#E11D48] text-white text-xs font-bold rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Agregar Primer Servicio
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service: any) => (
            <Card
              key={service.id}
              className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-amber-100/80 bg-white/80 backdrop-blur-sm rounded-2xl"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">{service.name}</h3>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(service)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {service.active_discount_percentage > 0 && (
                  <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">
                    <Tag className="w-3 h-3" />
                    {service.active_discount_percentage}% OFF Promoción
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                    Precio Base
                  </span>
                  <div className="text-lg font-black text-gray-900 font-mono">
                    {formatCurrency(service.base_price)}
                  </div>
                </div>

                {service.active_discount_percentage > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-rose-600 uppercase tracking-wider font-semibold block">
                      Con Descuento
                    </span>
                    <div className="text-base font-bold text-rose-600 font-mono">
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-amber-200/60 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-xl font-bold font-serif text-gray-900"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {editingServiceId ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Servicio *
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Balayage Iluminado + Tonalización"
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Precio Base ($) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="Ej. 120000"
                  className="h-11 rounded-xl font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Descuento Promocional (%)
                  </label>
                  <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">Opcional</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  placeholder="0"
                  className="h-11 rounded-xl font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Rebaja promocional temporal (ej. 10% OFF). Deja en 0 si el servicio no tiene descuento.
                </p>
              </div>

              <div className="pt-3 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl"
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : editingServiceId ? 'Guardar Cambios' : 'Crear Servicio'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
