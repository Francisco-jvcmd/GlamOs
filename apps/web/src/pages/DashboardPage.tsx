import { useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import {
  PlusCircle,
  Package,
  Cake,
  TrendingUp,
  Users,
  Receipt,
  Scissors,
  Crown,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  UserCheck,
  MessageCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import {
  formatCurrency,
  formatDate,
  ensureUuid,
  isTodayEcuador,
  getEcuadorHour,
  formatEditorialDateEcuador,
  getEcuadorDateString,
  getBirthdayDetails,
  getBirthdayWhatsAppUrl,
} from '../lib/utils';
import { MetricCard } from '../components/ui/MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'OWNER_ADMIN';
  const [adminViewMode, setAdminViewMode] = useState<'salon' | 'personal'>('salon');

  const { docs: sales, loading: salesLoading } = useCollection('sales');
  const { docs: clients, loading: clientsLoading } = useCollection('clients');
  const { docs: saleItems } = useCollection('sale_items');
  const { docs: services } = useCollection('services');
  const { docs: products } = useCollection('products');

  const userUuid = useMemo(() => (user?.sub ? ensureUuid(user?.sub) : null), [user?.sub]);
  const userDisplayName = useMemo(() => {
    if (user?.email) {
      const stored = localStorage.getItem(`glamos_user_name_${user.email}`);
      if (stored) return stored;
      const part = user.email.split('@')[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return localStorage.getItem('glamos_user_display_name') || 'José';
  }, [user]);

  // Función para determinar si una fecha corresponde a hoy en zona horaria oficial de Ecuador (America/Guayaquil)
  const isToday = isTodayEcuador;

  // Helper para saber si un item es producto
  const isItemProduct = (item: any) => {
    if (item.product_id) return true;
    if (item.service_id) return false;
    if (!products || products.length === 0) return false;
    const itemName = (item.name || '').trim().toLowerCase();
    return products.some((p: any) => p.name && p.name.trim().toLowerCase() === itemName);
  };

  // Función para obtener los items de una venta (servicios / productos)
  const getSaleItems = (sale: any) => {
    if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
      return sale.items;
    }
    const related = (saleItems || []).filter((it: any) => it.sale_id === sale.id);
    if (related.length > 0) {
      return related.map((it: any) => {
        let name = it.name;
        if (!name) {
          if (it.service_id) {
            const svc = (services || []).find((s: any) => s.id === it.service_id);
            name = svc?.name;
          } else if (it.product_id) {
            const prd = (products || []).find((p: any) => p.id === it.product_id);
            name = prd?.name;
          }
        }
        return {
          name: name || 'Servicio / Producto',
          quantity: it.quantity || 1,
          unit_price: it.unit_price || 0,
          line_total: it.line_total || 0,
          service_id: it.service_id || null,
          product_id: it.product_id || null,
        };
      });
    }
    return [
      {
        name: 'Servicio en Salón',
        quantity: 1,
        unit_price: sale.subtotal || sale.final_total || 0,
        line_total: sale.subtotal || sale.final_total || 0,
        service_id: 'default',
        product_id: null,
      },
    ];
  };

  // Nombre del cliente asociado a la venta
  const getSaleClientName = (sale: any) => {
    if (sale.client_name) return sale.client_name;
    if (sale.client_id) {
      const c = (clients || []).find((cl: any) => cl.id === sale.client_id);
      if (c?.full_name) return c.full_name;
    }
    return 'Cliente Ocasional';
  };

  // Nombre del empleado asociado a la venta
  const getSaleEmployeeName = (sale: any) => {
    return (
      sale.employee_name ||
      sale.stylist_name ||
      (sale.employee_id && sale.employee_id !== 'offline_user' ? sale.employee_id.slice(0, 8) : 'Estilista General')
    );
  };

  // Ventas válidas de todo el salón
  const validSalonSales = useMemo(() => {
    return (sales || []).filter((s) => !s.deleted_at && s.status !== 'VOIDED');
  }, [sales]);

  const sortedSalonSales = useMemo(() => {
    return [...validSalonSales].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [validSalonSales]);

  const todaySalonSales = useMemo(() => {
    return validSalonSales.filter((s) => isToday(s.created_at));
  }, [validSalonSales]);

  // Totales de hoy para todo el salón
  const todaySalonStats = useMemo(() => {
    let totalRevenue = 0;
    let tipsRevenue = 0;
    let servicesCount = 0;
    let servicesRevenue = 0;
    let productsCount = 0;
    let productsRevenue = 0;

    for (const sale of todaySalonSales) {
      totalRevenue += sale.final_total || 0;
      tipsRevenue += sale.tip_amount || 0;

      const items = getSaleItems(sale);
      for (const item of items) {
        const qty = item.quantity || 1;
        const total = item.line_total ?? ((item.unit_price || 0) * qty);
        if (isItemProduct(item)) {
          productsCount += qty;
          productsRevenue += total;
        } else {
          servicesCount += qty;
          servicesRevenue += total;
        }
      }
    }

    return {
      totalRevenue,
      tipsRevenue,
      servicesCount,
      servicesRevenue,
      productsCount,
      productsRevenue,
    };
  }, [todaySalonSales, saleItems, services, products]);

  // Rendimiento desglosado por empleado/personal
  const staffPerformance = useMemo(() => {
    const map = new Map<string, {
      name: string;
      totalRevenue: number;
      servicesCount: number;
      servicesRevenue: number;
      productsCount: number;
      productsRevenue: number;
      tipsRevenue: number;
      salesCount: number;
    }>();

    // Si hoy no hay ventas aún, analizar las últimas ventas del salón
    const salesToAnalyze = todaySalonSales.length > 0 ? todaySalonSales : sortedSalonSales.slice(0, 25);

    for (const sale of salesToAnalyze) {
      const name = getSaleEmployeeName(sale);

      const existing = map.get(name) || {
        name,
        totalRevenue: 0,
        servicesCount: 0,
        servicesRevenue: 0,
        productsCount: 0,
        productsRevenue: 0,
        tipsRevenue: 0,
        salesCount: 0,
      };

      existing.totalRevenue += sale.final_total || 0;
      existing.tipsRevenue += sale.tip_amount || 0;
      existing.salesCount += 1;

      const items = getSaleItems(sale);
      for (const item of items) {
        const qty = item.quantity || 1;
        const total = item.line_total ?? ((item.unit_price || 0) * qty);
        if (isItemProduct(item)) {
          existing.productsCount += qty;
          existing.productsRevenue += total;
        } else {
          existing.servicesCount += qty;
          existing.servicesRevenue += total;
        }
      }

      map.set(name, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [todaySalonSales, sortedSalonSales, saleItems, services, products]);

  // Ventas propias del empleado (resolución robusta y flexible)
  const mySales = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const matched = sales.filter((s) => {
      if (s.deleted_at || s.status === 'VOIDED') return false;
      // Coincidencia por sub o UUID sintetizado
      if (user?.sub && (s.employee_id === user.sub || s.employee_id === userUuid)) return true;
      // Coincidencia por email
      if (user?.email && (s.employee_id === user.email || s.employee_email === user.email)) return true;
      // Coincidencia por nombre de estilista
      if (
        userDisplayName &&
        (s.employee_name?.toLowerCase() === userDisplayName.toLowerCase() ||
          s.stylist_name?.toLowerCase() === userDisplayName.toLowerCase())
      ) {
        return true;
      }
      if (user?.email) {
        const emailPrefix = user.email.split('@')[0].toLowerCase();
        if (
          s.employee_name?.toLowerCase() === emailPrefix ||
          s.stylist_name?.toLowerCase() === emailPrefix
        ) {
          return true;
        }
      }
      // Fallback si fue una venta local
      if (!s.employee_id || s.employee_id === 'offline_user' || s.employee_id === 'demo_user') {
        return true;
      }
      return false;
    });

    if (matched.length === 0 && sales.length > 0) {
      return sales.filter((s) => !s.deleted_at && s.status !== 'VOIDED');
    }

    return matched;
  }, [sales, user, userUuid, userDisplayName]);

  // Ventas de hoy del empleado
  const myTodaySales = useMemo(() => {
    return mySales.filter((s) => isToday(s.created_at));
  }, [mySales]);

  // Ventas del empleado ordenadas cronológicamente (más recientes primero)
  const sortedMySales = useMemo(() => {
    return [...mySales].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [mySales]);

  // Totales de hoy del estilista discriminando Servicios y Productos
  const myTodayStats = useMemo(() => {
    let totalRevenue = 0;
    let tipsRevenue = 0;
    let servicesCount = 0;
    let servicesRevenue = 0;
    let productsCount = 0;
    let productsRevenue = 0;

    for (const sale of myTodaySales) {
      totalRevenue += sale.final_total || 0;
      tipsRevenue += sale.tip_amount || 0;

      const items = getSaleItems(sale);
      for (const item of items) {
        const qty = item.quantity || 1;
        const total = item.line_total ?? ((item.unit_price || 0) * qty);
        if (isItemProduct(item)) {
          productsCount += qty;
          productsRevenue += total;
        } else {
          servicesCount += qty;
          servicesRevenue += total;
        }
      }
    }

    return {
      totalRevenue,
      tipsRevenue,
      servicesCount,
      servicesRevenue,
      productsCount,
      productsRevenue,
    };
  }, [myTodaySales, saleItems, services, products]);

  // Cumpleaños próximos en zona horaria de Ecuador (hoy y próximos 3 días)
  const upcomingBirthdays = useMemo(() => {
    if (!clients || clients.length === 0) return [];
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
  }, [clients]);

  const firstName = user?.email?.split('@')[0] || 'Estilista';
  const hour = getEcuadorHour();
  const greeting =
    hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-7 max-w-6xl mx-auto select-none">
      {/* ── EDITORIAL GREETING & AMBIENT PROFILE ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isAdmin ? 'gold' : 'glam'} dot>
              {isAdmin ? <Crown className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5" />}
              {isAdmin ? 'Dueña / Administradora General' : 'Estilista Profesional'}
            </Badge>
            <span className="text-neutral-600 text-xs hidden sm:inline">·</span>
            <span className="text-[11px] font-semibold text-neutral-400 hidden sm:inline uppercase tracking-wider">
              {formatEditorialDateEcuador()}
            </span>
            {userDisplayName && (
              <span className="text-[11px] font-bold text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                {userDisplayName}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold font-editorial text-white tracking-tight leading-tight">
            {greeting},{' '}
            <span className="text-gradient-glam italic">
              {userDisplayName || firstName}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-400 font-normal">
            {isAdmin
              ? 'Resumen ejecutivo de recaudación, flujo de caja, cartera VIP y rendimiento del personal.'
              : 'Terminal de cobro inmediato, tus servicios, venta de productos y propinas de la jornada.'}
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto shrink-0">
          {isAdmin && (
            <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/10">
              <button
                type="button"
                onClick={() => setAdminViewMode('salon')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminViewMode === 'salon'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B88A22] text-neutral-950 shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Todo el Salón
              </button>
              <button
                type="button"
                onClick={() => setAdminViewMode('personal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  adminViewMode === 'personal'
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#B88A22] text-neutral-950 shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Mi Producción
              </button>
            </div>
          )}

          <Button
            onClick={() => navigate('/sales/new')}
            variant="glam"
            size="default"
            className="w-full sm:w-auto shadow-md"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            <span>Cobrar Servicio / Venta</span>
          </Button>
        </div>
      </div>

      {/* ── DASHBOARD PARA ESTILISTA / EMPLEADO (O MODO PERSONAL DEL ADMIN) ── */}
      {!isAdmin || adminViewMode === 'personal' ? (
        <div className="space-y-6">
          {/* Métricas del Estilista (4 Glass / Hero Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Mis Ventas de Hoy"
              value={salesLoading ? '...' : formatCurrency(myTodayStats.totalRevenue)}
              subtitle={`${myTodayStats.servicesCount} serv. · ${myTodayStats.productsCount} prod. facturados`}
              icon={<TrendingUp className="w-4 h-4 text-amber-300" />}
              variant="hero"
            />

            <MetricCard
              label="Servicios Realizados"
              value={`${myTodayStats.servicesCount} un.`}
              subtitle={`Total: ${formatCurrency(myTodayStats.servicesRevenue)}`}
              icon={<Scissors className="w-4 h-4 text-amber-300" />}
              variant="glass"
            />

            <MetricCard
              label="Productos Vendidos"
              value={`${myTodayStats.productsCount} un.`}
              subtitle={`Total: ${formatCurrency(myTodayStats.productsRevenue)}`}
              icon={<Package className="w-4 h-4 text-amber-300" />}
              variant="glass"
            />

            <MetricCard
              label="Propinas de Hoy"
              value={formatCurrency(myTodayStats.tipsRevenue)}
              subtitle="Fondo voluntario acumulado"
              icon={<Sparkles className="w-4 h-4 text-amber-300" />}
              variant="gold"
            />
          </div>

          {/* Banner de Cobro Rápido con Alta Joyería */}
          <div
            onClick={() => navigate('/sales/new')}
            className="p-6 rounded-3xl bg-neutral-900/80 text-white border border-amber-400/30 shadow-xl shadow-black/40 hover:border-amber-400/60 transition-all duration-300 cursor-pointer flex items-center justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 flex items-center justify-center shrink-0 shadow-lg shadow-black/30 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-7 h-7 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-amber-200 transition-colors">
                    Terminal de Nueva Venta & Cobro
                  </span>
                  <Badge variant="gold" className="hidden sm:inline-flex">0ms Latencia</Badge>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Selecciona cliente VIP, añade servicios de corte o balayage, productos y emite el recibo.
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-amber-200 group-hover:translate-x-1 group-hover:bg-white/20 transition-all shrink-0 ml-3">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          {/* Mis Servicios y Ventas Recientes con desglose completo */}
          <Card variant="glass">
            <CardHeader className="pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mis Servicios y Ventas Recientes</CardTitle>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Historial cronológico de cobros y productos registrados por {userDisplayName || 'ti'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/sales')}
                >
                  Ver Todo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {sortedMySales.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 space-y-2">
                  <Scissors className="w-8 h-8 mx-auto text-amber-400/50 stroke-1" />
                  <p className="text-xs font-semibold text-neutral-300">Aún no has registrado servicios o ventas hoy</p>
                  <p className="text-[11px] text-neutral-500">Pulsa en "Cobrar Servicio / Venta" para emitir tu primer comprobante.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedMySales.slice(0, 6).map((sale) => {
                    const items = getSaleItems(sale);
                    const clientName = getSaleClientName(sale);
                    const hasServices = items.some((it: any) => !isItemProduct(it));
                    const hasProducts = items.some((it: any) => isItemProduct(it));

                    return (
                      <div
                        key={sale.id}
                        onClick={() => navigate('/sales')}
                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-amber-400/40 hover:bg-white/[0.06] transition-all cursor-pointer group space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                              {hasServices && hasProducts ? (
                                <Sparkles className="w-5 h-5 text-amber-300" />
                              ) : hasProducts ? (
                                <Package className="w-5 h-5 text-amber-300" />
                              ) : (
                                <Scissors className="w-5 h-5 text-amber-300" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-white group-hover:text-amber-200 transition-colors">
                                  {clientName}
                                </span>
                                <span className="text-[10px] text-neutral-500 font-mono">#{sale.id.slice(0, 6).toUpperCase()}</span>
                                <Badge variant={sale.payment_method === 'CASH' ? 'gold' : 'glam'} className="text-[9px] py-0 px-1.5 h-4">
                                  {sale.payment_method}
                                </Badge>
                              </div>
                              <span className="text-[11px] text-neutral-400 block mt-0.5">
                                {formatDate(sale.created_at)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-editorial text-base sm:text-lg font-extrabold text-white block">
                              {formatCurrency(sale.final_total)}
                            </span>
                            {sale.tip_amount > 0 && (
                              <span className="text-[10px] font-semibold text-amber-300 block">
                                +{formatCurrency(sale.tip_amount)} propina
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Desglose de servicios y productos */}
                        <div className="pt-2 border-t border-white/[0.05] flex flex-wrap gap-1.5 items-center">
                          {items.map((it: any, idx: number) => {
                            const isProd = isItemProduct(it);
                            return (
                              <span
                                key={idx}
                                className={`text-[11px] px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                  isProd
                                    ? 'bg-neutral-800/80 text-amber-200/90 border-amber-400/20'
                                    : 'bg-white/[0.04] text-neutral-300 border-white/10'
                                }`}
                              >
                                {isProd ? (
                                  <Package className="w-3 h-3 text-amber-400 shrink-0" />
                                ) : (
                                  <Scissors className="w-3 h-3 text-amber-400 shrink-0" />
                                )}
                                <span className="font-bold text-white">{it.quantity || 1}x</span> {it.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ── DASHBOARD PARA ADMINISTRADOR / DUEÑA ─────────────────────────── */
        <div className="space-y-6">
          {/* Métricas Principales Admin (4 Glass Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Ventas del Salón (Hoy)"
              value={salesLoading ? '...' : formatCurrency(todaySalonStats.totalRevenue)}
              subtitle={`${todaySalonSales.length} cobros · ${todaySalonStats.servicesCount} serv. · ${todaySalonStats.productsCount} prod.`}
              icon={<TrendingUp className="w-4 h-4 text-amber-300" />}
              variant="hero"
            />

            <MetricCard
              label="Servicios Realizados"
              value={`${todaySalonStats.servicesCount} un.`}
              subtitle={`Total: ${formatCurrency(todaySalonStats.servicesRevenue)}`}
              icon={<Scissors className="w-4 h-4 text-amber-300" />}
              variant="glass"
            />

            <MetricCard
              label="Productos Vendidos"
              value={`${todaySalonStats.productsCount} un.`}
              subtitle={`Total: ${formatCurrency(todaySalonStats.productsRevenue)}`}
              icon={<Package className="w-4 h-4 text-amber-300" />}
              variant="glass"
            />

            <MetricCard
              label="Propinas del Salón"
              value={formatCurrency(todaySalonStats.tipsRevenue)}
              subtitle="Fondo voluntario acumulado"
              icon={<Sparkles className="w-4 h-4 text-amber-300" />}
              variant="gold"
            />
          </div>

          {/* Rendimiento y Producción del Personal */}
          <Card variant="glass">
            <CardHeader className="pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <span>Rendimiento y Producción del Personal</span>
                  </CardTitle>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {todaySalonSales.length > 0
                      ? 'Desglose en tiempo real de servicios y venta de productos por cada estilista hoy'
                      : 'Últimas ventas y servicios distribuidos por estilista en el salón'}
                  </p>
                </div>
                <Badge variant="gold">
                  {staffPerformance.length} {staffPerformance.length === 1 ? 'Estilista' : 'Estilistas'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {staffPerformance.length === 0 ? (
                <div className="py-8 text-center text-neutral-500 space-y-1.5">
                  <Users className="w-7 h-7 mx-auto text-amber-400/50 stroke-1" />
                  <p className="text-xs font-semibold text-neutral-300">Sin actividad registrada en la jornada</p>
                  <p className="text-[11px] text-neutral-500">Las ventas de cada estilista aparecerán aquí en cuanto se cobren.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {staffPerformance.map((sp, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-amber-400/40 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400/20 to-amber-200/10 border border-amber-400/30 text-amber-300 flex items-center justify-center font-bold text-sm">
                            {sp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-white block">
                              {sp.name}
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              {sp.salesCount} {sp.salesCount === 1 ? 'ticket cobrado' : 'tickets cobrados'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-editorial text-lg font-extrabold text-amber-300 block">
                            {formatCurrency(sp.totalRevenue)}
                          </span>
                          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                            Total Facturado
                          </span>
                        </div>
                      </div>

                      {/* Desglose de Servicios, Productos y Propinas del estilista */}
                      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-white/[0.06] text-center">
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <span className="text-[10px] text-neutral-400 block font-medium">Servicios</span>
                          <span className="text-xs font-bold text-white block mt-0.5">
                            {sp.servicesCount} un.
                          </span>
                          <span className="text-[10px] text-amber-300/80 font-semibold block">
                            {formatCurrency(sp.servicesRevenue)}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <span className="text-[10px] text-neutral-400 block font-medium">Productos</span>
                          <span className="text-xs font-bold text-white block mt-0.5">
                            {sp.productsCount} un.
                          </span>
                          <span className="text-[10px] text-amber-300/80 font-semibold block">
                            {formatCurrency(sp.productsRevenue)}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <span className="text-[10px] text-neutral-400 block font-medium">Propinas</span>
                          <span className="text-xs font-bold text-amber-300 block mt-0.5">
                            {formatCurrency(sp.tipsRevenue)}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-semibold block">
                            Voluntarias
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerta de Cumpleaños VIP con Notificación y Envío de WhatsApp */}
          {!clientsLoading && upcomingBirthdays.length > 0 && (
            <Card variant="glass" className="border-amber-400/30 bg-gradient-to-r from-amber-950/30 via-neutral-900/90 to-neutral-950 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <CardContent className="p-5 sm:p-6 space-y-4 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 flex items-center justify-center shrink-0 shadow-lg shadow-black/30 animate-pulse">
                      <Cake className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-editorial text-lg sm:text-xl font-bold text-white tracking-tight">
                          Notificación VIP: Cumpleaños Cercanos
                        </h3>
                        <Badge variant="gold" dot className="font-bold">
                          {upcomingBirthdays.length} {upcomingBirthdays.length === 1 ? 'clienta' : 'clientas'}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Felicita a tus clientas con 1 toque por WhatsApp e invítalas al salón con una cortesía especial.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/clients')}
                    className="shrink-0 text-xs"
                  >
                    Ver Cartera
                  </Button>
                </div>

                {/* Lista de Cumpleañeras con Botón Directo de WhatsApp */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcomingBirthdays.map(({ client: c, details }) => {
                    const phone = c.phone_whatsapp || c.phone;
                    const waUrl = getBirthdayWhatsAppUrl(c.full_name, phone);

                    return (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          details.isToday
                            ? 'bg-amber-500/10 border-amber-400/40 shadow-[0_0_15px_rgba(212,175,55,0.15)]'
                            : 'bg-white/[0.03] border-white/[0.08] hover:border-amber-400/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-sm text-white block truncate">
                              {c.full_name}
                            </span>
                            <span className="text-[11px] text-neutral-400 block mt-0.5">
                              {phone || 'Sin WhatsApp'}
                            </span>
                          </div>
                          <Badge
                            variant={details.isToday ? 'gold' : 'glam'}
                            className={`text-[10px] shrink-0 font-bold ${
                              details.isToday ? 'animate-bounce' : ''
                            }`}
                          >
                            🎂 {details.label}
                          </Badge>
                        </div>

                        {phone ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 group"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <span>Enviar WhatsApp</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate('/clients')}
                            className="w-full py-2 px-3 rounded-xl bg-white/[0.04] text-neutral-400 hover:text-white border border-white/10 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <span>Añadir WhatsApp</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Módulos de Gestión de Alta Gama (4 Cards Interactivas) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-interface">
                Módulos de Gestión & Operaciones
              </h2>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Acceso Total
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: POS Terminal (Signature Champagne Gold Highlight) */}
              <div
                onClick={() => navigate('/sales/new')}
                className="p-5 rounded-3xl bg-gradient-to-br from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 shadow-[0_10px_30px_rgba(212,175,55,0.25)] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)] hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-950/20 flex items-center justify-center text-neutral-950 backdrop-blur-md">
                    <PlusCircle className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="mt-6">
                  <h3 className="font-editorial text-xl font-bold text-neutral-950 tracking-tight">
                    Nueva Venta
                  </h3>
                  <p className="text-xs text-neutral-900/80 font-medium mt-0.5">Terminal POS y cobro rápido</p>
                </div>
              </div>

              {/* Card 2: Finanzas */}
              <div
                onClick={() => navigate('/finance')}
                className="p-5 rounded-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/[0.08] shadow-lg hover:border-amber-400/40 hover:bg-neutral-900/90 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06] text-amber-300 flex items-center justify-center border border-white/10 group-hover:border-amber-400/30">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="mt-6">
                  <h3 className="font-editorial text-xl font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                    Finanzas & P&L
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Gastos fijos, margen y utilidad</p>
                </div>
              </div>

              {/* Card 3: Servicios */}
              <div
                onClick={() => navigate('/services')}
                className="p-5 rounded-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/[0.08] shadow-lg hover:border-amber-400/40 hover:bg-neutral-900/90 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06] text-amber-300 flex items-center justify-center border border-white/10 group-hover:border-amber-400/30">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="mt-6">
                  <h3 className="font-editorial text-xl font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                    Servicios
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Menú de cortes, tintes y spa</p>
                </div>
              </div>

              {/* Card 4: Inventario */}
              <div
                onClick={() => navigate('/inventory')}
                className="p-5 rounded-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/[0.08] shadow-lg hover:border-amber-400/40 hover:bg-neutral-900/90 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06] text-amber-300 flex items-center justify-center border border-white/10 group-hover:border-amber-400/30">
                    <Package className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
                <div className="mt-6">
                  <h3 className="font-editorial text-xl font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                    Inventario & Stock
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Cosméticos y control de insumos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Últimos Cobros en Salón con desglose de items y personal */}
          <Card variant="glass">
            <CardHeader className="pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Últimos Cobros en el Salón</CardTitle>
                  <p className="text-xs text-neutral-400 mt-0.5">Transacciones consolidadas con desglose de personal y productos</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/sales')}
                >
                  Ver Todo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {sortedSalonSales.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 space-y-2">
                  <Receipt className="w-8 h-8 mx-auto text-amber-400/50 stroke-1" />
                  <p className="text-xs font-semibold text-neutral-300">Aún no hay cobros registrados</p>
                  <p className="text-[11px] text-neutral-500">Las ventas completadas aparecerán en este registro.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSalonSales.slice(0, 5).map((sale) => {
                    const items = getSaleItems(sale);
                    const clientName = getSaleClientName(sale);
                    const employeeName = getSaleEmployeeName(sale);
                    const hasServices = items.some((it: any) => !isItemProduct(it));
                    const hasProducts = items.some((it: any) => isItemProduct(it));

                    return (
                      <div
                        key={sale.id}
                        onClick={() => navigate('/sales')}
                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-amber-400/40 hover:bg-white/[0.06] transition-all cursor-pointer group space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                              {hasServices && hasProducts ? (
                                <Sparkles className="w-5 h-5 text-amber-300" />
                              ) : hasProducts ? (
                                <Package className="w-5 h-5 text-amber-300" />
                              ) : (
                                <Scissors className="w-5 h-5 text-amber-300" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-white group-hover:text-amber-200 transition-colors">
                                  {clientName}
                                </span>
                                <span className="text-[10px] text-neutral-500 font-mono">#{sale.id.slice(0, 6).toUpperCase()}</span>
                                <Badge variant="gold" className="text-[9px] py-0 px-1.5 h-4">
                                  {employeeName}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4">
                                  {sale.payment_method}
                                </Badge>
                              </div>
                              <span className="text-[11px] text-neutral-400 block mt-0.5">
                                {formatDate(sale.created_at)}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-editorial text-base sm:text-lg font-extrabold text-white block">
                              {formatCurrency(sale.final_total)}
                            </span>
                            {sale.tip_amount > 0 && (
                              <span className="text-[10px] font-semibold text-amber-300 block">
                                +{formatCurrency(sale.tip_amount)} propina
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Desglose de servicios y productos */}
                        <div className="pt-2 border-t border-white/[0.05] flex flex-wrap gap-1.5 items-center">
                          {items.map((it: any, idx: number) => {
                            const isProd = isItemProduct(it);
                            return (
                              <span
                                key={idx}
                                className={`text-[11px] px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                  isProd
                                    ? 'bg-neutral-800/80 text-amber-200/90 border-amber-400/20'
                                    : 'bg-white/[0.04] text-neutral-300 border-white/10'
                                }`}
                              >
                                {isProd ? (
                                  <Package className="w-3 h-3 text-amber-400 shrink-0" />
                                ) : (
                                  <Scissors className="w-3 h-3 text-amber-400 shrink-0" />
                                )}
                                <span className="font-bold text-white">{it.quantity || 1}x</span> {it.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
