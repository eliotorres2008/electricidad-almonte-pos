import { useState, useMemo } from 'react';
import { Search, Plus, Package, AlertTriangle, DollarSign, CreditCard as Edit3, Trash2, Boxes, Tag, History, Download, Upload, Zap, ArrowUpCircle, ArrowDownCircle, CheckCircle2, Settings2, X } from 'lucide-react';
import type { Product, UnitType, StockState } from '@/types';
import { UNITS } from '@/types';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modal';
import { NumberField } from '@/components/NumberField';
import { formatCurrency, formatNumber, genId, genInternalCode, genBarcode, stockState, downloadCSV } from '@/lib/format';

const emptyForm = {
  code: '', barcode: '', name: '', category: '',
  cost: 0, price: 0, stock: 0, minStock: 0, unit: 'Unidad' as UnitType,
  location: '', baseUnit: '' as UnitType | '', baseUnitFactor: 0,
};

export function Inventory() {
  const app = useApp();
  const { products, setProducts, movements, addMovement, addAudit, config, categories, setCategories, canSeeCost } = app;
  const cashier = config.cashier;
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [stateFilter, setStateFilter] = useState<'todos' | StockState>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'entrada' | 'salida'>('entrada');
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [deleteCat, setDeleteCat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = catFilter === 'Todas' || p.category === catFilter;
      const matchQuery = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.barcode.includes(q);
      const matchState = stateFilter === 'todos' || stockState(p.stock, p.minStock) === stateFilter;
      return matchCat && matchQuery && matchState;
    });
  }, [products, query, catFilter, stateFilter]);

  const { activeCount, criticalCount, agotadoCount, totalValue } = useMemo(() => {
    let crit = 0, ago = 0, val = 0;
    for (const p of products) {
      const st = stockState(p.stock, p.minStock);
      if (p.stock > 0 && p.stock <= p.minStock) crit++;
      if (st === 'agotado') ago++;
      val += p.cost * p.stock;
    }
    return { activeCount: products.length, criticalCount: crit, agotadoCount: ago, totalValue: val };
  }, [products]);

  const openNew = () => {
    setForm({ ...emptyForm, category: categories[0] ?? '' });
    setEditMode(false);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      code: p.code, barcode: p.barcode, name: p.name, category: p.category,
      cost: p.cost, price: p.price, stock: p.stock, minStock: p.minStock, unit: p.unit,
      location: p.location, baseUnit: p.baseUnit ?? '', baseUnitFactor: p.baseUnitFactor ?? 0,
    });
    setEditMode(true);
    setEditingId(p.id);
    setModalOpen(true);
  };

  const save = () => {
    const productData: Product = {
      id: editingId ?? genId('p'),
      code: form.code, barcode: form.barcode, name: form.name, category: form.category,
      cost: Number(form.cost), price: Number(form.price), stock: Number(form.stock),
      minStock: Number(form.minStock), unit: form.unit, location: form.location,
      baseUnit: form.baseUnit || undefined, baseUnitFactor: form.baseUnitFactor || undefined,
    };
    if (editMode && editingId) {
      setProducts((prev) => prev.map((p) => (p.id === editingId ? productData : p)));
      addAudit(`Producto editado — ${productData.code} ${productData.name}`, cashier);
    } else {
      setProducts((prev) => [productData, ...prev]);
      addMovement({ id: genId('m'), productId: productData.id, productName: productData.name, type: 'entrada', qty: productData.stock, reason: 'Stock inicial', user: cashier, timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) });
      addAudit(`Producto creado — ${productData.code} ${productData.name}`, cashier);
    }
    setForm(emptyForm);
    setModalOpen(false);
    setSavedOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteProduct) return;
    const p = deleteProduct;
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    addAudit(`Producto eliminado — ${p.code} ${p.name}`, cashier);
    setDeleteProduct(null);
  };

  const doAdjust = () => {
    if (!adjustProduct || adjustQty <= 0) return;
    const delta = adjustType === 'entrada' ? adjustQty : -adjustQty;
    const newStock = Math.max(0, adjustProduct.stock + delta);
    setProducts((prev) => prev.map((p) => (p.id === adjustProduct.id ? { ...p, stock: newStock } : p)));
    addMovement({
      id: genId('m'), productId: adjustProduct.id, productName: adjustProduct.name,
      type: adjustType === 'entrada' ? 'entrada' : 'salida', qty: adjustQty,
      reason: adjustReason || (adjustType === 'entrada' ? 'Entrada de almacén' : 'Salida/merma'),
      user: cashier, timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
    addAudit(`Inventario ajustado — ${adjustProduct.name} (${delta > 0 ? '+' : ''}${delta})`, cashier);
    setAdjustProduct(null);
    setAdjustQty(0);
    setAdjustReason('');
  };

  const exportCSV = () => {
    const rows: (string | number)[][] = [
      ['Código', 'Barras', 'Nombre', 'Categoría', 'Costo', 'Precio', 'Stock', 'Mínimo', 'Unidad', 'Ubicación'],
      ...products.map((p) => [p.code, p.barcode, p.name, p.category, p.cost, p.price, p.stock, p.minStock, p.unit, p.location]),
    ];
    downloadCSV('inventario_almonte.csv', rows);
    addAudit('Inventario exportado a CSV', cashier);
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? '');
      const lines = text.split('\n').filter(Boolean);
      const imported: Product[] = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.replace(/^"|"$/g, ''));
        return {
          id: genId('p'), code: cols[0] ?? '', barcode: cols[1] ?? '', name: cols[2] ?? '',
          category: cols[3] ?? 'Eléctrica', cost: Number(cols[4]) || 0, price: Number(cols[5]) || 0,
          stock: Number(cols[6]) || 0, minStock: Number(cols[7]) || 0,
          unit: (cols[8] as UnitType) || 'Unidad', location: cols[9] ?? '',
        };
      });
      setProducts((prev) => [...imported, ...prev]);
      addAudit(`Inventario importado — ${imported.length} productos`, cashier);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const productHistory = useMemo(
    () => (productId: string) => movements.filter((m) => m.productId === productId),
    [movements],
  );

  // Category management
  const addCategory = () => {
    const name = newCatName.trim();
    if (!name || categories.includes(name)) return;
    setCategories((prev) => [...prev, name]);
    addAudit(`Categoría creada — ${name}`, cashier);
    setNewCatName('');
  };

  const saveEditCat = () => {
    const name = editingCatName.trim();
    if (!name || !editingCat || categories.includes(name)) return;
    setCategories((prev) => prev.map((c) => (c === editingCat ? name : c)));
    setProducts((prev) => prev.map((p) => (p.category === editingCat ? { ...p, category: name } : p)));
    addAudit(`Categoría renombrada — ${editingCat} → ${name}`, cashier);
    setEditingCat(null);
    setEditingCatName('');
  };

  const confirmDeleteCat = () => {
    if (!deleteCat) return;
    setCategories((prev) => prev.filter((c) => c !== deleteCat));
    setProducts((prev) => prev.map((p) => (p.category === deleteCat ? { ...p, category: 'Sin Categoría' } : p)));
    if (!categories.includes('Sin Categoría')) setCategories((prev) => [...prev, 'Sin Categoría']);
    addAudit(`Categoría eliminada — ${deleteCat}`, cashier);
    setDeleteCat(null);
  };

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={<Package size={22} />} label="Productos Activos" value={formatNumber(activeCount)} color="brand" />
        <Metric icon={<AlertTriangle size={22} />} label="Stock Crítico" value={formatNumber(criticalCount)} color="red" />
        <Metric icon={<Boxes size={22} />} label="Agotados" value={formatNumber(agotadoCount)} color="orange" />
        <Metric icon={<DollarSign size={22} />} label="Valor Inventario" value={formatCurrency(totalValue)} color="green" />
      </div>

      {/* Toolbar */}
      <div className="card p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto..." className="input pl-11" />
        </div>
        <div className="flex gap-2">
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input min-w-[120px] lg:w-44 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 focus:ring-amber-500">
            <option>Todas</option>
            {categories.map((c) => (<option key={c}>{c}</option>))}
          </select>
          <button onClick={() => setCatModalOpen(true)} className="btn-ghost px-3" title="Gestionar categorías"><Settings2 size={16} className="text-brand-500" /></button>
        </div>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value as 'todos' | StockState)} className="input min-w-[140px] lg:w-44 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 focus:ring-amber-500">
          <option value="todos">Todos los estados</option>
          <option value="ok">OK</option>
          <option value="bajo">Stock Bajo</option>
          <option value="critico">Crítico</option>
          <option value="agotado">Agotado</option>
        </select>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-ghost" title="Exportar CSV"><Download size={16} /><span className="hidden lg:inline">Exportar</span></button>
          <label className="btn-ghost cursor-pointer" title="Importar CSV">
            <Upload size={16} /><span className="hidden lg:inline">Importar</span>
            <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
          </label>
          <button onClick={openNew} className="btn-primary whitespace-nowrap"><Plus size={18} /> Nuevo</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-left text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                {canSeeCost && <th className="px-4 py-3 font-semibold text-right">Costo</th>}
                <th className="px-4 py-3 font-semibold text-right">Precio</th>
                <th className="px-4 py-3 font-semibold text-right">Stock</th>
                <th className="px-4 py-3 font-semibold">Ubicación</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.map((p) => {
                const st = stockState(p.stock, p.minStock);
                return (
                  <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500 dark:text-neutral-400">{p.code}</td>
                    <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-100">{p.name}</td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{p.category}</td>
                    {canSeeCost && <td className="px-4 py-3 text-right tabular-nums text-neutral-500 dark:text-neutral-400">{formatCurrency(p.cost)}</td>}
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-neutral-800 dark:text-neutral-100">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={st === 'critico' || st === 'agotado' ? 'text-red-500 font-bold' : st === 'bajo' ? 'text-amber-500 font-bold' : 'text-neutral-700 dark:text-neutral-200'}>
                        {p.stock} {p.unit === 'Metro' ? 'm' : 'u'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">{p.location}</td>
                    <td className="px-4 py-3"><StateBadge state={st} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setAdjustProduct(p); setAdjustType('entrada'); setAdjustQty(0); setAdjustReason(''); }} className="p-1.5 rounded-lg text-green-500 hover:bg-green-500/10 transition" title="Entrada / Compra"><ArrowUpCircle size={16} /></button>
                        <button onClick={() => { setAdjustProduct(p); setAdjustType('salida'); setAdjustQty(0); setAdjustReason(''); }} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition" title="Salida / Merma / Ajuste"><ArrowDownCircle size={16} /></button>
                        <button onClick={() => setLabelProduct(p)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-500/10 transition" title="Imprimir etiqueta"><Tag size={16} /></button>
                        <button onClick={() => setHistoryProduct(p)} className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-brand-500/10 transition" title="Historial"><History size={16} /></button>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-brand-500/10 transition" title="Editar"><Edit3 size={16} /></button>
                        <button onClick={() => setDeleteProduct(p)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition" title="Eliminar"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-neutral-400 dark:text-neutral-600">
            <Boxes size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No se encontraron productos</p>
          </div>
        )}
      </div>

      {/* New/Edit Product Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editMode ? 'Editar Producto' : 'Nuevo Producto'} subtitle={editMode ? 'Modifica los datos del producto' : 'Completa los datos del producto'} size="lg"
        footer={<div className="flex gap-3"><button onClick={() => setModalOpen(false)} className="btn-ghost flex-1">Cancelar</button><button onClick={save} disabled={!form.name || !form.code} className="btn-primary flex-1"><CheckCircle2 size={18} /> Guardar</button></div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Código</label>
            <div className="flex gap-2">
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input" placeholder="EL-001" />
              <button onClick={() => setForm({ ...form, code: genInternalCode(form.category, products) })} className="btn-ghost px-3 whitespace-nowrap" title="Generar código"><Zap size={16} className="text-brand-500" /></button>
            </div>
          </div>
          <div>
            <label className="label">Código de Barras</label>
            <div className="flex gap-2">
              <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="input" placeholder="750..." />
              <button onClick={() => setForm({ ...form, barcode: genBarcode() })} className="btn-ghost px-3 whitespace-nowrap" title="Generar EAN-13"><Zap size={16} className="text-brand-500" /></button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Nombre del Producto</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Cable THW #12" />
          </div>
          <div>
            <label className="label">Categoría</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
              {categories.map((c) => (<option key={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Unidad de Medida</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as UnitType })} className="input">
              {UNITS.map((u) => (<option key={u}>{u}</option>))}
            </select>
          </div>
          {canSeeCost && (<div><label className="label">Costo (RD$)</label><NumberField value={form.cost} onChange={(v) => setForm({ ...form, cost: v })} min={0} prefix="RD$" /></div>)}
          <div><label className="label">Precio Venta (RD$)</label><NumberField value={form.price} onChange={(v) => setForm({ ...form, price: v })} min={0} prefix="RD$" /></div>
          <div><label className="label">Stock Inicial</label><NumberField value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} min={0} /></div>
          <div><label className="label">Stock Mínimo</label><NumberField value={form.minStock} onChange={(v) => setForm({ ...form, minStock: v })} min={0} /></div>
          <div className="sm:col-span-2"><label className="label">Ubicación en Almacén</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input" placeholder="Estante A-3, Pasillo 2, Bodega Principal" /></div>
          <div>
            <label className="label">Unidad Base (para conversión)</label>
            <select value={form.baseUnit} onChange={(e) => setForm({ ...form, baseUnit: e.target.value as UnitType | '' })} className="input">
              <option value="">Ninguna</option>
              {UNITS.filter((u) => u !== 'Unidad' && u !== 'Caja').map((u) => (<option key={u}>{u}</option>))}
            </select>
          </div>
          <div><label className="label">Factor (ej: 100 metros por rollo)</label><NumberField value={form.baseUnitFactor} onChange={(v) => setForm({ ...form, baseUnitFactor: v })} min={0} /></div>
        </div>
      </Modal>

      {/* Stock Adjust Modal */}
      <Modal open={!!adjustProduct} onClose={() => setAdjustProduct(null)} title={adjustType === 'entrada' ? 'Entrada de Almacén' : 'Salida / Ajuste de Mermas'} subtitle={adjustProduct?.name} size="sm"
        footer={<div className="flex gap-3"><button onClick={() => setAdjustProduct(null)} className="btn-ghost flex-1">Cancelar</button><button onClick={doAdjust} className="btn-primary flex-1"><CheckCircle2 size={18} /> Confirmar</button></div>}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setAdjustType('entrada')} className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition flex items-center justify-center gap-1.5 ${adjustType === 'entrada' ? 'bg-green-500/15 border-green-500 text-green-500' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}><ArrowUpCircle size={16} /> Entrada</button>
            <button onClick={() => setAdjustType('salida')} className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition flex items-center justify-center gap-1.5 ${adjustType === 'salida' ? 'bg-red-500/15 border-red-500 text-red-500' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}><ArrowDownCircle size={16} /> Salida</button>
          </div>
          <div><label className="label">Cantidad</label><NumberField value={adjustQty} onChange={setAdjustQty} min={0} /></div>
          <div><label className="label">Motivo</label><input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="input" placeholder="Compra de proveedor, Mercancía dañada..." /></div>
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-3 text-sm">
            <p className="text-neutral-500 dark:text-neutral-400">Stock actual: <span className="font-bold text-neutral-800 dark:text-neutral-100">{adjustProduct?.stock ?? 0}</span></p>
            <p className="text-neutral-500 dark:text-neutral-400">Nuevo stock: <span className="font-bold text-brand-500">{adjustProduct ? Math.max(0, adjustProduct.stock + (adjustType === 'entrada' ? adjustQty : -adjustQty)) : 0}</span></p>
          </div>
        </div>
      </Modal>

      {/* Barcode Label Modal */}
      <Modal open={!!labelProduct} onClose={() => setLabelProduct(null)} title="Etiqueta de Producto" subtitle="Vista previa para impresora térmica/adhesiva" size="sm"
        footer={<div className="flex gap-3"><button onClick={() => setLabelProduct(null)} className="btn-ghost flex-1">Cerrar</button><button onClick={() => window.print()} className="btn-primary flex-1"><Tag size={18} /> Imprimir</button></div>}>
        {labelProduct && (
          <div className="mx-auto max-w-[280px] bg-white text-black font-mono p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 text-center">
            <p className="font-bold text-sm">{config.nombreComercial}</p>
            <p className="text-xs mt-1">{labelProduct.name}</p>
            <p className="text-2xl font-bold my-2">{formatCurrency(labelProduct.price)}</p>
            <div className="flex justify-center my-2">
              <svg width="200" height="60">
                {labelProduct.barcode.split('').map((d, i) => (<rect key={i} x={i * 15} y={0} width={parseInt(d) % 3 === 0 ? 4 : parseInt(d) % 2 === 0 ? 3 : 2} height={40} fill="black" />))}
              </svg>
            </div>
            <p className="text-[10px] tracking-widest">{labelProduct.barcode}</p>
            <p className="text-[10px] mt-1">Código: {labelProduct.code}</p>
          </div>
        )}
      </Modal>

      {/* History Modal */}
      <Modal open={!!historyProduct} onClose={() => setHistoryProduct(null)} title="Historial de Movimientos" subtitle={historyProduct?.name} size="lg"
        footer={<button onClick={() => setHistoryProduct(null)} className="btn-primary w-full">Cerrar</button>}>
        {historyProduct && (
          <div className="space-y-2">
            {productHistory(historyProduct.id).length === 0 ? (
              <p className="text-center text-neutral-400 py-8 text-sm">Sin movimientos registrados</p>
            ) : (
              productHistory(historyProduct.id).map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.type === 'entrada' ? 'bg-green-500/15 text-green-500' : m.type === 'venta' ? 'bg-blue-500/15 text-blue-500' : 'bg-red-500/15 text-red-500'}`}>
                    {m.type === 'entrada' ? <ArrowUpCircle size={16} /> : m.type === 'venta' ? <Tag size={16} /> : <ArrowDownCircle size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 capitalize">{m.type} — {m.reason}</p>
                    <p className="text-xs text-neutral-400">{m.user} · {m.timestamp}</p>
                  </div>
                  <span className={`font-bold tabular-nums ${m.type === 'entrada' ? 'text-green-500' : 'text-red-500'}`}>{m.type === 'entrada' ? '+' : '-'}{m.qty}</span>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteProduct} onClose={() => setDeleteProduct(null)} title="¿Eliminar producto del inventario?" size="sm"
        footer={<div className="flex gap-3"><button onClick={() => setDeleteProduct(null)} className="btn-ghost flex-1">Cancelar</button><button onClick={confirmDelete} className="btn-danger flex-1"><Trash2 size={18} /> Eliminar Producto</button></div>}>
        <div className="space-y-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/15 mx-auto">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <p className="text-center text-sm text-neutral-600 dark:text-neutral-300">
            ¿Estás seguro de que deseas eliminar <span className="font-bold text-neutral-900 dark:text-white">'{deleteProduct?.name}'</span> ({deleteProduct?.code})? Esta acción no se puede deshacer.
          </p>
        </div>
      </Modal>

      {/* Category Management Modal */}
      <Modal open={catModalOpen} onClose={() => setCatModalOpen(false)} title="Gestión de Categorías" subtitle="Crear, editar y eliminar categorías" size="md"
        footer={<button onClick={() => setCatModalOpen(false)} className="btn-primary w-full">Cerrar</button>}>
        <div className="space-y-4">
          {/* Add new category */}
          <div className="flex gap-2">
            <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} className="input flex-1" placeholder="Nueva categoría (Ej: Pinturas, Tornillería)" />
            <button onClick={addCategory} disabled={!newCatName.trim()} className="btn-primary"><Plus size={18} /> Guardar</button>
          </div>

          {/* Category list */}
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40">
                {editingCat === cat ? (
                  <>
                    <input value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEditCat()} className="input flex-1 py-1.5 text-sm" autoFocus />
                    <button onClick={saveEditCat} className="p-1.5 rounded-lg text-green-500 hover:bg-green-500/10 transition"><CheckCircle2 size={16} /></button>
                    <button onClick={() => { setEditingCat(null); setEditingCatName(''); }} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{cat}</span>
                    <button onClick={() => { setEditingCat(cat); setEditingCatName(cat); }} className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-brand-500/10 transition" title="Editar"><Edit3 size={16} /></button>
                    <button onClick={() => setDeleteCat(cat)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition" title="Eliminar"><Trash2 size={16} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete Category Confirmation */}
      <Modal open={!!deleteCat} onClose={() => setDeleteCat(null)} title="¿Eliminar categoría?" size="sm"
        footer={<div className="flex gap-3"><button onClick={() => setDeleteCat(null)} className="btn-ghost flex-1">Cancelar</button><button onClick={confirmDeleteCat} className="btn-danger flex-1"><Trash2 size={18} /> Eliminar</button></div>}>
        <div className="space-y-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/15 mx-auto">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <p className="text-center text-sm text-neutral-600 dark:text-neutral-300">
            ¿Eliminar la categoría <span className="font-bold text-neutral-900 dark:text-white">'{deleteCat}'</span>? Los productos de esta categoría se reasignarán a 'Sin Categoría'.
          </p>
        </div>
      </Modal>

      {/* Saved toast */}
      <Modal open={savedOpen} onClose={() => setSavedOpen(false)} title="" size="sm">
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} className="text-green-500" />
          </div>
          <p className="font-semibold text-neutral-900 dark:text-white">Producto guardado</p>
        </div>
      </Modal>
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-500/15 text-brand-500', red: 'bg-red-500/15 text-red-500',
    green: 'bg-green-500/15 text-green-500', orange: 'bg-orange-500/15 text-orange-500',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-extrabold text-neutral-900 dark:text-white tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: StockState }) {
  const config: Record<StockState, { label: string; cls: string }> = {
    ok: { label: 'OK', cls: 'bg-green-500/15 text-green-500' },
    bajo: { label: 'Bajo', cls: 'bg-amber-500/15 text-amber-500' },
    critico: { label: 'Crítico', cls: 'bg-red-500/15 text-red-500' },
    agotado: { label: 'Agotado', cls: 'bg-neutral-500/15 text-neutral-500' },
  };
  const c = config[state];
  return <span className={`chip ${c.cls}`}>{c.label}</span>;
}
