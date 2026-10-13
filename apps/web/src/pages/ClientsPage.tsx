import { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../auth/auth-context';
import { getDatabase } from '../db/database';
import { triggerSync } from '../db/sync';
import { ensureUuid, generateUuid } from '../lib/utils';
import {
  Users,
  UserPlus,
  Search,
  Cake,
  MessageCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  Phone,
  Crown,
  Heart,
  Calendar,
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
      // 1. Guardar de inmediato en caché local (0ms delay)
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

      // 2. Persistir en RxDB
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

      // 3. Sincronizar en la nube en segundo plano (silencioso)
      try {
        triggerSync();
      } catch {}

      setIsModalOpen(false);
      setSuccessMessage(
        editingClientId
          ? '¡Cliente VIP actualizado exitosamente!'
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
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-950/20 border border-emerald-400/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide">{successMessage}</div>
            <div className="text-[10px] text-emerald-100">Cartera VIP sincronizada</div>
          </div>
        </div>
      )}

      {/* ── HEADER DE ALTA GAMA ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-200/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80">
              Directorio Exclusivo
            </span>
          </div>
          <h1
            className="text-3xl font-bold font-serif text-gray-900"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Cartera de Clientes VIP
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Historial de servicios, cumpleaños, preferencias y contacto directo por WhatsApp.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-extrabold text-xs shadow-md shadow-rose-900/15 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Registrar Cliente VIP</span>
        </button>
      </div>

      {/* ── TARJETAS KPI DE FIDELIZACIÓN ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 block">Clientes VIP Registrados</span>
            <span className="text-2xl font-extrabold text-gray-900 font-serif mt-0.5 block">
              {stats.total}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <Crown className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 block">Con WhatsApp Activo</span>
            <span className="text-2xl font-extrabold text-emerald-700 font-serif mt-0.5 block">
              {stats.withPhone}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 block">Cumpleañeros del Mes</span>
            <span className="text-2xl font-extrabold text-rose-600 font-serif mt-0.5 block">
              {stats.birthdays}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <Cake className="w-5 h-5 text-rose-500" />
          </div>
        </div>
      </div>

      {/* ── BUSCADOR Y FILTROS SEGMENTADOS ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o cumpleaños..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-amber-200/80 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
          />
        </div>

        <div className="flex rounded-xl bg-white border border-amber-200/80 p-1 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'ALL'
                ? 'bg-amber-100 text-amber-900'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setFilterType('WHATSAPP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'WHATSAPP'
                ? 'bg-emerald-100 text-emerald-900'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setFilterType('BIRTHDAYS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'BIRTHDAYS'
                ? 'bg-rose-100 text-rose-900'
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
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-amber-200/70 shadow-sm text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#FDE68A] to-[#FB7185] p-0.5 mx-auto shadow-md">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
              <Users className="w-8 h-8 text-amber-700 stroke-[1.5]" />
            </div>
          </div>

          <div>
            <h3
              className="text-xl font-bold font-serif text-gray-900"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Comienza tu Cartera VIP
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Registra a tus clientes frecuentes para mantener su ficha personal, recordar sus cumpleaños y enviar promociones exclusivas.
            </p>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all"
          >
            + Registrar Primer Cliente VIP
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredClients.map((client: any) => {
            const cName = client.full_name || client.name || 'Sin Nombre';
            const cPhone = client.phone_whatsapp || client.phone;
            return (
              <div
                key={client.id}
                className="p-5 rounded-2xl bg-white border border-amber-200/70 hover:border-amber-400 hover:shadow-md transition-all space-y-3.5 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-200 to-rose-200 text-amber-900 font-extrabold text-sm flex items-center justify-center shrink-0">
                      {cName[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm truncate group-hover:text-amber-900 transition-colors">
                        {cName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                        <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{cPhone || 'Sin teléfono'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenModal(client)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  {client.birth_date ? (
                    <div className="flex items-center gap-1.5 text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-md">
                      <Cake className="w-3 h-3" />
                      <span>{client.birth_date}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Sin cumpleaños</span>
                  )}

                  {cPhone && (
                    <a
                      href={`https://wa.me/${cPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md hover:bg-emerald-100 transition-colors shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: REGISTRAR / EDITAR CLIENTE VIP ──────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-amber-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-gray-900">
                  {editingClientId ? 'Editar Ficha VIP' : 'Nueva Ficha de Cliente VIP'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Isabella Rossellini"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  WhatsApp / Celular
                </label>
                <input
                  type="tel"
                  placeholder="Ej. +593 99 123 4567"
                  value={phoneWhatsapp}
                  onChange={(e) => setPhoneWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  El sistema destacará a esta cliente en la pantalla de Inicio durante la semana de su cumpleaños.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F6D365] to-[#E11D48] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all"
                >
                  {editingClientId ? 'Guardar Cambios' : 'Registrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
