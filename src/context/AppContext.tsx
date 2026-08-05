import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import type {
  Theme, Product, CompanyConfig, SaleRecord, AuditEntry, User, NcfSequence,
  StockMovement, LoginAttempt, Session, CashSession, Customer, AccountReceivable,
  Employee, Payout, CashOutflow, Quote, CommissionEntry, Dispatch, CartItem,
} from '@/types';
import {
  seedProducts, seedUsers, seedAudit, seedConfig, seedSales, seedNcfSequences,
  seedMovements, seedLoginAttempts, seedSessions, CATEGORIES,
  seedEmployees, seedPayouts,
} from '@/data/seed';
import { formatCurrency, genId } from '@/lib/format';

interface AppContextValue {
  // collections
  products: Product[];
  users: User[];
  audit: AuditEntry[];
  sales: SaleRecord[];
  config: CompanyConfig;
  ncfSequences: NcfSequence[];
  movements: StockMovement[];
  loginAttempts: LoginAttempt[];
  sessions: Session[];
  customers: Customer[];
  receivables: AccountReceivable[];
  employees: Employee[];
  payouts: Payout[];
  cashOutflows: CashOutflow[];
  quotes: Quote[];
  dispatches: Dispatch[];
  categories: string[];
  cashSession: CashSession | null;

  // session / ui
  currentUser: User | null;
  loggedIn: boolean;
  theme: Theme;

  // setters (for modules that mutate directly)
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setConfig: React.Dispatch<React.SetStateAction<CompanyConfig>>;
  setNcfSequences: React.Dispatch<React.SetStateAction<NcfSequence[]>>;
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  setCashSession: React.Dispatch<React.SetStateAction<CashSession | null>>;
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
  setDispatches: React.Dispatch<React.SetStateAction<Dispatch[]>>;

  // actions
  addAudit: (action: string, user?: string) => void;
  registerSale: (sale: SaleRecord) => void;
  addMovement: (m: StockMovement) => void;
  adjustStock: (productId: string, newStock: number) => void;
  login: (username: string, remember: boolean) => boolean;
  logout: () => void;
  toggleTheme: () => void;
  openCash: (amount: number) => void;
  upsertCustomer: (customer: Customer) => void;
  addReceivable: (r: AccountReceivable) => void;
  payReceivable: (id: string, amount: number) => void;
  upsertEmployee: (e: Employee) => void;
  deleteEmployee: (id: string) => void;
  registerPayout: (p: Payout) => void;
  registerAdvance: (p: Payout) => void;
  logCommissions: (sale: SaleRecord) => void;
  addCashOutflow: (o: CashOutflow) => void;
  saveQuote: (q: Quote) => void;
  convertQuote: (id: string) => Quote | null;
  createDispatch: (d: Dispatch) => void;
  liquidateDispatch: (id: string, items: Dispatch['items'], sale: SaleRecord) => void;
  cancelDispatch: (id: string) => void;

  // Dispatch liquidation handoff: a preloaded cart + customer name that Sales consumes on mount.
  pendingDispatchCart: { cart: CartItem[]; customerName: string; dispatchId: string } | null;
  setPendingDispatchCart: (v: { cart: CartItem[]; customerName: string; dispatchId: string } | null) => void;

  // derived
  canSeeCost: boolean;
  isCashOpen: boolean;
  cashBalance: number;
}

const AppContext = createContext<AppContextValue | null>(null);

const nowTs = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

const seedCustomers: Customer[] = [
  { id: 'c1', name: 'Constructora Nova', phone: '809-555-110', rnc: '402-555-778', balance: 1475, createdAt: '2026-07-20 09:00:00' },
  { id: 'c2', name: 'Ferretería La Económica', phone: '809-555-220', rnc: '131-001-234', balance: 0, createdAt: '2026-07-18 09:00:00' },
  { id: 'c3', name: 'Eléctrica Don Pedro', phone: '809-555-330', rnc: '098-334-221', balance: 0, createdAt: '2026-07-15 09:00:00' },
];

