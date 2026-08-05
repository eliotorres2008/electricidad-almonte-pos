import { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Receipt, X, Printer, CheckCircle2,
  User, FileText, CreditCard, Banknote, ArrowLeftRight, Wallet, Layers, Phone,
  AlertTriangle, Wrench, FolderOpen, ArrowRight, CalendarClock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type {
  Product, CartItem, NcfType, SaleRecord, PaymentMethod, MixedPayment, UnitType,
  Customer, AccountReceivable, CompanyConfig, Quote, QuoteItem, PrintFormat,
} from '@/types';
import { Modal } from '@/components/Modal';
import { NumberField } from '@/components/NumberField';
import { formatCurrency, genId, genNcf, unitPrice, availableUnits, formatNumber } from '@/lib/format';

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { key: 'efectivo', label: 'Efectivo', icon: <Banknote size={18} /> },
  { key: 'tarjeta', label: 'Tarjeta', icon: <CreditCard size={18} /> },
  { key: 'transferencia', label: 'Transferencia', icon: <ArrowLeftRight size={18} /> },
  { key: 'credito', label: 'Crédito / Fiado', icon: <Wallet size={18} /> },
  { key: 'mixto', label: 'Pago Mixto', icon: <Layers size={18} /> },
];

const nowTs = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

