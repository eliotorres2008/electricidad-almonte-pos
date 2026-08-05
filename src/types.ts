export type Theme = 'dark' | 'light';

export type NcfType = 'B02' | 'B01' | 'B14' | 'B15' | 'B04';

export type UnitType = 'Unidad' | 'Metro' | 'Pies' | 'Yardas' | 'Libras' | 'Rollos' | 'Caja' | 'Kilo';

export const UNITS: UnitType[] = ['Unidad', 'Metro', 'Pies', 'Yardas', 'Libras', 'Rollos', 'Caja', 'Kilo'];

// Length/weight units that use proportional pricing from a base "Rollos" or bulk unit
export const MEASURE_UNITS: UnitType[] = ['Metro', 'Pies', 'Yardas', 'Libras', 'Rollos', 'Kilo'];

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'credito' | 'mixto';

export type StockState = 'ok' | 'bajo' | 'critico' | 'agotado';

export interface Product {
  id: string;
  code: string;
  barcode: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  unit: UnitType;
  location: string;
  baseUnit?: UnitType; // e.g. Rollos for cable
  baseUnitFactor?: number; // how many base units per base (e.g. 100 metros per rollo)
}

export interface CartItem {
  product: Product;
  qty: number;
  unit: UnitType;
  // Service / labor line items (quote mode + custom services)
  isService?: boolean;
  serviceTitle?: string;
  servicePrice?: number;
  assignedEmployeeId?: string;
  commissionAmount?: number;
}

export interface MixedPayment {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
}

export interface SaleItem {
  name: string;
  qty: number;
  price: number;
  unit: string;
  isService?: boolean;
  assignedEmployeeId?: string;
  commissionAmount?: number;
}

export interface SaleRecord {
  id: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  itbis: number;
  total: number;
  ncf: string;
  ncfType: NcfType;
  customerDoc: string;
  customerName: string;
  cashier: string;
  paymentMethod: PaymentMethod;
  mixed?: MixedPayment;
  cashReceived?: number;
  skipStockDecrement?: boolean; // true when stock was already deducted (e.g. dispatch liquidation)
}

export type Role = 'Administrador' | 'Cajero' | 'Almacenista' | 'Supervisor' | 'Cajero Turno Mañana';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
  permissions: Record<string, boolean>;
  maxDiscount: number;
}

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface LoginAttempt {
  id: string;
  username: string;
  success: boolean;
  timestamp: string;
  ip: string;
}

export interface Session {
  id: string;
  user: string;
  loginTime: string;
  active: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'entrada' | 'salida' | 'venta' | 'ajuste';
  qty: number;
  reason: string;
  user: string;
  timestamp: string;
}

export interface CompanyConfig {
  // Fiscal / empresa
  rnc: string;
  razonSocial: string;
  nombreComercial: string;
  branch: string;
  phone: string;
  email: string;
  address: string;
  provincia: string;
  // Impuestos
  itbisRate: number;
  itbisIncluded: boolean;
  retencionItbis: boolean;
  retencionIsr: boolean;
  retencionItbisRate: number;
  retencionIsrRate: number;
  // Caja
  cashier: string;
  representanteLegal: string;
  printer: '80mm' | '58mm';
  maxCashierDiscount: number;
  allowNegativeStock: boolean;
  minCashFloat: number;
  cashRetirementAlert: number;
  // Ticket
  ticket: TicketConfig;
  // Full-page invoice / quote (A4 / Letter)
  invoiceConfig: TicketConfig;
  // Hardware
  hardware: HardwareConfig;
  // Backup
  backup: BackupConfig;
}

export type LogoAlign = 'center' | 'left' | 'right';
export type LogoSize = 'small' | 'medium' | 'large';

export interface TicketConfig {
  showLogo: boolean;
  logoData: string | null;
  logoAlign: LogoAlign;
  logoSize: LogoSize;
  slogan: string;
  showRnc: boolean;
  showAddress: boolean;
  showCashier: boolean;
  showNcf: boolean;
  showItbis: boolean;
  footerMessage: string;
}

export interface HardwareConfig {
  printerConnection: 'USB' | 'COM' | 'LAN' | 'Bluetooth';
  printerComPort: string;
  printerBaudRate: string;
  printerIp: string;
  printerPort: string;
  scannerMode: 'USBHID' | 'COM' | 'Camera';
  scannerComPort: string;
  scannerAutoEnter: boolean;
  cashDrawerConnection: 'Printer' | 'COM';
  cashDrawerComPort: string;
}

export interface BackupConfig {
  frequency: 'diario' | 'semanal' | 'cierre';
  path: string;
  lastBackup: string;
}

