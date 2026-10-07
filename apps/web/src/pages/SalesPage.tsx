import { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import {
  PlusCircle,
  Receipt,
  Search,
  Wallet,
  CreditCard,
  ArrowRightLeft,
  Printer,
  X,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SalesPage() {
  const navigate = useNavigate();
  const { docs: sales, loading } = useCollection('sales', { sort: [{ created_at: 'desc' }] });
  const { docs: clients } = useCollection('clients');

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
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-amber-200/60">
        <div>
          <h1
            className="text-3xl font-bold font-serif text-gray-900"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Libro Diario de Ventas
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Registro cronológico y fiscal de cobros, transacciones y propinas del salón.
          </p>
        </div>
        <Button
          onClick={() => navigate('/sales/new')}
          className="bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold shadow-md hover:shadow-lg transition-all"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Nueva Venta
        </Button>
      </div>

      {/* ── METRICS SUMMARY CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Total Recaudado</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 font-serif">
            {formatCurrency(stats.total)}
          </div>
          <p className="text-[10px] text-gray-400">{sales.length} transacciones</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>En Efectivo</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 font-serif">
            {formatCurrency(stats.cash)}
          </div>
          <p className="text-[10px] text-gray-400">En caja física</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Transferencias</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-gray-900 font-serif">
            {formatCurrency(stats.transfer)}
          </div>
          <p className="text-[10px] text-gray-400">Banco / Digital</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Propinas Equipo</span>
            <Sparkles className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-extrabold text-rose-600 font-serif">
            {formatCurrency(stats.tips)}
          </div>
          <p className="text-[10px] text-gray-400">Fondo voluntario</p>
        </div>
      </div>

      {/* ── SEARCH & FILTERS ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por folio, fecha o método..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-amber-200/80 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
          />
        </div>

        <div className="flex rounded-xl bg-white border border-amber-200/80 p-1 shrink-0">
          {(['ALL', 'CASH', 'TRANSFER', 'MIXED'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setFilterMethod(method)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterMethod === method
                  ? 'bg-amber-100 text-amber-900'
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
        <div className="p-12 text-center text-gray-400">Cargando libro de ventas...</div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-amber-200 space-y-3">
          <Receipt className="w-10 h-10 mx-auto text-amber-300 stroke-1" />
          <div className="font-bold text-gray-800 text-base">No hay ventas registradas</div>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Registra tu primer cobro desde el botón "Nueva Venta" para comenzar a poblar el reporte.
          </p>
          <Button
            onClick={() => navigate('/sales/new')}
            className="mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
          >
            Abrir Terminal de Cobro
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSales.map((sale) => {
            const finalVal = sale.final_total || sale.total_amount || 0;
            return (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className="p-4 rounded-2xl bg-white border border-amber-100/80 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {sale.payment_method === 'CASH' ? (
                      <Wallet className="w-5 h-5 text-amber-700" />
                    ) : sale.payment_method === 'TRANSFER' ? (
                      <CreditCard className="w-5 h-5 text-blue-700" />
                    ) : (
                      <ArrowRightLeft className="w-5 h-5 text-purple-700" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-500">
                        #{sale.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                        {sale.payment_method === 'CASH'
                          ? 'Efectivo'
                          : sale.payment_method === 'TRANSFER'
                            ? 'Transferencia'
                            : 'Mixto'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDate(sale.created_at)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-lg font-extrabold text-gray-900 font-serif">
                    {formatCurrency(finalVal)}
                  </span>
                  {sale.tip_amount > 0 && (
                    <span className="text-[10px] text-emerald-600 font-medium">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-gray-900">Comprobante de Venta</h3>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-amber-200/60 space-y-3 font-mono text-xs">
              <div className="flex justify-between text-gray-600 font-sans">
                <span className="font-bold">Folio:</span>
                <span>#{selectedSale.id.slice(0, 10).toUpperCase()}</span>
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
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Total Cobrado:</span>
                  <span className="font-serif text-base text-rose-600">
                    {formatCurrency(selectedSale.final_total || selectedSale.total_amount)}
                  </span>
                </div>
              </div>

              {/* Desglose de forma de cobro */}
              <div className="pt-2 border-t border-gray-200 font-sans text-xs">
                <span className="font-bold text-gray-700 block mb-1">Método de Cobro:</span>
                {selectedSale.payment_method === 'CASH' && (
                  <div className="text-gray-600">💵 100% Efectivo en caja</div>
                )}
                {selectedSale.payment_method === 'TRANSFER' && (
                  <div className="text-gray-600">💳 100% Transferencia Bancaria</div>
                )}
                {selectedSale.payment_method === 'MIXED' && (
                  <div className="space-y-0.5 text-gray-600 bg-white p-2 rounded-lg border border-gray-200">
                    <div>💵 Efectivo: {formatCurrency(selectedSale.cash_amount || 0)}</div>
                    <div>💳 Transferencia: {formatCurrency(selectedSale.transfer_amount || 0)}</div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-3 px-4 rounded-xl border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-50 flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4 text-amber-700" />
              <span>Imprimir Ticket de Venta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
