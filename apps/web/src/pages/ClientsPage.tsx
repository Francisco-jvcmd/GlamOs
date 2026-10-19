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
import { ensureUuid, generateUuid, getEcuadorDateString, getBirthdayDetails, getBirthdayWhatsAppUrl } from '../lib/utils';
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
    const currentMonth = parseInt(getEcuadorDateString().split('-')[1], 10);
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
        const currentMonth = parseInt(getEcuadorDateString().split('-')[1], 10);
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

        <div className="flex rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-white/[0.08] p-1 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'ALL'
                ? 'bg-gradient-to-r from-[#F5E5C4] to-[#D4AF37] text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setFilterType('WHATSAPP')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'WHATSAPP'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setFilterType('BIRTHDAYS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === 'BIRTHDAYS'
                ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Cumpleaños
          </button>
        </div>
      </div>

      {/* ── LISTADO / EMPTY STATE DE ALTA JOYERÍA ─────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-neutral-500 font-medium">
          Cargando cartera exclusiva de clientes...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-neutral-900/40 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-white/[0.08] text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-neutral-800 border border-white/10 p-0.5 mx-auto shadow-md">
            <div className="w-full h-full bg-[#121118] rounded-[22px] flex items-center justify-center">
              <Users className="w-8 h-8 text-[#F5E5C4] stroke-[1.5]" />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold font-editorial text-white">
              Comienza tu Cartera VIP
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
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
                      <div className="w-11 h-11 rounded-2xl bg-neutral-800/90 border border-white/10 text-[#F5E5C4] font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                        {cName[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-base truncate group-hover:text-[#F5E5C4] transition-colors">
                          {cName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                          <Phone className="w-3 h-3 text-amber-400/80 shrink-0" />
                          <span className="truncate">{cPhone || 'Sin teléfono'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenModal(client)}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-[#F5E5C4] hover:bg-white/[0.06] transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-1.5 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {(() => {
                  const bDetails = getBirthdayDetails(client.birth_date);
                  const waUrl = bDetails?.isUpcoming
                    ? getBirthdayWhatsAppUrl(client.full_name, cPhone)
                    : cPhone
                    ? `https://wa.me/${cPhone.replace(/\D/g, '')}`
                    : '';

                  return (
                    <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] gap-2">
                      {client.birth_date ? (
                        <Badge variant={bDetails?.isToday ? 'gold' : bDetails?.isUpcoming ? 'gold' : 'glam'} dot>
                          <Cake className="w-3 h-3 mr-0.5" />
                          <span>{bDetails?.isUpcoming ? `🎂 ${bDetails.label}` : client.birth_date}</span>
                        </Badge>
                      ) : (
                        <span className="text-neutral-500 font-medium">Sin cumpleaños</span>
                      )}

                      {cPhone && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 ${
                            bDetails?.isUpcoming
                              ? 'text-amber-200 bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30'
                              : 'text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/40'
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{bDetails?.isUpcoming ? 'Felicitar' : 'WhatsApp'}</span>
                        </a>
                      )}
                    </div>
                  );
                })()}
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