const seedReceivables: AccountReceivable[] = [
  { id: 'ar1', customerId: 'c1', customerName: 'Constructora Nova', saleId: 's5', ncf: 'B01-0000087', amount: 1475, paid: 0, status: 'pendiente', date: '2026-07-20 10:00:00', dueDate: '2026-08-19 10:00:00' },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [audit, setAudit] = useState<AuditEntry[]>(seedAudit);
  const [sales, setSales] = useState<SaleRecord[]>(seedSales);
  const [config, setConfig] = useState<CompanyConfig>(seedConfig);
  const [ncfSequences, setNcfSequences] = useState<NcfSequence[]>(seedNcfSequences);
  const [movements, setMovements] = useState<StockMovement[]>(seedMovements);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>(seedLoginAttempts);
  const [sessions, setSessions] = useState<Session[]>(seedSessions);
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const [receivables, setReceivables] = useState<AccountReceivable[]>(seedReceivables);
  const [employees, setEmployees] = useState<Employee[]>(seedEmployees);
  const [payouts, setPayouts] = useState<Payout[]>(seedPayouts);
  const [cashOutflows, setCashOutflows] = useState<CashOutflow[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [pendingDispatchCart, setPendingDispatchCart] = useState<{ cart: CartItem[]; customerName: string; dispatchId: string } | null>(null);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Restore remembered session
  useEffect(() => {
    const saved = localStorage.getItem('almonte_session');
    if (saved) {
      const u = users.find((x) => x.username === saved && x.active);
      if (u) {
        setCurrentUser(u);
        setLoggedIn(true);
      }
    }
  }, []);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);

  const addAudit = useCallback((action: string, user?: string) => {
    const actor = user ?? currentUser?.username ?? config.cashier;
    setAudit((prev) => [{ id: genId('a'), user: actor, action, timestamp: nowTs() }, ...prev]);
  }, [currentUser, config.cashier]);

  const addMovement = useCallback((m: StockMovement) => {
    setMovements((prev) => [m, ...prev]);
  }, []);

  const adjustStock = useCallback((productId: string, newStock: number) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: Math.max(0, newStock) } : p)));
  }, []);

  const login = useCallback((username: string, remember: boolean) => {
    const user = users.find((u) => u?.username === username && u?.active);
    const userToUse = user ?? users.find((u) => u.active) ?? null;
    if (!userToUse) return false;
    setCurrentUser(userToUse);
    setLoggedIn(true);
    if (remember) localStorage.setItem('almonte_session', userToUse.username);
    else localStorage.removeItem('almonte_session');
    setLoginAttempts((prev) => [{ id: genId('la'), username, success: true, timestamp: nowTs(), ip: '192.168.1.15' }, ...prev]);
    setSessions((prev) => [
      // Mark all previous sessions as closed on this single-PC POS, then add the new active one
      ...prev.map((s) => ({ ...s, active: false })),
      { id: genId('ses'), user: username, loginTime: nowTs(), active: true },
    ]);
    setAudit((prev) => [{ id: genId('a'), user: username, action: 'Inicio de sesión', timestamp: nowTs() }, ...prev]);
    return true;
  }, [users]);

  const logout = useCallback(() => {
    if (currentUser) {
      setSessions((prev) => prev.map((s) => (s.active ? { ...s, active: false } : s)));
      setAudit((prev) => [{ id: genId('a'), user: currentUser.username, action: 'Cierre de sesión', timestamp: nowTs() }, ...prev]);
    }
    setLoggedIn(false);
    setCurrentUser(null);
    window.location.hash = '';
    localStorage.removeItem('almonte_session');
  }, [currentUser]);

  const openCash = useCallback((amount: number) => {
    const newSession: CashSession = {
      id: genId('cash'),
      cashier: currentUser?.username ?? config.cashier,
      openingAmount: Math.max(0, amount),
      openingTime: new Date().toISOString(),
      closed: false,
    };
    setCashSession(newSession);
    addAudit(`Apertura de caja — Fondo: ${formatCurrency(amount)}`);
  }, [config.cashier, addAudit]);

  const upsertCustomer = useCallback((customer: Customer) => {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === customer.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = customer;
        return next;
      }
      return [customer, ...prev];
    });
  }, []);

  const addReceivable = useCallback((r: AccountReceivable) => {
    setReceivables((prev) => [r, ...prev]);
    setCustomers((prev) => prev.map((c) => (c.id === r.customerId ? { ...c, balance: c.balance + (r.amount - r.paid) } : c)));
    addAudit(`Cuenta por cobrar creada — ${r.customerName} (${formatCurrency(r.amount - r.paid)})`);
  }, [addAudit]);

  const payReceivable = useCallback((id: string, amount: number) => {
    setReceivables((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const paid = r.paid + amount;
      const status = paid >= r.amount ? 'pagada' : paid > 0 ? 'parcial' : r.status;
      return { ...r, paid, status };
    }));
    setCustomers((prev) => prev.map((c) => {
      const r = receivables.find((x) => x.id === id);
      if (!r || r.customerId !== c.id) return c;
      return { ...c, balance: Math.max(0, c.balance - amount) };
    }));
    addAudit(`Pago de cuenta por cobrar — ${formatCurrency(amount)}`);
  }, [receivables, addAudit]);

  const upsertEmployee = useCallback((e: Employee) => {
    setEmployees((prev) => {
      const idx = prev.findIndex((x) => x.id === e.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = e;
        return next;
      }
      return [...prev, e];
    });
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    addAudit(`Empleado eliminado`);
  }, [addAudit]);

  const addCashOutflow = useCallback((o: CashOutflow) => {
    setCashOutflows((prev) => [o, ...prev]);
  }, []);

  const logCommissions = useCallback((sale: SaleRecord) => {
    sale.items.forEach((it) => {
      if (!it.isService || !it.assignedEmployeeId || !it.commissionAmount || it.commissionAmount <= 0) return;
      const entry: CommissionEntry = {
        id: genId('com'),
        saleId: sale.id,
        serviceName: it.name,
        amount: it.commissionAmount,
        date: sale.date,
        paid: false,
      };
      setEmployees((prev) => prev.map((e) => {
        if (e.id !== it.assignedEmployeeId) return e;
        return { ...e, pendingCommissions: [...(e.pendingCommissions ?? []), entry] };
      }));
      addAudit(`Comisión registrada — ${formatCurrency(it.commissionAmount)}`, sale.cashier);
    });
  }, [addAudit]);

  // Central sale registration: records sale, decrements stock, logs movements, logs commissions.
  const registerSale = useCallback((sale: SaleRecord) => {
    setSales((prev) => [sale, ...prev]);
    // Decrement stock + movements for each line (skip services)
    if (!sale.skipStockDecrement) {
      setProducts((prevProducts) => {
        return prevProducts.map((p) => {
          const line = sale.items.find((i) => i.name === p.name);
          if (!line) return p;
          return { ...p, stock: Math.max(0, p.stock - line.qty) };
        });
      });
      sale.items.forEach((it) => {
        const prod = products.find((p) => p.name === it.name);
        if (!prod) return;
        addMovement({
        id: genId('m'),
        productId: prod.id,
        productName: prod.name,
        type: 'venta',
        qty: it.qty,
        reason: `Venta ${sale.ncf}`,
        user: sale.cashier,
        timestamp: nowTs(),
      });
      });
    }
    logCommissions(sale);
    addAudit(`Venta registrada — NCF ${sale.ncf}`, sale.cashier);
  }, [products, addMovement, addAudit, logCommissions]);

  const saveQuote = useCallback((q: Quote) => {
    setQuotes((prev) => [q, ...prev]);
    addAudit(`Cotización emitida — ${q.number}`, q.cashier);
  }, [addAudit]);

  const quotesRef = useRef<Quote[]>([]);
  quotesRef.current = quotes;

  const convertQuote = useCallback((id: string): Quote | null => {
    const q = quotesRef.current.find((x) => x.id === id);
    if (!q) return null;
    const updated = { ...q, status: 'convertida' as const };
    setQuotes((prev) => prev.map((x) => (x.id === id ? updated : x)));
    addAudit(`Cotización convertida a venta — ${q.number}`);
    return updated;
  }, [addAudit]);

  // Create a dispatch: deduct items from inventory and record stock movements.
  const createDispatch = useCallback((d: Dispatch) => {
    setDispatches((prev) => [d, ...prev]);
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const line = d.items.find((i) => i.productId === p.id);
        if (!line) return p;
        return { ...p, stock: Math.max(0, p.stock - line.dispatchedQty) };
      }),
    );
    d.items.forEach((it) => {
      addMovement({
        id: genId('m'),
        productId: it.productId,
        productName: it.productName,
        type: 'salida',
        qty: it.dispatchedQty,
        reason: `Despacho ${d.code}`,
        user: d.cashier,
        timestamp: nowTs(),
      });
    });
    addAudit(`Despacho creado — ${d.code} (${d.employeeName})`, d.cashier);
  }, [addMovement, addAudit]);

  // Liquidate a dispatch: restore returned quantities to inventory, register a sale
  // for used quantities (without re-decrementing stock, since it was deducted at dispatch).
  const liquidateDispatch = useCallback((id: string, items: Dispatch['items'], sale: SaleRecord) => {
    const saleWithFlag: SaleRecord = { ...sale, skipStockDecrement: true };
    setSales((prev) => [saleWithFlag, ...prev]);
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const line = items.find((i) => i.productId === p.id);
        if (!line) return p;
        return { ...p, stock: p.stock + line.returnedQty };
      }),
    );
    items.forEach((it) => {
      if (it.returnedQty > 0) {
        addMovement({
          id: genId('m'),
          productId: it.productId,
          productName: it.productName,
          type: 'entrada',
          qty: it.returnedQty,
          reason: `Devolución despacho ${id}`,
          user: sale.cashier,
          timestamp: nowTs(),
        });
      }
    });
    setDispatches((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'liquidado', items, liquidatedAt: nowTs(), liquidatedSaleId: sale.id } : d)));
    addAudit(`Despacho liquidado — ${id} (Venta ${sale.ncf})`, sale.cashier);
  }, [addMovement, addAudit]);

  // Cancel a dispatch: restore all dispatched quantities to inventory.
  const cancelDispatch = useCallback((id: string) => {
    setDispatches((prev) => {
      const d = prev.find((x) => x.id === id);
      if (!d) return prev;
      setProducts((prevProducts) =>
        prevProducts.map((p) => {
          const line = d.items.find((i) => i.productId === p.id);
          if (!line) return p;
          return { ...p, stock: p.stock + line.dispatchedQty };
        }),
      );
      d.items.forEach((it) => {
        addMovement({
          id: genId('m'),
          productId: it.productId,
          productName: it.productName,
          type: 'entrada',
          qty: it.dispatchedQty,
          reason: `Cancelación despacho ${d.code}`,
          user: d.cashier,
          timestamp: nowTs(),
        });
      });
      addAudit(`Despacho cancelado — ${d.code}`, d.cashier);
      return prev.map((x) => (x.id === id ? { ...x, status: 'cancelado' as const } : x));
    });
  }, [addMovement, addAudit]);

  const registerAdvance = useCallback((p: Payout) => {
    setPayouts((prev) => [p, ...prev]);
    setEmployees((prev) => prev.map((e) => {
      if (e.id !== p.employeeId) return e;
      return { ...e, pendingAdvanceDeduction: (e.pendingAdvanceDeduction ?? 0) + p.netPay };
    }));
    if (p.method === 'efectivo_caja') {
      addCashOutflow({
        id: genId('out'),
        date: p.date,
        category: 'Adelanto',
        description: `Adelanto / Vale — ${p.employeeName}`,
        amount: p.netPay,
        registeredBy: p.registeredBy,
        source: 'nomina',
      });
    }
    addAudit(`Adelanto registrado — ${p.employeeName} (${formatCurrency(p.netPay)})`, p.registeredBy);
  }, [addCashOutflow, addAudit]);

  const registerPayout = useCallback((p: Payout) => {
    setPayouts((prev) => [p, ...prev]);
    const hasBaseSalary = p.concepts.some((c) => c.type === 'sueldo_base' && c.amount > 0);
    const hasCommissions = p.concepts.some((c) => c.type === 'comision' && c.amount > 0);
    setEmployees((prev) => prev.map((e) => {
      if (e.id !== p.employeeId) return e;
      const updates: Partial<Employee> = {};
      // Only base salary payments update the payroll period status
      if (hasBaseSalary) {
        const paidDate = p.date.slice(0, 10);
        const d = new Date(paidDate);
        switch (e.frequency) {
          case 'semanal': d.setDate(d.getDate() + 7); break;
          case 'quincenal': d.setDate(d.getDate() + 15); break;
          case 'mensual': d.setMonth(d.getMonth() + 1); break;
        }
        updates.lastPaidDate = paidDate;
        updates.nextDueDate = d.toISOString().slice(0, 10);
        // Clear pending advance deduction after a base salary payout
        if ((e.pendingAdvanceDeduction ?? 0) > 0) {
          updates.pendingAdvanceDeduction = 0;
        }
      }
      // Mark pending commissions as paid if included in this payout
      if (hasCommissions && e.pendingCommissions && e.pendingCommissions.length > 0) {
        updates.pendingCommissions = e.pendingCommissions.map((c) => ({ ...c, paid: true }));
      }
      return { ...e, ...updates };
    }));
    // Only efectivo_caja deducts from the cash register
    if (p.method === 'efectivo_caja') {
      addCashOutflow({
        id: genId('out'),
        date: p.date,
        category: p.kind === 'adelanto' ? 'Adelanto' : 'Nómina',
        description: `${p.kind === 'adelanto' ? 'Adelanto / Vale' : 'Pago de nómina'} — ${p.employeeName}`,
        amount: p.netPay,
        registeredBy: p.registeredBy,
        source: 'nomina',
      });
    }
    addAudit(`${p.kind === 'adelanto' ? 'Adelanto' : 'Pago de nómina'} registrado — ${p.employeeName} (${formatCurrency(p.netPay)})`, p.registeredBy);
  }, [addCashOutflow, addAudit]);

  const canSeeCost = currentUser?.permissions?.ver_costo ?? false;
  const isCashOpen = !!(cashSession && !cashSession.closed);

  const cashBalance = useMemo(() => {
    if (!cashSession || cashSession.closed) return 0;
    const sessionStart = new Date(cashSession.openingTime).getTime();
    const sessionSales = sales.filter((s) => new Date(s.date).getTime() >= sessionStart);
    const cashSalesTotal = sessionSales
      .filter((s) => s.paymentMethod === 'efectivo')
      .reduce((sum, s) => sum + (s.total ?? 0), 0);
    const mixedCashTotal = sessionSales
      .filter((s) => s.paymentMethod === 'mixto' && s.mixed)
      .reduce((sum, s) => sum + (s.mixed?.efectivo ?? 0), 0);
    const sessionOutflows = cashOutflows
      .filter((o) => new Date(o.date).getTime() >= sessionStart)
      .reduce((sum, o) => sum + o.amount, 0);
    return (cashSession.openingAmount ?? 0) + cashSalesTotal + mixedCashTotal - sessionOutflows;
  }, [cashSession, sales, cashOutflows]);

  const value: AppContextValue = {
    products, users, audit, sales, config, ncfSequences, movements, loginAttempts,
    sessions, customers, receivables, employees, payouts, cashOutflows, quotes, dispatches, categories, cashSession,
    currentUser, loggedIn, theme,
    setProducts, setUsers, setConfig, setNcfSequences, setCategories, setCashSession, setEmployees, setQuotes, setDispatches,
    addAudit, registerSale, addMovement, adjustStock, login, logout, toggleTheme,
    openCash, upsertCustomer, addReceivable, payReceivable,
    upsertEmployee, deleteEmployee, registerPayout, registerAdvance, logCommissions, addCashOutflow,
    saveQuote, convertQuote, createDispatch, liquidateDispatch, cancelDispatch,
    pendingDispatchCart, setPendingDispatchCart,
    canSeeCost, isCashOpen, cashBalance,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
