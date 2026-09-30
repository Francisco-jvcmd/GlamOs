import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { formatCurrency } from '../lib/utils';
import { ArrowLeft, Plus, Minus, Search, Check } from 'lucide-react';

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
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'MIXED'>('CASH');
  const [tipAmount, setTipAmount] = useState(0);
  const [step, setStep] = useState(1);

  // Derived totals
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const discountTotal = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity * (item.discount_percentage / 100),
    0,
  );
  const finalTotal = subtotal - discountTotal + tipAmount;

  const addToCart = (item: Omit<CartItem, 'quantity' | 'line_total'> & { quantity?: number }) => {
    setCart((prev) => {
      const key = item.service_id || item.product_id;
      const existing = prev.find((i) => (i.service_id || i.product_id) === key);
      if (existing) {
        return prev.map((i) =>
          (i.service_id || i.product_id) === key
            ? {
                ...i,
                quantity: i.quantity + 1,
                line_total: i.unit_price * (i.quantity + 1) * (1 - i.discount_percentage / 100),
              }
            : i,
        );
      }
      const qty = item.quantity || 1;
      return [
        ...prev,
        {
          ...item,
          quantity: qty,
          line_total: item.unit_price * qty * (1 - item.discount_percentage / 100),
        },
      ];
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
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

  const handleConfirm = async () => {
    if (!db || !user || cart.length === 0) return;

    const saleId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert sale
    await db.sales.insert({
      id: saleId,
      organization_id: user.org || '',
      employee_id: user.sub,
      client_id: selectedClientId || null,
      subtotal,
      discount_total: discountTotal,
      final_total: finalTotal,
      tip_amount: tipAmount,
      payment_method: paymentMethod,
      cash_amount: null,
      transfer_amount: null,
      transfer_receipt_key: null,
      status: 'COMPLETED',
      voided_at: null,
      voided_by: null,
      void_reason: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    // Insert sale items + stock movements
    for (const item of cart) {
      const itemId = crypto.randomUUID();
      await db.sale_items.insert({
        id: itemId,
        sale_id: saleId,
        organization_id: user.org || '',
        service_id: item.service_id || null,
        product_id: item.product_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        line_total: item.line_total,
        created_at: now,
        updated_at: now,
      });

      // If product, create stock movement (negative delta = sold)
      if (item.product_id) {
        await db.stock_movements.insert({
          id: crypto.randomUUID(),
          organization_id: user.org || '',
          product_id: item.product_id,
          delta: -item.quantity,
          reason: 'SALE',
          reference_id: saleId,
          created_at: now,
          updated_at: now,
        });
      }
    }

    navigate('/sales');
  };

  const filteredClients = (clients || []).filter(
    (c: any) =>
      !c.deleted_at &&
      c.full_name?.toLowerCase().includes(clientSearch.toLowerCase()),
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Nueva Venta
        </h1>
        <span className="ml-auto text-sm text-gray-500">Paso {step}/3</span>
      </div>

      {/* Step 1: Select services/products */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Servicios</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {(services || [])
                .filter((s: any) => !s.deleted_at)
                .map((service: any) => {
                  const discountPct = service.active_discount_percentage || 0;
                  return (
                    <button
                      key={service.id}
                      onClick={() =>
                        addToCart({
                          service_id: service.id,
                          name: service.name,
                          unit_price: service.base_price,
                          discount_percentage: discountPct,
                        })
                      }
                      className="p-3 text-left rounded-lg border border-gray-200 hover:border-rose-300 hover:bg-rose-50 transition-colors dark:border-gray-700 dark:hover:border-rose-500 dark:hover:bg-rose-900/20"
                    >
                      <div className="font-medium text-sm">{service.name}</div>
                      <div className="text-rose-600 font-semibold">
                        {formatCurrency(service.base_price)}
                        {discountPct > 0 && (
                          <span className="ml-1 text-xs text-green-600">
                            -{discountPct}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {(products || [])
                .filter((p: any) => !p.deleted_at && p.current_stock > 0)
                .map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() =>
                      addToCart({
                        product_id: product.id,
                        name: product.name,
                        unit_price: product.unit_price,
                        discount_percentage: 0,
                      })
                    }
                    className="p-3 text-left rounded-lg border border-gray-200 hover:border-rose-300 hover:bg-rose-50 transition-colors dark:border-gray-700 dark:hover:border-rose-500 dark:hover:bg-rose-900/20"
                  >
                    <div className="font-medium text-sm">{product.name}</div>
                    <div className="text-rose-600 font-semibold">
                      {formatCurrency(product.unit_price)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Stock: {product.current_stock}
                    </div>
                  </button>
                ))}
            </CardContent>
          </Card>

          {/* Cart summary */}
          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Carrito ({cart.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(item.unit_price)} × {item.quantity}
                        {item.discount_percentage > 0 &&
                          ` (-${item.discount_percentage}%)`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(idx, -1)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(idx, 1)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="w-20 text-right font-semibold text-sm">
                      {formatCurrency(item.line_total)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full"
            onClick={() => setStep(2)}
            disabled={cart.length === 0}
          >
            Continuar → Cliente
          </Button>
        </div>
      )}

      {/* Step 2: Select client */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cliente (opcional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-rose-500 dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                <button
                  onClick={() => setSelectedClientId(null)}
                  className={`w-full p-2 text-left rounded text-sm ${
                    !selectedClientId
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Sin cliente
                </button>
                {filteredClients.map((client: any) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`w-full p-2 text-left rounded text-sm flex items-center justify-between ${
                      selectedClientId === client.id
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span>{client.full_name}</span>
                    {selectedClientId === client.id && (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              ← Atrás
            </Button>
            <Button onClick={() => setStep(3)} className="flex-1">
              Continuar → Pago
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Payment + confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Método de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {(['CASH', 'TRANSFER', 'MIXED'] as const).map((method) => (
                  <Button
                    key={method}
                    type="button"
                    variant={paymentMethod === method ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod(method)}
                    className="flex-1"
                  >
                    {method === 'CASH'
                      ? 'Efectivo'
                      : method === 'TRANSFER'
                        ? 'Transferencia'
                        : 'Mixto'}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                label="Propina"
                value={tipAmount || ''}
                onChange={(e) => setTipAmount(Number(e.target.value) || 0)}
                placeholder="0.00"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span>-{formatCurrency(discountTotal)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Propina</span>
                  <span>{formatCurrency(tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-rose-600">{formatCurrency(finalTotal)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              ← Atrás
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={cart.length === 0}
              className="flex-1 h-12 text-lg"
            >
              Confirmar Venta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
