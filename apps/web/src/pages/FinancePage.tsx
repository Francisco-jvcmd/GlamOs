import { useState, useMemo } from 'react';
import { useCollection } from '../hooks/useCollection';
import { useDatabase } from '../hooks/useDatabase';
import { getDatabase } from '../db/database';
import { useAuth } from '../auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency } from '../lib/utils';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Users,
  PieChart,
  Building,
  Zap,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  RENT: { label: 'Arriendo', icon: Building, color: 'text-purple-600 bg-purple-50' },
  UTILITIES: { label: 'Servicios Públicos (Luz/Agua)', icon: Zap, color: 'text-amber-600 bg-amber-50' },
  SALARIES: { label: 'Sueldos / Nómina', icon: Users, color: 'text-blue-600 bg-blue-50' },
  SUPPLIES: { label: 'Insumos de Trabajo', icon: ShoppingBag, color: 'text-rose-600 bg-rose-50' },
  MARKETING: { label: 'Publicidad / Redes', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
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

  // Ingresos Totales
  const totalRevenue = useMemo(() => {
    return completedSales.reduce((sum: number, s: any) => sum + (s.final_total || 0), 0);
  }, [completedSales]);

  // Gastos Operativos Totales
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  }, [expenses]);

  // Costo Estimado de Productos Vendidos (COGS)
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

    const orgId = user?.org || 'default_org';
    const now = new Date().toISOString();
    const expenseData = {
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
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
      // 1. Guardar inmediatamente en caché local
      try {
        const cached = localStorage.getItem('glamos_local_fixed_expenses');
        const currentList = cached ? JSON.parse(cached) : [];
        currentList.unshift(expenseData);
        localStorage.setItem('glamos_local_fixed_expenses', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_fixed_expenses'));
      } catch (cacheErr) {
        console.warn('Error guardando gasto en caché:', cacheErr);
      }

      // 2. Persistir en RxDB
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
      // 1. Eliminar de caché local
      const cached = localStorage.getItem('glamos_local_fixed_expenses');
      if (cached) {
        const currentList = JSON.parse(cached).filter((e: any) => e.id !== id);
        localStorage.setItem('glamos_local_fixed_expenses', JSON.stringify(currentList));
        window.dispatchEvent(new Event('glamos_updated_fixed_expenses'));
      }
      // 2. Marcar en RxDB
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
    <div className="space-y-7 max-w-5xl mx-auto relative">
      {/* Notificación Flotante */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-950/20 border border-emerald-400/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide">{successMessage}</div>
            <div className="text-[10px] text-emerald-100">Registros actualizados</div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold font-serif text-gray-900"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Inteligencia Financiera & P&L
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Estado de resultados en tiempo real, control de costos operativos y rendimiento.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold text-xs shadow-md hover:shadow-lg flex items-center gap-2 px-5 py-2.5 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Registrar Gasto
        </Button>
      </div>

      {/* ESTADO DE RESULTADOS (TARJETAS DE ALTO NIVEL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Brutos */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase font-semibold">Ventas Totales</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-gray-900">
              {salesLoading ? '...' : formatCurrency(totalRevenue)}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">{completedSales.length} ventas</span>
          </div>
        </div>

        {/* Costo de Ventas */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase font-semibold">Costo Productos (COGS)</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-gray-900">
              {formatCurrency(totalCOGS)}
            </div>
            <span className="text-[11px] text-gray-400">Insumos y reventa</span>
          </div>
        </div>

        {/* Gastos Operativos */}
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase font-semibold">Gastos Operativos</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-rose-600">
              {expensesLoading ? '...' : formatCurrency(totalExpenses)}
            </div>
            <span className="text-[11px] text-gray-400">{expenses.length} conceptos registrados</span>
          </div>
        </div>

        {/* UTILIDAD NETA REAL (RESULTADO FINAL) */}
        <div
          className={`p-5 rounded-2xl text-white shadow-lg flex flex-col justify-between ${
            netProfit >= 0
              ? 'bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#047857]'
              : 'bg-gradient-to-br from-[#991B1B] to-[#7F1D1D]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider opacity-90">
              Utilidad Neta Real
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20">
              {profitMargin.toFixed(1)}% Margen
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-mono">
              {formatCurrency(netProfit)}
            </div>
            <span className="text-[11px] opacity-80">Ganancia libre de costos</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN DUAL: REGISTRO DE GASTOS & RENDIMIENTO POR EMPLEADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de Gastos Fijos y Variables */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Gastos Registrados</h2>
              <p className="text-xs text-gray-400">Arriendo, nómina, servicios e insumos</p>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="outline"
              size="sm"
              className="text-xs rounded-xl"
            >
              + Agregar
            </Button>
          </div>

          {expenses.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              No has registrado gastos todavía. Registra arriendos o nómina para calcular tu utilidad neta real.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {expenses.map((expense: any) => {
                const config = CATEGORY_LABELS[expense.category] || CATEGORY_LABELS.OTHER;
                const Icon = config.icon;

                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-xs">{config.label}</div>
                        <div className="text-[11px] text-gray-400">{expense.description || expense.expense_date}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-gray-900 text-sm">
                        {formatCurrency(expense.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-gray-300 hover:text-rose-600 transition-colors"
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
        </div>

        {/* Rendimiento por Estilista / Empleado */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-900">Métricas por Estilista</h2>
            <p className="text-xs text-gray-400">Ventas generadas y propinas por colaborador</p>
          </div>

          {employeeMetrics.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              Aún no hay ventas registradas por colaboradores.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {employeeMetrics.map((emp, index) => (
                <div
                  key={emp.employeeId}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-amber-50/40 via-white to-rose-50/30 border border-amber-100/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F6D365] to-[#D97706] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-xs">
                        Colaborador {emp.employeeId.slice(0, 8)}...
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {emp.count} tickets atendidos · Propinas: {formatCurrency(emp.tips)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-gray-900 text-sm block">
                      {formatCurrency(emp.total)}
                    </span>
                    <span className="text-[10px] text-amber-800 uppercase font-semibold">Total Facturado</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Registrar Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-amber-200/60 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-xl font-bold font-serif text-gray-900"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Registrar Gasto del Salón
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Categoría del Gasto *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                >
                  <option value="RENT">🏢 Arriendo de Local</option>
                  <option value="UTILITIES">⚡ Servicios Públicos (Agua, Luz, Teléfono)</option>
                  <option value="SALARIES">👥 Nómina / Sueldos / Anticipos</option>
                  <option value="SUPPLIES">🛍️ Insumos de Trabajo (Tintes, Toallas)</option>
                  <option value="MARKETING">📱 Publicidad & Redes Sociales</option>
                  <option value="OTHER">📦 Otros Gastos / Mantenimiento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Monto del Gasto ($) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej. 350000"
                  className="h-11 rounded-xl font-mono text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción / Proveedor
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Pago de arriendo local comercial Mes Actual"
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Fecha del Gasto
                </label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold rounded-xl shadow-md"
                >
                  Registrar Gasto
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
