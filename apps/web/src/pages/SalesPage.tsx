import { useState, useMemo } from 'react';
import { useAuth } from '../auth/auth-context';
import { useCollection } from '../hooks/useCollection';
import { formatCurrency, formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  PlusCircle,
  Receipt,
  Search,
  Wallet,
  CreditCard,
  ArrowRightLeft,
  Printer,
  Sparkles,
  TrendingUp,
  Calendar,
  User,
  Scissors,
  Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SalesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { docs: sales, loading } = useCollection('sales', { sort: [{ created_at: 'desc' }] });
  const { docs: saleItems } = useCollection('sale_items');
  const { docs: services } = useCollection('services');
  const { docs: products } = useCollection('products');
  const { docs: clients } = useCollection('clients');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<'ALL' | 'CASH' | 'TRANSFER' | 'MIXED'>('ALL');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // Obtener nombre del profesional emisor de la venta
  const getSaleAttendant = (sale: any) => {
    if (sale.employee_name) return sale.employee_name;
    if (sale.stylist_name) return sale.stylist_name;
    if (user?.email) {
      const customName = localStorage.getItem(`glamos_user_name_${user.email}`);
      if (customName) return customName;
      const part = user.email.split('@')[0];
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return localStorage.getItem('glamos_user_display_name') || 'José';
  };

  // Obtener nombre del cliente
  const getSaleClient = (sale: any) => {
    if (sale.client_name) return sale.client_name;
    if (sale.client_id) {
      const client = (clients || []).find((c: any) => c.id === sale.client_id);
      if (client?.full_name) return client.full_name;
    }
    return 'Cliente Ocasional';
  };

  // Obtener items desglosados de la venta
  const getSaleItems = (sale: any) => {
    if (sale?.items && Array.isArray(sale.items) && sale.items.length > 0) {
      return sale.items;
    }
    const related = (saleItems || []).filter((it: any) => it.sale_id === sale?.id);
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
          unit_price: it.unit_price || (it.line_total / (it.quantity || 1)),
          line_total: it.line_total || 0,
        };
      });
    }
    return [
      {
        name: 'Servicio / Consumo en Salón',
        quantity: 1,
        unit_price: sale?.subtotal || sale?.final_total || 0,
        line_total: sale?.subtotal || sale?.final_total || 0,
      },
    ];
  };

  // Financial KPIs
  const stats = useMemo(() => {
    let total = 0;
    let cash = 0;
    let transfer = 0;
    let tips = 0;

    for (const s of sales) {
      if (s.status === 'COMPLETED' && !s.deleted_at) {
        const finalTot = s.final_total || s.total_amount || 0;
        total += finalTot;
        tips += s.tip_amount || 0;

        if (s.payment_method === 'CASH') {
          cash += s.cash_amount || finalTot;
        } else if (s.payment_method === 'TRANSFER') {
          transfer += s.transfer_amount || finalTot;
        } else if (s.payment_method === 'MIXED') {
          cash += s.cash_amount || 0;
          transfer += s.transfer_amount || 0;
        }
      }
    }

    return { total, cash, transfer, tips };
  }, [sales]);

  const filteredSales = useMemo(() => {
    return (sales || []).filter((s) => {
      if (s.deleted_at) return false;
      const matchesMethod = filterMethod === 'ALL' || s.payment_method === filterMethod;
      const attendant = getSaleAttendant(s).toLowerCase();
      const client = getSaleClient(s).toLowerCase();
      const items = getSaleItems(s).map((it: any) => it.name.toLowerCase()).join(' ');

      const matchesSearch =
        s.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.payment_method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendant.includes(searchTerm.toLowerCase()) ||
        client.includes(searchTerm.toLowerCase()) ||
        items.includes(searchTerm.toLowerCase()) ||
        s.created_at?.includes(searchTerm);
      return matchesMethod && matchesSearch;
    });
  }, [sales, filterMethod, searchTerm, saleItems, services, products, clients]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 select-none">
      {/* ── EDITORIAL PAGE HEADER ────────────────────────────────────────── */}
      <PageHeader
        title="Libro Diario de Ventas"
        subtitle="Registro cronológico y fiscal de cobros, transacciones y propinas del salón."
        badge="Caja & Facturación"
        badgeVariant="gold"
        actions={
          <Button
            onClick={() => navigate('/sales/new')}
            variant="glam"
            size="default"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Nueva Venta
          </Button>
        }
      />

      {/* ── METRICS SUMMARY CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard
          label="Total Recaudado"
          value={formatCurrency(stats.total)}
          subtitle={`${sales.length} transacciones`}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="hero"
        />

        <MetricCard
          label="En Efectivo"
          value={formatCurrency(stats.cash)}
          subtitle="En caja física"
          icon={<Wallet className="w-4 h-4" />}
          variant="glass"
        />

        <MetricCard
          label="Transferencias"
          value={formatCurrency(stats.transfer)}
          subtitle="Bancos & Digital"
          icon={<CreditCard className="w-4 h-4" />}
          variant="glass"
        />

        <MetricCard
          label="Propinas Equipo"
          value={formatCurrency(stats.tips)}
          subtitle="Fondo voluntario"
          icon={<Sparkles className="w-4 h-4" />}
          variant="gold"
        />
      </div>

      {/* ── SEARCH & FILTER TABS ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por folio, fecha o método de pago..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-white/10 bg-neutral-900/80 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 shadow-2xs backdrop-blur-sm"
          />
        </div>

        <div className="flex rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-1 shrink-0 overflow-x-auto no-scrollbar">
          {(['ALL', 'CASH', 'TRANSFER', 'MIXED'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setFilterMethod(method)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterMethod === method
                  ? 'bg-white/[0.1] text-amber-300 shadow-2xs font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {method === 'ALL'
                ? 'Todos'
                : method === 'CASH'
                ? 'Efectivo'
                : method === 'TRANSFER'
                ? 'Transf.'
                : 'Mixto'}
            </button>
          ))}
        </div>
      </div>

      {/* ── LISTA DE VENTAS ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-neutral-400 font-medium">Cargando libro de ventas...</div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900/50 backdrop-blur-xl rounded-3xl border border-dashed border-white/10 space-y-3 p-8">
          <Receipt className="w-12 h-12 mx-auto text-amber-400/50 stroke-1" />
          <div className="font-editorial text-2xl font-bold text-white">No hay ventas registradas</div>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Registra tu primer cobro desde el botón "Nueva Venta" para comenzar a poblar el reporte.
          </p>
          <Button
            onClick={() => navigate('/sales/new')}
            variant="glam"
            className="mt-2"
          >
            Abrir Terminal de Cobro
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSales.map((sale) => {
            const finalVal = sale.final_total || sale.total_amount || 0;
            const items = getSaleItems(sale);
            const attendant = getSaleAttendant(sale);
            const client = getSaleClient(sale);

            return (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className="p-4 sm:p-5 rounded-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/[0.08] hover:border-amber-400/40 hover:bg-neutral-900/80 transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {sale.payment_method === 'CASH' ? (
                      <Wallet className="w-5 h-5 text-amber-400" />
                    ) : sale.payment_method === 'TRANSFER' ? (
                      <CreditCard className="w-5 h-5 text-amber-300" />
                    ) : (
                      <ArrowRightLeft className="w-5 h-5 text-amber-200" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-neutral-400">
                        #{sale.id.slice(0, 8).toUpperCase()}
                      </span>
                      <Badge
                        variant={
                          sale.payment_method === 'CASH'
                            ? 'gold'
                            : sale.payment_method === 'TRANSFER'
                            ? 'glass'
                            : 'glam'
                        }
                      >
                        {sale.payment_method === 'CASH'
                          ? 'Efectivo'
                          : sale.payment_method === 'TRANSFER'
                          ? 'Transferencia'
                          : 'Cobro Mixto'}
                      </Badge>
                    </div>

                    {/* Desglose de servicios y productos realizados */}
                    <div className="text-xs font-medium text-neutral-200 mt-1 truncate">
                      {items.map((it: any) => `${it.quantity}x ${it.name}`).join(' · ')}
                    </div>

                    <div className="text-[11px] text-neutral-400 mt-1 flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-neutral-400">
                        <Calendar className="w-3 h-3 text-neutral-500" />
                        <span>{formatDate(sale.created_at)}</span>
                      </div>
                      <span className="text-neutral-600">•</span>
                      <div className="flex items-center gap-1 text-amber-300 font-medium">
                        <User className="w-3 h-3 text-amber-400" />
                        <span>{attendant}</span>
                      </div>
                      <span className="text-neutral-600">•</span>
                      <span className="text-neutral-400 truncate max-w-[140px]">
                        {client}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xl sm:text-2xl font-bold text-white font-editorial tracking-tight">
                    {formatCurrency(finalVal)}
                  </span>
                  {sale.tip_amount > 0 && (
                    <span className="text-[10px] text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded-md mt-0.5 border border-amber-400/20">
                      +{formatCurrency(sale.tip_amount)} propina
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: DETALLE DEL COMPROBANTE ──────────────────────────────────── */}
      {selectedSale && (() => {
        const modalItems = getSaleItems(selectedSale);
        const attendantName = getSaleAttendant(selectedSale);
        const clientName = getSaleClient(selectedSale);

        return (
          <Modal
            isOpen={!!selectedSale}
            onClose={() => setSelectedSale(null)}
            title="Comprobante de Venta"
            subtitle={`Ticket fiscal #${selectedSale.id.slice(0, 10).toUpperCase()}`}
            icon={<Receipt className="w-5 h-5" />}
          >
            <div id="printable-ticket" className="bg-black/60 rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-3 font-mono text-xs text-neutral-300">
              {/* Encabezado del Comprobante */}
              <div className="flex justify-between font-sans pb-1">
                <span className="font-semibold text-neutral-400">Folio:</span>
                <span className="font-mono text-white font-bold">#{selectedSale.id.slice(0, 10).toUpperCase()}</span>
              </div>
              <div className="flex justify-between font-sans pb-1">
                <span className="font-semibold text-neutral-400">Fecha y Hora:</span>
                <span className="text-white">{formatDate(selectedSale.created_at)}</span>
              </div>
              <div className="flex justify-between font-sans pb-1">
                <span className="font-semibold text-neutral-400">Atendido por:</span>
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  {attendantName}
                </span>
              </div>
              <div className="flex justify-between font-sans pb-1">
                <span className="font-semibold text-neutral-400">Cliente VIP:</span>
                <span className="text-white font-medium">{clientName}</span>
              </div>

              {/* Sección de Servicios y Productos Realizados */}
              <div className="pt-2.5 border-t border-white/[0.08] space-y-2 font-sans">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Servicios & Productos Realizados ({modalItems.length})
                  </span>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 no-scrollbar">
                  {modalItems.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-white/[0.04] p-2.5 rounded-xl border border-white/[0.06] text-xs font-sans"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-white block truncate">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {formatCurrency(item.unit_price || (item.line_total / (item.quantity || 1)))} c/u
                        </span>
                      </div>
                      <span className="font-editorial text-sm font-bold text-white shrink-0">
                        {formatCurrency(item.line_total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totales Financieros */}
              <div className="pt-2.5 border-t border-white/[0.08] space-y-1 font-sans text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Subtotal:</span>
                  <span className="text-neutral-200">{formatCurrency(selectedSale.subtotal || selectedSale.final_total)}</span>
                </div>
                {selectedSale.discount_total > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Descuento Aplicado:</span>
                    <span>-{formatCurrency(selectedSale.discount_total)}</span>
                  </div>
                )}
                {selectedSale.tip_amount > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Propina Voluntaria:</span>
                    <span>+{formatCurrency(selectedSale.tip_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white pt-2 border-t border-white/[0.08]">
                  <span>Total Cobrado:</span>
                  <span className="font-editorial text-xl text-gradient-glam font-bold">
                    {formatCurrency(selectedSale.final_total || selectedSale.total_amount)}
                  </span>
                </div>
              </div>

              {/* Desglose de forma de cobro */}
              <div className="pt-2.5 border-t border-white/[0.08] font-sans text-xs">
                <span className="font-semibold text-neutral-400 block mb-1">Método de Cobro:</span>
                {selectedSale.payment_method === 'CASH' && (
                  <div className="text-white">💵 100% Efectivo en caja física</div>
                )}
                {selectedSale.payment_method === 'TRANSFER' && (
                  <div className="text-white">💳 100% Transferencia Bancaria Directa</div>
                )}
                {selectedSale.payment_method === 'MIXED' && (
                  <div className="space-y-1 text-white bg-white/[0.04] p-2.5 rounded-xl border border-white/10">
                    <div>💵 Efectivo: {formatCurrency(selectedSale.cash_amount || 0)}</div>
                    <div>💳 Transferencia: {formatCurrency(selectedSale.transfer_amount || 0)}</div>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={() => window.print()}
              variant="glass"
              className="w-full mt-3"
            >
              <Printer className="w-4 h-4 mr-2 text-amber-400" />
              <span>Imprimir Ticket de Venta</span>
            </Button>
          </Modal>
        );
      })()}
    </div>
  );
}
