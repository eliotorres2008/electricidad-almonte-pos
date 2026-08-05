import { useState, useMemo } from 'react';
import {
  Users, UserPlus, Search, Wallet, TrendingUp, CalendarClock, CheckCircle2,
  AlertTriangle, X, Trash2, CircleUser as UserCircle,
  History, DollarSign, Phone, Mail, MapPin, CreditCard, Printer, Coins,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modal';
import { NumberField } from '@/components/NumberField';
import { PayrollModal, PayoutReceipt } from '@/components/PayrollModal';
import { formatCurrency, genId, capitalizeName } from '@/lib/format';
import { STANDARD_ROLES } from '@/data/seed';
import type {
  Employee, Payout, PayFrequency, PayoutStatus, PayoutKind,
} from '@/types';

type HistoryRange = 'mes' | '3meses' | 'anio' | 'todos';

type GlobalRange = 'este_mes' | '3meses' | 'anio' | 'todos';

const RANGE_LABELS: Record<HistoryRange, string> = {
  mes: 'Último Mes', '3meses': 'Últimos 3 Meses', anio: 'Año Actual', todos: 'Todos',
};

const GLOBAL_RANGE_LABELS: Record<GlobalRange, string> = {
  este_mes: 'Este Mes', '3meses': 'Últimos 3 Meses', anio: 'Año Actual', todos: 'Todos los Tiempos',
};

const GLOBAL_RANGE_KPI_LABELS: Record<GlobalRange, string> = {
  este_mes: 'Pagado (Este Mes)', '3meses': 'Pagado (Últimos 3 Meses)', anio: 'Pagado (Año Actual)', todos: 'Pagado (Todos los Tiempos)',
};

const FREQUENCY_LABELS: Record<PayFrequency, string> = {
  semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual',
};

function payoutStatus(emp: Employee): PayoutStatus {
  // CHECK PAYMENT HISTORY FIRST — no history means primer pago pending, regardless of nextDueDate
  if (!emp.lastPaidDate) return 'sin_pago';
  if (!emp.nextDueDate) return 'sin_pago';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(emp.nextDueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'vencido';
  if (diffDays === 0) return 'vence_hoy';
  return 'al_dia';
}

const STATUS_META: Record<PayoutStatus, { label: string; chip: string; dot: string }> = {
  al_dia: { label: 'Al Día', chip: 'bg-green-500/15 text-green-500', dot: 'bg-green-500' },
  pendiente: { label: 'Pago Pendiente', chip: 'bg-amber-500/15 text-amber-500', dot: 'bg-amber-500' },
  vence_hoy: { label: 'Vence Hoy', chip: 'bg-orange-500/15 text-orange-500', dot: 'bg-orange-500' },
  vencido: { label: 'Pago Vencido', chip: 'bg-red-500/15 text-red-500', dot: 'bg-red-500' },
  sin_pago: { label: 'Pendiente de Primer Pago', chip: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', dot: 'bg-blue-500' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function filterPayoutsByRange(payouts: Payout[], range: HistoryRange): Payout[] {
  const today = new Date();
  if (range === 'todos') return payouts.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const start = new Date(today);
  if (range === 'mes') start.setDate(today.getDate() - 30);
  if (range === '3meses') start.setDate(today.getDate() - 90);
  if (range === 'anio') { start.setMonth(0, 1); start.setFullYear(today.getFullYear()); }
  return payouts
    .filter((p) => {
      const pd = new Date(p.date);
      return pd >= start && pd <= today;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function filterPayoutsByGlobalRange(payouts: Payout[], range: GlobalRange): Payout[] {
  if (range === 'todos') return payouts;
  const today = new Date();
  const start = new Date(today);
  if (range === 'este_mes') { start.setDate(today.getDate() - 30); }
  if (range === '3meses') { start.setDate(today.getDate() - 90); }
  if (range === 'anio') { start.setMonth(0, 1); start.setFullYear(today.getFullYear()); }
  return payouts.filter((p) => {
    const pd = new Date(p.date);
    return pd >= start && pd <= today;
  });
}

export function Payroll() {
  const app = useApp();
  const { employees, payouts, currentUser, isCashOpen, config } = app;

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [profileEmp, setProfileEmp] = useState<Employee | null>(null);
  const [payoutEmp, setPayoutEmp] = useState<Employee | null>(null);
  const [payoutKind, setPayoutKind] = useState<PayoutKind>('pago');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [printPayout, setPrintPayout] = useState<{ payout: Payout; emp: Employee } | null>(null);
  const [globalRange, setGlobalRange] = useState<GlobalRange>('este_mes');

  const allRoles = useMemo(() => {
    const set = new Set<string>(STANDARD_ROLES);
    employees.forEach((e) => set.add(e.role));
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees
      .filter((e) => (showInactive ? true : e.active))
      .filter((e) => (roleFilter === 'all' ? true : e.role === roleFilter))
      .filter((e) => (statusFilter === 'all' ? true : payoutStatus(e) === statusFilter))
      .filter((e) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q)
        );
      });
  }, [employees, showInactive, roleFilter, statusFilter, search]);

  const kpis = useMemo(() => {
    const active = employees.filter((e) => e.active);
    const totalPayroll = active.reduce((s, e) => s + e.baseSalary, 0);
    const statuses = active.map(payoutStatus);
    const pending = statuses.filter((s) => s === 'sin_pago' || s === 'vence_hoy' || s === 'vencido').length;
    const periodPayouts = filterPayoutsByGlobalRange(payouts, globalRange);
    const periodTotal = periodPayouts.reduce((s, p) => s + p.netPay, 0);
    return { count: active.length, totalPayroll, pending, periodTotal };
  }, [employees, payouts, globalRange]);

  const openPayout = (emp: Employee, kind: PayoutKind) => {
    setPayoutEmp(emp);
    setPayoutKind(kind);
    setProfileEmp(null);
  };

  const confirmPayout = (p: Payout) => {
    if (p.kind === 'adelanto') {
      app.registerAdvance(p);
    } else {
      app.registerPayout(p);
    }
    setPayoutEmp(null);
  };

  return (
    <div className="space-y-4">
      {/* Global time range selector */}
      <div className="flex items-center gap-2">
        <CalendarClock size={16} className="text-neutral-400" />
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl p-1">
          {(Object.keys(GLOBAL_RANGE_LABELS) as GlobalRange[]).map((r) => (
            <button key={r} onClick={() => setGlobalRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${globalRange === r ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
              {GLOBAL_RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<Users size={20} />} label="Empleados Activos" value={String(kpis.count)} color="blue" />
        <Kpi icon={<DollarSign size={20} />} label="Nómina Mensual" value={formatCurrency(kpis.totalPayroll)} color="brand" />
        <Kpi icon={<TrendingUp size={20} />} label={GLOBAL_RANGE_KPI_LABELS[globalRange]} value={formatCurrency(kpis.periodTotal)} color="green" />
        <Kpi icon={<AlertTriangle size={20} />} label="Pagos Pendientes" value={String(kpis.pending)} color="red" />
      </div>

      {/* Toolbar */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, rol o código…"
            className="input pl-9"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input min-w-[130px] max-w-[180px]">
          <option value="all">Todos los roles</option>
          {allRoles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input min-w-[150px] max-w-[180px]">
          <option value="all">Todos los estados</option>
          <option value="al_dia">Al Día</option>
          <option value="pendiente">Pendiente</option>
          <option value="vence_hoy">Vence Hoy</option>
          <option value="vencido">Vencido</option>
          <option value="sin_pago">Pendiente de Primer Pago</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
          Inactivos
        </label>
        <button onClick={() => setShowAdd(true)} className="btn-primary ml-auto"><UserPlus size={18} /> Nuevo Empleado</button>
      </div>

      {/* Employee list */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <th className="px-4 py-3 text-left font-semibold">Empleado</th>
                <th className="px-4 py-3 text-left font-semibold">Rol</th>
                <th className="px-4 py-3 text-left font-semibold">Frecuencia</th>
                <th className="px-4 py-3 text-right font-semibold">Salario Base</th>
                <th className="px-4 py-3 text-center font-semibold">Último Pago</th>
                <th className="px-4 py-3 text-center font-semibold">Próximo Pago</th>
                <th className="px-4 py-3 text-center font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-neutral-400">No se encontraron empleados</td></tr>
              ) : filtered.map((e) => {
                const st = payoutStatus(e);
                const meta = STATUS_META[st];
                const pendingComm = (e.pendingCommissions ?? []).filter((c) => !c.paid).length;
                return (
                  <tr key={e.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition cursor-pointer" onClick={() => setProfileEmp(e)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-500/15 text-brand-500 flex items-center justify-center font-bold text-sm shrink-0">
                          {capitalizeName(e.firstName[0])}{capitalizeName(e.lastName[0])}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">{capitalizeName(e.firstName)} {capitalizeName(e.lastName)}</p>
                          <p className="text-xs text-neutral-400 whitespace-nowrap">{e.code}{e.cedula ? ` · ${e.cedula}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="chip bg-blue-500/10 text-blue-600 dark:text-blue-400">{e.role}</span>
                      {!e.active && <span className="chip bg-neutral-400/15 text-neutral-400 ml-1">Inactivo</span>}
                      {pendingComm > 0 && <span className="chip bg-green-500/15 text-green-500 ml-1" title="Comisiones pendientes">{pendingComm} com.</span>}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{FREQUENCY_LABELS[e.frequency]}</td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-800 dark:text-neutral-100 tabular-nums">{formatCurrency(e.baseSalary)}</td>
                    <td className="px-4 py-3 text-center text-neutral-500 dark:text-neutral-400 tabular-nums">{formatDate(e.lastPaidDate)}</td>
                    <td className="px-4 py-3 text-center text-neutral-500 dark:text-neutral-400 tabular-nums">{formatDate(e.nextDueDate)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`chip ${meta.chip}`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot} mr-1.5`} />{meta.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                      <button
                        onClick={() => openPayout(e, 'pago')}
                        disabled={!e.active}
                        className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                      ><Wallet size={14} /> Pagar</button>
                      <button onClick={() => setProfileEmp(e)} className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-brand-500/10 transition" title="Ver perfil"><ChevronRight size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Drawer */}
      {profileEmp && (
        <ProfileDrawer
          emp={profileEmp}
          onClose={() => setProfileEmp(null)}
          onEdit={() => { setEditEmp(profileEmp); setProfileEmp(null); }}
          onPay={() => openPayout(profileEmp, 'pago')}
          onAdvance={() => openPayout(profileEmp, 'adelanto')}
          onPrint={(payout) => setPrintPayout({ payout, emp: profileEmp })}
        />
      )}

      {/* Payout Modal */}
      {payoutEmp && (
        <PayrollModal
          emp={payoutEmp}
          isCashOpen={isCashOpen}
          kind={payoutKind}
          pendingCommissions={payoutEmp.pendingCommissions}
          onClose={() => setPayoutEmp(null)}
          onConfirm={confirmPayout}
          registeredBy={currentUser?.name ?? currentUser?.username ?? 'admin'}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal
          open
          onClose={() => setDeleteTarget(null)}
          title="Eliminar Empleado"
          subtitle={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          size="sm"
          footer={
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={() => { app.deleteEmployee(deleteTarget.id); setDeleteTarget(null); }} className="btn-primary flex-1 !bg-red-500 !text-white">
                <Trash2 size={18} /> Eliminar
              </button>
            </div>
          }
        >
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <AlertTriangle size={20} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
              ¿Seguro que desea eliminar este empleado? Se perderán todos los registros históricos. Considere inactivarlo en su lugar.
            </p>
          </div>
        </Modal>
      )}

      {/* Print Receipt */}
      {printPayout && (
        <Modal
          open
          onClose={() => setPrintPayout(null)}
          title="Recibo de Pago"
          subtitle="Vista previa del recibo térmico"
          size="sm"
          footer={
            <div className="flex gap-3">
              <button onClick={() => setPrintPayout(null)} className="btn-ghost flex-1">Cerrar</button>
              <button onClick={() => window.print()} className="btn-primary flex-1"><Printer size={18} /> Imprimir</button>
            </div>
          }
        >
          <PayoutReceipt payout={printPayout.payout} emp={printPayout.emp} config={config} />
        </Modal>
      )}

      {/* Add/Edit Modal */}
      {(showAdd || editEmp) && (
        <EmployeeFormModal
          emp={editEmp}
          roles={allRoles}
          employees={employees}
          onClose={() => { setShowAdd(false); setEditEmp(null); }}
          onSave={(e) => { const isNew = !employees.some((x) => x.id === e.id); app.upsertEmployee(e); if (isNew) app.addAudit(`Nuevo empleado registrado — ${capitalizeName(e.firstName)} ${capitalizeName(e.lastName)}`); setShowAdd(false); setEditEmp(null); }}
          onDelete={editEmp ? () => { setDeleteTarget(editEmp); setEditEmp(null); } : undefined}
        />
      )}
    </div>
  );
}

// ===== Profile Drawer =====

function ProfileDrawer({ emp, onClose, onEdit, onPay, onAdvance, onPrint }: {
  emp: Employee;
  onClose: () => void;
  onEdit: () => void;
  onPay: () => void;
  onAdvance: () => void;
  onPrint: (payout: Payout) => void;
}) {
  const { payouts } = useApp();
  const [range, setRange] = useState<HistoryRange>('3meses');

  const empPayouts = useMemo(() => filterPayoutsByRange(
    payouts.filter((p) => p.employeeId === emp.id), range,
  ), [payouts, emp.id, range]);

  const totalPaid = empPayouts.reduce((s, p) => s + p.netPay, 0);
  const st = payoutStatus(emp);
  const meta = STATUS_META[st];
  const fullName = `${emp.firstName} ${emp.lastName}`;
  const pendingComm = (emp.pendingCommissions ?? []).filter((c) => !c.paid);

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 shadow-2xl h-full overflow-hidden animate-slide-in-right flex flex-col">
        {/* Header — pinned */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-700/50 bg-gradient-to-br from-brand-500/10 to-transparent shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/15 text-brand-500 flex items-center justify-center font-bold text-xl">
                {capitalizeName(emp.firstName[0])}{capitalizeName(emp.lastName[0])}
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{fullName}</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{emp.code} · {emp.role}</p>
                <span className={`chip mt-1.5 ${meta.chip}`}><span className={`w-1.5 h-1.5 rounded-full ${meta.dot} mr-1.5`} />{meta.label}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700/60 text-neutral-500 transition"><X size={20} /></button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          {/* Pending commissions */}
          {pendingComm.length > 0 && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Coins size={16} className="text-green-500" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-green-600 dark:text-green-400">Comisiones Pendientes</h3>
              </div>
              {pendingComm.map((c) => (
                <div key={c.id} className="flex justify-between text-sm py-1">
                  <span className="text-neutral-600 dark:text-neutral-300 truncate">{c.serviceName}</span>
                  <span className="font-semibold text-green-500 tabular-nums shrink-0">{formatCurrency(c.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1.5 mt-1 border-t border-green-500/20">
                <span className="text-sm font-bold text-green-600 dark:text-green-400">Total Pendiente</span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(pendingComm.reduce((s, c) => s + c.amount, 0))}</span>
              </div>
            </div>
          )}

          {/* Pending advance deduction */}
          {emp.pendingAdvanceDeduction && emp.pendingAdvanceDeduction > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm font-semibold">
              <AlertTriangle size={16} /> Adelantos pendientes: {formatCurrency(emp.pendingAdvanceDeduction)}
            </div>
          )}

          {/* Personal info */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">Información Personal</h3>
            <div className="space-y-2.5">
              <InfoRow icon={<CreditCard size={15} />} label="Cédula" value={emp.cedula || '—'} />
              <InfoRow icon={<Phone size={15} />} label="Teléfono" value={emp.phone} />
              <InfoRow icon={<Mail size={15} />} label="Email" value={emp.email || '—'} />
              <InfoRow icon={<MapPin size={15} />} label="Dirección" value={emp.address || '—'} />
              <InfoRow icon={<CalendarClock size={15} />} label="Ingreso" value={formatDate(emp.hireDate)} />
            </div>
          </section>

          {/* Employment info */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-3">Información Laboral</h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard label="Salario Base" value={formatCurrency(emp.baseSalary)} />
              <InfoCard label="Frecuencia" value={FREQUENCY_LABELS[emp.frequency]} />
              <InfoCard label="Último Pago" value={formatDate(emp.lastPaidDate)} />
              <InfoCard label="Próximo Pago" value={formatDate(emp.nextDueDate)} />
            </div>
          </section>

          {/* Payment history */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <History size={16} className="text-brand-500" />
              <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-400">Historial de Pagos</h3>
              <div className="flex gap-1 ml-auto bg-neutral-100 dark:bg-neutral-800/60 rounded-lg p-0.5">
                {(Object.keys(RANGE_LABELS) as HistoryRange[]).map((r) => (
                  <button key={r} onClick={() => setRange(r)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition ${range === r ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
                    {RANGE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-brand-500/10 border border-brand-500/30 p-3 mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">Total Pagado ({RANGE_LABELS[range]})</span>
              <span className="text-lg font-extrabold text-brand-500 tabular-nums">{formatCurrency(totalPaid)}</span>
            </div>
            {empPayouts.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">Sin pagos en este período</p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {empPayouts.map((p) => (
                  <div key={p.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700/40 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{formatDate(p.date)}</span>
                        {p.kind === 'adelanto' && <span className="chip text-[10px] bg-amber-500/15 text-amber-500">Adelanto</span>}
                      </div>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(p.netPay)}</span>
                    </div>
                    {/* Concept breakdown */}
                    <div className="mt-1.5 space-y-0.5">
                      {p.concepts.map((c) => (
                        <div key={c.id} className="flex justify-between text-[11px] text-neutral-400">
                          <span>{c.label}</span>
                          <span className={c.type === 'deduccion' || (c.type === 'custom' && c.isDeduction) ? 'text-red-400' : ''}>
                            {c.type === 'deduccion' || (c.type === 'custom' && c.isDeduction) ? '-' : ''}{formatCurrency(c.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`chip text-[10px] ${p.method === 'efectivo_caja' ? 'bg-green-500/15 text-green-500' : p.method === 'efectivo_directo' ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/15 text-blue-500'}`}>
                        {p.method === 'efectivo_caja' ? 'Caja' : p.method === 'efectivo_directo' ? 'Directo' : 'Transfer.'}
                      </span>
                      {p.reference && <span className="text-[10px] text-neutral-400 font-mono">Ref: {p.reference}</span>}
                      <button onClick={() => onPrint(p)} className="ml-auto p-1 rounded-md text-neutral-400 hover:text-brand-500 hover:bg-brand-500/10 transition" title="Imprimir recibo">
                        <Printer size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer — pinned */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700/50 flex gap-2 shrink-0">
          <button onClick={onEdit} className="btn-ghost flex-1"><UserCircle size={18} /> Editar</button>
          <button onClick={onAdvance} disabled={!emp.active} className="btn-ghost flex-1 !text-amber-500 disabled:opacity-40"><Coins size={18} /> Adelanto</button>
          <button onClick={onPay} disabled={!emp.active} className="btn-primary flex-1 disabled:opacity-40"><Wallet size={18} /> Pagar</button>
        </div>
      </div>
    </div>
  );
}

// ===== Employee Form Modal =====

function EmployeeFormModal({ emp, roles, employees, onClose, onSave, onDelete }: {
  emp: Employee | null;
  roles: string[];
  employees: Employee[];
  onClose: () => void;
  onSave: (e: Employee) => void;
  onDelete?: () => void;
}) {
  function calcInitialDueDate(hireDate: string, frequency: PayFrequency): string | null {
    if (!hireDate) return null;
    const d = new Date(hireDate);
    switch (frequency) {
      case 'semanal': d.setDate(d.getDate() + 7); break;
      case 'quincenal': d.setDate(d.getDate() + 15); break;
      case 'mensual': d.setMonth(d.getMonth() + 1); break;
    }
    return d.toISOString().slice(0, 10);
  }

  function formatCedula(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
  }

  function nextEmpCode(allEmps: Employee[]): string {
    const nums = allEmps
      .map((e) => parseInt(e.code.replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `EMP-${String(max + 1).padStart(3, '0')}`;
  }

  const blank: Employee = {
    id: genId('emp'), code: nextEmpCode(employees), firstName: '', lastName: '', role: roles[0] ?? 'Vendedor',
    phone: '', email: '', address: '', cedula: '', hireDate: new Date().toISOString().slice(0, 10),
    active: true, baseSalary: 0, frequency: 'semanal', lastPaidDate: null,
    nextDueDate: calcInitialDueDate(new Date().toISOString().slice(0, 10), 'semanal'),
  };
  const [form, setForm] = useState<Employee>(emp ?? blank);
  const [roleMode, setRoleMode] = useState<'select' | 'custom'>(roles.includes(form.role) ? 'select' : 'custom');
  const [customRole, setCustomRole] = useState(roles.includes(form.role) ? '' : form.role);
  const [error, setError] = useState('');

  const updateForm = (patch: Partial<Employee>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      // Auto-calc initial due date when hireDate or frequency changes (only for new employees without payment history)
      if (!emp && !next.lastPaidDate && (patch.hireDate || patch.frequency)) {
        next.nextDueDate = calcInitialDueDate(next.hireDate, next.frequency);
      }
      return next;
    });
  };

  const submit = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('Nombre y apellido son obligatorios.'); return; }
    const finalRole = roleMode === 'custom' ? customRole.trim() : form.role;
    if (!finalRole) { setError('El rol es obligatorio.'); return; }
    onSave({ ...form, cedula: form.cedula.trim(), role: finalRole });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={emp ? 'Editar Empleado' : 'Nuevo Empleado'}
      subtitle="Información personal, laboral y de pago"
      size="lg"
      footer={
        <div className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-semibold">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          <div className="flex gap-3">
            {onDelete && emp && (
              <button onClick={() => onDelete()} className="btn-ghost !text-red-500"><Trash2 size={18} /></button>
            )}
            <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
            <button onClick={submit} className="btn-primary flex-1"><CheckCircle2 size={18} /> Guardar</button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre"><input value={form.firstName} onChange={(e) => updateForm({ firstName: e.target.value })} className="input" /></Field>
          <Field label="Apellido"><input value={form.lastName} onChange={(e) => updateForm({ lastName: e.target.value })} className="input" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cédula (Opcional)"><input value={form.cedula} onChange={(e) => updateForm({ cedula: formatCedula(e.target.value) })} className="input" placeholder="000-0000000-0" /></Field>
          <Field label="Teléfono"><input value={form.phone} onChange={(e) => updateForm({ phone: e.target.value })} className="input" placeholder="809-555-0000" /></Field>
        </div>
        <Field label="Email"><input value={form.email} onChange={(e) => updateForm({ email: e.target.value })} className="input" /></Field>
        <Field label="Dirección"><input value={form.address} onChange={(e) => updateForm({ address: e.target.value })} className="input" /></Field>

        {/* Dynamic role selector */}
        <div>
          <label className="label">Rol / Cargo</label>
          <div className="flex gap-1 mb-2">
            <button onClick={() => setRoleMode('select')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${roleMode === 'select' ? 'bg-brand-500 text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-500'}`}>Rol Estándar</button>
            <button onClick={() => setRoleMode('custom')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${roleMode === 'custom' ? 'bg-brand-500 text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800/60 text-neutral-500'}`}>Rol Personalizado</button>
          </div>
          {roleMode === 'select' ? (
            <select value={form.role} onChange={(e) => updateForm({ role: e.target.value })} className="input">
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          ) : (
            <input
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              placeholder="Ej: Cablista, Medidor, Electricista Senior…"
              className="input"
              list="role-suggestions"
            />
          )}
          <datalist id="role-suggestions">
            {STANDARD_ROLES.map((r) => <option key={r} value={r} />)}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Salario Base (RD$)">
            <NumberField value={form.baseSalary} onChange={(v) => updateForm({ baseSalary: v })} min={0} prefix="RD$" />
          </Field>
          <Field label="Frecuencia de Pago">
            <select value={form.frequency} onChange={(e) => updateForm({ frequency: e.target.value as PayFrequency })} className="input">
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha de Ingreso"><input type="date" value={form.hireDate} onChange={(e) => updateForm({ hireDate: e.target.value })} className="input" /></Field>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer pb-2">
              <input type="checkbox" checked={form.active} onChange={(e) => updateForm({ active: e.target.checked })} className="w-4 h-4 rounded accent-brand-500" /> {form.active ? 'Activo' : 'Inactivo'}
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ===== Small UI helpers =====

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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <span className="text-neutral-400 shrink-0">{icon}</span>
      <span className="text-neutral-500 dark:text-neutral-400 min-w-[70px]">{label}</span>
      <span className="font-semibold text-neutral-800 dark:text-neutral-100 text-right ml-auto">{value}</span>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40 p-3">
      <p className="text-xs text-neutral-400 font-semibold">{label}</p>
      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 mt-0.5">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
