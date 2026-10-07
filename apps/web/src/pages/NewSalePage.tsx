import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../auth/auth-context';
import { getDatabase } from '../db/database';
import { triggerSync } from '../db/sync';
import { formatCurrency, formatDate, ensureUuid, generateUuid } from '../lib/utils';
import {
  ArrowLeft,
  Plus,
  Minus,
  Search,
  Check,
  Receipt,
  Printer,
  CheckCircle2,
  Wallet,
  CreditCard,
  ArrowRightLeft,
  UserPlus,
  Sparkles,
  Scissors,
  Package,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';

interface CartItem {
  service_id?: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  line_total: number;
}

export function NewSalePage() {
  const navigate = useNavigate();
  const db = useDatabase();
  const { user } = useAuth();
  const { docs: services } = useCollection('services');
  const { docs: products } = useCollection('products');
  const { docs: clients } = useCollection('clients');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [activeCatalogTab, setActiveCatalogTab] = useState<'ALL' | 'SERVICES' | 'PRODUCTS'>('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'MIXED'>('CASH');
  const [tipSelection, setTipSelection] = useState<'0' | '5' | '10' | '15' | 'custom'>('0');
  const [customTip, setCustomTip] = useState('');
  const [cashAmountInput, setCashAmountInput] = useState('');
  const [transferAmountInput, setTransferAmountInput] = useState('');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  // Quick New Client Modal
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientBirth, setNewClientBirth] = useState('');

  // Totals calculations
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    [cart],
  );

  const discountTotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.unit_price * item.quantity * (item.discount_percentage / 100),
        0,
      ),
    [cart],
  );

  const netTotal = subtotal - discountTotal;

  const tipAmount = useMemo(() => {
    if (tipSelection === '0') return 0;
    if (tipSelection === '5') return Math.round(netTotal * 0.05 * 100) / 100;
    if (tipSelection === '10') return Math.round(netTotal * 0.1 * 100) / 100;
    if (tipSelection === '15') return Math.round(netTotal * 0.15 * 100) / 100;
    return parseFloat(customTip) || 0;
  }, [tipSelection, customTip, netTotal]);

  const finalTotal = netTotal + tipAmount;

  // Split payment amounts
  const cashNum = parseFloat(cashAmountInput) || 0;
  const transferNum = parseFloat(transferAmountInput) || 0;
  const totalPaidInMixed = cashNum + transferNum;
  const mixedDifference = totalPaidInMixed - finalTotal;

  // Quick split actions for Mixed payment
  const handleSetMixedSplit5050 = () => {
    const half = Math.round((finalTotal / 2) * 100) / 100;
    const remainder = Math.round((finalTotal - half) * 100) / 100;
    setCashAmountInput(half.toFixed(2));
    setTransferAmountInput(remainder.toFixed(2));
  };

  const handleSetMixedAllCash = () => {
    setCashAmountInput(finalTotal.toFixed(2));
    setTransferAmountInput('0.00');
  };

  const handleSetMixedAllTransfer = () => {
    setCashAmountInput('0.00');
    setTransferAmountInput(finalTotal.toFixed(2));
  };

  // Cart operations
  const addToCart = (item: Omit<CartItem, 'quantity' | 'line_total'>) => {
    setCart((prev) => {
      const key = item.service_id || item.product_id;
      const existing = prev.find((i) => (i.service_id || i.product_id) === key);
      if (existing) {
        return prev.map((i) =>
          (i.service_id || i.product_id) === key
            ? {
                ...i,
                quantity: i.quantity + 1,
                line_total:
                  i.unit_price * (i.quantity + 1) * (1 - i.discount_percentage / 100),
              }
            : i,
        );
      }
      return [
        ...prev,
        {
          ...item,
          quantity: 1,
          line_total: item.unit_price * (1 - item.discount_percentage / 100),
        },
      ];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => {
          if (i !== index) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null as unknown as CartItem;
          return {
            ...item,
            quantity: newQty,
            line_total: item.unit_price * newQty * (1 - item.discount_percentage / 100),
          };
        })
        .filter(Boolean),
    );
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick Client Creation
  const handleSaveQuickClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const orgId = ensureUuid(user?.org);
    const newId = generateUuid();
    const now = new Date().toISOString();

    const clientDoc = {
      id: newId,
      organization_id: orgId,
      full_name: newClientName.trim(),
      phone_whatsapp: newClientPhone.trim() || null,
      birth_date: newClientBirth || null,
      consent_given_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    // Cache local
    try {
      const cached = localStorage.getItem('glamos_local_clients');
      let list = cached ? JSON.parse(cached) : [];
      list.unshift(clientDoc);
      localStorage.setItem('glamos_local_clients', JSON.stringify(list));
      window.dispatchEvent(new Event('glamos_updated_clients'));
    } catch {}

    // RxDB
    try {
      let activeDb = db;
      if (!activeDb) activeDb = await getDatabase().catch(() => null);
      if (activeDb?.clients) {
        await activeDb.clients.insert(clientDoc);
      }
    } catch {}

    setSelectedClientId(newId);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientBirth('');
    setIsNewClientModalOpen(false);
  };

  // Confirm and Save Sale
  const handleConfirm = async () => {
    if (cart.length === 0 || isSubmitting) return;

    // Mixed payment validation
    if (paymentMethod === 'MIXED' && totalPaidInMixed < finalTotal - 0.01) {
      alert(`El total cubierto ($${totalPaidInMixed.toFixed(2)}) es menor al total a pagar ($${finalTotal.toFixed(2)}). Ajusta los montos.`);
      return;
    }

    setIsSubmitting(true);
    const saleId = generateUuid();
    const now = new Date().toISOString();
    const orgId = ensureUuid(user?.org);
    const employeeId = ensureUuid(user?.sub);

    let cashToSave = 0;
    let transferToSave = 0;

    if (paymentMethod === 'CASH') {
      cashToSave = finalTotal;
      transferToSave = 0;
    } else if (paymentMethod === 'TRANSFER') {
      cashToSave = 0;
      transferToSave = finalTotal;
    } else {
      cashToSave = cashNum;
      transferToSave = transferNum;
    }

    const saleDoc = {
      id: saleId,
      organization_id: orgId,
      employee_id: employeeId,
      client_id: selectedClientId ? ensureUuid(selectedClientId) : null,
      subtotal,
      discount_total: discountTotal,
      final_total: finalTotal,
      tip_amount: tipAmount,
      payment_method: paymentMethod,
      cash_amount: cashToSave,
      transfer_amount: transferToSave,
      transfer_receipt_key: null,
      status: 'COMPLETED',
      voided_at: null,
      voided_by: null,
      void_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };

    const saleItemsDocs = cart.map((item) => ({
      id: generateUuid(),
      sale_id: saleId,
      organization_id: orgId,
      service_id: item.service_id ? ensureUuid(item.service_id) : null,
      product_id: item.product_id ? ensureUuid(item.product_id) : null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percentage: item.discount_percentage,
      line_total: item.line_total,
      created_at: now,
      updated_at: now,
    }));

    try {
      // 1. Guardado inmediato en caché local (Reactividad 0ms)
      try {
        const cachedSales = localStorage.getItem('glamos_local_sales');
        let salesList = cachedSales ? JSON.parse(cachedSales) : [];
        salesList.unshift(saleDoc);
        localStorage.setItem('glamos_local_sales', JSON.stringify(salesList));
        window.dispatchEvent(new Event('glamos_updated_sales'));
      } catch (cacheErr) {
        console.warn('Aviso guardando venta local:', cacheErr);
      }

      // 2. Persistir en RxDB
      try {
        let activeDb = db;
        if (!activeDb) activeDb = await getDatabase().catch(() => null);
        if (activeDb?.sales) {
          await activeDb.sales.insert(saleDoc);
          if (activeDb?.sale_items) {
            for (const itemDoc of saleItemsDocs) {
              await activeDb.sale_items.insert(itemDoc);
            }
          }
          // Movimientos de stock para productos
          if (activeDb?.stock_movements) {
            for (const item of cart) {
              if (item.product_id) {
                await activeDb.stock_movements.insert({
                  id: generateUuid(),
                  organization_id: orgId,
                  product_id: ensureUuid(item.product_id),
                  delta: -item.quantity,
                  reason: 'SALE',
                  reference_id: saleId,
                  created_at: now,
                  updated_at: now,
                });
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn('Aviso persistiendo en RxDB:', dbErr);
      }

      // 3. Sincronizar en la nube en segundo plano
      try {
        triggerSync();
      } catch {}

      // 4. Mostrar Comprobante / Recibo de Venta Luxury
      const selectedClientObj = clients.find((c: any) => c.id === selectedClientId);
      setCompletedSale({
        ...saleDoc,
        items: [...cart],
        client_name: selectedClientObj?.full_name || 'Cliente Ocasional',
      });
    } catch (err) {
      console.error('Error al registrar venta:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewSale = () => {
    setCart([]);
    setSelectedClientId(null);
    setPaymentMethod('CASH');
    setTipSelection('0');
    setCustomTip('');
    setCashAmountInput('');
    setTransferAmountInput('');
    setStep(1);
    setCompletedSale(null);
  };

  // Filtered lists
  const filteredServices = useMemo(
    () =>
      (services || []).filter(
        (s: any) =>
          !s.deleted_at &&
          s.name?.toLowerCase().includes(catalogSearch.toLowerCase()),
      ),
    [services, catalogSearch],
  );

  const filteredProducts = useMemo(
    () =>
      (products || []).filter(
        (p: any) =>
          !p.deleted_at &&
          p.current_stock > 0 &&
          p.name?.toLowerCase().includes(catalogSearch.toLowerCase()),
      ),
    [products, catalogSearch],
  );

  const filteredClients = useMemo(
    () =>
      (clients || []).filter(
        (c: any) =>
          !c.deleted_at &&
          (c.full_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
            c.phone_whatsapp?.includes(clientSearch)),
      ),
    [clients, clientSearch],
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-28 select-none">
      {/* ── TOP NAV / STEPPER ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-200/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step > 1) setStep((s) => (s - 1) as any);
              else navigate('/sales');
            }}
            className="w-10 h-10 rounded-xl bg-white border border-amber-200/80 flex items-center justify-center text-gray-700 hover:bg-amber-50 hover:text-amber-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1
              className="text-2xl font-bold font-serif text-gray-900"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Terminal de Nueva Venta
            </h1>
            <p className="text-xs text-gray-500">
              {step === 1 && 'Selecciona los servicios y productos del salón'}
              {step === 2 && 'Asigna un cliente VIP o continúa como cliente ocasional'}
              {step === 3 && 'Selecciona el método de cobro y confirma el pago'}
            </p>
          </div>
        </div>

        {/* Stepper Pills */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: 'Catálogo' },
            { num: 2, label: 'Cliente' },
            { num: 3, label: 'Cobro' },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => {
                if (s.num === 1) setStep(1);
                if (s.num === 2 && cart.length > 0) setStep(2);
                if (s.num === 3 && cart.length > 0) setStep(3);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                step === s.num
                  ? 'bg-gradient-to-r from-[#F6D365] to-[#E11D48] text-white shadow-md shadow-rose-900/10'
                  : step > s.num
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-white text-gray-400 border border-gray-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/10">
                {step > s.num ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PASO 1: SELECCIÓN DE SERVICIOS Y PRODUCTOS ──────────────────────── */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Catálogo */}
          <div className="lg:col-span-2 space-y-4">
            {/* Buscador y Filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar corte, manicura, tinte, shampoo..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-amber-200/80 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                />
              </div>
              <div className="flex rounded-xl bg-white border border-amber-200/80 p-1 shrink-0">
                <button
                  onClick={() => setActiveCatalogTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeCatalogTab === 'ALL'
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setActiveCatalogTab('SERVICES')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeCatalogTab === 'SERVICES'
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Servicios
                </button>
                <button
                  onClick={() => setActiveCatalogTab('PRODUCTS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeCatalogTab === 'PRODUCTS'
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Productos
                </button>
              </div>
            </div>

            {/* Grid de Servicios */}
            {(activeCatalogTab === 'ALL' || activeCatalogTab === 'SERVICES') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <Scissors className="w-3.5 h-3.5 text-amber-600" />
                  <span>Servicios del Salón ({filteredServices.length})</span>
                </div>
                {filteredServices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 bg-white rounded-2xl border border-dashed border-amber-200">
                    No se encontraron servicios disponibles.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredServices.map((svc: any) => {
                      const discountPct = svc.active_discount_percentage || 0;
                      const inCart = cart.find((i) => i.service_id === svc.id);
                      return (
                        <div
                          key={svc.id}
                          onClick={() =>
                            addToCart({
                              service_id: svc.id,
                              name: svc.name,
                              unit_price: svc.base_price,
                              discount_percentage: discountPct,
                            })
                          }
                          className={`group p-3.5 rounded-2xl border bg-white cursor-pointer transition-all hover:shadow-md flex items-center justify-between gap-3 ${
                            inCart
                              ? 'border-amber-400 bg-amber-50/40 shadow-sm ring-1 ring-amber-400/50'
                              : 'border-amber-200/60 hover:border-amber-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 truncate group-hover:text-amber-800">
                              {svc.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-extrabold text-sm text-gray-900 font-serif">
                                {formatCurrency(svc.base_price)}
                              </span>
                              {discountPct > 0 && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  -{discountPct}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                              inCart
                                ? 'bg-amber-500 text-white font-bold text-xs'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inCart ? inCart.quantity : <Plus className="w-4 h-4" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Grid de Productos */}
            {(activeCatalogTab === 'ALL' || activeCatalogTab === 'PRODUCTS') && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <Package className="w-3.5 h-3.5 text-rose-600" />
                  <span>Productos en Stock ({filteredProducts.length})</span>
                </div>
                {filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 bg-white rounded-2xl border border-dashed border-rose-200">
                    No hay productos en inventario con stock disponible.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredProducts.map((prod: any) => {
                      const inCart = cart.find((i) => i.product_id === prod.id);
                      return (
                        <div
                          key={prod.id}
                          onClick={() =>
                            addToCart({
                              product_id: prod.id,
                              name: prod.name,
                              unit_price: prod.unit_price,
                              discount_percentage: 0,
                            })
                          }
                          className={`group p-3.5 rounded-2xl border bg-white cursor-pointer transition-all hover:shadow-md flex items-center justify-between gap-3 ${
                            inCart
                              ? 'border-rose-400 bg-rose-50/40 shadow-sm ring-1 ring-rose-400/50'
                              : 'border-amber-200/60 hover:border-rose-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 truncate group-hover:text-rose-800">
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-extrabold text-sm text-gray-900 font-serif">
                                {formatCurrency(prod.unit_price)}
                              </span>
                              <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                                Stock: {prod.current_stock}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                              inCart
                                ? 'bg-rose-500 text-white font-bold text-xs'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inCart ? inCart.quantity : <Plus className="w-4 h-4" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna Derecha: Carrito en Vivo */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-amber-200/80 shadow-[0_10px_30px_rgba(217,119,6,0.06)] sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Carrito Actual</h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {cart.length} {cart.length === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-amber-300 stroke-1" />
                  <p className="text-xs font-medium">El carrito está vacío</p>
                  <p className="text-[11px] text-gray-400">
                    Toca cualquier servicio o producto para agregarlo.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 my-3 max-h-64 overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {formatCurrency(item.unit_price)} c/u
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(idx, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(idx, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-white transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="w-16 text-right font-bold text-xs text-gray-900">
                        {formatCurrency(item.line_total)}
                      </div>

                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-gray-300 hover:text-rose-500 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Totales del Carrito */}
              {cart.length > 0 && (
                <div className="pt-3 border-t border-amber-100 space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600 font-medium">
                      <span>Descuentos promocionales</span>
                      <span>-{formatCurrency(discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-gray-200">
                    <span className="text-sm font-bold text-gray-900">Total a Cobrar</span>
                    <span className="text-xl font-extrabold text-rose-600 font-serif">
                      {formatCurrency(netTotal)}
                    </span>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full mt-4 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                  >
                    <span>Continuar con Cliente</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 2: ASIGNACIÓN DE CLIENTE VIP ──────────────────────────────── */}
      {step === 2 && (
        <div className="max-w-xl mx-auto space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-amber-200/80 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div>
                <h3 className="font-bold text-base text-gray-900">Seleccionar Cliente</h3>
                <p className="text-xs text-gray-500">
                  Asocia la venta a un cliente para historial, fidelización y recordatorios.
                </p>
              </div>
              <button
                onClick={() => setIsNewClientModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                <span>Nuevo Cliente</span>
              </button>
            </div>

            {/* Buscador de cliente */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono de WhatsApp..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-amber-200/80 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            {/* Lista de Clientes */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-gray-50 pr-1">
              <button
                type="button"
                onClick={() => setSelectedClientId(null)}
                className={`w-full p-3 rounded-2xl text-left flex items-center justify-between transition-all ${
                  !selectedClientId
                    ? 'bg-amber-500 text-white font-bold shadow-sm'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Cliente Ocasional / Anónimo</div>
                  <div
                    className={`text-[10px] ${
                      !selectedClientId ? 'text-amber-100' : 'text-gray-400'
                    }`}
                  >
                    No registrar datos personales en esta venta
                  </div>
                </div>
                {!selectedClientId && <Check className="w-4 h-4 text-white" />}
              </button>

              {filteredClients.map((client: any) => {
                const isSelected = selectedClientId === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClientId(client.id)}
                    className={`w-full p-3 rounded-2xl text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#F6D365] to-[#E11D48] text-white font-bold shadow-md'
                        : 'bg-white hover:bg-amber-50/50 border border-amber-100/60 text-gray-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{client.full_name}</div>
                      <div
                        className={`text-[11px] ${
                          isSelected ? 'text-amber-100' : 'text-gray-500'
                        }`}
                      >
                        {client.phone_whatsapp || 'Sin WhatsApp'}
                        {client.birth_date && ` · Cumple: ${client.birth_date}`}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-3 rounded-2xl border border-gray-300 bg-white text-gray-700 font-bold text-xs hover:bg-gray-50"
            >
              ← Volver al Catálogo
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              Continuar al Cobro →
            </button>
          </div>
        </div>
      )}

      {/* ── PASO 3: TERMINAL DE COBRO PROFESIONAL (EFECTIVO / TRANSFERENCIA / MIXTO) ── */}
      {step === 3 && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Card Principal de Pago */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-[0_20px_50px_rgba(217,119,6,0.08)] space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Paso 3 de 3 · Liquidación
              </span>
              <h2
                className="text-2xl font-bold font-serif text-gray-900 mt-2"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Método de Pago
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Selecciona la vía de pago para asentar la venta en caja y generar el comprobante.
              </p>
            </div>

            {/* Selector de Método de Pago */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'CASH', label: 'Efectivo', icon: Wallet, desc: 'Dinero en mano' },
                { id: 'TRANSFER', label: 'Transferencia', icon: CreditCard, desc: 'Banco / Móvil' },
                { id: 'MIXED', label: 'Pago Mixto', icon: ArrowRightLeft, desc: 'Efectivo + Transf.' },
              ].map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id as any);
                      if (m.id === 'MIXED' && !cashAmountInput && !transferAmountInput) {
                        handleSetMixedSplit5050();
                      }
                    }}
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                      isSelected
                        ? 'border-amber-400 bg-gradient-to-b from-amber-50 to-white ring-2 ring-amber-400 shadow-md'
                        : 'border-amber-200/60 bg-white hover:bg-amber-50/30'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-gradient-to-tr from-[#F6D365] to-[#E11D48] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <m.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-gray-900">{m.label}</div>
                      <div className="text-[10px] text-gray-400 hidden sm:block">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* SECCIÓN ESPECIAL: PAGO MIXTO (EFECTIVO + TRANSFERENCIA) */}
            {paymentMethod === 'MIXED' && (
              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                      Desglose de Pago Mixto
                    </span>
                  </div>
                  {/* Botones de cálculo rápido */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleSetMixedSplit5050}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
                    >
                      50% / 50%
                    </button>
                    <button
                      type="button"
                      onClick={handleSetMixedAllCash}
                      className="px-2 py-1 rounded-lg bg-white border border-amber-200 text-[10px] text-gray-600 hover:bg-gray-100"
                    >
                      Todo Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={handleSetMixedAllTransfer}
                      className="px-2 py-1 rounded-lg bg-white border border-amber-200 text-[10px] text-gray-600 hover:bg-gray-100"
                    >
                      Todo Transf.
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Monto en Efectivo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      💵 Recibido en Efectivo ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cashAmountInput}
                        onChange={(e) => setCashAmountInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-amber-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Monto en Transferencia */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      💳 Recibido en Transferencia ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={transferAmountInput}
                        onChange={(e) => setTransferAmountInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-amber-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Balance Dinámico de Pago Mixto */}
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    mixedDifference >= 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {mixedDifference >= 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>
                      {mixedDifference >= 0
                        ? mixedDifference === 0
                          ? 'Monto total exacto cubierto'
                          : `Cambio / Vuelto a entregar al cliente:`
                        : `Monto pendiente por cubrir:`}
                    </span>
                  </div>
                  <span className="font-bold text-sm font-serif">
                    {mixedDifference >= 0
                      ? mixedDifference === 0
                        ? '✓ $0.00'
                        : formatCurrency(mixedDifference)
                      : formatCurrency(Math.abs(mixedDifference))}
                  </span>
                </div>
              </div>
            )}

            {/* SECCIÓN DE PROPINA OPCIONAL CON CHIPS RÁPIDOS */}
            <div className="pt-2 border-t border-amber-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-800">
                    Propina para el Personal
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Opcional
                  </span>
                </div>
                {tipAmount > 0 && (
                  <span className="text-xs font-bold text-emerald-600 font-serif">
                    +{formatCurrency(tipAmount)}
                  </span>
                )}
              </div>

              {/* Chips de selección rápida de propina */}
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: '0', label: 'Sin propina' },
                  { id: '5', label: '5%' },
                  { id: '10', label: '10%' },
                  { id: '15', label: '15%' },
                  { id: 'custom', label: 'Otro' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setTipSelection(chip.id as any)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                      tipSelection === chip.id
                        ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {tipSelection === 'custom' && (
                <div className="relative pt-1 animate-in fade-in duration-200">
                  <span className="absolute left-3.5 top-3.5 text-gray-400 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder="Monto voluntario en dólares..."
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 rounded-xl border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              )}
            </div>

            {/* RESUMEN FINAL EJECUTIVO */}
            <div className="pt-4 border-t-2 border-dashed border-amber-200/80 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal bruto ({cart.length} ítems)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                  <span>Descuentos aplicados</span>
                  <span>-{formatCurrency(discountTotal)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-xs text-amber-800">
                  <span>Propina voluntaria</span>
                  <span>+{formatCurrency(tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-3 border-t border-amber-200">
                <div>
                  <span className="text-base font-bold text-gray-900">Total a Liquidar</span>
                  <span className="block text-[10px] text-gray-400">
                    Método:{' '}
                    {paymentMethod === 'CASH'
                      ? 'Efectivo'
                      : paymentMethod === 'TRANSFER'
                        ? 'Transferencia'
                        : 'Mixto'}
                  </span>
                </div>
                <span className="text-3xl font-extrabold text-rose-600 font-serif">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-3.5 rounded-2xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors"
              >
                ← Volver
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={
                  isSubmitting ||
                  cart.length === 0 ||
                  (paymentMethod === 'MIXED' && totalPaidInMixed < finalTotal - 0.01)
                }
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-extrabold text-base shadow-lg shadow-rose-950/20 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isSubmitting ? 'Registrando en caja...' : 'Confirmar y Cobrar Venta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: COMPROBANTE / RECIBO DE VENTA EXITOSA ─────────────────────── */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-amber-200/80 space-y-5 text-center">
            {/* Medallón de Éxito */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-widest">
                Transacción Exitosa
              </span>
              <h3
                className="text-2xl font-bold font-serif text-gray-900 mt-2"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                ¡Venta Registrada!
              </h3>
              <p className="text-xs text-gray-500">
                Folio: #{completedSale.id.slice(0, 8).toUpperCase()} · {formatDate(completedSale.created_at)}
              </p>
            </div>

            {/* Ticket Desglosado */}
            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-amber-200/60 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between pb-2 border-b border-gray-200 text-gray-600 font-sans">
                <span className="font-bold">Cliente:</span>
                <span>{completedSale.client_name}</span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {completedSale.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-gray-800">
                    <span className="truncate pr-2">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-bold">{formatCurrency(item.line_total)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-200 space-y-1 text-gray-600 font-sans">
                {completedSale.tip_amount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Propina incluida:</span>
                    <span>{formatCurrency(completedSale.tip_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span>Método de cobro:</span>
                  <span className="font-bold">
                    {completedSale.payment_method === 'CASH'
                      ? 'Efectivo'
                      : completedSale.payment_method === 'TRANSFER'
                        ? 'Transferencia'
                        : `Mixto (Efec: $${completedSale.cash_amount} / Transf: $${completedSale.transfer_amount})`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-gray-900 pt-1 border-t border-gray-200">
                  <span>TOTAL COBRADO:</span>
                  <span className="text-rose-600 font-serif">
                    {formatCurrency(completedSale.final_total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones del Comprobante */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 px-4 rounded-xl border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-50 flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4 text-amber-700" />
                <span>Imprimir Comprobante de Venta</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/sales')}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
                >
                  Ver Historial
                </button>
                <button
                  onClick={handleStartNewSale}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#F6D365] via-[#FDA085] to-[#E11D48] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all"
                >
                  Nueva Venta +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR NUEVO CLIENTE VIP INLINE ───────────────────────── */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-amber-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">Nuevo Cliente VIP</h3>
              <button
                onClick={() => setIsNewClientModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carolina Herrera"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  WhatsApp / Celular
                </label>
                <input
                  type="tel"
                  placeholder="+593 99 999 9999"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fecha de Cumpleaños
                </label>
                <input
                  type="date"
                  value={newClientBirth}
                  onChange={(e) => setNewClientBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 shadow-sm"
                >
                  Guardar y Asignar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
