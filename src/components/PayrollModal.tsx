import { useState, useMemo } from 'react';
import {
  Wallet, AlertTriangle, CheckCircle2, Banknote, ArrowLeftRight, Plus, Trash2,
  DollarSign, TrendingUp, BadgeCheck, Coins,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { NumberField } from '@/components/NumberField';
import { formatCurrency, genId } from '@/lib/format';
import type {
  Employee, Payout, PayoutConcept, PayoutConceptType, PayoutMethod,
  PayFrequency, PayoutKind, CompanyConfig,
} from '@/types';

const CONCEPT_META: Record<PayoutConceptType, { label: string; color: string; icon: React.ReactNode }> = {
  sueldo_base: { label: 'Sueldo Base', color: 'blue', icon: <DollarSign size={14} /> },
  comision: { label: 'Comisión por Servicio', color: 'green', icon: <TrendingUp size={14} /> },
  bono: { label: 'Bono / Incentivo', color: 'brand', icon: <BadgeCheck size={14} /> },
  deduccion: { label: 'Deducción (Avance / Vale)', color: 'red', icon: <AlertTriangle size={14} /> },
  custom: { label: 'Otro Concepto', color: 'neutral', icon: <Coins size={14} /> },
};

const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual',
};

function defaultBaseSalary(emp: Employee): number {
  return emp.baseSalary;
}

interface PayrollModalProps {
  emp: Employee;
  isCashOpen: boolean;
  kind: PayoutKind;
  pendingCommissions?: Employee['pendingCommissions'];
  onClose: () => void;
  onConfirm: (p: Payout) => void;
  registeredBy: string;
}

