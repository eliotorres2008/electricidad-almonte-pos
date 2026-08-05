import { useState, useMemo } from 'react';
import { Package, Plus, Search, Trash2, CheckCircle2, XCircle, ClipboardList, AlertTriangle, ShoppingCart, Pencil } from 'lucide-react';
import type { Dispatch, DispatchItem, DispatchStatus, UnitType, CartItem, Product } from '@/types';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modal';
import { formatCurrency, genId, unitPrice } from '@/lib/format';

// Light-theme styling for compact number inputs inside tables.
const NUM_LIGHT = 'bg-slate-50 text-gray-900 border border-gray-300 rounded px-2 py-1 text-center font-semibold w-16 focus:ring-2 focus:ring-amber-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
// Light-theme styling for compact selects.
const SELECT_LIGHT_SM = 'bg-slate-50 text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer';
const SELECT_LIGHT = 'bg-slate-50 text-gray-900 border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer w-full';

type DraftLine = {
  productId: string;
  productName: string;
  productCode: string;
  category: string;
  unit: UnitType;
  available: number;
  qty: number;
  price: number;
};

export function Dispatches() {
  const app = useApp();
  const { dispatches, products, employees, categories, createDispatch, updateDispatch, prepareDispatchLiquidation, finalizeDispatch, cancelDispatch, addAudit, setPendingDispatchCart } = app;

  const [createOpen, setCreateOpen] = useState(false);
  const [liquidateId, setLiquidateId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Dispatch | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | DispatchStatus>('todos');

  // Create modal state
  const [techId, setTechId] = useState('');
  const [clientName, setClientName] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [productCat, setProductCat] = useState('Todas');

  // Liquidation modal state
  const [liqItems, setLiqItems] = useState<DispatchItem[]>([]);

  // Edit modal state
  const [editTechId, setEditTechId] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editItems, setEditItems] = useState<DispatchItem[]>([]);
  const [editProductQuery, setEditProductQuery] = useState('');
  const [editProductCat, setEditProductCat] = useState('Todas');

  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dispatches.filter((d) => {
      const matchQ = !q || d.code.toLowerCase().includes(q) || d.employeeName.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'todos' || d.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [dispatches, query, statusFilter]);

  const searchableProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return products.filter((p) =>
      (productCat === 'Todas' || p.category === productCat) &&
      (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)),
    ).slice(0, 12);
  }, [products, productQuery, productCat]);

  const editableProducts = useMemo(() => {
    const q = editProductQuery.trim().toLowerCase();
    return products.filter((p) =>
      (editProductCat === 'Todas' || p.category === editProductCat) &&
      (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)),
    ).slice(0, 12);
  }, [products, editProductQuery, editProductCat]);

  const resetCreate = () => {
    setTechId('');
    setClientName('');
    setLines([]);
    setProductQuery('');
    setProductCat('Todas');
  };

  const addLine = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (lines.some((l) => l.productId === productId)) return;
    setLines((prev) => [...prev, {
      productId: p.id, productName: p.name, productCode: p.code, category: p.category, unit: p.unit,
      available: p.stock, qty: 0, price: unitPrice(p, p.unit),
    }]);
    setProductQuery('');
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const setLineQty = (productId: string, qty: number) => {
    setLines((prev) => prev.map((l) => l.productId === productId ? { ...l, qty } : l));
  };

  const hasValidLines = lines.length > 0 && lines.some((l) => l.qty > 0);
  const allLinesValid = lines.every((l) => l.qty >= 0 && l.qty <= l.available);
  const canCreate = !!techId && hasValidLines && allLinesValid;

  const doCreate = () => {
    if (!canCreate) return;
    const tech = activeEmployees.find((e) => e.id === techId);
    const techName = tech ? `${tech.firstName} ${tech.lastName}`.trim() : 'Técnico';
    const code = `DSP-${String(dispatches.length + 1).padStart(4, '0')}`;
    const items: DispatchItem[] = lines.filter((l) => l.qty > 0).map((l) => ({
      productId: l.productId, productName: l.productName, productCode: l.productCode,
      unit: l.unit, dispatchedQty: l.qty, price: l.price, usedQty: 0, returnedQty: 0,
    }));
    const dispatch: Dispatch = {
      id: genId('dsp'), code, date: new Date().toISOString(),
      employeeId: techId, employeeName: techName, customerName: clientName.trim() || 'Sin cliente',
      items, status: 'en_obra', cashier: app.config.cashier,
    };
    createDispatch(dispatch);
    resetCreate();
    setCreateOpen(false);
  };

  const openLiquidate = (d: Dispatch) => {
    setLiqItems(d.items.map((i) => ({ ...i, usedQty: i.dispatchedQty, returnedQty: 0 })));
    setLiquidateId(d.id);
  };

  const setUsed = (productId: string, used: number) => {
    setLiqItems((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      const clamped = Math.max(0, Math.min(used, i.dispatchedQty));
      return { ...i, usedQty: clamped, returnedQty: i.dispatchedQty - clamped };
    }));
  };

  const setReturned = (productId: string, returned: number) => {
    setLiqItems((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      const clamped = Math.max(0, Math.min(returned, i.dispatchedQty));
      return { ...i, returnedQty: clamped, usedQty: i.dispatchedQty - clamped };
    }));
  };

  // "Finalizar y Cobrar": hand off used items to the standard Sales checkout.
  // The dispatch stays "en_obra" until the sale is actually paid in Sales.
  const doLiquidate = () => {
    if (!liquidateId) return;
    const d = dispatches.find((x) => x.id === liquidateId);
    if (!d) return;
    const usedItems = liqItems.filter((i) => i.usedQty > 0);
    if (usedItems.length === 0) return;

    const cart: CartItem[] = usedItems.map((i) => {
      const prod = products.find((p) => p.id === i.productId) ?? {
        id: i.productId, code: i.productCode, name: i.productName, category: 'Servicio',
        price: i.price, cost: 0, stock: 0, unit: i.unit, barcode: '', minStock: 0,
      } as Product;
      return { product: prod, qty: i.usedQty, unit: i.unit };
    });

    prepareDispatchLiquidation(liquidateId, liqItems);
    setPendingDispatchCart({ cart, customerName: d.customerName, dispatchId: liquidateId });
    setLiquidateId(null);
    setLiqItems([]);
    window.location.hash = '#/ventas';
  };

  const doCancel = (id: string) => {
    cancelDispatch(id);
    addAudit(`Despacho cancelado — ${id}`);
  };

  // ===== Edit modal helpers =====
  const openEdit = (d: Dispatch) => {
    setEditId(d.id);
    setEditTechId(d.employeeId);
    setEditClientName(d.customerName);
    setEditItems(d.items.map((i) => ({ ...i })));
    setEditProductQuery('');
    setEditProductCat('Todas');
  };

  const editAddProduct = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (editItems.some((i) => i.productId === productId)) return;
    setEditItems((prev) => [...prev, {
      productId: p.id, productName: p.name, productCode: p.code,
      unit: p.unit, dispatchedQty: 0, price: unitPrice(p, p.unit), usedQty: 0, returnedQty: 0,
    }]);
    setEditProductQuery('');
  };

  const editRemoveProduct = (productId: string) => {
    setEditItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const editSetQty = (productId: string, qty: number) => {
    setEditItems((prev) => prev.map((i) => i.productId === productId ? { ...i, dispatchedQty: qty } : i));
  };

  const doSaveEdit = () => {
    if (!editId) return;
    const tech = activeEmployees.find((e) => e.id === editTechId);
    const techName = tech ? `${tech.firstName} ${tech.lastName}`.trim() : 'Técnico';
    const validItems = editItems.filter((i) => i.dispatchedQty > 0);
    if (validItems.length === 0) return;
    updateDispatch(editId, {
      employeeId: editTechId,
      employeeName: techName,
      customerName: editClientName.trim() || 'Sin cliente',
      items: validItems,
    });
    setEditId(null);
    setEditItems([]);
  };

  const statusBadge = (s: DispatchStatus) => {
    const map: Record<DispatchStatus, { label: string; cls: string }> = {
      en_obra: { label: 'En Obra', cls: 'bg-blue-500/15 text-blue-500' },
      liquidado: { label: 'Liquidado', cls: 'bg-green-500/15 text-green-500' },
      cancelado: { label: 'Cancelado', cls: 'bg-neutral-500/15 text-neutral-500' },
    };
    const c = map[s];
    return <span className={`chip ${c.cls}`}>{c.label}</span>;
  };

  const liqSubtotal = liqItems.filter((i) => i.usedQty > 0).reduce((s, i) => s + i.usedQty * i.price, 0);
  const canSaveEdit = !!editTechId && editItems.some((i) => i.dispatchedQty > 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, técnico u obra..." className="input pl-11" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'todos' | DispatchStatus)} className="input w-auto lg:w-48 whitespace-nowrap py-2.5">
          <option value="todos">Todos los estados</option>
          <option value="en_obra">En Obra</option>
          <option value="liquidado">Liquidado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button onClick={() => { resetCreate(); setCreateOpen(true); }} className="btn-primary whitespace-nowrap">
          <Plus size={18} /> Crear Vale de Despacho
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Técnico Asignado</th>
                <th className="px-4 py-3 font-semibold">Cliente / Obra</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold text-center">Materiales</th>
                <th className="px-4 py-3 font-semibold text-center">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition">
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500 dark:text-neutral-400">{d.code}</td>
                  <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-100">{d.employeeName}</td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{d.customerName}</td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">{new Date(d.date).toLocaleDateString('es-DO')}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center leading-tight">
                      <span className="tabular-nums font-semibold text-neutral-700 dark:text-neutral-200">{d.items.reduce((acc, i) => acc + i.dispatchedQty, 0)}</span>
                      <span className="text-[10px] text-neutral-400">{d.items.length} {d.items.length === 1 ? 'tipo' : 'tipos'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(d.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {d.status === 'en_obra' && (
                        <>
                          <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-brand-500/10 transition" title="Editar despacho">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => openLiquidate(d)} className="btn-ghost px-3 py-1.5 text-xs" title="Liquidar despacho">
                            <CheckCircle2 size={14} /> Liquidar
                          </button>
                          <button onClick={() => setCancelTarget(d)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition" title="Cancelar despacho">
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                      {d.status === 'liquidado' && (
                        <span className="chip bg-green-500/10 text-green-500 text-xs">Liquidado</span>
                      )}
                      {d.status === 'cancelado' && (
                        <span className="chip bg-neutral-500/10 text-neutral-400 text-xs">Cancelado</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-neutral-400 dark:text-neutral-600">
            <ClipboardList size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay despachos registrados</p>
          </div>
        )}
      </div>

      {/* Create Dispatch Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear Vale de Despacho"
        subtitle="Selecciona técnico, obra y materiales a despachar"
        size="lg"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setCreateOpen(false)} className="btn-ghost flex-1">Cancelar</button>
            <button
              onClick={doCreate}
              disabled={!canCreate}
              className={`btn-primary flex-1 ${!canCreate ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Package size={18} /> Despachar Materiales
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Técnico / Empleado Asignado</label>
              <select value={techId} onChange={(e) => setTechId(e.target.value)} className={SELECT_LIGHT}>
                <option value="">Seleccionar técnico...</option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.role}</option>
                ))}
              </select>
              {activeEmployees.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">No hay empleados activos registrados.</p>
              )}
            </div>
            <div>
              <label className="label">Cliente / Obra (opcional)</label>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="input" placeholder="Nombre del cliente o descripción de obra" />
            </div>
          </div>

          {/* Product search + category filter */}
          <div>
            <label className="label">Agregar Materiales del Inventario</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Buscar por nombre o SKU..." className="input pl-11" />
              </div>
              <select value={productCat} onChange={(e) => setProductCat(e.target.value)} className={SELECT_LIGHT_SM + ' whitespace-nowrap'}>
                <option value="Todas">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {(productQuery || productCat !== 'Todas') && searchableProducts.length > 0 && (
              <div className="mt-1 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden max-h-[220px] overflow-y-auto scroll-sleek">
                {searchableProducts.map((p) => (
                  <button key={p.id} onClick={() => addLine(p.id)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-brand-500/10 transition text-left">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="chip bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px]">{p.category}</span>
                        <span className="text-xs text-neutral-400">{p.code}</span>
                        <span className="text-xs text-neutral-400">· {formatCurrency(p.price)}/{p.unit === 'Metro' ? 'm' : 'u'}</span>
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Stock: {p.stock} {p.unit === 'Metro' ? 'mt' : 'u'}</span>
                      </div>
                    </div>
                    <Plus size={16} className="text-brand-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {(productQuery || productCat !== 'Todas') && searchableProducts.length === 0 && (
              <p className="text-center text-xs text-neutral-400 py-3">Sin resultados para esta búsqueda.</p>
            )}
          </div>

          {/* Lines */}
          {lines.length > 0 && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-xs uppercase text-neutral-500 dark:text-neutral-400">
                    <th className="px-3 py-2 text-left font-semibold">Material</th>
                    <th className="px-3 py-2 text-right font-semibold">Disponible</th>
                    <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {lines.map((l) => {
                    const over = l.qty > l.available;
                    return (
                      <tr key={l.productId}>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-neutral-800 dark:text-neutral-100">{l.productName}</p>
                          <p className="text-xs text-neutral-400">{l.productCode} · {formatCurrency(l.price)}/{l.unit}</p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400">{l.available} {l.unit === 'Metro' ? 'm' : 'u'}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={l.qty === 0 ? '' : l.qty}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') { setLineQty(l.productId, 0); return; }
                              if (!/^\d*\.?\d*$/.test(raw)) return;
                              const v = Math.min(Number(raw) || 0, l.available);
                              setLineQty(l.productId, Math.max(0, v));
                            }}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                            min={0}
                            max={l.available}
                            placeholder="0"
                            className={`${NUM_LIGHT} ${over ? '!border-red-500' : ''}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => removeLine(l.productId)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {lines.length === 0 && (
            <p className="text-center text-sm text-neutral-400 py-6">Agrega materiales del inventario para despachar</p>
          )}
        </div>
      </Modal>

      {/* Liquidate Dispatch Modal */}
      <Modal
        open={!!liquidateId}
        onClose={() => { setLiquidateId(null); setLiqItems([]); }}
        title="Liquidar Despacho"
        subtitle="Registra materiales usados y devueltos, luego cobra en caja"
        size="lg"
        footer={
          <div className="flex gap-3">
            <button onClick={() => { setLiquidateId(null); setLiqItems([]); }} className="btn-ghost flex-1">Cancelar</button>
            <button
              onClick={doLiquidate}
              disabled={liqItems.every((i) => i.usedQty === 0)}
              className={`btn-primary flex-1 ${liqItems.every((i) => i.usedQty === 0) ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <ShoppingCart size={18} /> Finalizar y Cobrar
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              La cantidad usada se enviará al checkout de Ventas para facturarla (NCF, ITBIS 18% solo a productos, pago y ticket). La cantidad devuelta regresará al inventario. Usada + Devuelta debe igualar el total despachado.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-xs uppercase text-neutral-500 dark:text-neutral-400">
                  <th className="px-3 py-2 text-left font-semibold">Material</th>
                  <th className="px-3 py-2 text-right font-semibold">Despachado</th>
                  <th className="px-3 py-2 text-right font-semibold">Usada</th>
                  <th className="px-3 py-2 text-right font-semibold">Devuelta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {liqItems.map((i) => (
                  <tr key={i.productId}>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-neutral-800 dark:text-neutral-100">{i.productName}</p>
                      <p className="text-xs text-neutral-400">{formatCurrency(i.price)}/{i.unit}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400">{i.dispatchedQty} {i.unit === 'Metro' ? 'm' : 'u'}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={i.usedQty === 0 ? '' : i.usedQty}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') { setUsed(i.productId, 0); return; }
                          if (!/^\d*\.?\d*$/.test(raw)) return;
                          const v = Math.min(Number(raw) || 0, i.dispatchedQty);
                          setUsed(i.productId, Math.max(0, v));
                        }}
                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                        min={0}
                        max={i.dispatchedQty}
                        placeholder="0"
                        className={NUM_LIGHT}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={i.returnedQty === 0 ? '' : i.returnedQty}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') { setReturned(i.productId, 0); return; }
                          if (!/^\d*\.?\d*$/.test(raw)) return;
                          const v = Math.min(Number(raw) || 0, i.dispatchedQty);
                          setReturned(i.productId, Math.max(0, v));
                        }}
                        onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                        min={0}
                        max={i.dispatchedQty}
                        placeholder="0"
                        className={NUM_LIGHT}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-neutral-500 dark:text-neutral-400">Valor de materiales usados</span><span className="font-semibold tabular-nums">{formatCurrency(liqSubtotal)}</span></div>
            <p className="text-xs text-neutral-400">El ITBIS (18% a productos), descuentos, método de pago e impresión del ticket se completan en la pantalla de Ventas.</p>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancelar Vale de Despacho"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setCancelTarget(null)} className="btn-ghost flex-1">No, mantener</button>
            <button
              onClick={() => {
                if (cancelTarget) doCancel(cancelTarget.id);
                setCancelTarget(null);
              }}
              className="btn-danger flex-1"
            >
              <XCircle size={18} /> Sí, cancelar
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              ¿Está seguro de que desea cancelar el vale {cancelTarget?.code}?
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Los productos despachados volverán automáticamente al inventario general.
            </p>
          </div>
        </div>
      </Modal>

      {/* Edit Dispatch Modal */}
      <Modal
        open={!!editId}
        onClose={() => { setEditId(null); setEditItems([]); }}
        title="Editar Despacho en Curso"
        subtitle="Modifica técnico, obra o materiales antes de liquidar"
        size="lg"
        footer={
          <div className="flex gap-3">
            <button onClick={() => { setEditId(null); setEditItems([]); }} className="btn-ghost flex-1">Cancelar</button>
            <button
              onClick={doSaveEdit}
              disabled={!canSaveEdit}
              className={`btn-primary flex-1 ${!canSaveEdit ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Package size={18} /> Guardar Cambios
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Técnico / Empleado Asignado</label>
              <select value={editTechId} onChange={(e) => setEditTechId(e.target.value)} className={SELECT_LIGHT}>
                <option value="">Seleccionar técnico...</option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cliente / Obra</label>
              <input value={editClientName} onChange={(e) => setEditClientName(e.target.value)} className="input" placeholder="Nombre del cliente o descripción de obra" />
            </div>
          </div>

          {/* Add more products */}
          <div>
            <label className="label">Agregar más materiales</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input value={editProductQuery} onChange={(e) => setEditProductQuery(e.target.value)} placeholder="Buscar por nombre o SKU..." className="input pl-11" />
              </div>
              <select value={editProductCat} onChange={(e) => setEditProductCat(e.target.value)} className={SELECT_LIGHT_SM + ' whitespace-nowrap'}>
                <option value="Todas">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {(editProductQuery || editProductCat !== 'Todas') && editableProducts.length > 0 && (
              <div className="mt-1 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden max-h-[220px] overflow-y-auto scroll-sleek">
                {editableProducts.map((p) => (
                  <button key={p.id} onClick={() => editAddProduct(p.id)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-brand-500/10 transition text-left">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="chip bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px]">{p.category}</span>
                        <span className="text-xs text-neutral-400">{p.code}</span>
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Stock: {p.stock} {p.unit === 'Metro' ? 'mt' : 'u'}</span>
                      </div>
                    </div>
                    <Plus size={16} className="text-brand-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Edit existing items */}
          {editItems.length > 0 && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-xs uppercase text-neutral-500 dark:text-neutral-400">
                    <th className="px-3 py-2 text-left font-semibold">Material</th>
                    <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {editItems.map((i) => {
                    const prod = products.find((p) => p.id === i.productId);
                    const maxQty = i.dispatchedQty + (prod?.stock ?? 0);
                    const over = i.dispatchedQty > maxQty;
                    return (
                      <tr key={i.productId}>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-neutral-800 dark:text-neutral-100">{i.productName}</p>
                          <p className="text-xs text-neutral-400">{i.productCode} · {formatCurrency(i.price)}/{i.unit}</p>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={i.dispatchedQty === 0 ? '' : i.dispatchedQty}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') { editSetQty(i.productId, 0); return; }
                              if (!/^\d*\.?\d*$/.test(raw)) return;
                              const v = Math.min(Number(raw) || 0, maxQty);
                              editSetQty(i.productId, Math.max(0, v));
                            }}
                            onKeyDown={(e) => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault(); }}
                            min={0}
                            max={maxQty}
                            placeholder="0"
                            className={`${NUM_LIGHT} ${over ? '!border-red-500' : ''}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => editRemoveProduct(i.productId)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {editItems.length === 0 && (
            <p className="text-center text-sm text-neutral-400 py-6">Agrega materiales para despachar</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
