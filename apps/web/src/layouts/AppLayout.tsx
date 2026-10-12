import { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../auth/auth-context';
import { cn } from '../lib/utils';
import { GlamOSEmblem } from '../components/GlamOSLogo';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'OWNER_ADMIN';

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Inicio', section: 'PRINCIPAL' },
    { to: '/sales', icon: Receipt, label: 'Ventas', section: 'OPERACIONES' },
    { to: '/sales/new', icon: PlusCircle, label: 'Nueva Venta', primary: true, section: 'OPERACIONES' },
    { to: '/services', icon: Scissors, label: 'Servicios', section: 'OPERACIONES' },
    ...(isAdmin ? [{ to: '/inventory', icon: Package, label: 'Inventario & Stock', section: 'GESTIÓN' }] : []),
    { to: '/clients', icon: Users, label: 'Cartera VIP Clientes', section: 'GESTIÓN' },
    ...(isAdmin ? [{ to: '/finance', icon: TrendingUp, label: 'Finanzas & P&L', section: 'GESTIÓN' }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavLinks = (closeMobile = false) => (
    <div className="flex flex-col h-full space-y-6">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 pt-2">
        <GlamOSEmblem size={42} />
        <div>
          <span className="font-bold text-2xl tracking-tight block leading-none">
            <span
              className="font-serif italic font-bold bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] bg-clip-text text-transparent"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Glam
            </span>
            <span
              className="text-gray-900 font-extrabold uppercase text-lg tracking-wider ml-0.5"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              OS
            </span>
          </span>
          <span className="text-[10px] font-bold text-amber-700/80 uppercase tracking-widest">
            Haute Salon Suite
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => closeMobile && setMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all group',
                item.primary
                  ? 'bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white shadow-md shadow-rose-900/15 hover:shadow-lg hover:scale-[1.02] my-2'
                  : isActive
                    ? 'bg-amber-100/70 text-amber-950 font-extrabold border border-amber-300/80 shadow-xs'
                    : 'text-gray-600 hover:bg-amber-50/50 hover:text-amber-950',
              )
            }
          >
            <item.icon
              className={cn(
                'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                item.primary ? 'text-white' : 'text-amber-700',
              )}
            />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info & Settings Footer */}
      <div className="pt-3 border-t border-amber-200/60 space-y-2">
        <NavLink
          to="/settings"
          onClick={() => closeMobile && setMobileMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors',
              isActive
                ? 'bg-amber-100 text-amber-900'
                : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900',
            )
          }
        >
          <Settings className="w-4 h-4 text-gray-500" />
          <span>Configuración</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
        >
          <LogOut className="w-4 h-4 text-gray-400" />
          <span>Cerrar Sesión</span>
        </button>

        {/* User Card */}
        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs">
            {user?.email?.[0].toUpperCase() || 'G'}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-gray-900 block truncate">
              {user?.email}
            </span>
            <span className="text-[10px] text-amber-800 font-semibold block truncate">
              {isAdmin ? 'Dueña / Administradora' : 'Estilista Profesional'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#FAF7F2] text-gray-900 relative overflow-hidden select-none">
      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-amber-200/60 bg-white/85 backdrop-blur-xl p-5 shadow-sm">
        {renderNavLinks(false)}
      </aside>

      {/* ── MOBILE / TABLET DRAWER OVERLAY ───────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[#FAF7F2] h-full p-5 border-r border-amber-200 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-900"
            >
              <X className="w-4 h-4" />
            </button>
            {renderNavLinks(true)}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 lg:pb-0">
        {/* Top Executive Header */}
        <header className="h-16 border-b border-amber-200/60 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile / Tablet */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-white border border-amber-200 text-gray-700 hover:bg-amber-50 hover:text-amber-900 shadow-xs"
              title="Abrir Menú"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo on smaller screens */}
            <div className="lg:hidden flex items-center gap-2">
              <GlamOSEmblem size={32} />
              <span className="font-bold text-lg tracking-tight">
                <span
                  className="font-serif italic font-bold bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] bg-clip-text text-transparent"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Glam
                </span>
                <span
                  className="text-gray-900 font-extrabold uppercase text-sm tracking-wider ml-0.5"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  OS
                </span>
              </span>
            </div>

            {/* Salon Badge on Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
                {isAdmin ? <Crown className="w-3.5 h-3.5 text-amber-600" /> : <Sparkles className="w-3.5 h-3.5 text-rose-500" />}
                {isAdmin ? 'Panel de Administración' : 'Terminal de Ventas'}
              </span>
            </div>
          </div>

          {/* User Profile on Header */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-gray-900 block truncate max-w-[220px]">
                {user?.email}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                {isAdmin ? 'Dueña / Administradora' : 'Estilista'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
              {user?.email?.[0].toUpperCase() || 'G'}
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 bg-[#FAF7F2]">
          <Outlet />
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ─────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-lg border-t border-amber-200/80 flex items-center justify-around px-2 z-40 safe-area-bottom shadow-lg">
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
                'flex flex-col items-center justify-center w-16 h-full gap-1 transition-all',
                item.primary
                  ? 'text-rose-600 -translate-y-1'
                  : isActive
                    ? 'text-amber-800 font-extrabold'
                    : 'text-gray-400 hover:text-gray-700',
              )
            }
          >
            {item.primary ? (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F6D365] to-[#E11D48] text-white flex items-center justify-center shadow-md shadow-rose-900/20">
                <PlusCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
            ) : (
              <item.icon className="w-5 h-5" strokeWidth={2} />
            )}
            <span className="text-[10px] font-bold">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