export interface NcfSequence {
  id: string;
  type: NcfType;
  label: string;
  prefix: string;
  startSeq: number;
  currentSeq: number;
  endSeq: number;
  expiry: string;
}

export interface CashSession {
  id: string;
  cashier: string;
  openingAmount: number;
  openingTime: string;
  closed: boolean;
  closingAmount?: number;
  closingTime?: string;
  expectedCash?: number;
  difference?: number;
}

export const PERMISSION_KEYS = [
  'ventas',
  'inventario',
  'reportes',
  'seguridad',
  'configuracion',
  'anular_venta',
  'ver_costo',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<string, string> = {
  ventas: 'Ventas',
  inventario: 'Inventario',
  reportes: 'Reportes',
  seguridad: 'Seguridad',
  configuracion: 'Configuración',
  anular_venta: 'Anular Facturas',
  ver_costo: 'Ver Costo/Margen',
};

export interface Customer {
  id: string;
  name: string;
  phone: string;
  rnc?: string;
  balance: number; // total outstanding across all receivables
  createdAt: string;
}

export interface AccountReceivable {
  id: string;
  customerId: string;
  customerName: string;
  saleId: string;
  ncf: string;
  amount: number; // original charged amount
  paid: number; // amount already settled
  status: 'pendiente' | 'parcial' | 'pagada';
  date: string;
  dueDate: string;
}

// ===== Nómina y Personal =====

export type PayFrequency = 'semanal' | 'quincenal' | 'mensual';

export type PayoutStatus = 'al_dia' | 'pendiente' | 'vence_hoy' | 'vencido' | 'sin_pago';

export type PayoutMethod = 'efectivo_caja' | 'efectivo_directo' | 'transferencia';

export type PayoutConceptType = 'sueldo_base' | 'comision' | 'bono' | 'deduccion' | 'custom';

export type PayoutKind = 'pago' | 'adelanto' | 'comision';

export interface PayoutConcept {
  id: string;
  type: PayoutConceptType;
  label: string;
  amount: number;
  isDeduction?: boolean; // for custom type: true = subtract, false = add
}

export interface Payout {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  concepts: PayoutConcept[];
  grossPay: number; // sueldo + comisiones + bonos + custom-add
  totalDeductions: number;
  netPay: number;
  method: PayoutMethod;
  reference?: string; // e.g. número de transferencia
  registeredBy: string;
  kind: PayoutKind;
}

export interface CommissionEntry {
  id: string;
  saleId: string;
  serviceName: string;
  amount: number;
  date: string;
  paid: boolean;
}

export interface Employee {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  role: string; // dynamic — standard or custom job title
  phone: string;
  email: string;
  address: string;
  cedula: string;
  hireDate: string;
  active: boolean;
  baseSalary: number;
  frequency: PayFrequency;
  lastPaidDate: string | null;
  nextDueDate: string | null;
  pendingAdvanceDeduction?: number; // accumulated advances to deduct from next base salary
  pendingCommissions?: CommissionEntry[]; // commissions from sales, pending payout
}

export interface CashOutflow {
  id: string;
  date: string;
  category: string; // e.g. 'Nómina', 'Gasto Menor'
  description: string;
  amount: number;
  registeredBy: string;
  source: 'nomina' | 'manual';
}

// ===== Cotizaciones / Presupuestos =====

export type QuoteStatus = 'vigente' | 'convertida' | 'vencida';

export type PrintFormat = 'ticket_80' | 'ticket_wide' | 'a4';

export interface QuoteItem {
  name: string;
  qty: number;
  price: number;
  unit: string;
  isService?: boolean;
  assignedEmployeeId?: string;
  commissionAmount?: number;
}

export interface Quote {
  id: string;
  number: string; // e.g. COT-0001
  date: string;
  expiryDate: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  itbis: number;
  total: number;
  customerName: string;
  customerDoc: string;
  cashier: string;
  status: QuoteStatus;
  convertedSaleId?: string;
  printFormat?: PrintFormat;
}

// ===== Despachos / Vales de Servicio =====

export type DispatchStatus = 'en_obra' | 'liquidado' | 'cancelado';

export interface DispatchItem {
  productId: string;
  productName: string;
  productCode: string;
  unit: UnitType;
  dispatchedQty: number;
  price: number; // unit price at dispatch time
  usedQty: number;
  returnedQty: number;
}

export interface Dispatch {
  id: string;
  code: string; // e.g. DSP-0001
  date: string;
  employeeId: string;
  employeeName: string;
  customerName: string;
  items: DispatchItem[];
  status: DispatchStatus;
  cashier: string;
  liquidatedAt?: string;
  liquidatedSaleId?: string;
}
