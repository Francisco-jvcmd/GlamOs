import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SalesPage() {
  const navigate = useNavigate();
  const { docs: sales, loading } = useCollection('sales', { sort: [{ created_at: 'desc' }] });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<'ALL' | 'CASH' | 'TRANSFER' | 'MIXED'>('ALL');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

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
      const matchesSearch =
        s.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.payment_method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.created_at?.includes(searchTerm);
      return matchesMethod && matchesSearch;
    });
  }, [sales, filterMethod, searchTerm]);

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
          variant="noir"
        />

        <MetricCard
          label="En Efectivo"
          value={formatCurrency(stats.cash)}
          subtitle="En caja física"
          icon={<Wallet className="w-4 h-4" />}
          variant="gold"
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
          variant="hero"
        />
      </div>

      {/* ── SEARCH & FILTER TABS ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por folio, fecha o método de pago..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-2xl border border-amber-200/80 bg-white/90 text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-amber-400 focus:ring-3 focus:ring-amber-400/20 shadow-2xs"
          />
        </div>

        <div className="flex rounded-2xl bg-white/80 backdrop-blur-md border border-amber-200/80 p-1 shrink-0 overflow-x-auto no-scrollbar">
          {(['ALL', 'CASH', 'TRANSFER', 'MIXED'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setFilterMethod(method)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMethod === method
                  ? 'bg-amber-100/90 text-amber-950 shadow-2xs font-black'
                  : 'text-gray-500 hover:text-gray-900'
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
        <div className="p-16 text-center text-gray-400 font-medium">Cargando libro de ventas...</div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-16 bg-white/80 backdrop-blur-xl rounded-3xl border border-dashed border-amber-200 space-y-3 p-8">
          <Receipt className="w-12 h-12 mx-auto text-amber-300 stroke-1" />
          <div className="font-editorial text-2xl font-bold text-gray-900">No hay ventas registradas</div>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
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
            return (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className="p-4 sm:p-5 rounded-3xl bg-white/85 backdrop-blur-xl border border-amber-200/70 hover:border-amber-400 hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {sale.payment_method === 'CASH' ? (
                      <Wallet className="w-5 h-5 text-amber-700" />
                    ) : sale.payment_method === 'TRANSFER' ? (
                      <CreditCard className="w-5 h-5 text-blue-700" />
                    ) : (
                      <ArrowRightLeft className="w-5 h-5 text-purple-700" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gray-600">
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
                    <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(sale.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xl sm:text-2xl font-black text-gray-950 font-editorial tracking-tight">
                    {formatCurrency(finalVal)}
                  </span>
                  {sale.tip_amount > 0 && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5 border border-emerald-200/60">
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
      {selectedSale && (
        <Modal
          isOpen={!!selectedSale}
          onClose={() => setSelectedSale(null)}
          title="Comprobante de Venta"
          subtitle={`Ticket fiscal #${selectedSale.id.slice(0, 10).toUpperCase()}`}
          icon={<Receipt className="w-5 h-5" />}
        >
          <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-amber-200/60 space-y-3 font-mono text-xs">
            <div className="flex justify-between text-gray-600 font-sans">
              <span className="font-bold">Folio:</span>
              <span className="font-mono">#{selectedSale.id.slice(0, 10).toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-gray-600 font-sans">
              <span className="font-bold">Fecha:</span>
              <span>{formatDate(selectedSale.created_at)}</span>
            </div>

            <div className="pt-2 border-t border-gray-200 space-y-1 font-sans text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedSale.subtotal || selectedSale.final_total)}</span>
              </div>
              {selectedSale.discount_total > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Descuento:</span>
                  <span>-{formatCurrency(selectedSale.discount_total)}</span>
                </div>
              )}
              {selectedSale.tip_amount > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>Propina:</span>
                  <span>+{formatCurrency(selectedSale.tip_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Cobrado:</span>
                <span className="font-editorial text-xl text-rose-600 font-black">
                  {formatCurrency(selectedSale.final_total || selectedSale.total_amount)}
                </span>
              </div>
            </div>

            {/* Desglose de forma de cobro */}
            <div className="pt-2 border-t border-gray-200 font-sans text-xs">
              <span className="font-bold text-gray-700 block mb-1">Método de Cobro:</span>
              {selectedSale.payment_method === 'CASH' && (
                <div className="text-gray-600">💵 100% Efectivo en caja física</div>
              )}
              {selectedSale.payment_method === 'TRANSFER' && (
                <div className="text-gray-600">💳 100% Transferencia Bancaria Directa</div>
              )}
              {selectedSale.payment_method === 'MIXED' && (
                <div className="space-y-1 text-gray-600 bg-white p-2.5 rounded-xl border border-gray-200">
                  <div>💵 Efectivo: {formatCurrency(selectedSale.cash_amount || 0)}</div>
                  <div>💳 Transferencia: {formatCurrency(selectedSale.transfer_amount || 0)}</div>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={() => window.print()}
            variant="glass"
            className="w-full mt-2"
          >
            <Printer className="w-4 h-4 mr-2 text-amber-700" />
            <span>Imprimir Ticket de Venta</span>
          </Button>
        </Modal>
      )}
    </div>
  );
}
