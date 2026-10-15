import { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../auth/auth-context';
import { getDatabase } from '../db/database';
import { triggerSync } from '../db/sync';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { ensureUuid, generateUuid } from '../lib/utils';
import {
  Users,
  UserPlus,
  Search,
  Cake,
  MessageCircle,
  Edit2,
  Trash2,
  Phone,
  Crown,
} from 'lucide-react';

export function ClientsPage() {
  const { user } = useAuth();
  const db = useDatabase();
  const { docs: clients, loading } = useCollection('clients');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'WHATSAPP' | 'BIRTHDAYS'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Stats
  const stats = useMemo(() => {
    const active = (clients || []).filter((c: any) => !c.deleted_at);
    const withPhone = active.filter((c: any) => !!(c.phone_whatsapp || c.phone)).length;
    const currentMonth = new Date().getMonth() + 1;
    const birthdays = active.filter((c: any) => {
      if (!c.birth_date) return false;
      const parts = c.birth_date.split('-');
      return parseInt(parts[1], 10) === currentMonth;
    }).length;

    return { total: active.length, withPhone, birthdays };
  }, [clients]);

  const filteredClients = useMemo(() => {
    return (clients || []).filter((c: any) => {
      if (c.deleted_at) return false;
      const name = c.full_name || c.name || '';
      const phone = c.phone_whatsapp || c.phone || '';

      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phone.includes(searchTerm);

      if (!matchesSearch) return false;

      if (filterType === 'WHATSAPP') return !!phone;
      if (filterType === 'BIRTHDAYS') {
        if (!c.birth_date) return false;
        const currentMonth = new Date().getMonth() + 1;
        const parts = c.birth_date.split('-');
        return parseInt(parts[1], 10) === currentMonth;
      }

      return true;
    });
  }, [clients, searchTerm, filterType]);

  const handleOpenModal = (client?: any) => {
    if (client) {
      setEditingClientId(client.id);
      setFullName(client.full_name || client.name || '');
      setPhoneWhatsapp(client.phone_whatsapp || client.phone || '');
      setBirthDate(client.birth_date || '');
    } else {
      setEditingClientId(null);
      setFullName('');
      setPhoneWhatsapp('');
      setBirthDate('');
    }
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const orgId = ensureUuid(user?.org);
    const now = new Date().toISOString();
    const clientId = editingClientId ? ensureUuid(editingClientId) : generateUuid();

    const clientData = {
      id: clientId,
      organization_id: orgId,
      full_name: fullName.trim(),
      phone_whatsapp: phoneWhatsapp.trim() || null,
      birth_date: birthDate || null,
      consent_given_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    try {
      try {
        const cached = localStorage.getItem('glamos_local_clients');
        let currentList = cached ? JSON.parse(cached) : [];
        if (editingClientId) {
          currentList = currentList.map((c: any) =>
            c.id === editingClientId ? { ...c, ...clientData } : c,
          );
        } else {
          currentList.unshift(clientData);
        }
        localStorage.setItem('glamos_local_clients', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_clients'));
      } catch (cacheErr) {
        console.warn('Aviso guardando cliente local:', cacheErr);
      }

      try {
        let activeDb = db;
        if (!activeDb) activeDb = await getDatabase().catch(() => null);
        if (activeDb?.clients) {
          if (editingClientId) {
            const doc = await activeDb.clients.findOne(editingClientId).exec();
            if (doc) await doc.patch(clientData);
            else await activeDb.clients.insert(clientData);
          } else {
            await activeDb.clients.insert(clientData);
          }
        }
      } catch (dbErr) {
        console.warn('Aviso persistiendo en RxDB:', dbErr);
      }

      try {
        triggerSync();
      } catch {}

      setIsModalOpen(false);
      setSuccessMessage(
        editingClientId
          ? '¡Ficha de cliente VIP actualizada!'
          : '¡Cliente VIP registrado en cartera!',
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error guardando cliente:', err);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('¿Deseas dar de baja a este cliente de tu cartera VIP?')) return;

    try {
      const cached = localStorage.getItem('glamos_local_clients');
      if (cached) {
        const currentList = JSON.parse(cached).filter((c: any) => c.id !== id);
        localStorage.setItem('glamos_local_clients', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_clients'));
      }

      let activeDb = db;
      if (!activeDb) activeDb = await getDatabase().catch(() => null);
      if (activeDb?.clients) {
        const doc = await activeDb.clients.findOne(id).exec();
        if (doc) {
          await doc.patch({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      try {
        triggerSync();
      } catch {}

      setSuccessMessage('Cliente removido de la cartera.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error eliminando cliente:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 relative select-none">
      {/* Toast Flotante */}
      {successMessage && (
        <Toast
          message={successMessage}
          subtitle="Cartera VIP sincronizada"
          type="success"
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* ── HEADER DE ALTA GAMA ────────────────────────────────────────────── */}
      <PageHeader
        title="Cartera de Clientes VIP"
        subtitle="Historial de servicios, cumpleaños, preferencias y contacto directo por WhatsApp."
        badge="Directorio Exclusivo"
        badgeVariant="gold"
        icon={<Crown className="w-3.5 h-3.5 text-amber-600" />}
        actions={
          <Button
            onClick={() => handleOpenModal()}
            variant="glam"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            + Registrar Cliente VIP
          </Button>
        }
      />

      {/* ── TARJETAS KPI DE FIDELIZACIÓN ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <MetricCard
          label="Clientes VIP Registrados"
          value={stats.total}
          subtitle="Directorio exclusivo activo"
          icon={<Crown className="w-4 h-4" />}
          variant="glass"
        />

        <MetricCard
          label="Con WhatsApp Directo"
          value={stats.withPhone}
          subtitle="Canal de fidelización rápido"
          icon={<MessageCircle className="w-4 h-4 text-emerald-600" />}
          variant="glass"
        />

        <MetricCard
          label="Cumpleañeros del Mes"
          value={stats.birthdays}
          subtitle="Oportunidades de cortesía"
          icon={<Cake className="w-4 h-4 text-rose-500" />}
          variant="gold"
        />
      </div>

      {/* ── BUSCADOR Y FILTROS SEGMENTADOS ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, teléfono o cumpleaños..."
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex rounded-2xl bg-white/80 backdrop-blur-md border border-amber-200/80 p-1 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'ALL'
                ? 'bg-amber-100/90 text-amber-950 shadow-2xs font-black'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setFilterType('WHATSAPP')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'WHATSAPP'
                ? 'bg-emerald-100 text-emerald-950 shadow-2xs font-black'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setFilterType('BIRTHDAYS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'BIRTHDAYS'
                ? 'bg-rose-100 text-rose-950 shadow-2xs font-black'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Cumpleaños
          </button>
        </div>
      </div>

      {/* ── LISTADO / EMPTY STATE DE ALTA JOYERÍA ─────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-gray-400 font-medium">
          Cargando cartera exclusiva de clientes...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-amber-200/70 shadow-sm text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#FDE68A] to-[#FB7185] p-0.5 mx-auto shadow-md">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
              <Users className="w-8 h-8 text-amber-700 stroke-[1.5]" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold font-editorial text-gray-900">
              Comienza tu Cartera VIP
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Registra a tus clientas frecuentes para mantener su ficha personal, recordar sus cumpleaños y enviar promociones exclusivas.
            </p>
          </div>

          <Button
            onClick={() => handleOpenModal()}
            variant="glam"
            className="mt-2"
          >
            + Registrar Primer Cliente VIP
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client: any) => {
            const cName = client.full_name || client.name || 'Sin Nombre';
            const cPhone = client.phone_whatsapp || client.phone;
            return (
              <Card
                key={client.id}
                variant="glass"
                interactive
                className="p-5 flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-200 to-rose-200 text-amber-950 font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                        {cName[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-950 text-base truncate group-hover:text-amber-900 transition-colors">
                          {cName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                          <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="truncate">{cPhone || 'Sin teléfono'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenModal(client)}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-amber-700 hover:bg-amber-50/80 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50/80 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-amber-100/70 flex items-center justify-between text-[11px]">
                  {client.birth_date ? (
                    <Badge variant="glam" dot>
                      <Cake className="w-3 h-3 mr-0.5" />
                      <span>{client.birth_date}</span>
                    </Badge>
                  ) : (
                    <span className="text-gray-400 font-medium">Sin cumpleaños</span>
                  )}

                  {cPhone && (
                    <a
                      href={`https://wa.me/${cPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-all shadow-2xs active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── MODAL: REGISTRAR / EDITAR CLIENTE VIP ──────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClientId ? 'Editar Ficha VIP' : 'Nueva Ficha de Cliente VIP'}
        subtitle="Registra a tu cliente para historial de servicios y promociones."
        icon={<Crown className="w-5 h-5 text-amber-600" />}
      >
        <form onSubmit={handleSaveClient} className="space-y-4">
          <Input
            label="Nombre Completo *"
            required
            placeholder="Ej. Isabella Rossellini"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <Input
            label="WhatsApp / Celular"
            type="tel"
            placeholder="Ej. +593 99 123 4567"
            value={phoneWhatsapp}
            onChange={(e) => setPhoneWhatsapp(e.target.value)}
          />

          <Input
            label="Fecha de Nacimiento"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            helperText="El sistema destacará a esta clienta en la pantalla de Inicio durante la semana de su cumpleaños."
          />

          <div className="flex gap-2.5 pt-2">
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
              {editingClientId ? 'Guardar Cambios' : 'Registrar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
