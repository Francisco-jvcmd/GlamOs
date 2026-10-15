import { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { useDatabase } from '../hooks/useDatabase';
import { getDatabase } from '../db/database';
import { useAuth } from '../auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, generateUuid, ensureUuid } from '../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  Trash2,
  Users,
  Building,
  Zap,
  ShoppingBag,
  Sparkles,
  DollarSign,
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  RENT: { label: 'Arriendo de Local', icon: Building, color: 'text-purple-600 bg-purple-50' },
  UTILITIES: { label: 'Servicios Públicos (Luz/Agua)', icon: Zap, color: 'text-amber-600 bg-amber-50' },
  SALARIES: { label: 'Nómina / Sueldos', icon: Users, color: 'text-blue-600 bg-blue-50' },
  SUPPLIES: { label: 'Insumos de Trabajo', icon: ShoppingBag, color: 'text-rose-600 bg-rose-50' },
  MARKETING: { label: 'Publicidad & Redes', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  OTHER: { label: 'Otros Gastos', icon: Receipt, color: 'text-gray-600 bg-gray-50' },
};

export function FinancePage() {
  const { user } = useAuth();
  const db = useDatabase();
  const { docs: sales, loading: salesLoading } = useCollection('sales');
  const { docs: saleItems } = useCollection('sale_items');
  const { docs: products } = useCollection('products');
  const { docs: expenses, loading: expensesLoading } = useCollection('fixed_expenses');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('RENT');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Cálculos de P&L (Estado de Resultados)
  const completedSales = useMemo(() => {
    return sales.filter((s: any) => s.status !== 'VOIDED');
  }, [sales]);

  const totalRevenue = useMemo(() => {
    return completedSales.reduce((sum: number, s: any) => sum + (s.final_total || 0), 0);
  }, [completedSales]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p: any) => map.set(p.id, p.unit_cost || 0));
    return map;
  }, [products]);

  const totalCOGS = useMemo(() => {
    return saleItems.reduce((sum: number, item: any) => {
      if (item.product_id && productCostMap.has(item.product_id)) {
        return sum + (productCostMap.get(item.product_id)! * (item.quantity || 1));
      }
      return sum;
    }, 0);
  }, [saleItems, productCostMap]);

  // Utilidad Neta Real
  const netProfit = totalRevenue - totalCOGS - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // 2. Rendimiento por Empleado
  const employeeMetrics = useMemo(() => {
    const map = new Map<string, { total: number; count: number; tips: number }>();
    completedSales.forEach((s: any) => {
      const empId = s.employee_id || 'Desconocido';
      const current = map.get(empId) || { total: 0, count: 0, tips: 0 };
      map.set(empId, {
        total: current.total + (s.final_total || 0),
        count: current.count + 1,
        tips: current.tips + (s.tip_amount || 0),
      });
    });
    return Array.from(map.entries()).map(([employeeId, data]) => ({
      employeeId,
      ...data,
    }));
  }, [completedSales]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const orgId = ensureUuid(user?.org);
    const now = new Date().toISOString();
    const expenseData = {
      id: generateUuid(),
      organization_id: orgId,
      category,
      description: description.trim() || null,
      amount: parseFloat(amount),
      expense_date: expenseDate,
      registered_by: user?.sub || null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    try {
      try {
        const cached = localStorage.getItem('glamos_local_fixed_expenses');
        const currentList = cached ? JSON.parse(cached) : [];
        currentList.unshift(expenseData);
        localStorage.setItem('glamos_local_fixed_expenses', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_fixed_expenses'));
      } catch (cacheErr) {
        console.warn('Error guardando gasto en caché:', cacheErr);
      }

      try {
        let activeDb = db;
        if (!activeDb) activeDb = await getDatabase().catch(() => null);
        if (activeDb?.fixed_expenses) {
          await activeDb.fixed_expenses.insert(expenseData);
        }
      } catch (dbErr) {
        console.warn('Aviso sincronizando gasto en RxDB:', dbErr);
      }

      setIsModalOpen(false);
      setDescription('');
      setAmount('');
      setSuccessMessage('¡Gasto registrado correctamente!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Error registrando gasto:', err);
      setSuccessMessage('Gasto guardado en sesión local.');
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este registro de gasto?')) return;
    try {
      const cached = localStorage.getItem('glamos_local_fixed_expenses');
      if (cached) {
        const currentList = JSON.parse(cached).filter((e: any) => e.id !== id);
        localStorage.setItem('glamos_local_fixed_expenses', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_fixed_expenses'));
      }
      let activeDb = db;
      if (!activeDb) activeDb = await getDatabase().catch(() => null);
      if (activeDb?.fixed_expenses) {
        const doc = await activeDb.fixed_expenses.findOne(id).exec();
        if (doc) {
          await doc.patch({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
      setSuccessMessage('Gasto eliminado.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error eliminando gasto:', err);
    }
  };

  return (
    <div className="space-y-7 max-w-5xl mx-auto relative select-none pb-24">
      {/* Toast Notificación */}
      {successMessage && (
        <Toast
          message={successMessage}
          subtitle="Registros financieros sincronizados"
          type="success"
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Inteligencia Financiera & P&L"
        subtitle="Estado de resultados en tiempo real, control de costos operativos y rendimiento."
        badge="Estado de Resultados"
        badgeVariant="gold"
        icon={<TrendingUp className="w-3.5 h-3.5 text-amber-600" />}
        actions={
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="glam"
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Gasto
          </Button>
        }
      />

      {/* ── ESTADO DE RESULTADOS: 4 METRIC CARDS ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Ventas Totales"
          value={salesLoading ? '...' : formatCurrency(totalRevenue)}
          subtitle={`${completedSales.length} ventas consolidadas`}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          variant="glass"
        />

        <MetricCard
          label="Costo Insumos (COGS)"
          value={formatCurrency(totalCOGS)}
          subtitle="Productos y reventa"
          icon={<ShoppingBag className="w-4 h-4 text-orange-600" />}
          variant="glass"
        />

        <MetricCard
          label="Gastos Operativos"
          value={expensesLoading ? '...' : formatCurrency(totalExpenses)}
          subtitle={`${expenses.length} conceptos registrados`}
          icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
          variant="glass"
        />

        <MetricCard
          label="Utilidad Neta Real"
          value={formatCurrency(netProfit)}
          subtitle="Margen libre de costos"
          trend={{
            value: `${profitMargin.toFixed(1)}% Margen`,
            isPositive: netProfit >= 0,
          }}
          icon={<Sparkles className="w-4 h-4 text-amber-300" />}
          variant="noir"
        />
      </div>

      {/* ── SECCIÓN DUAL: GASTOS & RENDIMIENTO DE COLABORADORES ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de Gastos Fijos y Variables */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-amber-100/70 mb-4">
            <div>
              <CardTitle className="text-xl">Gastos Registrados</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Arriendo, nómina, servicios e insumos</p>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="outline"
              size="sm"
            >
              + Agregar
            </Button>
          </div>

          {expenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No has registrado gastos todavía. Registra arriendos o nómina para calcular tu utilidad neta real.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 no-scrollbar">
              {expenses.map((expense: any) => {
                const config = CATEGORY_LABELS[expense.category] || CATEGORY_LABELS.OTHER;
                const Icon = config.icon;

                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white/70 border border-amber-100/70 hover:bg-white hover:border-amber-300 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-xs">{config.label}</div>
                        <div className="text-[11px] text-gray-400">{expense.description || expense.expense_date}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-editorial font-extrabold text-gray-950 text-base">
                        {formatCurrency(expense.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-gray-300 hover:text-rose-600 transition-colors p-1"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Rendimiento por Estilista */}
        <Card variant="glass" className="p-6">
          <div className="pb-4 border-b border-amber-100/70 mb-4">
            <CardTitle className="text-xl">Métricas por Estilista</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Ventas generadas y propinas por colaborador</p>
          </div>

          {employeeMetrics.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              Aún no hay ventas registradas por colaboradores.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 no-scrollbar">
              {employeeMetrics.map((emp, index) => (
                <div
                  key={emp.employeeId}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/50 via-white to-rose-50/40 border border-amber-100/80 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F6D365] to-[#D97706] text-white font-black text-xs flex items-center justify-center shadow-xs">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-gray-950 text-xs">
                        Colaborador {emp.employeeId.slice(0, 8)}...
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {emp.count} tickets atendidos · Propinas: {formatCurrency(emp.tips)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-editorial font-black text-gray-950 text-base block">
                      {formatCurrency(emp.total)}
                    </span>
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                      Facturado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modal Registrar Gasto */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Gasto del Salón"
        subtitle="Ingresa arriendos, nómina, insumos o servicios."
        icon={<TrendingDown className="w-5 h-5" />}
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Categoría del Gasto *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-4 rounded-2xl border border-amber-200/80 focus:outline-none focus:border-amber-400 focus:ring-3 focus:ring-amber-400/20 text-xs sm:text-sm bg-white text-gray-900 shadow-2xs"
            >
              <option value="RENT">🏢 Arriendo de Local</option>
              <option value="UTILITIES">⚡ Servicios Públicos (Agua, Luz, Teléfono)</option>
              <option value="SALARIES">👥 Nómina / Sueldos / Anticipos</option>
              <option value="SUPPLIES">🛍️ Insumos de Trabajo (Tintes, Toallas)</option>
              <option value="MARKETING">📱 Publicidad & Redes Sociales</option>
              <option value="OTHER">📦 Otros Gastos / Mantenimiento</option>
            </select>
          </div>

          <Input
            label="Monto del Gasto ($) *"
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ej. 350000"
            className="font-mono text-base font-bold"
          />

          <Input
            label="Descripción / Proveedor"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Pago de arriendo local comercial Mes Actual"
          />

          <Input
            label="Fecha del Gasto"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />

          <div className="pt-3 flex gap-3">
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
              Registrar Gasto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
