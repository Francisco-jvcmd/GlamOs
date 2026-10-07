import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Package, Users, Settings, PlusCircle, MoreHorizontal, Scissors, TrendingUp } from 'lucide-react';
import { useAuth } from '../auth/auth-context';
import { cn } from '../lib/utils';
import { GlamOSEmblem } from '../components/GlamOSLogo';
import { SyncBanner } from '../components/SyncBanner';

export function AppLayout() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'OWNER_ADMIN';

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Inicio' },
    { to: '/sales', icon: Receipt, label: 'Ventas' },
    { to: '/sales/new', icon: PlusCircle, label: 'Nueva Venta', primary: true },
    { to: '/services', icon: Scissors, label: 'Servicios' },
    ...(isAdmin ? [{ to: '/inventory', icon: Package, label: 'Inventario' }] : []),
    { to: '/clients', icon: Users, label: 'Clientes' },
  ];

  return (
    <div className="flex h-screen bg-[#FAF7F2] text-gray-900 relative">
      <SyncBanner />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-amber-100 bg-white/80 backdrop-blur-md p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <GlamOSEmblem size={40} />
          <span className="font-bold text-2xl tracking-tight">
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
        </div>
        
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive ? "bg-rose-50 text-rose-600 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                item.primary && "bg-rose-500 text-white hover:bg-rose-600 hover:text-white font-medium shadow-sm mt-4"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/finance"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mt-1",
                isActive ? "bg-amber-50 text-amber-800 font-semibold border border-amber-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <TrendingUp className="w-5 h-5 text-amber-600" />
              Finanzas & P&L
            </NavLink>
          )}
        </nav>

        <div className="mt-auto border-t pt-4">
          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              isActive ? "bg-rose-50 text-rose-600 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Settings className="w-5 h-5" />
            Configuración
          </NavLink>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
        <header className="h-14 border-b bg-white flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="md:hidden flex items-center gap-2">
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
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm font-medium hidden sm:block">{user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 font-bold text-sm">
              {user?.email?.[0].toUpperCase()}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-gray-50">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around px-2 z-50 safe-area-bottom">
        {[
          { to: '/', icon: LayoutDashboard, label: 'Inicio' },
          { to: '/sales', icon: Receipt, label: 'Ventas' },
          { to: '/sales/new', icon: PlusCircle, label: 'Vender', primary: true },
          ...(isAdmin
            ? [{ to: '/inventory', icon: Package, label: 'Stock' }]
            : [{ to: '/clients', icon: Users, label: 'Clientes' }]),
          { to: '/settings', icon: Settings, label: 'Ajustes' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center w-16 h-full gap-1",
              isActive ? "text-rose-600" : "text-gray-500 hover:text-gray-900",
              item.primary && "text-rose-500"
            )}
          >
            <item.icon className={cn("w-6 h-6", item.primary && "w-8 h-8")} strokeWidth={item.primary ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
