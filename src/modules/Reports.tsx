import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';
import { DollarSign, TrendingUp, Receipt, AlertTriangle, Banknote, CreditCard, ArrowLeftRight, Wallet, FileText, Percent, PackageX, Trophy } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { Product } from '@/types';
import { formatCurrency } from '@/lib/format';

type Range = '7dias' | 'mes' | '3meses' | 'anio';

const RANGE_LABELS: Record<Range, string> = {
  '7dias': 'Últimos 7 Días',
  'mes': 'Último Mes',
  '3meses': 'Últimos 3 Meses',
  'anio': 'Año Actual',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Cableado': '#F59E0B',
  'Cerrajería': '#10B981',
  'Eléctrica': '#06B6D4',
  'Herramientas': '#8B5CF6',
  'Iluminación': '#EC4899',
  'Plomería': '#F97316',
  'Protección': '#3B82F6',
  'Sin Categoría': '#6B7280',
};

function colorForCategory(name: string): string {
  return CATEGORY_COLORS[name] ?? '#6B7280';
}

type TopSort = 'qty' | 'revenue';
type CatMode = 'revenue' | 'qty';
type BarMode = 'categoria' | 'pago';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function Reports() {
  const app = useApp();
  const { sales, products } = app;
  const [range, setRange] = useState<Range>('mes');
  const [topSort, setTopSort] = useState<TopSort>('qty');
  const [catMode, setCatMode] = useState<CatMode>('revenue');
  const [barMode, setBarMode] = useState<BarMode>('categoria');
  const now = useMemo(() => new Date(2026, 6, 22), []);

  // Filter by JS timestamps, then sort chronologically (oldest first) for correct chart ordering.
  const filteredSales = useMemo(() => {
    const start = new Date(now);
    switch (range) {
      case '7dias': start.setDate(now.getDate() - 6); break;
      case 'mes': start.setDate(now.getDate() - 30); break;
      case '3meses': start.setDate(now.getDate() - 90); break;
      case 'anio': { const s = new Date(now.getFullYear(), 0, 1); return sales
          .filter((s2) => { const d = new Date(s2.date); return d >= s && d <= now; })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); }
    }
    return sales
      .filter((s) => { const d = new Date(s.date); return d >= start && d <= now; })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sales, range, now]);

  const productByName = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.name, p));
    return m;
  }, [products]);

  // Completed (valid) transactions only.
  const validSales = useMemo(() => filteredSales.filter((s) => s.total > 0 && s.items.length > 0), [filteredSales]);

  const totalSales = validSales.reduce((s, x) => s + x.total, 0);
  const totalTransactions = validSales.length;
  const avgTicket = totalTransactions ? totalSales / totalTransactions : 0;
  const totalDiscount = validSales.reduce((s, x) => s + x.discount, 0);
  const totalItbis = validSales.reduce((s, x) => s + x.itbis, 0);

  // Cost of goods sold and gross profit per line (pre-discount line revenue).
  const { totalCost, grossProfit } = useMemo(() => {
    let cost = 0, profit = 0;
    validSales.forEach((s) => {
      s.items.forEach((it) => {
        const prod = productByName.get(it.name);
        const unitCost = prod ? prod.cost : 0;
        const lineCost = unitCost * it.qty;
        const lineRevenue = it.price * it.qty;
        cost += lineCost;
        profit += lineRevenue - lineCost;
      });
    });
    return { totalCost: cost, grossProfit: profit };
  }, [validSales, productByName]);

  // Net profit = gross profit - discounts (discounts subtracted exactly once).
  const netProfit = grossProfit - totalDiscount;

  // Ventas Gravadas (Subtotal) = sum of (subtotal - discount) per sale.
  // This equals COGS + Gross Profit because both are computed on pre-discount line revenue
  // and subtotal - discount = sum of line revenue - discount = (COGS + grossProfit) - discount.
  const taxableBase = validSales.reduce((s, x) => s + x.subtotal - x.discount, 0);

  // Critical stock: stock > 0 AND stock <= minStock (matches the inventory definition).
  const criticalCount = useMemo(() => products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length, [products]);

  // Top selling products — default sort by UNITS SOLD, not revenue.
  const topProducts = useMemo(() => {
    const buckets: Record<string, { qty: number; revenue: number; category: string }> = {};
    validSales.forEach((s) => {
      s.items.forEach((it) => {
        const prod = productByName.get(it.name);
        const cat = prod?.category ?? 'Sin Categoría';
        if (!buckets[it.name]) buckets[it.name] = { qty: 0, revenue: 0, category: cat };
        buckets[it.name].qty += it.qty;
        buckets[it.name].revenue += it.price * it.qty;
      });
    });
    return Object.entries(buckets)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => (topSort === 'qty' ? b.qty - a.qty : b.revenue - a.revenue))
      .slice(0, 10);
  }, [validSales, productByName, topSort]);

  const topMaxValue = topProducts.length > 0
    ? (topSort === 'qty' ? topProducts[0].qty : topProducts[0].revenue)
    : 1;

  const paymentBreakdown = useMemo(() => {
    const methods = { efectivo: 0, tarjeta: 0, transferencia: 0, credito: 0, mixto: 0 };
    validSales.forEach((s) => {
      if (s.paymentMethod === 'mixto' && s.mixed) {
        methods.efectivo += s.mixed.efectivo;
        methods.tarjeta += s.mixed.tarjeta;
        methods.transferencia += s.mixed.transferencia;
      } else {
        methods[s.paymentMethod] += s.total;
      }
    });
    return methods;
  }, [validSales]);

  // Dynamic time-series data — uses UNROUNDED totals so the sum matches the KPI exactly.
  const seriesData = useMemo(() => {
    if (range === 'anio') {
      const buckets: Record<string, number> = {};
      MONTH_LABELS.forEach((m) => (buckets[m] = 0));
      validSales.forEach((s) => { buckets[MONTH_LABELS[new Date(s.date).getMonth()]] += s.total; });
      return MONTH_LABELS.map((m) => ({ label: m, ventas: buckets[m] }));
    }
    if (range === '3meses') {
      // 13 weekly buckets, labeled Semana 1..Semana 13 (oldest to newest).
      const weeks: { label: string; ventas: number }[] = [];
      for (let i = 12; i >= 0; i--) {
        const ref = new Date(now);
        ref.setDate(now.getDate() - i * 7);
        const end = new Date(ref);
        end.setDate(ref.getDate() + 6);
        weeks.push({ label: `Sem ${13 - i}`, ventas: 0 });
      }
      validSales.forEach((s) => {
        const dayDiff = Math.floor((now.getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24));
        const weekIdx = 12 - Math.floor(dayDiff / 7);
        if (weekIdx >= 0 && weekIdx < weeks.length) weeks[weekIdx].ventas += s.total;
      });
      return weeks;
    }
    if (range === 'mes') {
      // 4 weekly buckets: Semana 1..Semana 4 (oldest to newest), each ~7-8 days.
      const buckets: { label: string; ventas: number }[] = [];
      for (let w = 0; w < 4; w++) {
        buckets.unshift({ label: `Semana ${4 - w}`, ventas: 0 });
      }
      validSales.forEach((s) => {
        const dayDiff = Math.floor((now.getTime() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24));
        const weekIdx = 3 - Math.floor(dayDiff / 8);
        if (weekIdx >= 0 && weekIdx < buckets.length) buckets[weekIdx].ventas += s.total;
      });
      return buckets;
    }
    // 7dias: days of the week, oldest to newest.
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const ordered: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const ref = new Date(now);
      ref.setDate(now.getDate() - i);
      ordered.push(days[(ref.getDay() + 6) % 7]);
    }
    const buckets: Record<string, number> = {};
    const seen: string[] = [];
    ordered.forEach((d) => { if (!buckets[d] && buckets[d] !== 0) { buckets[d] = 0; seen.push(d); } });
    validSales.forEach((s) => {
      const d = new Date(s.date);
      const dayName = days[(d.getDay() + 6) % 7];
      if (dayName in buckets) buckets[dayName] += s.total;
    });
    return seen.map((d) => ({ label: d, ventas: buckets[d] }));
  }, [validSales, range, now]);

  // Category breakdown — proportional allocation of each sale's TOTAL (net of discount + ITBIS)
  // so the donut total EXACTLY matches the Ventas Totales KPI. No rounding applied.
  const categoryData = useMemo(() => {
    const buckets: Record<string, number> = {};
    validSales.forEach((s) => {
      const lineSum = s.items.reduce((acc, it) => acc + it.price * it.qty, 0);
      const ratio = lineSum > 0 ? s.total / lineSum : 0;
      s.items.forEach((it) => {
        const prod = productByName.get(it.name);
        const cat = prod?.category ?? 'Sin Categoría';
        const amount = catMode === 'qty' ? it.qty : it.price * it.qty * ratio;
        buckets[cat] = (buckets[cat] ?? 0) + amount;
      });
    });
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [validSales, productByName, catMode]);

  const categoryTotal = categoryData.reduce((s, x) => s + x.value, 0);

  // Bar chart data: by category or by payment method (not a duplicate of the time series).
  const barData = useMemo(() => {
    if (barMode === 'categoria') {
      return categoryData.map((c) => ({ label: c.name, ventas: c.value }));
    }
    return [
      { label: 'Efectivo', ventas: paymentBreakdown.efectivo },
      { label: 'Tarjeta', ventas: paymentBreakdown.tarjeta },
      { label: 'Transfer.', ventas: paymentBreakdown.transferencia },
      { label: 'Crédito', ventas: paymentBreakdown.credito },
    ];
  }, [barMode, categoryData, paymentBreakdown]);

  // Dynamic low-rotation: products with stock>0, least units sold in the active period, top 4 ASC.
  const lowRotation = useMemo(() => {
    const sold: Record<string, number> = {};
    validSales.forEach((s) => s.items.forEach((it) => { sold[it.name] = (sold[it.name] ?? 0) + it.qty; }));
    return products
      .filter((p) => p.stock > 0)
      .map((p) => ({ id: p.id, name: p.name, code: p.code, stock: p.stock, sold: sold[p.name] ?? 0 }))
      .sort((a, b) => a.sold - b.sold)
      .slice(0, 4);
  }, [validSales, products]);

  return (
    <div className="space-y-4">
      {/* Time filters */}
      <div className="card p-2 inline-flex gap-1 flex-wrap">
        {(Object.keys(RANGE_LABELS) as Range[]).map((key) => (
          <button key={key} onClick={() => setRange(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${range === key ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'}`}>
            {RANGE_LABELS[key]}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<DollarSign size={20} />} label="Ventas Totales" value={formatCurrency(totalSales)} color="brand" />
        <Kpi icon={<TrendingUp size={20} />} label="Ganancia Neta" value={formatCurrency(netProfit)} color="green" />
        <Kpi icon={<Receipt size={20} />} label="Ticket Promedio" value={formatCurrency(avgTicket)} color="blue" />
        <Kpi icon={<AlertTriangle size={20} />} label="Productos Críticos" value={String(criticalCount)} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 pb-8">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-1">Ingresos por Ventas</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">{RANGE_LABELS[range]}</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={seriesData} margin={{ top: 5, right: 10, left: -10, bottom: 10 }}>
              <defs>
                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={8} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fbbf24', fontWeight: 600 }} itemStyle={{ color: '#fff' }} formatter={(v) => [formatCurrency(Number(v)), 'Ventas']} />
              <Area type="monotone" dataKey="ventas" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorVentas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white">Ventas por Categoría</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Distribución de {catMode === 'revenue' ? 'ingresos' : 'unidades'}</p>
            </div>
            <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg p-0.5 shrink-0">
              <button onClick={() => setCatMode('revenue')} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${catMode === 'revenue' ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>Por Ingresos</button>
              <button onClick={() => setCatMode('qty')} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${catMode === 'qty' ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>Por Unidades</button>
            </div>
          </div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={95} paddingAngle={3}>
                  {categoryData.map((entry, i) => (<Cell key={i} fill={colorForCategory(entry.name)} />))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fbbf24', fontWeight: 600 }} itemStyle={{ color: '#fff' }}
                  formatter={(v, _name, props) => {
                    const pct = categoryTotal > 0 ? ((Number(v) / categoryTotal) * 100).toFixed(1) : '0';
                    const valStr = catMode === 'qty' ? `${Number(v).toLocaleString('es-DO')} unid.` : formatCurrency(Number(v));
                    return [`${valStr} (${pct}%)`, props?.payload?.name ?? ''] as [string, string];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500 font-semibold">Total {catMode === 'revenue' ? 'Ingresos' : 'Unidades'}</p>
              <p className="text-lg font-extrabold text-neutral-900 dark:text-white tabular-nums leading-tight">{catMode === 'revenue' ? formatCurrency(categoryTotal) : categoryTotal.toLocaleString('es-DO')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3">
            {categoryData.map((entry) => {
              const pct = categoryTotal > 0 ? ((entry.value / categoryTotal) * 100).toFixed(0) : '0';
              return (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorForCategory(entry.name) }} />
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">{entry.name} <span className="text-neutral-400">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top selling products */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Trophy size={20} className="text-brand-500" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Productos Más Vendidos</h3>
          <span className="chip bg-brand-500/15 text-brand-600 dark:text-brand-400 ml-auto">{RANGE_LABELS[range]}</span>
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg p-0.5 shrink-0">
            <button onClick={() => setTopSort('qty')} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${topSort === 'qty' ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>Por Unidades</button>
            <button onClick={() => setTopSort('revenue')} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${topSort === 'revenue' ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>Por Ingreso</button>
          </div>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-4">Sin ventas en el período seleccionado</p>
        ) : (
          <div className="space-y-2.5">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${i === 0 ? 'bg-brand-500/20 text-brand-500' : i === 1 ? 'bg-neutral-400/20 text-neutral-400' : i === 2 ? 'bg-orange-600/20 text-orange-600' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'}`}>
                  {i + 1}°
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{p.name}</p>
                  <p className="text-xs text-neutral-400">{p.category}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(p.revenue)}</p>
                  <p className="text-xs text-neutral-400">{p.qty.toLocaleString('es-DO')} vendidos</p>
                </div>
                <div className="w-24 shrink-0">
                  <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${((topSort === 'qty' ? p.qty : p.revenue) / topMaxValue) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment method breakdown */}
      <div className="card p-5">
        <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Desglose por Método de Pago</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <PaymentCard icon={<Banknote size={20} />} label="Efectivo" amount={paymentBreakdown.efectivo} color="green" />
          <PaymentCard icon={<CreditCard size={20} />} label="Tarjeta" amount={paymentBreakdown.tarjeta} color="blue" />
          <PaymentCard icon={<ArrowLeftRight size={20} />} label="Transferencia" amount={paymentBreakdown.transferencia} color="purple" />
          <PaymentCard icon={<Wallet size={20} />} label="Crédito / Fiado" amount={paymentBreakdown.credito} color="orange" />
        </div>
      </div>

      {/* ITBIS Report + Profit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-brand-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white">Reporte ITBIS (DGII - Formulario 607)</h3>
          </div>
          <div className="space-y-3 flex-1">
            <ReportRow label="Total Facturas Emitidas" value={String(totalTransactions)} />
            <ReportRow label="Ventas Gravadas (Subtotal)" value={formatCurrency(taxableBase)} />
            <ReportRow label="ITBIS Facturado (18%)" value={formatCurrency(totalItbis)} />
            <ReportRow label="Total Ingresos (con ITBIS)" value={formatCurrency(totalSales)} />
          </div>
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-700/50 pb-1">
            <span className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5"><Percent size={16} className="text-brand-500" /> Total a Reportar DGII</span>
            <span className="text-xl font-extrabold text-brand-500 tabular-nums">{formatCurrency(totalItbis)}</span>
          </div>
        </div>

        <div className="card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-brand-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white">Utilidad Bruta vs. Neta</h3>
          </div>
          <div className="space-y-3 flex-1">
            <ReportRow label="Costo de Mercancía Vendida" value={formatCurrency(totalCost)} />
            <ReportRow label="Utilidad Bruta" value={formatCurrency(grossProfit)} />
            <ReportRow label="Descuentos Otorgados" value={formatCurrency(totalDiscount)} />
          </div>
          <div className="flex justify-between items-center pt-3 mt-3 border-t border-neutral-200 dark:border-neutral-700/50 pb-1">
            <span className="font-bold text-neutral-900 dark:text-white">Utilidad Neta</span>
            <span className="text-xl font-extrabold text-green-500 tabular-nums">{formatCurrency(netProfit)}</span>
          </div>
        </div>
      </div>

      {/* Low rotation products — dynamic, top 4 least-sold with stock>0 */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <PackageX size={20} className="text-brand-500" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Productos de Baja Rotación</h3>
          <span className="chip bg-neutral-200 dark:bg-neutral-700 text-neutral-500 ml-auto">{RANGE_LABELS[range]}</span>
        </div>
        {lowRotation.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-4">Sin productos con stock disponible</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {lowRotation.map((p) => (
              <div key={p.id} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{p.name}</p>
                <p className="text-xs text-neutral-400">{p.code} · Stock: {p.stock}</p>
                <p className="text-xs text-orange-500 font-semibold mt-1">{p.sold} vendidos en el período</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bar chart — grouped by Category or Payment Method (not a duplicate of the time series) */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-bold text-neutral-900 dark:text-white">Ingresos por {barMode === 'categoria' ? 'Categoría' : 'Método de Pago'}</h3>
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg p-0.5 shrink-0 ml-auto">
            <button onClick={() => setBarMode('categoria')} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${barMode === 'categoria' ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>Categoría</button>
            <button onClick={() => setBarMode('pago')} className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${barMode === 'pago' ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>Método de Pago</button>
          </div>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">{RANGE_LABELS[range]}</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={4} />
            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#fbbf24', fontWeight: 600 }} itemStyle={{ color: '#fff' }} formatter={(v) => [formatCurrency(Number(v)), 'Ingresos']} cursor={{ fill: 'rgba(245,158,11,0.08)' }} />
            <Bar dataKey="ventas" radius={[8, 8, 0, 0]} maxBarSize={56}>
              {barMode === 'categoria'
                ? barData.map((d, i) => (<Cell key={i} fill={colorForCategory(d.label)} />))
                : barData.map((d, i) => (<Cell key={i} fill={['#10B981', '#3B82F6', '#8B5CF6', '#F97316'][i % 4]} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: 'rgba(24,24,27,0.95)',
  border: '1px solid rgba(245,158,11,0.3)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 13,
  padding: '8px 12px',
};

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-500/15 text-brand-500', green: 'bg-green-500/15 text-green-500',
    blue: 'bg-blue-500/15 text-blue-500', red: 'bg-red-500/15 text-red-500',
  };
  return (
    <div className="card p-5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-extrabold text-neutral-900 dark:text-white tabular-nums mt-1">{value}</p>
    </div>
  );
}

function PaymentCard({ icon, label, amount, color }: { icon: React.ReactNode; label: string; amount: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500/15 text-green-500', blue: 'bg-blue-500/15 text-blue-500',
    purple: 'bg-purple-500/15 text-purple-500', orange: 'bg-orange-500/15 text-orange-500',
  };
  return (
    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>{icon}</div>
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="text-lg font-bold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(amount)}</p>
    </div>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="font-semibold text-neutral-800 dark:text-neutral-100 tabular-nums">{value}</span>
    </div>
  );
}