export function PayrollModal({
  emp, isCashOpen, kind, pendingCommissions, onClose, onConfirm, registeredBy,
}: PayrollModalProps) {
  const isAdvance = kind === 'adelanto';

  const initialConcepts = (): PayoutConcept[] => {
    if (isAdvance) {
      return [{ id: genId('c'), type: 'deduccion', label: 'Adelanto / Vale', amount: 0 }];
    }
    const concepts: PayoutConcept[] = [
      { id: genId('c'), type: 'sueldo_base', label: `Sueldo Base ${FREQUENCY_LABELS[emp.frequency]}`, amount: defaultBaseSalary(emp) },
    ];
    if (pendingCommissions && pendingCommissions.length > 0) {
      const totalComm = pendingCommissions.filter((c) => !c.paid).reduce((s, c) => s + c.amount, 0);
      if (totalComm > 0) {
        concepts.push({ id: genId('c'), type: 'comision', label: 'Comisiones por Servicios', amount: totalComm });
      }
    }
    if (emp.pendingAdvanceDeduction && emp.pendingAdvanceDeduction > 0) {
      concepts.push({ id: genId('c'), type: 'deduccion', label: 'Descuento Adelantos Pendientes', amount: emp.pendingAdvanceDeduction });
    }
    return concepts;
  };

  const [concepts, setConcepts] = useState<PayoutConcept[]>(initialConcepts);
  const [method, setMethod] = useState<PayoutMethod>(isCashOpen ? 'efectivo_caja' : 'efectivo_directo');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  const { grossPay, totalDeductions, netPay } = useMemo(() => {
    let gross = 0, ded = 0;
    concepts.forEach((c) => {
      if (c.type === 'deduccion' || (c.type === 'custom' && c.isDeduction)) {
        ded += c.amount;
      } else {
        gross += c.amount;
      }
    });
    return { grossPay: gross, totalDeductions: ded, netPay: gross - ded };
  }, [concepts]);

  const addConcept = (type: PayoutConceptType) => {
    const meta = CONCEPT_META[type];
    setConcepts((prev) => [...prev, { id: genId('c'), type, label: meta.label, amount: 0, isDeduction: type === 'custom' ? false : undefined }]);
  };

  const updateConcept = (id: string, patch: Partial<PayoutConcept>) => {
    setConcepts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeConcept = (id: string) => {
    setConcepts((prev) => prev.filter((c) => c.id !== id));
  };

  const submit = () => {
    if (concepts.length === 0) { setError('Agregue al menos un concepto.'); return; }
    if (netPay <= 0) { setError('El neto a pagar debe ser mayor que cero.'); return; }
    if (method === 'efectivo_caja' && !isCashOpen) { setError('La caja está cerrada. Use Efectivo Directo o Transferencia.'); return; }
    if (method === 'transferencia' && !reference.trim()) { setError('Ingrese el número de referencia / comprobante.'); return; }
    const payout: Payout = {
      id: genId('pay'),
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      date: new Date().toISOString(),
      concepts,
      grossPay, totalDeductions, netPay,
      method,
      reference: method === 'transferencia' ? reference.trim() : undefined,
      registeredBy,
      kind,
    };
    onConfirm(payout);
  };

  const title = isAdvance ? 'Registrar Adelanto / Vale' : 'Registrar Pago de Nómina';

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      subtitle={`${emp.firstName} ${emp.lastName} · ${emp.role}`}
      size="lg"
      footer={
        <div className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={submit} className="btn-primary flex-1"><Wallet size={18} /> Confirmar {isAdvance ? 'Adelanto' : 'Pago'}</button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Pending advance notice */}
        {emp.pendingAdvanceDeduction && emp.pendingAdvanceDeduction > 0 && !isAdvance && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <AlertTriangle size={14} /> Adelantos pendientes: {formatCurrency(emp.pendingAdvanceDeduction)} — se deducirán automáticamente.
          </div>
        )}

        {/* Pending commissions notice */}
        {pendingCommissions && pendingCommissions.filter((c) => !c.paid).length > 0 && !isAdvance && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs font-semibold">
            <TrendingUp size={14} /> {pendingCommissions.filter((c) => !c.paid).length} comisiones pendientes cargadas automáticamente.
          </div>
        )}

        {/* Concepts */}
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <label className="label">Desglose de Conceptos</label>
            <div className="flex gap-1 flex-wrap">
              {!isAdvance && (Object.keys(CONCEPT_META) as PayoutConceptType[]).map((t) => (
                <button key={t} onClick={() => addConcept(t)}
                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 hover:bg-brand-500/15 hover:text-brand-500 transition flex items-center gap-1">
                  <Plus size={12} /> {CONCEPT_META[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {concepts.map((c) => {
              const meta = CONCEPT_META[c.type];
              const colors: Record<string, string> = {
                blue: 'bg-blue-500/15 text-blue-500', green: 'bg-green-500/15 text-green-500',
                brand: 'bg-brand-500/15 text-brand-500', red: 'bg-red-500/15 text-red-500',
                neutral: 'bg-neutral-400/15 text-neutral-500',
              };
              return (
                <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors[meta.color]}`}>{meta.icon}</span>
                  <input
                    value={c.label}
                    onChange={(e) => updateConcept(c.id, { label: e.target.value })}
                    className="input flex-1 min-w-0 text-sm"
                  />
                  {c.type === 'custom' && (
                    <select
                      value={c.isDeduction ? 'ded' : 'add'}
                      onChange={(e) => updateConcept(c.id, { isDeduction: e.target.value === 'ded' })}
                      className="text-xs rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-neutral-700 dark:text-neutral-200"
                    >
                      <option value="add">+</option>
                      <option value="ded">−</option>
                    </select>
                  )}
                  <div className="w-32 shrink-0">
                    <NumberField
                      value={c.amount}
                      onChange={(v) => updateConcept(c.id, { amount: v })}
                      min={0}
                      prefix="RD$"
                      className="input py-1.5 text-sm text-right"
                    />
                  </div>
                  <button onClick={() => removeConcept(c.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
            {concepts.length === 0 && <p className="text-sm text-neutral-400 text-center py-3">Agregue un concepto para comenzar</p>}
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="label">Método de Pago</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setMethod('efectivo_caja')}
              disabled={!isCashOpen}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${method === 'efectivo_caja' ? 'bg-green-500/15 border-green-500 text-green-600 dark:text-green-400' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-neutral-400'}`}
            >
              <span className="flex items-center gap-1.5"><Banknote size={16} /> Efectivo desde Caja</span>
              <span className="text-[10px] font-normal text-neutral-400">Descuenta del turno activo</span>
              {!isCashOpen && <span className="text-[10px] text-red-400">Caja cerrada</span>}
            </button>
            <button
              onClick={() => setMethod('efectivo_directo')}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-sm font-semibold transition ${method === 'efectivo_directo' ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-neutral-400'}`}
            >
              <span className="flex items-center gap-1.5"><Wallet size={16} /> Efectivo Directo</span>
              <span className="text-[10px] font-normal text-neutral-400">No afecta el cuadre de caja</span>
            </button>
            <button
              onClick={() => setMethod('transferencia')}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-sm font-semibold transition ${method === 'transferencia' ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500 hover:border-neutral-400'}`}
            >
              <span className="flex items-center gap-1.5"><ArrowLeftRight size={16} /> Transferencia</span>
              <span className="text-[10px] font-normal text-neutral-400">Requiere número de referencia</span>
            </button>
          </div>
          {method === 'transferencia' && (
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Número de referencia / comprobante *"
              className="input mt-2"
            />
          )}
          {method === 'efectivo_caja' && isCashOpen && (
            <p className="text-xs text-green-500 mt-2 flex items-center gap-1.5"><CheckCircle2 size={13} /> Se registrará una salida de efectivo en la caja activa.</p>
          )}
          {method === 'efectivo_directo' && (
            <p className="text-xs text-amber-500 mt-2 flex items-center gap-1.5"><CheckCircle2 size={13} /> Se registra en el historial del empleado sin afectar el cuadre de caja.</p>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-4 space-y-2">
          <SummaryRow label="Total Devengado" value={formatCurrency(grossPay)} color="text-neutral-800 dark:text-neutral-100" />
          <SummaryRow label="Total Deducciones" value={`- ${formatCurrency(totalDeductions)}`} color="text-red-500" />
          <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-700/50">
            <span className="font-bold text-neutral-900 dark:text-white">Neto a Pagar</span>
            <span className="text-2xl font-extrabold text-brand-500 tabular-nums">{formatCurrency(netPay)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className={`font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

// ===== Printable Payout Receipt =====

export function PayoutReceipt({ payout, emp, config }: { payout: Payout; emp: Employee; config: CompanyConfig }) {
  const t = config.ticket;
  return (
    <div className="print-root print-ticket-80 mx-auto bg-white text-black font-mono text-[11px] p-4 rounded-lg">
      {t.showLogo && (
        <div className="text-center mb-1">
          {t.logoData ? <img src={t.logoData} alt="Logo" className="max-h-14 object-contain mx-auto" /> : <span className="text-lg font-bold">⚡</span>}
        </div>
      )}
      <div className="text-center">
        <p className="font-bold text-sm">{config.nombreComercial}</p>
        {t.showRnc && <p>RNC: {config.rnc}</p>}
        {t.showAddress && <p>{config.address}</p>}
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <p className="text-center font-bold text-sm">RECIBO DE PAGO</p>
      <p className="text-center text-[10px]">{payout.kind === 'adelanto' ? 'ADELANTO / VALE' : 'PAGO DE NÓMINA'}</p>
      <div className="border-t border-dashed border-black my-2" />
      <div className="space-y-0.5">
        <p>Recibo #: {payout.id.slice(-6).toUpperCase()}</p>
        <p>Fecha: {new Date(payout.date).toLocaleString('es-DO')}</p>
        <p>Empleado: {emp.firstName} {emp.lastName}</p>
        <p>Cédula: {emp.cedula || '—'}</p>
        <p>Cargo: {emp.role}</p>
        <p>Registrado por: {payout.registeredBy}</p>
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <p className="font-bold">Conceptos:</p>
      <div className="space-y-0.5">
        {payout.concepts.map((c) => (
          <div key={c.id} className="flex justify-between">
            <span>{c.label}</span>
            <span>{c.type === 'deduccion' || (c.type === 'custom' && c.isDeduction) ? '-' : ''}{c.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Devengado</span><span>{payout.grossPay.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Deducciones</span><span>-{payout.totalDeductions.toFixed(2)}</span></div>
        <div className="flex justify-between font-bold text-sm border-t border-black mt-1 pt-1">
          <span>NETO PAGADO</span><span>{payout.netPay.toFixed(2)}</span>
        </div>
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <p className="text-[10px]">Método: {payout.method === 'efectivo_caja' ? 'Efectivo (Caja)' : payout.method === 'efectivo_directo' ? 'Efectivo Directo' : 'Transferencia'}</p>
      {payout.reference && <p className="text-[10px]">Ref: {payout.reference}</p>}
      <div className="border-t border-dashed border-black my-4" />
      <div className="text-center text-[10px]">
        <p>___________________________</p>
        <p>Firma del Empleado</p>
      </div>
      <div className="text-center text-[9px] mt-3">
        <p>{t.footerMessage}</p>
      </div>
    </div>
  );
}
