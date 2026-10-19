import { useState, useMemo } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  Package,
  Users,
  Settings,
  PlusCircle,
  Scissors,
  TrendingUp,
  Menu,
  X,
  Crown,
  Sparkles,
  LogOut,
  ChevronRight,
  Cake,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../auth/auth-context';
import { useCollection } from '../hooks/useCollection';
import { cn, getBirthdayDetails, getBirthdayWhatsAppUrl } from '../lib/utils';
import { GlamOSEmblem } from '../components/GlamOSLogo';
import { Badge } from '../components/ui/Badge';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [birthdayDropdownOpen, setBirthdayDropdownOpen] = useState(false);

  const isAdmin = user?.role === 'OWNER_ADMIN';
  const { docs: clients } = useCollection('clients');

  const upcomingBirthdays = useMemo(() => {
    if (!isAdmin || !clients || clients.length === 0) return [];
    const list: Array<{
      client: any;
      details: { isUpcoming: boolean; daysLeft: number; label: string; isToday: boolean };
    }> = [];

    for (const c of clients) {
      if (c.deleted_at || !c.birth_date) continue;
      const details = getBirthdayDetails(c.birth_date);
      if (details?.isUpcoming) {
        list.push({ client: c, details });
      }
    }

    return list.sort((a, b) => a.details.daysLeft - b.details.daysLeft);
  }, [isAdmin, clients]);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Inicio', section: 'PRINCIPAL' },
    { to: '/sales', icon: Receipt, label: 'Ventas', section: 'OPERACIONES' },
    { to: '/sales/new', icon: PlusCircle, label: 'Nueva Venta', primary: true, section: 'OPERACIONES' },
    { to: '/services', icon: Scissors, label: 'Servicios', section: 'OPERACIONES' },
    ...(isAdmin ? [{ to: '/inventory', icon: Package, label: 'Inventario & Stock', section: 'GESTIÓN' }] : []),
    { to: '/clients', icon: Users, label: 'Cartera VIP Clientes', section: 'GESTIÓN' },
    { to: '/nail-art', icon: Sparkles, label: 'Diseño de Uñas IA', badge: 'Studio IA', section: 'GESTIÓN' },
    ...(isAdmin ? [{ to: '/finance', icon: TrendingUp, label: 'Finanzas & P&L', section: 'GESTIÓN' }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavLinks = (closeMobile = false) => (
    <div className="flex flex-col h-full space-y-6">
      {/* Brand Header */}
      <div className="flex items-center gap-3.5 px-2 pt-2">
        <GlamOSEmblem size={44} />
        <div>
          <span className="font-bold text-2xl tracking-tight block leading-none">
            <span className="font-editorial italic font-bold text-gradient-glam text-2xl">
              Glam
            </span>
            <span className="text-white font-black uppercase text-lg tracking-wider ml-1 font-interface">
              OS
            </span>
          </span>
          <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest block mt-0.5">
            Haute Salon Suite
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => closeMobile && setMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 group active:scale-[0.98]',
                item.primary
                  ? 'bg-gradient-to-r from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_28px_rgba(212,175,55,0.5)] my-2.5 font-bold hover:brightness-105'
                  : isActive
                  ? 'bg-white/[0.08] text-amber-300 font-bold border-l-2 border-amber-400 shadow-xs'
                  : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'
              )
            }
          >
            <div className="flex items-center gap-3 min-w-0">
              <item.icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110',
                  item.primary ? 'text-neutral-950' : 'text-amber-400/90'
                )}
              />
              <span className="truncate">{item.label}</span>
            </div>
            {!item.primary && (
              <div className="flex items-center gap-1.5 shrink-0">
                {item.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400/20 to-amber-200/10 text-amber-300 border border-amber-400/30">
                    {item.badge}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5" />
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Info & Settings Footer */}
      <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
        <NavLink
          to="/settings"
          onClick={() => closeMobile && setMobileMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-colors',
              isActive
                ? 'bg-white/[0.08] text-amber-300 font-bold'
                : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white'
            )
          }
        >
          <Settings className="w-4 h-4 text-neutral-400" />
          <span>Configuración</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold text-neutral-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-neutral-500" />
          <span>Cerrar Sesión</span>
        </button>

        {/* User Velvet Card */}
        <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-white/[0.08] shadow-lg flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E5C378] to-[#AA7C11] text-neutral-950 font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
            {user?.email?.[0].toUpperCase() || 'G'}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-white block truncate">
              {user?.email}
            </span>
            <span className="text-[10px] text-amber-400/90 font-medium block truncate">
              {isAdmin ? 'Dueña / Administradora' : 'Estilista Profesional'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#09090B] text-neutral-100 relative overflow-hidden select-none font-interface">
      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-white/[0.08] bg-[#0D0B10]/95 backdrop-blur-2xl p-5 shadow-2xl">
        {renderNavLinks(false)}
      </aside>

      {/* ── MOBILE / TABLET DRAWER OVERLAY ───────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[#0D0B10] h-full p-5 border-r border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300 overflow-y-auto">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/[0.06] border border-white/10 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            {renderNavLinks(true)}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        {/* Top Executive Header */}
        <header className="h-16 border-b border-white/[0.08] bg-[#09090B]/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile / Tablet */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2.5 rounded-2xl bg-white/[0.06] border border-white/10 text-neutral-200 hover:bg-white/[0.1] hover:text-white active:scale-95 transition-all"
              title="Abrir Menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo on smaller screens */}
            <div className="lg:hidden flex items-center gap-2">
              <GlamOSEmblem size={32} />
              <span className="font-bold text-lg tracking-tight">
                <span className="font-editorial italic font-bold text-gradient-glam text-xl">
                  Glam
                </span>
                <span className="text-white font-black uppercase text-sm tracking-wider ml-0.5">
                  OS
                </span>
              </span>
            </div>

            {/* Salon Badge on Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <Badge variant={isAdmin ? 'gold' : 'glam'} dot>
                {isAdmin ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                {isAdmin ? 'Panel de Administración' : 'Terminal de Ventas'}
              </Badge>
            </div>
          </div>

          {/* User Profile & VIP Birthday Notification on Header */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {isAdmin && upcomingBirthdays.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBirthdayDropdownOpen(!birthdayDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 hover:bg-amber-500/25 transition-all text-xs font-bold shadow-md cursor-pointer group active:scale-95"
                  title="Notificación: Cumpleaños VIP Cercanos"
                >
                  <Cake className="w-4 h-4 text-amber-400 animate-pulse group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Cumpleaños VIP</span>
                  <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 text-[10px] font-black flex items-center justify-center shadow-xs">
                    {upcomingBirthdays.length}
                  </span>
                </button>

                {/* Dropdown flotante de Notificaciones de Cumpleaños */}
                {birthdayDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-88 rounded-3xl bg-[#141218]/95 backdrop-blur-2xl border border-amber-400/30 shadow-[0_15px_50px_rgba(0,0,0,0.8)] p-4 z-50 animate-in fade-in zoom-in-95 duration-200 space-y-3">
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <Cake className="w-4 h-4 text-amber-400" />
                        <span className="font-editorial text-base font-bold text-white">
                          Cumpleaños VIP
                        </span>
                      </div>
                      <Badge variant="gold" className="text-[10px]">
                        {upcomingBirthdays.length} {upcomingBirthdays.length === 1 ? 'clienta' : 'clientas'}
                      </Badge>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                      {upcomingBirthdays.map(({ client: c, details }) => {
                        const phone = c.phone_whatsapp || c.phone;
                        const waUrl = getBirthdayWhatsAppUrl(c.full_name, phone);

                        return (
                          <div
                            key={c.id}
                            className={`p-3 rounded-2xl border transition-all space-y-2 ${
                              details.isToday
                                ? 'bg-amber-500/10 border-amber-400/40'
                                : 'bg-white/[0.03] border-white/[0.08]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-white truncate">
                                {c.full_name}
                              </span>
                              <Badge variant={details.isToday ? 'gold' : 'glam'} className="text-[9px] shrink-0 font-bold">
                                🎂 {details.label}
                              </Badge>
                            </div>

                            {phone ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setBirthdayDropdownOpen(false)}
                                className="w-full py-1.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Enviar Felicitación WhatsApp</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setBirthdayDropdownOpen(false);
                                  navigate('/clients');
                                }}
                                className="w-full py-1.5 px-3 rounded-xl bg-white/[0.04] text-neutral-400 hover:text-white border border-white/10 text-[11px] font-medium flex items-center justify-center gap-1.5"
                              >
                                <span>Añadir Celular</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center text-[11px]">
                      <span className="text-neutral-500 text-[10px]">GlamOS Haute Beauté</span>
                      <button
                        type="button"
                        onClick={() => {
                          setBirthdayDropdownOpen(false);
                          navigate('/clients');
                        }}
                        className="text-amber-400 hover:underline font-bold cursor-pointer"
                      >
                        Ver Cartera VIP →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white block truncate max-w-[220px]">
                {user?.email}
              </span>
              <span className="text-[10px] text-amber-400/80 font-medium">
                {isAdmin ? 'Dueña / Administradora' : 'Estilista'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#E5C378] to-[#AA7C11] text-neutral-950 font-black text-sm flex items-center justify-center shadow-xs">
              {user?.email?.[0].toUpperCase() || 'G'}
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 bg-[#09090B]">
          <Outlet />
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION BAR (Apple Dock Fluidity) ─────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-[#0D0B10]/95 backdrop-blur-2xl border-t border-white/[0.08] flex items-center justify-around px-3 z-40 shadow-2xl">
        {[
          { to: '/', icon: LayoutDashboard, label: 'Inicio' },
          { to: '/sales', icon: Receipt, label: 'Ventas' },
          { to: '/sales/new', icon: PlusCircle, label: 'Vender', primary: true },
          { to: '/clients', icon: Users, label: 'Clientes' },
          { to: '/services', icon: Scissors, label: 'Servicios' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center w-16 h-full gap-1 transition-all duration-200 active:scale-90',
                item.primary
                  ? 'text-amber-400 -translate-y-1'
                  : isActive
                  ? 'text-amber-300 font-bold'
                  : 'text-neutral-500 hover:text-neutral-300'
              )
            }
          >
            {item.primary ? (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                <PlusCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
            ) : (
              <item.icon className="w-5 h-5" strokeWidth={2} />
            )}
            <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