export function Sales() {
  const app = useApp();
  const { products, config, ncfSequences, customers, employees, addReceivable, upsertCustomer, registerSale, quotes, saveQuote, convertQuote, pendingDispatchCart, setPendingDispatchCart } = app;

  const [mode, setMode] = useState<'venta' | 'cotizacion'>('venta');
  const [query, setQuery] = useState('');
  const [catTab, setCatTab] = useState('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ncfType, setNcfType] = useState<NcfType>('B02');
  const [customerDoc, setCustomerDoc] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [cashReceived, setCashReceived] = useState(0);
  const [mixed, setMixed] = useState<MixedPayment>({ efectivo: 0, tarjeta: 0, transferencia: 0 });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceIdx, setEditingServiceIdx] = useState<number | null>(null);
  const [pendingQuote, setPendingQuote] = useState<Quote | null>(null);
  const [quotePrintOpen, setQuotePrintOpen] = useState(false);
  const [savedQuotesOpen, setSavedQuotesOpen] = useState(false);
  const [quoteMetaOpen, setQuoteMetaOpen] = useState(false);
  const [quoteMeta, setQuoteMeta] = useState({ clientName: '', phone: '', notes: '', validDays: 15 });
  const [quoteFormat, setQuoteFormat] = useState<PrintFormat>('ticket_80');
  const [viewQuote, setViewQuote] = useState<Quote | null>(null);
  const [saveQuoteToSystem, setSaveQuoteToSystem] = useState(false);

  // Credit / Fiado customer selection
  const [creditCustomerId, setCreditCustomerId] = useState('');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPhone, setQuickAddPhone] = useState('');

  const isQuote = mode === 'cotizacion';
  const isB01 = ncfType === 'B01';
  const isCredit = paymentMethod === 'credito';
  const selectedCreditCustomer = customers.find((c) => c.id === creditCustomerId) ?? null;
  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (catTab === 'Todas' || p.category === catTab) &&
        (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.barcode.includes(q)),
    );
  }, [products, query, catTab]);

  const effectiveStock = (product: Product, unit: UnitType): number => {
    if (unit === product.unit) return product.stock;
    if (product.baseUnit && product.baseUnitFactor) return Math.floor(product.stock / product.baseUnitFactor);
    return product.stock;
  };

  const totalQtyInCart = (productId: string, unit: UnitType): number => {
    return cart.filter((i) => i.product.id === productId && i.unit === unit && !i.isService).reduce((s, i) => s + i.qty, 0);
  };

  const canAddOne = (product: Product, unit: UnitType): boolean => {
    if (config.allowNegativeStock) return true;
    const inCart = totalQtyInCart(product.id, unit);
    return inCart + 1 <= effectiveStock(product, unit);
  };

  const addToCart = (product: Product) => {
    if (!config.allowNegativeStock && effectiveStock(product, product.unit) <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.unit === product.unit && !i.isService);
      if (existing) {
        if (!config.allowNegativeStock && existing.qty + 1 > effectiveStock(product, product.unit)) return prev;
        return prev.map((i) => (i.product.id === product.id && i.unit === product.unit && !i.isService ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { product, qty: 1, unit: product.unit }];
    });
  };

  const updateQty = (id: string, unit: UnitType, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === id && i.unit === unit && !i.isService);
      if (item && delta > 0 && !config.allowNegativeStock && item.qty + delta > effectiveStock(item.product, unit)) {
        return prev;
      }
      return prev
        .map((i) => (i.product.id === id && i.unit === unit ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0);
    });
  };

  const changeUnit = (id: string, oldUnit: UnitType, newUnit: UnitType) => {
    setCart((prev) =>
      prev.map((i) => (i.product.id === id && i.unit === oldUnit ? { ...i, unit: newUnit, qty: 1 } : i)),
    );
  };

  const removeItem = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));
  const clearCart = () => setCart([]);

  const lineTotal = (item: CartItem) => item.isService ? (item.servicePrice ?? 0) * item.qty : unitPrice(item.product, item.unit) * item.qty;

  const { subtotal, discount, itbis, retentionItbis, retentionIsr, total, netToCollect } = useMemo(() => {
    const sub = cart.reduce((s, i) => s + lineTotal(i), 0);
    const disc = (sub * discountPct) / 100;
    // ITBIS applies ONLY to physical products; services/labor are tax-exempt
    const productSub = cart.filter((i) => !i.isService).reduce((s, i) => s + lineTotal(i), 0);
    const taxableBase = productSub * (1 - discountPct / 100);
    const tax = taxableBase * (config.itbisRate / 100);
    const gross = (sub - disc) + tax;
    const applyRet = ncfType === 'B15' && config.retencionItbis;
    const retItbis = applyRet ? tax * (config.retencionItbisRate / 100) : 0;
    const retIsr = applyRet && config.retencionIsr ? gross * (config.retencionIsrRate / 100) : 0;
    return { subtotal: sub, discount: disc, taxedBase: taxableBase, itbis: tax, retentionItbis: retItbis, retentionIsr: retIsr, total: gross, netToCollect: gross - retItbis - retIsr };
  }, [cart, discountPct, config, ncfType]);

  const itemCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const mixedTotal = mixed.efectivo + mixed.tarjeta + mixed.transferencia;
  const change = paymentMethod === 'mixto' ? mixedTotal - total : cashReceived - total;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        if (cart.length > 0 && !isQuote) setCheckoutOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, isQuote]);

  // Consume a dispatch liquidation handoff: preload the cart + customer and open checkout.
  useEffect(() => {
    if (!pendingDispatchCart) return;
    setCart(pendingDispatchCart.cart);
    setCustomerName(pendingDispatchCart.customerName);
    setMode('venta');
    setPendingDispatchCart(null);
    // Defer opening checkout so the cart state has settled.
    const t = setTimeout(() => setCheckoutOpen(true), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDispatchCart]);

  const quickAddCustomer = () => {
    if (!quickAddName.trim()) return;
    const c: Customer = {
      id: genId('c'),
      name: quickAddName.trim(),
      phone: quickAddPhone.trim() || 'N/D',
      balance: 0,
      createdAt: new Date().toISOString(),
    };
    upsertCustomer(c);
    setCreditCustomerId(c.id);
    setQuickAddName('');
    setQuickAddPhone('');
  };

  const b01Blocked = isB01 && (!customerDoc.trim() || !customerName.trim());
  const creditBlocked = isCredit && (!selectedCreditCustomer || selectedCreditCustomer.name === 'Consumidor Final');
  const mixtoBlocked = paymentMethod === 'mixto' && mixedTotal < total;
  const cashBlocked = paymentMethod === 'efectivo' && cashReceived < total;

  const completeSale = () => {
    if (b01Blocked || creditBlocked || mixtoBlocked) return;

    const seq = ncfSequences.find((s) => s.type === ncfType);
    const ncf = seq ? genNcf(seq.prefix, seq.currentSeq) : genNcf(ncfType, 0);

    const finalCustomerName = isCredit && selectedCreditCustomer ? selectedCreditCustomer.name : (customerName.trim() || 'Consumidor Final');
    const finalCustomerDoc = isCredit && selectedCreditCustomer ? (selectedCreditCustomer.rnc ?? '') : customerDoc.trim();

    const sale: SaleRecord = {
      id: genId('s'),
      date: new Date().toISOString(),
      items: cart.map((i) => ({
        name: i.isService ? (i.serviceTitle ?? 'Servicio') : i.product.name,
        qty: i.qty,
        price: i.isService ? (i.servicePrice ?? 0) : unitPrice(i.product, i.unit),
        unit: i.isService ? 'serv' : i.unit,
        isService: i.isService,
        assignedEmployeeId: i.assignedEmployeeId,
        commissionAmount: i.commissionAmount,
      })),
      subtotal,
      discount,
      itbis,
      total,
      ncf,
      ncfType,
      customerDoc: finalCustomerDoc,
      customerName: finalCustomerName,
      cashier: config.cashier,
      paymentMethod,
      mixed: paymentMethod === 'mixto' ? mixed : undefined,
      cashReceived: paymentMethod === 'efectivo' ? cashReceived : undefined,
    };

    setLastSale(sale);
    registerSale(sale);

    if (paymentMethod === 'credito' && selectedCreditCustomer) {
      const due = new Date();
      due.setDate(due.getDate() + 30);
      const ar: AccountReceivable = {
        id: genId('ar'),
        customerId: selectedCreditCustomer.id,
        customerName: selectedCreditCustomer.name,
        saleId: sale.id,
        ncf: sale.ncf,
        amount: total,
        paid: 0,
        status: 'pendiente',
        date: nowTs(),
        dueDate: due.toISOString().replace('T', ' ').slice(0, 19),
      };
      addReceivable(ar);
    }

    setCheckoutOpen(false);
    setReceiptOpen(true);
  };

  // ===== Quote flow =====

  const finalizeQuote = (fmt: PrintFormat) => {
    const quoteNum = `COT-${String(quotes.length + 1).padStart(4, '0')}`;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (quoteMeta.validDays || 15));

    const quote: Quote = {
      id: genId('q'),
      number: quoteNum,
      date: new Date().toISOString(),
      expiryDate: expiry.toISOString(),
      items: cart.map((i) => ({
        name: i.isService ? (i.serviceTitle ?? 'Servicio') : i.product.name,
        qty: i.qty,
        price: i.isService ? (i.servicePrice ?? 0) : unitPrice(i.product, i.unit),
        unit: i.isService ? 'serv' : i.unit,
        isService: i.isService,
        assignedEmployeeId: i.assignedEmployeeId,
        commissionAmount: i.commissionAmount,
      })),
      subtotal,
      discount,
      itbis,
      total,
      customerName: quoteMeta.clientName.trim() || customerName.trim() || 'Consumidor Final',
      customerDoc: quoteMeta.phone.trim() || customerDoc.trim(),
      cashier: config.cashier,
      status: 'vigente',
      printFormat: fmt,
    };
    if (saveQuoteToSystem) saveQuote(quote);
    setPendingQuote(quote);
    setQuoteMetaOpen(false);
    setQuotePrintOpen(true);
  };

  const loadQuoteIntoCart = (q: Quote) => {
    const newCart: CartItem[] = q.items.map((qi: QuoteItem) => {
      if (qi.isService) {
        return {
          product: { id: genId('svc'), code: 'SVC', name: qi.name, category: 'Servicio', price: qi.price, cost: 0, stock: 0, unit: 'Unidad', barcode: '', minStock: 0 } as Product,
          qty: qi.qty,
          unit: 'Unidad' as UnitType,
          isService: true,
          serviceTitle: qi.name,
          servicePrice: qi.price,
          assignedEmployeeId: qi.assignedEmployeeId,
          commissionAmount: qi.commissionAmount,
        };
      }
      const prod = products.find((p) => p.name === qi.name);
      if (!prod) return null;
      return { product: prod, qty: qi.qty, unit: qi.unit as UnitType };
    }).filter(Boolean) as CartItem[];

    setCart(newCart);
    setCustomerName(q.customerName);
    setCustomerDoc(q.customerDoc);
    setDiscountPct(q.subtotal > 0 ? (q.discount / q.subtotal) * 100 : 0);
    setMode('venta');
    setSavedQuotesOpen(false);
  };

  const convertQuoteToSale = (q: Quote) => {
    const updated = convertQuote(q.id);
    if (!updated) return;
    loadQuoteIntoCart(updated);
  };

  const resetAfterReceipt = () => {
    setReceiptOpen(false);
    setCart([]);
    setCustomerDoc('');
    setCustomerName('');
    setDiscountPct(0);
    setCashReceived(0);
    setPaymentMethod('efectivo');
    setMixed({ efectivo: 0, tarjeta: 0, transferencia: 0 });
    setCreditCustomerId('');
    setQuickAddName('');
    setQuickAddPhone('');
    setLastSale(null);
  };

  const resetAfterQuote = () => {
    setQuotePrintOpen(false);
    setPendingQuote(null);
    setCart([]);
    setCustomerDoc('');
    setCustomerName('');
    setDiscountPct(0);
    setQuoteMeta({ clientName: '', phone: '', notes: '', validDays: 15 });
    setSaveQuoteToSystem(false);
  };

  // Fallback sale built from current cart so the ticket preview NEVER renders blank
  const fallbackSale: SaleRecord = {
    id: 'preview',
    date: new Date().toISOString(),
    items: cart.length > 0
      ? cart.map((i) => ({
          name: i.isService ? (i.serviceTitle ?? 'Servicio') : i.product.name,
          qty: i.qty,
          price: i.isService ? (i.servicePrice ?? 0) : unitPrice(i.product, i.unit),
          unit: i.isService ? 'serv' : i.unit,
          isService: i.isService,
          assignedEmployeeId: i.assignedEmployeeId,
          commissionAmount: i.commissionAmount,
        }))
      : [{ name: 'Sin productos', qty: 0, price: 0, unit: 'unid' }],
    subtotal,
    discount,
    itbis,
    total,
    ncf: 'B02-0000000',
    ncfType,
    customerDoc: customerDoc.trim(),
    customerName: customerName.trim() || 'Consumidor Final',
    cashier: config.cashier,
    paymentMethod,
    mixed: paymentMethod === 'mixto' ? mixed : undefined,
    cashReceived: paymentMethod === 'efectivo' ? cashReceived : undefined,
  };

  // Fallback quote built from current cart so the preview NEVER renders blank
  const fallbackQuote: Quote = {
    id: 'preview',
    number: `COT-${String(quotes.length + 1).padStart(4, '0')}`,
    date: new Date().toISOString(),
    expiryDate: new Date(Date.now() + (quoteMeta.validDays || 15) * 86400000).toISOString(),
    items: cart.length > 0
      ? cart.map((i) => ({
          name: i.isService ? (i.serviceTitle ?? 'Servicio') : i.product.name,
          qty: i.qty,
          price: i.isService ? (i.servicePrice ?? 0) : unitPrice(i.product, i.unit),
          unit: i.isService ? 'serv' : i.unit,
          isService: i.isService,
          assignedEmployeeId: i.assignedEmployeeId,
          commissionAmount: i.commissionAmount,
        }))
      : [{ name: 'Sin productos', qty: 0, price: 0, unit: 'unid' }],
    subtotal,
    discount,
    itbis,
    total,
    customerName: quoteMeta.clientName.trim() || customerName.trim() || 'Consumidor Final',
    customerDoc: quoteMeta.phone.trim() || customerDoc.trim(),
    cashier: config.cashier,
    status: 'vigente',
    printFormat: quoteFormat,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left: Product search + category tabs */}
      <div className="lg:w-[35%] flex flex-col gap-3">
        <div className="card p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const q = query.trim();
                  if (!q) return;
                  const exact = products.find((p) => p.barcode === q || p.code.toLowerCase() === q.toLowerCase());
                  if (exact) {
                    addToCart(exact);
                    setQuery('');
                  } else if (filtered.length === 1) {
                    addToCart(filtered[0]);
                    setQuery('');
                  }
                }
              }}
              placeholder="Buscar por nombre, código o barras..."
              className="input pl-11 text-base"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="card p-2 flex gap-1 overflow-x-auto">
          {['Todas', ...app.categories].map((cat) => (
            <button
              key={cat}
              onClick={() => setCatTab(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                catTab === cat
                  ? 'bg-brand-500 text-neutral-900'
                  : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="card p-3 flex-1 overflow-hidden flex flex-col">
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 px-2 pb-2 uppercase tracking-wide">
            {query ? `${filtered.length} resultados` : catTab === 'Todas' ? 'Productos populares' : catTab}
          </p>
          <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-brand-500/10 border border-transparent hover:border-brand-500/30 transition text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-700/60 flex items-center justify-center shrink-0 group-hover:bg-brand-500/20 transition">
                  <Plus size={18} className="text-neutral-400 group-hover:text-brand-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{p.name}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    {p.code} · {p.category} · Stock: {p.stock} {p.unit === 'Metro' ? 'm' : 'u'}
                    {p.baseUnit && ` · ${p.baseUnitFactor}${p.unit === 'Metro' ? 'm' : ''}/${p.baseUnit}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-brand-500 block">{formatCurrency(p.price)}</span>
                  <span className="text-[10px] text-neutral-400">/{p.unit}</span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-neutral-400 dark:text-neutral-600">
                <Search size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin resultados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="lg:w-[65%] flex flex-col gap-3">
        <div className="card flex-1 overflow-y-auto">
          {/* Cart header with mode toggle */}
          <div className="sticky top-0 z-10 p-4 pb-3 border-b border-neutral-200 dark:border-neutral-700/50 bg-white dark:bg-neutral-800 backdrop-blur space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} className="text-brand-500" />
                <h2 className="font-bold text-neutral-900 dark:text-white">{isQuote ? 'Modo Cotización' : 'Carrito de Venta'}</h2>
                <span className="chip bg-brand-500/15 text-brand-600 dark:text-brand-400">{itemCount} ítems</span>
              </div>
              <div className="flex items-center gap-2">
                {isQuote && (
                  <button onClick={() => setSavedQuotesOpen(true)} className="btn-ghost px-3 py-1.5 text-xs"><FolderOpen size={14} /> Cotizaciones</button>
                )}
                <button
                  onClick={() => { setEditingServiceIdx(null); setServiceModalOpen(true); }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-500/40 text-blue-500 hover:bg-blue-500/10 transition flex items-center gap-1.5"
                >
                  <Wrench size={14} /> + Servicio
                </button>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-xs font-semibold text-red-500 hover:text-red-400 transition flex items-center gap-1">
                    <Trash2 size={14} /> Vaciar
                  </button>
                )}
              </div>
            </div>
            {/* Mode toggle */}
            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl p-1 w-fit">
              <button
                onClick={() => setMode('venta')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${mode === 'venta' ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                <Receipt size={14} /> Venta Normal
              </button>
              <button
                onClick={() => setMode('cotizacion')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${mode === 'cotizacion' ? 'bg-blue-500 text-white' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                <FileText size={14} /> Modo Cotización
              </button>
            </div>
          </div>

          <div className="p-3 pt-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600 py-20">
                <ShoppingCart size={48} className="mb-3 opacity-40" />
                <p className="font-semibold">{isQuote ? 'Cotización vacía' : 'Carrito vacío'}</p>
                <p className="text-sm">Selecciona productos de la izquierda o agrega un servicio</p>
              </div>
            ) : (
              <>
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex flex-col p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40 animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        {item.isService ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <Wrench size={13} className="text-blue-500 shrink-0" />
                              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{item.serviceTitle}</p>
                            </div>
                            <p className="text-xs text-blue-500">{formatCurrency(item.servicePrice ?? 0)} c/u · Servicio</p>
                            {item.assignedEmployeeId && (
                              <p className="text-[10px] text-neutral-400 mt-0.5">
                                {employees.find((e) => e.id === item.assignedEmployeeId)?.firstName ?? ''} · Comisión: {formatCurrency(item.commissionAmount ?? 0)}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{item.product.name}</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">
                              {item.product.code} · {formatCurrency(unitPrice(item.product, item.unit))} c/u
                            </p>
                          </>
                        )}
                      </div>
                      {!item.isService && availableUnits(item.product).length > 1 && (
                        <select
                          value={item.unit}
                          onChange={(e) => changeUnit(item.product.id, item.unit, e.target.value as UnitType)}
                          className="text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          {availableUnits(item.product).map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(item.product.id, item.unit, -1)} className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center text-neutral-700 dark:text-neutral-200 transition">
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center font-bold text-sm text-neutral-900 dark:text-white tabular-nums">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.product.id, item.unit, 1)}
                          disabled={!config.allowNegativeStock && !canAddOne(item.product, item.unit)}
                          className="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-400 flex items-center justify-center text-neutral-900 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-500"
                          title={!config.allowNegativeStock && !canAddOne(item.product, item.unit) ? 'Stock insuficiente' : ''}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="w-24 text-right font-bold text-sm text-neutral-900 dark:text-white tabular-nums">
                        {formatCurrency(lineTotal(item))}
                      </span>
                      <div className="flex flex-col gap-1">
                        {item.isService && (
                          <button onClick={() => { setEditingServiceIdx(idx); setServiceModalOpen(true); }} className="p-1 rounded-lg text-neutral-400 hover:text-blue-500 hover:bg-blue-500/10 transition" title="Editar servicio">
                            <User size={14} />
                          </button>
                        )}
                        <button onClick={() => removeItem(idx)} className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cobro module */}
              <div className="mt-6 border-t border-neutral-200 dark:border-neutral-700/50 p-4 space-y-3">
              {/* Customer name */}
              <div>
                <label className="label">
                  Nombre del Cliente {isB01 ? '(REQUERIDO)' : '(Opcional)'}
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ej. Juan Pérez / Cliente General" className={`input pl-10 ${isB01 && !customerName.trim() ? 'border-amber-500 focus:ring-amber-500/60' : ''}`} />
                </div>
              </div>

              {/* NCF + customer doc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo NCF</label>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setNcfType('B02')} className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${ncfType === 'B02' ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-neutral-400'}`}>
                      <FileText size={14} /> B02 Consumidor
                    </button>
                    <button onClick={() => setNcfType('B01')} className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${ncfType === 'B01' ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-neutral-400'}`}>
                      <FileText size={14} /> B01 Crédito Fiscal
                    </button>
                    <button onClick={() => setNcfType('B15')} className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${ncfType === 'B15' ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-neutral-400'}`}>
                      <FileText size={14} /> B15 Gubernamental
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">RNC / Cédula {isB01 ? '(requerido)' : ''}</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input value={customerDoc} onChange={(e) => setCustomerDoc(e.target.value)} placeholder={isB01 ? '000-000000-0' : 'Opcional'} className={`input pl-10 ${isB01 && !customerDoc.trim() ? 'border-amber-500 focus:ring-amber-500/60' : ''}`} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Descuento (%) {app.canSeeCost ? '' : `(máx ${config.maxCashierDiscount}%)`}</label>
                  <NumberField value={discountPct} onChange={(v) => {
                    const max = app.canSeeCost ? 100 : config.maxCashierDiscount;
                    setDiscountPct(Math.min(v, max));
                  }} min={0} max={app.canSeeCost ? 100 : config.maxCashierDiscount} />
                </div>
                <div className="flex items-end">
                  <div className="w-full rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40 px-3.5 py-2.5">
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Método de Pago</p>
                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 capitalize">{PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label ?? 'Efectivo'}</p>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1.5 pt-2">
                <Row label="Subtotal" value={formatCurrency(subtotal)} />
                <Row label={`Descuento (${discountPct}%)`} value={`- ${formatCurrency(discount)}`} />
                <Row label={`ITBIS (${config.itbisRate}%)`} value={formatCurrency(itbis)} />
                {retentionItbis > 0 && <Row label={`Retención ITBIS (${config.retencionItbisRate}%)`} value={`- ${formatCurrency(retentionItbis)}`} />}
                {retentionIsr > 0 && <Row label={`Retención ISR (${config.retencionIsrRate}%)`} value={`- ${formatCurrency(retentionIsr)}`} />}
                <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700/50">
                  <span className="font-bold text-neutral-900 dark:text-white">Total</span>
                  <span className="text-2xl font-extrabold text-brand-500 tabular-nums">{formatCurrency(total)}</span>
                </div>
                {(retentionItbis > 0 || retentionIsr > 0) && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-semibold text-sm text-green-600 dark:text-green-400">Neto a Cobrar</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(netToCollect)}</span>
                  </div>
                )}
              </div>

              {b01Blocked && !isQuote && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                  <AlertTriangle size={14} /> B01 Crédito Fiscal requiere RNC/Cédula y Nombre del cliente.
                </div>
              )}

              {isQuote ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer">
                    <input type="checkbox" checked={saveQuoteToSystem} onChange={(e) => setSaveQuoteToSystem(e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
                    Guardar en sistema (Cotizaciones Guardadas)
                  </label>
                  <button onClick={() => setQuoteMetaOpen(true)} disabled={cart.length === 0} className="btn-primary w-full text-base py-3.5 !bg-blue-500">
                    <Printer size={20} /> Generar e Imprimir Cotización
                  </button>
                </div>
              ) : (
                <button onClick={() => setCheckoutOpen(true)} disabled={cart.length === 0 || b01Blocked} className="btn-primary w-full text-base py-3.5">
                  <Receipt size={20} /> Cobrar y Generar Ticket (F5)
                </button>
              )}
              </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="Confirmar Pago"
        subtitle="Selecciona el método de pago"
        size="md"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setCheckoutOpen(false)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={completeSale} disabled={creditBlocked || mixtoBlocked || cashBlocked} className="btn-primary flex-1">
              <CheckCircle2 size={18} /> Confirmar y Generar
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Método de Pago</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setPaymentMethod(m.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition ${
                    paymentMethod === m.key
                      ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-neutral-400'
                  }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {isCredit && (
            <div className="space-y-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/30">
              <label className="label text-orange-600 dark:text-orange-400">Seleccionar Cliente (Requerido para Crédito)</label>
              <select
                value={creditCustomerId}
                onChange={(e) => setCreditCustomerId(e.target.value)}
                className="input"
              >
                <option value="">— Selecciona un cliente —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
                ))}
              </select>

              {selectedCreditCustomer && (
                <div className="rounded-lg bg-white dark:bg-neutral-800/60 p-3 text-sm">
                  <p className="font-semibold text-neutral-800 dark:text-neutral-100">{selectedCreditCustomer.name}</p>
                  <p className="text-xs text-neutral-400 flex items-center gap-1"><Phone size={10} /> {selectedCreditCustomer.phone}</p>
                  {selectedCreditCustomer.rnc && <p className="text-xs text-neutral-400">RNC: {selectedCreditCustomer.rnc}</p>}
                  <p className="text-xs text-orange-500 font-semibold mt-1">Saldo pendiente: {formatCurrency(selectedCreditCustomer.balance)}</p>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/40">
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2">¿Cliente nuevo? Agregar rápido:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input value={quickAddName} onChange={(e) => setQuickAddName(e.target.value)} placeholder="Nombre" className="input py-2 text-sm" />
                  <input value={quickAddPhone} onChange={(e) => setQuickAddPhone(e.target.value)} placeholder="Teléfono" className="input py-2 text-sm" />
                  <button onClick={quickAddCustomer} disabled={!quickAddName.trim()} className="btn-ghost py-2 text-sm"><Plus size={14} /> Agregar</button>
                </div>
              </div>

              {creditBlocked && (
                <div className="flex items-center gap-2 text-xs text-red-500 font-semibold">
                  <AlertTriangle size={14} /> Selecciona un cliente registrado (no se permite "Consumidor Final" en crédito).
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'mixto' && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
              <div>
                <label className="label">Efectivo</label>
                <NumberField value={mixed.efectivo} onChange={(v) => setMixed({ ...mixed, efectivo: v })} min={0} prefix="RD$" />
              </div>
              <div>
                <label className="label">Tarjeta</label>
                <NumberField value={mixed.tarjeta} onChange={(v) => setMixed({ ...mixed, tarjeta: v })} min={0} prefix="RD$" />
              </div>
              <div>
                <label className="label">Transferencia</label>
                <NumberField value={mixed.transferencia} onChange={(v) => setMixed({ ...mixed, transferencia: v })} min={0} prefix="RD$" />
              </div>
            </div>
          )}

          {paymentMethod === 'efectivo' && (
            <div>
              <label className="label">Efectivo Recibido</label>
              <CashInput value={cashReceived} onChange={setCashReceived} />
            </div>
          )}

          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-4 space-y-2">
            <Row label="Ítems" value={`${itemCount}`} />
            <Row label="Subtotal" value={formatCurrency(subtotal)} />
            <Row label="Descuento" value={`- ${formatCurrency(discount)}`} />
            <Row label="ITBIS" value={formatCurrency(itbis)} />
            <Row label="NCF" value={`${ncfType} ${ncfType === 'B01' ? '(Crédito Fiscal)' : '(Consumidor Final)'}`} />
            <Row label="Cliente" value={(isCredit && selectedCreditCustomer ? selectedCreditCustomer.name : customerName.trim()) || 'Consumidor Final'} />
            {customerDoc && <Row label="RNC/Cédula" value={customerDoc} />}
          </div>
          <div className="flex justify-between items-center p-4 rounded-xl bg-brand-500/10 border border-brand-500/30">
            <span className="font-bold text-neutral-900 dark:text-white">Total a Pagar</span>
            <span className="text-3xl font-extrabold text-brand-500 tabular-nums">{formatCurrency(total)}</span>
          </div>

          {paymentMethod === 'efectivo' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Efectivo Recibido</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(cashReceived)}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Cambio / Devuelta</p>
                <p className={`text-lg font-bold tabular-nums ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{change >= 0 ? formatCurrency(change) : `- ${formatCurrency(Math.abs(change))}`}</p>
              </div>
            </div>
          )}
          {paymentMethod === 'efectivo' && cashBlocked && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
              <AlertTriangle size={14} /> El efectivo recibido es menor al total a pagar.
            </div>
          )}
          {paymentMethod === 'mixto' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Total Mixto</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(mixedTotal)}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-3">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Diferencia</p>
                <p className={`text-lg font-bold tabular-nums ${mixedTotal >= total ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(Math.abs(mixedTotal - total))}
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        open={receiptOpen}
        onClose={resetAfterReceipt}
        title="Ticket Generado"
        subtitle="Vista previa del ticket térmico"
        size="md"
        footer={
          <div className="flex gap-3">
            <button onClick={resetAfterReceipt} className="btn-ghost flex-1">Nueva Venta</button>
            <button onClick={() => window.print()} className="btn-primary flex-1">
              <Printer size={18} /> Imprimir
            </button>
          </div>
        }
      >
        <div className="no-print flex justify-center py-2 max-h-[60vh] overflow-y-auto">
          <ThermalReceipt sale={lastSale ?? fallbackSale} config={config} />
        </div>
        {/* Hidden print-only copy — visible only during window.print() */}
        <ThermalReceipt sale={lastSale ?? fallbackSale} config={config} printRoot />
      </Modal>

      {/* Service Modal */}
      {serviceModalOpen && (
        <ServiceModal
          onClose={() => { setServiceModalOpen(false); setEditingServiceIdx(null); }}
          onSave={(serviceItem) => {
            if (editingServiceIdx !== null) {
              setCart((prev) => prev.map((it, i) => (i === editingServiceIdx ? serviceItem : it)));
            } else {
              setCart((prev) => [...prev, serviceItem]);
            }
            setServiceModalOpen(false);
            setEditingServiceIdx(null);
          }}
          employees={activeEmployees}
          existing={editingServiceIdx !== null ? cart[editingServiceIdx] : null}
        />
      )}

      {/* Quote Metadata Modal */}
      <Modal
        open={quoteMetaOpen}
        onClose={() => setQuoteMetaOpen(false)}
        title="Guardar Cotización"
        subtitle="Información del cliente y validez"
        size="md"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setQuoteMetaOpen(false)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={() => { setQuoteMetaOpen(false); finalizeQuote(quoteFormat); }} className="btn-primary flex-1 !bg-blue-500">
              <Printer size={18} /> Generar e Imprimir
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre del Cliente</label>
            <input value={quoteMeta.clientName} onChange={(e) => setQuoteMeta({ ...quoteMeta, clientName: e.target.value })} placeholder="Ej: Juan Pérez" className="input" />
          </div>
          <div>
            <label className="label">Teléfono / Contacto</label>
            <input value={quoteMeta.phone} onChange={(e) => setQuoteMeta({ ...quoteMeta, phone: e.target.value })} placeholder="809-555-0000" className="input" />
          </div>
          <div>
            <label className="label">Notas</label>
            <input value={quoteMeta.notes} onChange={(e) => setQuoteMeta({ ...quoteMeta, notes: e.target.value })} placeholder="Notas adicionales" className="input" />
          </div>
          <div>
            <label className="label">Validez (días)</label>
            <NumberField value={quoteMeta.validDays} onChange={(v) => setQuoteMeta({ ...quoteMeta, validDays: v })} min={1} />
          </div>
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700/40">
            <label className="label">FORMATO DE IMPRESIÓN</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setQuoteFormat('ticket_80')}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition text-left ${quoteFormat === 'ticket_80' ? 'border-brand-500 bg-brand-500/10' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'}`}
              >
                <Receipt size={18} className={quoteFormat === 'ticket_80' ? 'text-brand-500' : 'text-neutral-400'} />
                <div>
                  <p className="font-semibold text-xs text-neutral-900 dark:text-white">Ticket Térmico (80mm)</p>
                  <p className="text-[10px] text-neutral-400">Recibo térmico compacto</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setQuoteFormat('a4')}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition text-left ${quoteFormat === 'a4' ? 'border-brand-500 bg-brand-500/10' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'}`}
              >
                <FileText size={18} className={quoteFormat === 'a4' ? 'text-brand-500' : 'text-neutral-400'} />
                <div>
                  <p className="font-semibold text-xs text-neutral-900 dark:text-white">Hoja Completa (Carta / A4)</p>
                  <p className="text-[10px] text-neutral-400">Página completa con tabla</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Quote Document Preview */}
      <Modal
        open={quotePrintOpen}
        onClose={resetAfterQuote}
        title="Cotización Generada"
        subtitle="Vista previa del documento"
        size="lg"
        footer={
          <div className="flex gap-3">
            <button onClick={resetAfterQuote} className="btn-ghost flex-1">Nueva Cotización</button>
            <button onClick={() => window.print()} className="btn-primary flex-1">
              <Printer size={18} /> Imprimir
            </button>
          </div>
        }
      >
        <div className="bg-neutral-900 p-4 max-h-[60vh] overflow-y-auto flex justify-center rounded-xl">
          <QuoteDocument quote={pendingQuote ?? fallbackQuote} config={config} screen />
        </div>
        <div className="hidden print-block">
          <QuoteDocument quote={pendingQuote ?? fallbackQuote} config={config} />
        </div>
      </Modal>

      {/* Saved Quotes Modal */}
      {savedQuotesOpen && (
        <Modal
          open
          onClose={() => setSavedQuotesOpen(false)}
          title="Cotizaciones Guardadas"
          subtitle={`${quotes.length} cotizaciones`}
          size="lg"
        >
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {quotes.length === 0 ? (
              <p className="text-center text-neutral-400 py-8">No hay cotizaciones guardadas</p>
            ) : quotes.map((q) => (
              <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-neutral-900 dark:text-white text-sm">{q.number}</p>
                    <span className={`chip text-[10px] ${q.status === 'vigente' ? 'bg-green-500/15 text-green-500' : q.status === 'convertida' ? 'bg-blue-500/15 text-blue-500' : 'bg-neutral-400/15 text-neutral-400'}`}>
                      {q.status === 'vigente' ? 'Vigente' : q.status === 'convertida' ? 'Convertida' : 'Vencida'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {new Date(q.date).toLocaleDateString('es-DO')} · {q.customerName} · {q.items.length} ítems · {formatCurrency(q.total)}
                  </p>
                  <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                    <CalendarClock size={10} /> Vence: {new Date(q.expiryDate).toLocaleDateString('es-DO')}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setViewQuote(q); setSavedQuotesOpen(false); }} className="btn-ghost px-2 py-1.5 text-xs" title="Ver / Imprimir">
                    <Printer size={14} />
                  </button>
                  <button
                    onClick={() => convertQuoteToSale(q)}
                    disabled={q.status === 'convertida'}
                    className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    <ArrowRight size={14} /> Cargar a Venta
                  </button>
                  <button
                    onClick={() => app.setQuotes((prev) => prev.filter((x) => x.id !== q.id))}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* View / Print Saved Quote */}
      <Modal
        open={!!viewQuote}
        onClose={() => setViewQuote(null)}
        title="Cotización"
        subtitle="Vista previa del documento"
        size="lg"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setViewQuote(null)} className="btn-ghost flex-1">Cerrar</button>
            <button onClick={() => window.print()} className="btn-primary flex-1">
              <Printer size={18} /> Imprimir
            </button>
          </div>
        }
      >
        <div className="bg-neutral-900 p-4 max-h-[60vh] overflow-y-auto flex justify-center rounded-xl">
          {viewQuote && <QuoteDocument quote={viewQuote} config={config} screen />}
        </div>
        <div className="hidden print-block">
          {viewQuote && <QuoteDocument quote={viewQuote} config={config} />}
        </div>
      </Modal>
    </div>
  );
}

// ===== Service Modal =====

function ServiceModal({ onClose, onSave, employees, existing }: {
  onClose: () => void;
  onSave: (item: CartItem) => void;
  employees: { id: string; firstName: string; lastName: string; role: string }[];
  existing: CartItem | null;
}) {
  const [title, setTitle] = useState(existing?.serviceTitle ?? '');
  const [price, setPrice] = useState(existing?.servicePrice ?? 0);
  const [qty, setQty] = useState(existing?.qty ?? 1);
  const [employeeId, setEmployeeId] = useState(existing?.assignedEmployeeId ?? '');
  const [commission, setCommission] = useState(existing?.commissionAmount ?? 0);
  const [error, setError] = useState('');

  const commissionExceeds = employeeId && commission > price;
  const canSubmit = title.trim().length > 0 && price > 0 && !commissionExceeds;

  const save = () => {
    if (!title.trim()) { setError('Ingrese el título del servicio.'); return; }
    if (price <= 0) { setError('Ingrese un precio válido.'); return; }
    if (commissionExceeds) { setError('La comisión no puede superar el precio total del servicio.'); return; }
    const dummyProduct: Product = {
      id: existing?.product.id ?? genId('svc'),
      code: 'SVC',
      name: title.trim(),
      category: 'Servicio',
      price,
      cost: 0,
      stock: 0,
      unit: 'Unidad',
      barcode: '',
      minStock: 0,
      location: '',
    };
    onSave({
      product: dummyProduct,
      qty,
      unit: 'Unidad',
      isService: true,
      serviceTitle: title.trim(),
      servicePrice: price,
      assignedEmployeeId: employeeId || undefined,
      commissionAmount: employeeId ? commission : undefined,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Agregar Servicio / Mano de Obra"
      subtitle="Concepto personalizado no vinculado al inventario"
      size="md"
      footer={
        <div className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={save} disabled={!canSubmit} className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed"><CheckCircle2 size={18} /> Agregar</button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Título del Servicio</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Instalación eléctrica, Medición, Cableado..." className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Precio (RD$)</label>
            <NumberField value={price} onChange={setPrice} min={0} prefix="RD$" />
          </div>
          <div>
            <label className="label">Cantidad</label>
            <NumberField value={qty} onChange={setQty} min={1} />
          </div>
        </div>
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/40">
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wide">Asignación de Técnico</p>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="label">Empleado Asignado</label>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="input">
                <option value="">— Sin asignar —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} · {e.role}</option>
                ))}
              </select>
            </div>
            {employeeId && (
              <div>
                <label className="label">Monto Comisión / Pago al Empleado</label>
                <NumberField value={commission} onChange={setCommission} min={0} prefix="RD$" />
                {commissionExceeds ? (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertTriangle size={12} /> La comisión no puede superar el precio total del servicio.</p>
                ) : (
                  <p className="text-xs text-green-500 mt-1.5 flex items-center gap-1"><CheckCircle2 size={12} /> Se registrará automáticamente en la nómina del empleado al completar la venta.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ===== Quote Document =====

function QuoteDocument({ quote, config, screen }: { quote: Quote; config: CompanyConfig; screen?: boolean }) {
  const fmtClass = quote.printFormat === 'a4' ? 'print-a4' : quote.printFormat === 'ticket_wide' ? 'print-ticket-wide' : 'print-ticket-80';
  const isA4 = quote.printFormat === 'a4';
  const t = isA4 ? config.invoiceConfig : config.ticket;
  const rootClass = screen ? '' : 'print-root';
  const a4Class = screen
    ? 'bg-white text-black text-xs p-6 shadow-lg rounded w-full max-w-[650px] min-h-[500px] font-sans'
    : `${fmtClass} mx-auto bg-white text-black p-8 rounded-lg`;

  if (isA4) {
    return (
      <div className={`${rootClass} ${a4Class}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6 border-b-2 border-black pb-4">
          <div className="flex items-center gap-3">
            {t.showLogo ? (
              config.invoiceConfig.logoData ? (
                <img src={config.invoiceConfig.logoData} alt="Logo" className="a4-logo max-h-16 object-contain" />
              ) : (
                <span className="text-3xl font-bold">⚡</span>
              )
            ) : null}
            <div>
              <h1 className="text-xl font-bold">{config.nombreComercial}</h1>
              {t.slogan && <p className="text-xs italic">{t.slogan}</p>}
              {t.showRnc && <p className="text-xs">RNC: {config.rnc}</p>}
              {t.showAddress && <p className="text-xs">{config.address}</p>}
              {t.showAddress && <p className="text-xs">Tel: {config.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold">COTIZACIÓN / PRESUPUESTO</h2>
            <p className="text-sm font-bold text-red-600">NO PAGADO</p>
            <p className="text-xs">N° {quote.number}</p>
            <p className="text-xs">Fecha: {new Date(quote.date).toLocaleDateString('es-DO')}</p>
            <p className="text-xs font-semibold">Vence: {new Date(quote.expiryDate).toLocaleDateString('es-DO')}</p>
          </div>
        </div>

        {/* Client info */}
        <div className="mb-4">
          <p className="text-xs font-bold uppercase text-neutral-500 mb-1">Cliente</p>
          <p className="font-semibold">{quote.customerName}</p>
          {quote.customerDoc && <p className="text-sm">RNC/Cédula: {quote.customerDoc}</p>}
        </div>

        {/* Items table */}
        <table className="w-full table-fixed border-collapse mb-4">
          <thead>
            <tr className="bg-neutral-100">
              <th className="border border-neutral-300 px-3 py-2 text-left text-xs" style={{ width: '55%' }}>Descripción</th>
              <th className="border border-neutral-300 px-3 py-2 text-center text-xs" style={{ width: '15%' }}>Cant</th>
              <th className="border border-neutral-300 px-3 py-2 text-right text-xs" style={{ width: '15%' }}>Precio</th>
              <th className="border border-neutral-300 px-3 py-2 text-right text-xs" style={{ width: '15%' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, i) => (
              <tr key={i}>
                <td className="border border-neutral-300 px-3 py-2 text-sm overflow-hidden" style={{ width: '55%' }}>{it.name}{it.isService && <span className="text-[10px] text-blue-500 ml-1">(Servicio)</span>}</td>
                <td className="border border-neutral-300 px-3 py-2 text-center text-sm" style={{ width: '15%' }}>{it.qty}</td>
                <td className="border border-neutral-300 px-3 py-2 text-right text-sm" style={{ width: '15%' }}>{it.price.toFixed(2)}</td>
                <td className="border border-neutral-300 px-3 py-2 text-right text-sm font-semibold" style={{ width: '15%' }}>{(it.price * it.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="ml-auto w-64 space-y-1 mb-6">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{quote.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Descuento</span><span>-{quote.discount.toFixed(2)}</span></div>
          {t.showItbis && <div className="flex justify-between text-sm"><span>ITBIS ({config.itbisRate}%)</span><span>{quote.itbis.toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-base border-t border-black pt-1"><span>TOTAL</span><span>{quote.total.toFixed(2)}</span></div>
        </div>

        {/* Footer disclaimer */}
        <div className="border-t border-neutral-300 pt-4 mt-8 text-center text-xs text-neutral-500">
          <p className="font-bold text-red-600 mb-1">DOCUMENTO NO FISCAL — NO PAGADO</p>
          <p>Esta cotización es válida hasta el {new Date(quote.expiryDate).toLocaleDateString('es-DO')} (15 días).</p>
          <p>Los precios están sujetos a cambios sin previo aviso. Inventario sujeto a disponibilidad.</p>
          {t.showCashier && <p className="mt-2">Emitido por: {quote.cashier}</p>}
          {t.footerMessage && <p className="mt-2">{t.footerMessage}</p>}
        </div>
      </div>
    );
  }

  // Thermal ticket formats
  const width = quote.printFormat === 'ticket_wide' ? 'max-w-[320px]' : 'max-w-[300px]';
  const fontSize = quote.printFormat === 'ticket_wide' ? 'text-[13px]' : 'text-[11px]';
  const ticketClass = screen
    ? `bg-white text-black font-mono ${fontSize} p-4 w-[280px] shadow-md rounded`
    : `${fmtClass} mx-auto ${width} bg-white text-black font-mono ${fontSize} p-4 rounded-lg border border-neutral-200 dark:border-neutral-700`;
  return (
    <div className={`${rootClass} ${ticketClass}`}>
      {config.ticket.showLogo && (
        <div className="text-center mb-1">
          {config.ticket.logoData ? <img src={config.ticket.logoData} alt="Logo" className="max-h-14 object-contain mx-auto" /> : <span className="text-lg font-bold">⚡</span>}
        </div>
      )}
      <div className="text-center">
        <p className="font-bold text-sm">{config.nombreComercial}</p>
        {config.ticket.showRnc && <p>RNC: {config.rnc}</p>}
        {config.ticket.showAddress && <p>{config.address}</p>}
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <p className="text-center font-bold text-sm">COTIZACIÓN / PRESUPUESTO</p>
      <p className="text-center font-bold text-red-600">NO PAGADO</p>
      <div className="border-t border-dashed border-black my-2" />
      <div className="space-y-0.5">
        <p>N° {quote.number}</p>
        <p>Fecha: {new Date(quote.date).toLocaleString('es-DO')}</p>
        <p>Cliente: {quote.customerName}</p>
        {quote.customerDoc && <p>RNC/Cédula: {quote.customerDoc}</p>}
        <p className="font-bold">Vence: {new Date(quote.expiryDate).toLocaleDateString('es-DO')}</p>
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <table className="w-full">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left">Descripción</th>
            <th className="text-center">Cant</th>
            <th className="text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((it, i) => (
            <tr key={i}>
              <td className="text-left">{it.name}</td>
              <td className="text-center">{it.qty}</td>
              <td className="text-right">{(it.price * it.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-black my-2" />
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Subtotal</span><span>{quote.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Descuento</span><span>-{quote.discount.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>ITBIS</span><span>{quote.itbis.toFixed(2)}</span></div>
        <div className="flex justify-between font-bold text-sm border-t border-black mt-1 pt-1">
          <span>TOTAL</span><span>{quote.total.toFixed(2)}</span>
        </div>
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <div className="text-center text-[10px]">
        <p className="font-bold">DOCUMENTO NO FISCAL — NO PAGADO</p>
        <p>Válido por 15 días</p>
        <p>Emitido por: {quote.cashier}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="font-semibold text-neutral-800 dark:text-neutral-100 tabular-nums">{value}</span>
    </div>
  );
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  credito: 'Crédito / Fiado',
  mixto: 'Pago Mixto',
};

function ThermalReceipt({ sale, config, printRoot }: { sale: SaleRecord; config: CompanyConfig; printRoot?: boolean }) {
  const t = config.ticket;
  const width = config.printer === '80mm' ? 'max-w-[300px]' : 'max-w-[220px]';
  const cls = printRoot
    ? `print-root print-ticket-80 mx-auto ${width}`
    : `mx-auto ${width} bg-white text-black font-mono text-[11px] p-4 border rounded shadow-inner max-h-[60vh] overflow-y-auto`;
  return (
    <div className={cls}>
      {t.showLogo && (
        <div className={`flex mb-1 ${t.logoAlign === 'left' ? 'justify-start' : t.logoAlign === 'right' ? 'justify-end' : 'justify-center'}`}>
          {t.logoData ? (
            <img src={t.logoData} alt="Logo" className={`${t.logoSize === 'small' ? 'max-h-8' : t.logoSize === 'medium' ? 'max-h-14' : 'max-h-20'} object-contain`} />
          ) : (
            <span className="text-lg font-bold">⚡</span>
          )}
        </div>
      )}
      <div className="text-center">
        <p className="font-bold text-sm">{config.nombreComercial}</p>
        {t.slogan && <p className="text-[10px] italic">{t.slogan}</p>}
        {t.showRnc && <p>RNC: {config.rnc}</p>}
        {t.showAddress && (
          <>
            <p>{config.address}</p>
            <p>Tel: {config.phone}</p>
          </>
        )}
      </div>
      <div className="border-t border-dashed border-black my-2" />
      {t.showNcf && (
        <div className="space-y-0.5">
          <p>NCF: {sale.ncf}</p>
          <p>Fecha: {new Date(sale.date).toLocaleString('es-DO')}</p>
          {t.showCashier && <p>Cajero: {sale.cashier}</p>}
          <p>Cliente: {sale.customerName}</p>
          {sale.customerDoc && <p>RNC/Cédula: {sale.customerDoc}</p>}
        </div>
      )}
      <div className="border-t border-dashed border-black my-2" />
      <table className="w-full">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left">Producto</th>
            <th className="text-center">Cant</th>
            <th className="text-right">Precio</th>
            <th className="text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it, i) => (
            <tr key={i}>
              <td className="text-left">{it.name}</td>
              <td className="text-center">{it.qty}</td>
              <td className="text-right">{it.price.toFixed(2)}</td>
              <td className="text-right">{(it.price * it.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-black my-2" />
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Subtotal</span><span>{sale.subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Descuento</span><span>-{sale.discount.toFixed(2)}</span></div>
        {t.showItbis && <div className="flex justify-between"><span>ITBIS ({config.itbisRate}%)</span><span>{sale.itbis.toFixed(2)}</span></div>}
        <div className="flex justify-between font-bold text-sm border-t border-black mt-1 pt-1">
          <span>TOTAL</span><span>{sale.total.toFixed(2)}</span>
        </div>
      </div>
      {sale.paymentMethod === 'efectivo' && sale.cashReceived !== undefined && (
        <>
          <div className="border-t border-dashed border-black my-2" />
          <div className="space-y-0.5">
            <div className="flex justify-between"><span>Efectivo Recibido</span><span>{sale.cashReceived.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold"><span>Su Cambio</span><span>{(sale.cashReceived - sale.total).toFixed(2)}</span></div>
          </div>
        </>
      )}
      <div className="border-t border-dashed border-black my-2" />
      <div className="space-y-0.5 text-center">
        <p className="font-semibold">Pago: {PAYMENT_LABELS[sale.paymentMethod] ?? 'Efectivo'}</p>
        {sale.paymentMethod === 'mixto' && sale.mixed && (
          <p className="text-[10px]">
            Efect: {sale.mixed.efectivo.toFixed(2)} · Tarj: {sale.mixed.tarjeta.toFixed(2)} · Transf: {sale.mixed.transferencia.toFixed(2)}
          </p>
        )}
        <p className="text-[10px]">{t.footerMessage}</p>
      </div>
    </div>
  );
}

function CashInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium pointer-events-none">RD$</span>
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? '' : formatNumber(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, '');
          onChange(Number(digits) || 0);
        }}
        placeholder="0"
        className="input pl-12 text-left tabular-nums"
      />
    </div>
  );
}
