import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../auth/auth-context';
import { getDatabase } from '../db/database';
import { triggerSync } from '../db/sync';
import { formatCurrency, formatDate, ensureUuid, generateUuid } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
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
  AlertTriangle,
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

  // Toast / Alert states
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<Array<{ name: string; stock: number; min: number }>>([]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (validationError) {
      const t = setTimeout(() => setValidationError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [validationError]);

  useEffect(() => {
    if (lowStockAlerts.length > 0) {
      const t = setTimeout(() => setLowStockAlerts([]), 5000);
      return () => clearTimeout(t);
    }
  }, [lowStockAlerts]);

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
      setValidationError(`El total cubierto (${formatCurrency(totalPaidInMixed)}) es menor al total a pagar (${formatCurrency(finalTotal)}). Ajusta los montos.`);
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

      // 2. Decrementar stock de productos en caché local
      const lowStockList: Array<{ name: string; stock: number; min: number }> = [];
      try {
        const cachedProducts = localStorage.getItem('glamos_local_products');
        let productList: any[] = cachedProducts ? JSON.parse(cachedProducts) : [];
        for (const item of cart) {
          if (item.product_id) {
            const idx = productList.findIndex((p: any) => p.id === item.product_id);
            if (idx !== -1) {
              const newStock = Math.max(0, (productList[idx].current_stock || 0) - item.quantity);
              productList[idx] = { ...productList[idx], current_stock: newStock, updated_at: now };
              const minAlert = productList[idx].min_stock_alert ?? 5;
              if (newStock <= minAlert) {
                lowStockList.push({ name: productList[idx].name, stock: newStock, min: minAlert });
              }
            }
          }
        }
        localStorage.setItem('glamos_local_products', JSON.stringify(productList));
        window.dispatchEvent(new Event('glamos_updated_products'));
      } catch (stockCacheErr) {
        console.warn('Aviso actualizando stock local:', stockCacheErr);
      }

      // 3. Persistir en RxDB
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
          // Actualizar current_stock en RxDB products
          if (activeDb?.products) {
            for (const item of cart) {
              if (item.product_id) {
                try {
                  const productDoc = await activeDb.products.findOne({ selector: { id: item.product_id } }).exec();
                  if (productDoc) {
                    const oldStock = productDoc.current_stock ?? 0;
                    const newStock = Math.max(0, oldStock - item.quantity);
                    await productDoc.patch({ current_stock: newStock, updated_at: now });
                  }
                } catch {}
              }
            }
          }
        }
      } catch (dbErr) {
        console.warn('Aviso persistiendo en RxDB:', dbErr);
      }

      // 4. Sincronizar en la nube en segundo plano
      try {
        triggerSync();
      } catch {}

      // 5. Alertar productos con stock bajo
      if (lowStockList.length > 0) {
        setLowStockAlerts(lowStockList);
      }

      // 6. Mostrar Comprobante / Recibo de Venta Luxury
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
    <div className="space-y-6 max-w-4xl mx-auto pb-28 select-none relative">
      {/* ── TOAST FLOTANTE: VALIDACIÓN DE PAGO / ERRORES ────────────────────── */}
      {validationError && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A0B10]/95 text-rose-200 border border-rose-500/40 px-5 py-3 rounded-2xl shadow-[0_10px_35px_rgba(244,63,94,0.3)] flex items-center gap-3 text-xs font-semibold backdrop-blur-xl animate-in slide-in-from-top-4 duration-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
          <button onClick={() => setValidationError(null)} className="ml-2 text-neutral-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── TOAST FLOTANTE: ALERTA DE STOCK MÍNIMO TRAS VENTA ───────────────── */}
      {lowStockAlerts.length > 0 && !completedSale && (
        <div className="fixed top-6 right-6 z-50 max-w-sm bg-[#16130B]/95 border border-amber-400/50 p-4 rounded-2xl shadow-[0_10px_35px_rgba(212,175,55,0.3)] backdrop-blur-xl animate-in slide-in-from-right duration-200 space-y-2">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Stock Mínimo Alcanzado</span>
            </div>
            <button onClick={() => setLowStockAlerts([])} className="text-neutral-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-[11px] text-neutral-300 space-y-1">
            {lowStockAlerts.map((a, i) => (
              <div key={i} className="flex justify-between items-center py-0.5">
                <span className="text-white font-medium truncate pr-2">{a.name}</span>
                <span className="text-amber-300 font-mono font-bold shrink-0">Quedan {a.stock} un. (Mín: {a.min})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TOP NAV / STEPPER ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => {
              if (step > 1) setStep((s) => (s - 1) as any);
              else navigate('/sales');
            }}
            className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-neutral-300 hover:bg-white/[0.1] hover:text-white transition-all shadow-2xs active:scale-95"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-white tracking-tight">
              Terminal de Nueva Venta
            </h1>
            <p className="text-xs text-neutral-400 font-normal">
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
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                step === s.num
                  ? 'bg-gradient-to-r from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 shadow-[0_4px_16px_rgba(212,175,55,0.3)] font-black scale-105'
                  : step > s.num
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/[0.04] text-neutral-500 border border-white/10'
              }`}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-black/10 font-bold">
                {step > s.num ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PASO 1: SELECCIÓN DE SERVICIOS Y PRODUCTOS ──────────────────────── */}
      {step === 1 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Catálogo */}
          <div className="lg:col-span-2 space-y-4">
            {/* Buscador y Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Buscar corte, manicura, tinte, shampoo..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-2xl border border-white/10 bg-neutral-900/80 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 shadow-2xs backdrop-blur-sm"
                />
              </div>
              <div className="flex rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 p-1 shrink-0">
                <button
                  onClick={() => setActiveCatalogTab('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeCatalogTab === 'ALL'
                      ? 'bg-white/[0.1] text-amber-300 shadow-2xs font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setActiveCatalogTab('SERVICES')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeCatalogTab === 'SERVICES'
                      ? 'bg-white/[0.1] text-amber-300 shadow-2xs font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Servicios
                </button>
                <button
                  onClick={() => setActiveCatalogTab('PRODUCTS')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeCatalogTab === 'PRODUCTS'
                      ? 'bg-white/[0.1] text-amber-300 shadow-2xs font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Productos
                </button>
              </div>
            </div>

            {/* Grid de Servicios */}
            {(activeCatalogTab === 'ALL' || activeCatalogTab === 'SERVICES') && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  <span>Servicios del Salón ({filteredServices.length})</span>
                </div>
                {filteredServices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400 bg-neutral-900/50 rounded-2xl border border-dashed border-white/10">
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
                          className={`group p-3.5 rounded-2xl border bg-neutral-900/60 cursor-pointer transition-all hover:shadow-lg flex items-center justify-between gap-3 ${
                            inCart
                              ? 'border-amber-400/80 bg-amber-400/10 shadow-sm ring-1 ring-amber-400/30'
                              : 'border-white/[0.08] hover:border-amber-400/40 hover:bg-neutral-900/80'
                          }`}
                        >
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-white truncate group-hover:text-amber-200">
                              {svc.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-bold text-sm text-white font-serif">
                                {formatCurrency(svc.base_price)}
                              </span>
                              {discountPct > 0 && (
                                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                  -{discountPct}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                              inCart
                                ? 'bg-gradient-to-r from-[#F5E5C4] to-[#D4AF37] text-neutral-950 font-bold text-xs'
                                : 'bg-white/[0.06] text-amber-300 border border-white/10'
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
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span>Productos en Stock ({filteredProducts.length})</span>
                </div>
                {filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400 bg-neutral-900/50 rounded-2xl border border-dashed border-white/10">
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
                          className={`group p-3.5 rounded-2xl border bg-neutral-900/60 cursor-pointer transition-all hover:shadow-lg flex items-center justify-between gap-3 ${
                            inCart
                              ? 'border-amber-400/80 bg-amber-400/10 shadow-sm ring-1 ring-amber-400/30'
                              : 'border-white/[0.08] hover:border-amber-400/40 hover:bg-neutral-900/80'
                          }`}
                        >
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-white truncate group-hover:text-amber-200">
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-bold text-sm text-white font-serif">
                                {formatCurrency(prod.unit_price)}
                              </span>
                              <span className="text-[10px] text-neutral-400 bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.5 rounded">
                                Stock: {prod.current_stock}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                              inCart
                                ? 'bg-gradient-to-r from-[#F5E5C4] to-[#D4AF37] text-neutral-950 font-bold text-xs'
                                : 'bg-white/[0.06] text-amber-300 border border-white/10'
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
            <div className="bg-neutral-900/80 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl sticky top-6">
              <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <h3 className="font-editorial text-lg font-bold text-white">Carrito Actual</h3>
                </div>
                <Badge variant="gold">
                  {cart.length} {cart.length === 1 ? 'ítem' : 'ítems'}
                </Badge>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-amber-400/50 stroke-1" />
                  <p className="text-xs font-semibold text-neutral-300">El carrito está vacío</p>
                  <p className="text-[11px] text-neutral-500">
                    Toca cualquier servicio o producto del catálogo para agregarlo.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06] my-3 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                  {cart.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          {formatCurrency(item.unit_price)} c/u
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 bg-white/[0.06] border border-white/10 rounded-xl p-0.5">
                        <button
                          onClick={() => updateQuantity(idx, -1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-neutral-300 hover:bg-white/[0.1] transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(idx, 1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-neutral-300 hover:bg-white/[0.1] transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="w-16 text-right font-editorial font-bold text-sm text-white">
                        {formatCurrency(item.line_total)}
                      </div>

                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-neutral-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Totales del Carrito */}
              {cart.length > 0 && (
                <div className="pt-3.5 border-t border-white/[0.08] space-y-2">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Subtotal</span>
                    <span className="font-editorial text-sm font-bold text-neutral-200">{formatCurrency(subtotal)}</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between text-xs text-emerald-400 font-medium">
                      <span>Descuentos promocionales</span>
                      <span className="font-editorial text-sm font-bold">-{formatCurrency(discountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2.5 border-t border-dashed border-white/15">
                    <span className="text-sm font-semibold text-neutral-300 font-interface">Total a Cobrar</span>
                    <span className="text-2xl font-bold text-white font-editorial">
                      {formatCurrency(netTotal)}
                    </span>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full mt-4 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold text-xs shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_28px_rgba(212,175,55,0.5)] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                  >
                    <span>Continuar con Cliente VIP</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BOTÓN FLOTANTE MÓVIL / TABLET: ACCESO DIRECTO AL CARRITO ────────── */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-20 left-4 right-4 z-30 animate-in slide-in-from-bottom duration-200">
            <button
              onClick={() => setStep(2)}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold text-sm shadow-[0_4px_20px_rgba(212,175,55,0.3)] flex items-center justify-between active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center text-xs font-black">
                  {cart.length}
                </span>
                <span className="text-xs font-bold tracking-wide">
                  {cart.length === 1 ? 'ítem agregado' : 'ítems en el carrito'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base font-serif">
                  {formatCurrency(netTotal)}
                </span>
                <span className="text-[11px] bg-black/15 px-2 py-0.5 rounded-lg font-bold">
                  Continuar →
                </span>
              </div>
            </button>
          </div>
        )}
        </>
      )}

      {/* ── PASO 2: ASIGNACIÓN DE CLIENTE VIP ──────────────────────────────── */}
      {step === 2 && (
        <div className="max-w-xl mx-auto space-y-5">
          <div className="bg-neutral-900/80 rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="font-editorial text-lg font-bold text-white">Seleccionar Cliente</h3>
                <p className="text-xs text-neutral-400">
                  Asocia la venta a un cliente para historial, fidelización y recordatorios.
                </p>
              </div>
              <button
                onClick={() => setIsNewClientModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] text-amber-300 border border-white/10 text-xs font-semibold hover:bg-white/[0.1] transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Nuevo Cliente</span>
              </button>
            </div>

            {/* Buscador de cliente */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono de WhatsApp..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-neutral-950/80 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </div>

            {/* Lista de Clientes */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-white/[0.05] pr-1">
              <button
                type="button"
                onClick={() => setSelectedClientId(null)}
                className={`w-full p-3 rounded-2xl text-left flex items-center justify-between transition-all ${
                  !selectedClientId
                    ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] text-neutral-300 border border-white/[0.05]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Cliente Ocasional / Anónimo</div>
                  <div
                    className={`text-[10px] ${
                      !selectedClientId ? 'text-neutral-900 font-medium' : 'text-neutral-500'
                    }`}
                  >
                    No registrar datos personales en esta venta
                  </div>
                </div>
                {!selectedClientId && <Check className="w-4 h-4 text-neutral-950 stroke-[3]" />}
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
                        ? 'bg-gradient-to-r from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold shadow-md'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{client.full_name}</div>
                      <div
                        className={`text-[11px] ${
                          isSelected ? 'text-neutral-900' : 'text-neutral-400'
                        }`}
                      >
                        {client.phone_whatsapp || 'Sin WhatsApp'}
                        {client.birth_date && ` · Cumple: ${client.birth_date}`}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-neutral-950 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-3 rounded-2xl border border-white/15 bg-white/[0.04] text-neutral-300 font-bold text-xs hover:bg-white/[0.08] hover:text-white"
            >
              ← Volver al Catálogo
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold text-sm shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:brightness-105 transition-all"
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
          <div className="bg-neutral-900/80 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/30">
                Paso 3 de 3 · Liquidación
              </span>
              <h2
                className="text-2xl font-bold font-editorial text-white mt-2"
              >
                Método de Pago
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
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
                    className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/40 shadow-lg text-white'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-neutral-300'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-gradient-to-tr from-[#F5E5C4] to-[#D4AF37] text-neutral-950 shadow-sm'
                          : 'bg-white/[0.06] text-neutral-400'
                      }`}
                    >
                      <m.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">{m.label}</div>
                      <div className="text-[10px] text-neutral-400 hidden sm:block">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* SECCIÓN ESPECIAL: PAGO MIXTO (EFECTIVO + TRANSFERENCIA) */}
            {paymentMethod === 'MIXED' && (
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-amber-200 uppercase tracking-wide">
                      Desglose de Pago Mixto
                    </span>
                  </div>
                  {/* Botones de cálculo rápido */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleSetMixedSplit5050}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-[11px] font-bold text-amber-300 hover:bg-white/[0.1] transition-colors shadow-xs"
                    >
                      50% / 50%
                    </button>
                    <button
                      type="button"
                      onClick={handleSetMixedAllCash}
                      className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] text-neutral-400 hover:text-white"
                    >
                      Todo Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={handleSetMixedAllTransfer}
                      className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] text-neutral-400 hover:text-white"
                    >
                      Todo Transf.
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Monto en Efectivo */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      💵 Recibido en Efectivo ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cashAmountInput}
                        onChange={(e) => setCashAmountInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-white/10 bg-neutral-950/80 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                    </div>
                  </div>

                  {/* Monto en Transferencia */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      💳 Recibido en Transferencia ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={transferAmountInput}
                        onChange={(e) => setTransferAmountInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-white/10 bg-neutral-950/80 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Balance Dinámico de Pago Mixto */}
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    mixedDifference >= 0
                      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {mixedDifference >= 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
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
            <div className="pt-2 border-t border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-200">
                    Propina para el Personal
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Opcional
                  </span>
                </div>
                {tipAmount > 0 && (
                  <span className="text-xs font-bold text-emerald-400 font-serif">
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
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      tipSelection === chip.id
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold shadow-xs'
                        : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {tipSelection === 'custom' && (
                <div className="relative pt-1 animate-in fade-in duration-200">
                  <span className="absolute left-3.5 top-3.5 text-neutral-500 font-bold text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder="Monto voluntario en dólares..."
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 rounded-xl border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 bg-neutral-950/80"
                  />
                </div>
              )}
            </div>

            {/* RESUMEN FINAL EJECUTIVO */}
            <div className="pt-4 border-t-2 border-dashed border-white/10 space-y-2">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Subtotal bruto ({cart.length} ítems)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-xs text-emerald-400 font-medium">
                  <span>Descuentos aplicados</span>
                  <span>-{formatCurrency(discountTotal)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-xs text-amber-300">
                  <span>Propina voluntaria</span>
                  <span>+{formatCurrency(tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-3 border-t border-white/10">
                <div>
                  <span className="text-base font-bold text-white">Total a Liquidar</span>
                  <span className="block text-[10px] text-neutral-400">
                    Método:{' '}
                    {paymentMethod === 'CASH'
                      ? 'Efectivo'
                      : paymentMethod === 'TRANSFER'
                        ? 'Transferencia'
                        : 'Mixto'}
                  </span>
                </div>
                <span className="text-3xl font-bold text-white font-editorial">
                  {formatCurrency(finalTotal)}
                </span>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-3.5 rounded-2xl border border-white/15 bg-white/[0.04] text-neutral-300 font-bold text-xs hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
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
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold text-base shadow-[0_6px_25px_rgba(212,175,55,0.35)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm sm:max-w-md bg-[#0F0E14]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.9)] border border-white/10 space-y-5 text-center max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Subtle gold corner accents */}
            <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-amber-400/40 rounded-tl-sm pointer-events-none" />
            <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-amber-400/40 rounded-tr-sm pointer-events-none" />

            {/* Medallón de Éxito de Alta Joyería */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(212,175,55,0.3)]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30 uppercase tracking-widest">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Transacción Exitosa · GlamOS
              </span>
              <h3 className="text-3xl font-bold font-editorial text-white mt-2 tracking-tight">
                ¡Venta Registrada!
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Folio: #{completedSale.id.slice(0, 8).toUpperCase()} · {formatDate(completedSale.created_at)}
              </p>
            </div>

            {/* Alerta de Stock Mínimo Alcanzado */}
            {lowStockAlerts.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-left space-y-1.5 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>¡Alerta de Inventario Crítico!</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-snug">
                  Los siguientes productos han alcanzado o caído por debajo de su stock mínimo recomendado:
                </p>
                <div className="space-y-1 pt-1">
                  {lowStockAlerts.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-black/40 px-2.5 py-1.5 rounded-xl border border-amber-400/20">
                      <span className="font-semibold text-white truncate pr-2">{item.name}</span>
                      <span className="font-mono text-amber-300 font-bold shrink-0">
                        Quedan {item.stock} un. (Mín: {item.min})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ticket Desglosado con Acabado de Seda */}
            <div className="bg-black/60 rounded-2xl p-4 sm:p-5 border border-white/[0.08] text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between pb-2 border-b border-white/[0.08] text-neutral-400 font-sans">
                <span className="font-semibold text-neutral-300">Cliente VIP:</span>
                <span className="font-bold text-white">{completedSale.client_name}</span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                {completedSale.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-neutral-200">
                    <span className="truncate pr-2">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-bold text-white shrink-0">{formatCurrency(item.line_total)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/[0.08] space-y-1.5 text-neutral-400 font-sans">
                {completedSale.tip_amount > 0 && (
                  <div className="flex justify-between text-xs text-amber-300 font-medium">
                    <span>Propina incluida:</span>
                    <span>+{formatCurrency(completedSale.tip_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span>Método de cobro:</span>
                  <span className="font-bold text-white">
                    {completedSale.payment_method === 'CASH'
                      ? 'Efectivo en caja'
                      : completedSale.payment_method === 'TRANSFER'
                        ? 'Transferencia bancaria'
                        : `Mixto (Efec: $${completedSale.cash_amount} / Transf: $${completedSale.transfer_amount})`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-white/[0.08]">
                  <span className="font-sans text-xs uppercase tracking-wider text-neutral-400 self-center">TOTAL COBRADO:</span>
                  <span className="text-2xl text-gradient-glam font-editorial font-bold">
                    {formatCurrency(completedSale.final_total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones del Comprobante */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => window.print()}
                className="w-full py-3 px-4 rounded-2xl border border-white/15 bg-white/[0.04] text-neutral-200 font-bold text-xs hover:bg-white/[0.08] hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Imprimir Ticket de Venta</span>
              </button>

              <div className="flex gap-2.5">
                <button
                  onClick={() => navigate('/sales')}
                  className="flex-1 py-3 px-4 rounded-2xl border border-white/15 bg-white/[0.04] text-neutral-300 font-bold text-xs hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  Ver Libro Diario
                </button>
                <button
                  onClick={handleStartNewSale}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold text-xs shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:brightness-105 transition-all"
                >
                  + Nueva Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR NUEVO CLIENTE VIP INLINE ───────────────────────── */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0F0E14]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="font-editorial text-lg font-bold text-white">Nuevo Cliente VIP</h3>
              <button
                onClick={() => setIsNewClientModalOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carolina Herrera"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-neutral-950/80 text-white placeholder:text-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  WhatsApp / Celular
                </label>
                <input
                  type="tel"
                  placeholder="+593 99 999 9999"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-neutral-950/80 text-white placeholder:text-neutral-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Fecha de Cumpleaños
                </label>
                <input
                  type="date"
                  value={newClientBirth}
                  onChange={(e) => setNewClientBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-neutral-950/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-white/15 bg-white/[0.04] text-xs font-bold text-neutral-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#F5E5C4] via-[#D4AF37] to-[#B88A22] text-neutral-950 font-bold text-xs shadow-[0_4px_16px_rgba(212,175,55,0.3)] hover:brightness-105"
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
