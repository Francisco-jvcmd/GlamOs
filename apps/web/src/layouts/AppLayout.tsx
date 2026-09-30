import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Package, Users, Settings, PlusCircle, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../auth/auth-context';
import { cn } from '../lib/utils';

export function AppLayout() {
  const { user } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Inicio' },
    { to: '/sales', icon: Receipt, label: 'Ventas' },
    { to: '/sales/new', icon: PlusCircle, label: 'Nueva Venta', primary: true },
    { to: '/inventory', icon: Package, label: 'Inventario' },
    { to: '/clients', icon: Users, label: 'Clientes' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-white p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8A87C] to-[#C6426E] flex items-center justify-center text-white font-bold shadow-md shadow-rose-200/50">G</div>
          <span className="font-bold text-xl tracking-tight">
            <span className="bg-gradient-to-r from-[#C6426E] to-[#E8A87C] bg-clip-text text-transparent">Glam</span>
            <span className="text-gray-800">OS</span>
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
          {user?.role === 'OWNER_ADMIN' && (
            <NavLink
              to="/finance"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mt-1",
                isActive ? "bg-rose-50 text-rose-600 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              Finanzas
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
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E8A87C] to-[#C6426E] flex items-center justify-center text-white text-xs font-bold shadow-sm">G</div>
            <span className="font-bold">
              <span className="bg-gradient-to-r from-[#C6426E] to-[#E8A87C] bg-clip-text text-transparent">Glam</span>
              <span className="text-gray-800">OS</span>
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
          { to: '/inventory', icon: Package, label: 'Stock' },
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
