import { useState } from 'react';
import { Wallet, Lock, Unlock, TrendingUp, DollarSign, AlertTriangle, CheckCircle2, Receipt, Users, Phone, ClipboardList } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modal';
import { NumberField } from '@/components/NumberField';
import { formatCurrency, genId } from '@/lib/format';
import { Dispatches } from '@/modules/Dispatches';

export function Cash() {
  const app = useApp();
  const { cashSession: session, setCashSession, sales, config, receivables, customers, addAudit, payReceivable, cashOutflows } = app;

  const [openAmount, setOpenAmount] = useState(0);
  const [openError, setOpenError] = useState('');
  const [closeCounted, setCloseCounted] = useState(0);
  const [closeOpen, setCloseOpen] = useState(false);
  const [openOpen, setOpenOpen] = useState(false);
  const [result, setResult] = useState<{ diff: number; expected: number } | null>(null);
  const [payReceivableId, setPayReceivableId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [tab, setTab] = useState<'caja' | 'cxc' | 'despachos'>('caja');

  const sessionSales = sales.filter((s) => session && new Date(s.date) >= new Date(session.openingTime));
  const cashSales = sessionSales.filter((s) => s.paymentMethod === 'efectivo').reduce((sum, s) => sum + s.total, 0);
  const mixedCash = sessionSales.filter((s) => s.paymentMethod === 'mixto' && s.mixed).reduce((sum, s) => sum + (s.mixed?.efectivo ?? 0), 0);
  const sessionOutflows = session ? cashOutflows.filter((o) => new Date(o.date) >= new Date(session.openingTime)) : [];
  const totalOutflows = sessionOutflows.reduce((sum, o) => sum + o.amount, 0);
  const expectedCash = (session?.openingAmount ?? 0) + cashSales + mixedCash - totalOutflows;

  const openCash = () => {
    if (openAmount < config.minCashFloat) {
      setOpenError(`El monto ingresado es menor al mínimo de apertura configurado (Mínimo requerido: RD$ ${config.minCashFloat.toLocaleString('es-DO', { minimumFractionDigits: 2 })})`);
      return;
    }
    setOpenError('');
    const newSession = {
      id: genId('cash'),
      cashier: app.currentUser?.username ?? config.cashier,
      openingAmount: Math.max(0, openAmount),
      openingTime: new Date().toISOString(),
      closed: false,
    };
    setCashSession(newSession);
    addAudit(`Apertura de caja — Fondo: ${formatCurrency(openAmount)}`);
    setOpenOpen(false);
    setOpenAmount(0);
  };

  const closeCash = () => {
    if (!session) return;
    const diff = closeCounted - expectedCash;
    const closed = {
      ...session, closed: true, closingAmount: closeCounted, closingTime: new Date().toISOString(),
      expectedCash, difference: diff,
    };
    setCashSession(closed);
    addAudit(`Cierre de caja (Corte Z) — Diferencia: ${formatCurrency(diff)}`);
    setResult({ diff, expected: expectedCash });
    setCloseOpen(false);
  };

  const cardSales = sessionSales.filter((s) => s.paymentMethod === 'tarjeta').reduce((sum, s) => sum + s.total, 0);
  const transferSales = sessionSales.filter((s) => s.paymentMethod === 'transferencia').reduce((sum, s) => sum + s.total, 0);
  const creditSales = sessionSales.filter((s) => s.paymentMethod === 'credito').reduce((sum, s) => sum + s.total, 0);

  const openReceivables = receivables.filter((r) => r.status !== 'pagada');

  const doPayReceivable = () => {
    if (!payReceivableId || payAmount <= 0) return;
    payReceivable(payReceivableId, payAmount);
    setPayReceivableId(null);
    setPayAmount(0);
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="card p-2 flex gap-1 overflow-x-auto">
        <button onClick={() => setTab('caja')} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${tab === 'caja' ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'}`}>
          <Wallet size={16} /> Caja Chica
        </button>
        <button onClick={() => setTab('cxc')} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${tab === 'cxc' ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'}`}>
          <Users size={16} /> Cuentas por Cobrar
        </button>
        <button onClick={() => setTab('despachos')} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${tab === 'despachos' ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'}`}>
          <ClipboardList size={16} /> Despachos / Materiales en Obra
        </button>
      </div>

      {tab === 'despachos' ? (
        <Dispatches />
      ) : (
      <>
      {tab === 'caja' && (
      <>
      {/* Status card */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${session && !session.closed ? 'bg-green-500/15 text-green-500' : 'bg-neutral-500/15 text-neutral-500'}`}>
              {session && !session.closed ? <Unlock size={28} /> : <Lock size={28} />}
            </div>
            <div>
              <h2 className="font-bold text-lg text-neutral-900 dark:text-white">
                {session ? (session.closed ? 'Caja Cerrada' : 'Caja Abierta') : 'Caja Sin Abrir'}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {session ? `Cajero: ${session.cashier} · Apertura: ${new Date(session.openingTime).toLocaleString('es-DO')}` : 'Debe abrir la caja para comenzar a vender'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!session && (
              <button onClick={() => setOpenOpen(true)} className="btn-primary">
                <Wallet size={18} /> Abrir Caja
              </button>
            )}
            {session && !session.closed && (
              <button onClick={() => setCloseOpen(true)} className="btn-danger">
                <Lock size={18} /> Cierre de Caja (Corte Z)
              </button>
            )}
            {session?.closed && (
              <button onClick={() => { setCashSession(null); setOpenAmount(0); setOpenError(''); }} className="btn-primary">
                <Unlock size={18} /> Nueva Apertura
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      {session && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CashMetric icon={<Wallet size={20} />} label="Fondo Inicial" value={formatCurrency(session.openingAmount)} color="brand" />
          <CashMetric icon={<DollarSign size={20} />} label="Efectivo Esperado" value={formatCurrency(expectedCash)} color="green" />
          <CashMetric icon={<Receipt size={20} />} label="Ventas del Turno" value={String(sessionSales.length)} color="blue" />
          <CashMetric icon={<TrendingUp size={20} />} label="Total Vendido" value={formatCurrency(sessionSales.reduce((s, x) => s + x.total, 0))} color="brand" />
        </div>
      )}

      {/* Cash outflows (nómina + other) */}
      {session && sessionOutflows.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={18} className="text-red-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white">Salidas de Efectivo del Turno</h3>
            <span className="chip bg-red-500/15 text-red-500 ml-auto">{formatCurrency(totalOutflows)}</span>
          </div>
          <div className="space-y-2">
            {sessionOutflows.map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm p-2.5 rounded-xl bg-red-500/5 border border-red-500/20">
                <div>
                  <p className="font-semibold text-neutral-800 dark:text-neutral-100">{o.description}</p>
                  <p className="text-xs text-neutral-400">{o.category} · {new Date(o.date).toLocaleString('es-DO')} · {o.registeredBy}</p>
                </div>
                <span className="font-bold text-red-500 tabular-nums">- {formatCurrency(o.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment method breakdown */}
      {session && sessionSales.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Desglose por Método de Pago</h3>
          <div className="space-y-3">
            <PaymentRow label="Efectivo" amount={cashSales + mixedCash} color="green" />
            <PaymentRow label="Tarjeta" amount={cardSales} color="blue" />
            <PaymentRow label="Transferencia" amount={transferSales} color="purple" />
            <PaymentRow label="Crédito / Fiado" amount={creditSales} color="orange" />
          </div>
        </div>
      )}

      {/* Cash retirement alert */}
      {session && !session.closed && expectedCash >= config.cashRetirementAlert && (
        <div className="card p-4 flex items-center gap-3 border-amber-500/30 bg-amber-500/5">
          <AlertTriangle size={20} className="text-amber-500" />
          <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">
            Alerta: El efectivo en caja supera RD$ {formatCurrency(config.cashRetirementAlert)}. Se recomienda realizar un retiro ciego/depósito a bóveda.
          </p>
        </div>
      )}

      {/* Close result */}
      {session?.closed && session.difference !== undefined && (
        <div className={`card p-5 ${session.difference === 0 ? 'border-green-500/30 bg-green-500/5' : session.difference > 0 ? 'border-blue-500/30 bg-blue-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          <div className="flex items-center gap-3">
            {session.difference === 0 ? <CheckCircle2 size={24} className="text-green-500" /> : <AlertTriangle size={24} className={session.difference > 0 ? 'text-blue-500' : 'text-red-500'} />}
            <div>
              <p className="font-bold text-neutral-900 dark:text-white">Corte Z Realizado</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Esperado: {formatCurrency(session.expectedCash ?? 0)} · Contado: {formatCurrency(session.closingAmount ?? 0)} ·{' '}
                <span className={session.difference > 0 ? 'text-blue-500 font-bold' : session.difference < 0 ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>
                  {session.difference > 0 ? 'Sobrante' : session.difference < 0 ? 'Faltante' : 'Cuadrado'}: {formatCurrency(Math.abs(session.difference))}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Open Cash Modal */}
      <Modal
        open={openOpen}
        onClose={() => setOpenOpen(false)}
        title="Apertura de Caja"
        subtitle="Ingresa el fondo inicial de cambio"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setOpenOpen(false)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={openCash} className="btn-primary flex-1"><Wallet size={18} /> Abrir Caja</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Fondo Inicial (Monto de Cambio)</label>
            <NumberField value={openAmount} onChange={(v) => { setOpenAmount(v); setOpenError(''); }} min={0} prefix="RD$" placeholder="0" />
          </div>
          <p className="text-xs text-neutral-400">Efectivo mínimo para apertura: {formatCurrency(config.minCashFloat)}</p>
          {openError && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
              <AlertTriangle size={14} /> {openError}
            </div>
          )}
        </div>
      </Modal>

      {/* Close Cash Modal */}
      <Modal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        title="Cierre de Caja (Corte Z)"
        subtitle="Cuenta el efectivo físico y compáralo con el esperado"
        size="md"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setCloseOpen(false)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={closeCash} className="btn-danger flex-1"><Lock size={18} /> Cerrar Caja</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-4 space-y-2">
            <Row label="Fondo Inicial" value={formatCurrency(session?.openingAmount ?? 0)} />
            <Row label="Ventas en Efectivo" value={formatCurrency(cashSales + mixedCash)} />
            <Row label="Salidas de Efectivo" value={`- ${formatCurrency(totalOutflows)}`} />
            <Row label="Efectivo Esperado" value={formatCurrency(expectedCash)} />
          </div>
          <div>
            <label className="label">Efectivo Físico Contado</label>
            <NumberField value={closeCounted} onChange={setCloseCounted} min={0} prefix="RD$" />
          </div>
          <div className="rounded-xl bg-brand-500/10 border border-brand-500/30 p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-neutral-900 dark:text-white">Diferencia</span>
              <span className={`text-2xl font-extrabold tabular-nums ${closeCounted - expectedCash === 0 ? 'text-green-500' : closeCounted - expectedCash > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                {formatCurrency(Math.abs(closeCounted - expectedCash))}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Result toast */}
      <Modal open={!!result} onClose={() => setResult(null)} title="Corte Z Completado" size="sm"
        footer={<button onClick={() => setResult(null)} className="btn-primary w-full"><CheckCircle2 size={18} /> Entendido</button>}>
        <div className="text-center py-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${result?.diff === 0 ? 'bg-green-500/15' : result && result.diff > 0 ? 'bg-blue-500/15' : 'bg-red-500/15'}`}>
            {result?.diff === 0 ? <CheckCircle2 size={32} className="text-green-500" /> : <AlertTriangle size={32} className={result && result.diff > 0 ? 'text-blue-500' : 'text-red-500'} />}
          </div>
          <p className="font-semibold text-neutral-900 dark:text-white">
            {result?.diff === 0 ? 'Caja cuadrada' : result && result.diff > 0 ? `Sobrante de ${formatCurrency(result.diff)}` : `Faltante de ${formatCurrency(Math.abs(result?.diff ?? 0))}`}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Esperado: {formatCurrency(result?.expected ?? 0)}</p>
        </div>
      </Modal>
      </>
      )}
      {tab === 'cxc' && (
      <>
      {/* Accounts Receivable management */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-brand-500" />
          <h3 className="font-bold text-neutral-900 dark:text-white">Cuentas por Cobrar (Crédito / Fiado)</h3>
          <span className="chip bg-orange-500/15 text-orange-500 ml-auto">{openReceivables.length} pendientes</span>
        </div>
        {openReceivables.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-4">No hay cuentas por cobrar pendientes</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <th className="px-3 py-3 text-left font-semibold">Cliente</th>
                  <th className="px-3 py-3 text-left font-semibold">NCF</th>
                  <th className="px-3 py-3 text-right font-semibold">Total</th>
                  <th className="px-3 py-3 text-right font-semibold">Pagado</th>
                  <th className="px-3 py-3 text-right font-semibold">Saldo</th>
                  <th className="px-3 py-3 text-center font-semibold">Estado</th>
                  <th className="px-3 py-3 text-right font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {openReceivables.map((r) => {
                  const c = customers.find((x) => x.id === r.customerId);
                  const saldo = r.amount - r.paid;
                  return (
                    <tr key={r.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{r.customerName}</p>
                        {c && <p className="text-xs text-neutral-400"><Phone size={10} className="inline" /> {c.phone}</p>}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-neutral-500 dark:text-neutral-400">{r.ncf}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(r.amount)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-green-500">{formatCurrency(r.paid)}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-bold text-orange-500">{formatCurrency(saldo)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`chip ${r.status === 'parcial' ? 'bg-amber-500/15 text-amber-500' : 'bg-orange-500/15 text-orange-500'}`}>{r.status}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => { setPayReceivableId(r.id); setPayAmount(saldo); }} className="btn-ghost px-3 py-1.5 text-xs"><Wallet size={14} /> Abonar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Receivable Modal */}
      <Modal
        open={!!payReceivableId}
        onClose={() => setPayReceivableId(null)}
        title="Abonar a Cuenta por Cobrar"
        subtitle="Registra un pago parcial o total"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setPayReceivableId(null)} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={doPayReceivable} disabled={payAmount <= 0} className="btn-primary flex-1"><Wallet size={18} /> Abonar</button>
          </div>
        }
      >
        {(() => {
          const r = receivables.find((x) => x.id === payReceivableId);
          if (!r) return null;
          const saldo = r.amount - r.paid;
          return (
            <div className="space-y-4">
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-4 space-y-2">
                <Row label="Cliente" value={r.customerName} />
                <Row label="Total Factura" value={formatCurrency(r.amount)} />
                <Row label="Pagado" value={formatCurrency(r.paid)} />
                <Row label="Saldo Pendiente" value={formatCurrency(saldo)} />
              </div>
              <div>
                <label className="label">Monto del Abono</label>
                <NumberField value={payAmount} onChange={setPayAmount} min={0} max={saldo} prefix="RD$" />
              </div>
            </div>
          );
        })()}
      </Modal>
      </>
      )}
      </>
      )}
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

function CashMetric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-500/15 text-brand-500', green: 'bg-green-500/15 text-green-500',
    blue: 'bg-blue-500/15 text-blue-500', red: 'bg-red-500/15 text-red-500',
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

function PaymentRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500', blue: 'bg-blue-500', purple: 'bg-purple-500', orange: 'bg-orange-500',
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${colors[color]}`} />
      <span className="text-sm text-neutral-600 dark:text-neutral-300 flex-1">{label}</span>
      <span className="font-bold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(amount)}</span>
    </div>
  );
}
