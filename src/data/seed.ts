import type { Product, User, AuditEntry, CompanyConfig, SaleRecord, NcfSequence, StockMovement, LoginAttempt, Session, Employee, Payout } from '@/types';

export const CATEGORIES = [
  'Eléctrica',
  'Iluminación',
  'Herramientas',
  'Cableado',
  'Cerrajería',
  'Plomería',
  'Protección',
];

export const seedProducts: Product[] = [
  { id: 'p1', code: 'EL-001', barcode: '7501034560011', name: 'Cable THW #12 (mt)', category: 'Cableado', cost: 18, price: 35, stock: 270, minStock: 100, unit: 'Metro', location: 'Estante A-3', baseUnit: 'Rollos', baseUnitFactor: 100 },
  { id: 'p2', code: 'EL-002', barcode: '7501034560028', name: 'Cable THW #10 (mt)', category: 'Cableado', cost: 28, price: 55, stock: 0, minStock: 100, unit: 'Metro', location: 'Estante A-4', baseUnit: 'Rollos', baseUnitFactor: 100 },
  { id: 'p3', code: 'IL-101', barcode: '7501034560035', name: 'Bombillo LED 9W', category: 'Iluminación', cost: 45, price: 95, stock: 99, minStock: 50, unit: 'Unidad', location: 'Pasillo 2' },
  { id: 'p4', code: 'IL-102', barcode: '7501034560042', name: 'Bombillo LED 12W', category: 'Iluminación', cost: 60, price: 125, stock: 28, minStock: 50, unit: 'Unidad', location: 'Pasillo 2' },
  { id: 'p5', code: 'EL-201', barcode: '7501034560059', name: 'Breaker 15A 1P', category: 'Eléctrica', cost: 85, price: 175, stock: 50, minStock: 30, unit: 'Unidad', location: 'Estante B-1' },
  { id: 'p6', code: 'EL-202', barcode: '7501034560066', name: 'Breaker 20A 1P', category: 'Eléctrica', cost: 90, price: 185, stock: 12, minStock: 30, unit: 'Unidad', location: 'Estante B-1' },
  { id: 'p7', code: 'EL-203', barcode: '7501034560073', name: 'Breaker 30A 2P', category: 'Eléctrica', cost: 220, price: 395, stock: 21, minStock: 20, unit: 'Unidad', location: 'Estante B-2' },
  { id: 'p8', code: 'HE-301', barcode: '7501034560080', name: 'Destornillador Phillips', category: 'Herramientas', cost: 65, price: 145, stock: 60, minStock: 15, unit: 'Unidad', location: 'Bodega Principal' },
  { id: 'p9', code: 'HE-302', barcode: '7501034560097', name: 'Alicate de corte 8"', category: 'Herramientas', cost: 180, price: 350, stock: 8, minStock: 15, unit: 'Unidad', location: 'Bodega Principal' },
  { id: 'p10', code: 'CE-401', barcode: '7501034560103', name: 'Cerradura puerta pomo', category: 'Cerrajería', cost: 320, price: 650, stock: 22, minStock: 10, unit: 'Unidad', location: 'Estante C-1' },
  { id: 'p11', code: 'CE-402', barcode: '7501034560110', name: 'Chapa magnética', category: 'Cerrajería', cost: 280, price: 525, stock: 18, minStock: 10, unit: 'Unidad', location: 'Estante C-2' },
  { id: 'p12', code: 'PL-501', barcode: '7501034560127', name: 'Tubo PVC 1/2" (mt)', category: 'Plomería', cost: 22, price: 48, stock: 142, minStock: 60, unit: 'Metro', location: 'Pasillo 3', baseUnit: 'Rollos', baseUnitFactor: 50 },
  { id: 'p13', code: 'PL-502', barcode: '7501034560134', name: 'Codo PVC 1/2"', category: 'Plomería', cost: 8, price: 18, stock: 2, minStock: 50, unit: 'Unidad', location: 'Pasillo 3' },
  { id: 'p14', code: 'EL-204', barcode: '7501034560141', name: 'Tomacorriente doble', category: 'Eléctrica', cost: 55, price: 120, stock: 95, minStock: 25, unit: 'Unidad', location: 'Estante B-3' },
  { id: 'p15', code: 'EL-205', barcode: '7501034560158', name: 'Interruptor simple', category: 'Eléctrica', cost: 48, price: 105, stock: 110, minStock: 25, unit: 'Unidad', location: 'Estante B-3' },
  { id: 'p16', code: 'IL-103', barcode: '7501034560165', name: 'Tira LED 5m RGB', category: 'Iluminación', cost: 240, price: 495, stock: 35, minStock: 15, unit: 'Unidad', location: 'Pasillo 2' },
  { id: 'p17', code: 'IL-104', barcode: '7501034560172', name: 'Panel LED 40W', category: 'Iluminación', cost: 380, price: 750, stock: 9, minStock: 12, unit: 'Unidad', location: 'Pasillo 2' },
  { id: 'p18', code: 'HE-303', barcode: '7501034560189', name: 'Martillo carpintero', category: 'Herramientas', cost: 150, price: 295, stock: 40, minStock: 10, unit: 'Unidad', location: 'Bodega Principal' },
  { id: 'p19', code: 'PR-601', barcode: '7501034560196', name: 'Guantes dieléctricos', category: 'Protección', cost: 350, price: 695, stock: 25, minStock: 10, unit: 'Unidad', location: 'Estante D-1' },
  { id: 'p20', code: 'PR-602', barcode: '7501034560202', name: 'Gafas de seguridad', category: 'Protección', cost: 85, price: 175, stock: 0, minStock: 20, unit: 'Unidad', location: 'Estante D-2' },
];

export const seedUsers: User[] = [
  {
    id: 'u1', username: 'admin', name: 'Ronny Almonte', email: 'ronny@almonte.do', password: 'admin123',
    role: 'Administrador', active: true, maxDiscount: 100,
    permissions: { ventas: true, inventario: true, reportes: true, seguridad: true, configuracion: true, anular_venta: true, ver_costo: true },
  },
  {
    id: 'u2', username: 'ronny.cajero', name: 'Carlos Méndez', email: 'carlos@almonte.do', password: 'cajero123',
    role: 'Cajero', active: true, maxDiscount: 5,
    permissions: { ventas: true, inventario: false, reportes: false, seguridad: false, configuracion: false, anular_venta: false, ver_costo: false },
  },
  {
    id: 'u3', username: 'luisa.alm', name: 'Luisa Fernández', email: 'luisa@almonte.do', password: 'almacen123',
    role: 'Almacenista', active: false, maxDiscount: 0,
    permissions: { ventas: false, inventario: true, reportes: false, seguridad: false, configuracion: false, anular_venta: false, ver_costo: true },
  },
];

export const seedAudit: AuditEntry[] = [
  { id: 'a1', user: 'admin', action: 'Inicio de sesión', timestamp: '2026-07-22 08:02:11' },
  { id: 'a2', user: 'admin', action: 'Venta registrada — NCF B02-0000145', timestamp: '2026-07-22 08:15:44' },
  { id: 'a3', user: 'ronny.cajero', action: 'Inicio de sesión', timestamp: '2026-07-22 09:01:30' },
  { id: 'a4', user: 'ronny.cajero', action: 'Venta registrada — NCF B02-0000146', timestamp: '2026-07-22 09:22:18' },
  { id: 'a5', user: 'admin', action: 'Producto creado — IL-104 Panel LED 40W', timestamp: '2026-07-21 17:40:02' },
  { id: 'a6', user: 'admin', action: 'Inventario ajustado — Bombillo LED 12W (+30)', timestamp: '2026-07-21 16:10:55' },
  { id: 'a7', user: 'ronny.cajero', action: 'Venta anulada — NCF B02-0000144', timestamp: '2026-07-21 14:33:20' },
  { id: 'a8', user: 'admin', action: 'Configuración actualizada', timestamp: '2026-07-20 10:05:00' },
];

export const seedLoginAttempts: LoginAttempt[] = [
  { id: 'la1', username: 'admin', success: true, timestamp: '2026-07-22 08:02:11', ip: '192.168.1.15' },
  { id: 'la2', username: 'ronny.cajero', success: true, timestamp: '2026-07-22 09:01:30', ip: '192.168.1.16' },
  { id: 'la3', username: 'unknown', success: false, timestamp: '2026-07-22 09:15:00', ip: '192.168.1.99' },
  { id: 'la4', username: 'admin', success: false, timestamp: '2026-07-21 22:14:00', ip: '190.167.2.5' },
];

export const seedSessions: Session[] = [
  { id: 'ses1', user: 'admin', loginTime: '2026-07-22 08:02:11', active: false },
  { id: 'ses2', user: 'ronny.cajero', loginTime: '2026-07-22 09:01:30', active: false },
];

export const seedMovements: StockMovement[] = [
  { id: 'm1', productId: 'p4', productName: 'Bombillo LED 12W', type: 'entrada', qty: 30, reason: 'Compra de proveedor', user: 'admin', timestamp: '2026-07-21 16:10:55' },
  { id: 'm2', productId: 'p17', productName: 'Panel LED 40W', type: 'entrada', qty: 10, reason: 'Compra de proveedor', user: 'admin', timestamp: '2026-07-20 11:00:00' },
  { id: 'm3', productId: 'p1', productName: 'Cable THW #12 (mt)', type: 'venta', qty: 10, reason: 'Venta NCF B02-0000145', user: 'admin', timestamp: '2026-07-22 08:15:44' },
  { id: 'm4', productId: 'p9', productName: 'Alicate de corte 8"', type: 'salida', qty: 2, reason: 'Mercancía dañada', user: 'admin', timestamp: '2026-07-19 15:30:00' },
];

export const seedConfig: CompanyConfig = {
  rnc: '131-158-456',
  razonSocial: 'Electricidad Almonte SRL',
  nombreComercial: 'Electricidad ALMONTE',
  branch: 'Sucursal Principal — Santo Domingo',
  phone: '809-555-0142',
  email: 'info@almonte.do',
  address: 'Av. Winston Churchill #1099, Piantini, Santo Domingo',
  provincia: 'Santo Domingo, Distrito Nacional',
  itbisRate: 18,
  itbisIncluded: false,
  retencionItbis: false,
  retencionIsr: false,
  retencionItbisRate: 30,
  retencionIsrRate: 10,
  cashier: 'Ronny Almonte',
  representanteLegal: 'Ronny Almonte',
  printer: '80mm',
  maxCashierDiscount: 5,
  allowNegativeStock: false,
  minCashFloat: 500,
  cashRetirementAlert: 20000,
  ticket: {
    showLogo: true,
    logoData: null,
    logoAlign: 'center',
    logoSize: 'medium',
    slogan: '¡Los mejores precios en materiales eléctricos!',
    showRnc: true,
    showAddress: true,
    showCashier: true,
    showNcf: true,
    showItbis: true,
    footerMessage: '¡Gracias por su compra! No se aceptan devoluciones después de 30 días.',
  },
  invoiceConfig: {
    showLogo: true,
    logoData: null,
    logoAlign: 'left',
    logoSize: 'large',
    slogan: 'Materiales Eléctricos y Servicios de Instalación',
    showRnc: true,
    showAddress: true,
    showCashier: true,
    showNcf: true,
    showItbis: true,
    footerMessage: 'Documentos no fiscales generados por Electricidad Almonte SRL. Precios sujetos a cambios sin previo aviso.',
  },
  hardware: {
    printerConnection: 'USB',
    printerComPort: 'COM1',
    printerBaudRate: '9600',
    printerIp: '192.168.1.200',
    printerPort: '9100',
    scannerMode: 'USBHID',
    scannerComPort: 'COM2',
    scannerAutoEnter: true,
    cashDrawerConnection: 'Printer',
    cashDrawerComPort: 'COM3',
  },
  backup: {
    frequency: 'diario',
    path: 'C:/AlmontePOS/backups',
    lastBackup: '2026-07-22 06:00:00',
  },
};

export const seedNcfSequences: NcfSequence[] = [
  { id: 'ncf1', type: 'B02', label: 'Consumidor Final', prefix: 'B02', startSeq: 1, currentSeq: 146, endSeq: 1000, expiry: '2026-12-31' },
  { id: 'ncf2', type: 'B01', label: 'Crédito Fiscal', prefix: 'B01', startSeq: 1, currentSeq: 88, endSeq: 500, expiry: '2026-12-31' },
  { id: 'ncf3', type: 'B14', label: 'Regímenes Especiales', prefix: 'B14', startSeq: 1, currentSeq: 12, endSeq: 200, expiry: '2026-12-31' },
  { id: 'ncf4', type: 'B15', label: 'Gubernamental', prefix: 'B15', startSeq: 1, currentSeq: 5, endSeq: 100, expiry: '2026-12-31' },
  { id: 'ncf5', type: 'B04', label: 'Nota de Crédito', prefix: 'B04', startSeq: 1, currentSeq: 3, endSeq: 100, expiry: '2026-12-31' },
];

function daysAgo(n: number): string {
  const d = new Date(2026, 6, 22 - n);
  return d.toISOString();
}

export const seedSales: SaleRecord[] = [
  { id: 's1', date: daysAgo(0), items: [{ name: 'Cable THW #12 (mt)', qty: 10, price: 35, unit: 'Metro' }, { name: 'Breaker 15A 1P', qty: 2, price: 175, unit: 'Unidad' }], subtotal: 700, discount: 0, itbis: 126, total: 826, ncf: 'B02-0000145', ncfType: 'B02', customerDoc: '', customerName: 'Consumidor Final', cashier: 'Ronny Almonte', paymentMethod: 'efectivo' },
  { id: 's2', date: daysAgo(0), items: [{ name: 'Bombillo LED 9W', qty: 4, price: 95, unit: 'Unidad' }], subtotal: 380, discount: 20, itbis: 64.8, total: 424.8, ncf: 'B02-0000146', ncfType: 'B02', customerDoc: '', customerName: 'Consumidor Final', cashier: 'Carlos Méndez', paymentMethod: 'tarjeta' },
  { id: 's3', date: daysAgo(1), items: [{ name: 'Panel LED 40W', qty: 1, price: 750, unit: 'Unidad' }, { name: 'Tira LED 5m RGB', qty: 1, price: 495, unit: 'Unidad' }], subtotal: 1245, discount: 0, itbis: 224.1, total: 1469.1, ncf: 'B01-0000088', ncfType: 'B01', customerDoc: '131-001-234', customerName: 'Ferretería La Económica', cashier: 'Ronny Almonte', paymentMethod: 'transferencia' },
  { id: 's4', date: daysAgo(1), items: [{ name: 'Alicate de corte 8"', qty: 1, price: 350, unit: 'Unidad' }], subtotal: 350, discount: 0, itbis: 63, total: 413, ncf: 'B02-0000144', ncfType: 'B02', customerDoc: '', customerName: 'Consumidor Final', cashier: 'Carlos Méndez', paymentMethod: 'efectivo' },
  { id: 's5', date: daysAgo(2), items: [{ name: 'Cerradura puerta pomo', qty: 2, price: 650, unit: 'Unidad' }], subtotal: 1300, discount: 50, itbis: 225, total: 1475, ncf: 'B01-0000087', ncfType: 'B01', customerDoc: '402-555-778', customerName: 'Constructora Nova', cashier: 'Ronny Almonte', paymentMethod: 'credito' },
  { id: 's6', date: daysAgo(3), items: [{ name: 'Tomacorriente doble', qty: 5, price: 120, unit: 'Unidad' }, { name: 'Interruptor simple', qty: 5, price: 105, unit: 'Unidad' }], subtotal: 1125, discount: 0, itbis: 202.5, total: 1327.5, ncf: 'B02-0000143', ncfType: 'B02', customerDoc: '', customerName: 'Consumidor Final', cashier: 'Ronny Almonte', paymentMethod: 'efectivo' },
  { id: 's7', date: daysAgo(4), items: [{ name: 'Tubo PVC 1/2" (mt)', qty: 20, price: 48, unit: 'Metro' }], subtotal: 960, discount: 0, itbis: 172.8, total: 1132.8, ncf: 'B02-0000142', ncfType: 'B02', customerDoc: '', customerName: 'Consumidor Final', cashier: 'Carlos Méndez', paymentMethod: 'tarjeta' },
  { id: 's8', date: daysAgo(5), items: [{ name: 'Chapa magnética', qty: 3, price: 525, unit: 'Unidad' }], subtotal: 1575, discount: 75, itbis: 270, total: 1770, ncf: 'B01-0000086', ncfType: 'B01', customerDoc: '098-334-221', customerName: 'Eléctrica Don Pedro', cashier: 'Ronny Almonte', paymentMethod: 'mixto', mixed: { efectivo: 770, tarjeta: 1000, transferencia: 0 } },
  { id: 's9', date: daysAgo(6), items: [{ name: 'Martillo carpintero', qty: 2, price: 295, unit: 'Unidad' }, { name: 'Destornillador Phillips', qty: 2, price: 145, unit: 'Unidad' }], subtotal: 880, discount: 0, itbis: 158.4, total: 1038.4, ncf: 'B02-0000141', ncfType: 'B02', customerDoc: '', customerName: 'Consumidor Final', cashier: 'Carlos Méndez', paymentMethod: 'efectivo' },
  { id: 's10', date: daysAgo(8), items: [{ name: 'Breaker 30A 2P', qty: 2, price: 395, unit: 'Unidad' }], subtotal: 790, discount: 0, itbis: 142.2, total: 932.2, ncf: 'B02-0000140', ncfType: 'B02', customerDoc: '', customerName: 'Consumidor Final', cashier: 'Ronny Almonte', paymentMethod: 'efectivo' },
  { id: 's11', date: daysAgo(12), items: [{ name: 'Bombillo LED 12W', qty: 10, price: 125, unit: 'Unidad' }], subtotal: 1250, discount: 100, itbis: 207, total: 1357, ncf: 'B01-0000085', ncfType: 'B01', customerDoc: '501-220-110', customerName: 'Constructora Nova', cashier: 'Ronny Almonte', paymentMethod: 'transferencia' },
  { id: 's12', date: daysAgo(20), items: [{ name: 'Cable THW #10 (mt)', qty: 50, price: 55, unit: 'Metro' }], subtotal: 2750, discount: 0, itbis: 495, total: 3245, ncf: 'B01-0000084', ncfType: 'B01', customerDoc: '131-158-456', customerName: 'Electricidad Almonte SRL', cashier: 'Ronny Almonte', paymentMethod: 'efectivo' },
];

// ===== Nómina y Personal =====

export const STANDARD_ROLES: string[] = [
  'Administrador',
  'Cajero',
  'Vendedor',
  'Almacenista',
  'Cablista',
  'Medidor',
  'Electricista Senior',
  'Electricista Junior',
  'Chofer',
  'Contador',
];

const empDate = (daysAgoN: number): string => {
  const d = new Date(2026, 6, 22 - daysAgoN);
  return d.toISOString();
};

export const seedEmployees: Employee[] = [
  {
    id: 'emp1', code: 'EMP-001', firstName: 'Ronny', lastName: 'Almonte', role: 'Administrador',
    phone: '809-555-0101', email: 'ronny@almonte.do', address: 'Av. Churchill #1099, Santo Domingo',
    cedula: '001-1234567-1', hireDate: '2024-01-15', active: true, baseSalary: 45000, frequency: 'quincenal',
    lastPaidDate: empDate(12), nextDueDate: empDate(-3),
  },
  {
    id: 'emp2', code: 'EMP-002', firstName: 'Carlos', lastName: 'Méndez', role: 'Vendedor',
    phone: '809-555-0102', email: 'carlos@almonte.do', address: 'Calle El Sol #45, Santo Domingo',
    cedula: '002-2345678-2', hireDate: '2024-03-01', active: true, baseSalary: 22000, frequency: 'semanal',
    lastPaidDate: empDate(5), nextDueDate: empDate(2),
  },
  {
    id: 'emp3', code: 'EMP-003', firstName: 'Luis', lastName: 'Fernández', role: 'Cablista',
    phone: '809-555-0103', email: 'luis@almonte.do', address: 'Sector Los Mina, Santo Domingo',
    cedula: '003-3456789-3', hireDate: '2024-06-10', active: true, baseSalary: 28000, frequency: 'quincenal',
    lastPaidDate: empDate(14), nextDueDate: empDate(0),
  },
  {
    id: 'emp4', code: 'EMP-004', firstName: 'Pedro', lastName: 'García', role: 'Medidor',
    phone: '809-555-0104', email: 'pedro@almonte.do', address: 'Villa Mella, Santo Domingo',
    cedula: '004-4567890-4', hireDate: '2025-01-20', active: true, baseSalary: 25000, frequency: 'semanal',
    lastPaidDate: empDate(8), nextDueDate: empDate(-1),
  },
  {
    id: 'emp5', code: 'EMP-005', firstName: 'Miguel', lastName: 'Torres', role: 'Chofer',
    phone: '809-555-0105', email: 'miguel@almonte.do', address: 'Hato Mayor del Rey',
    cedula: '005-5678901-5', hireDate: '2024-09-05', active: true, baseSalary: 24000, frequency: 'semanal',
    lastPaidDate: empDate(6), nextDueDate: empDate(1),
  },
  {
    id: 'emp6', code: 'EMP-006', firstName: 'Ana', lastName: 'Rosario', role: 'Electricista Senior',
    phone: '809-555-0106', email: 'ana@almonte.do', address: 'Ensanche Ozama, Santo Domingo',
    cedula: '006-6789012-6', hireDate: '2023-08-12', active: true, baseSalary: 38000, frequency: 'quincenal',
    lastPaidDate: empDate(13), nextDueDate: empDate(1),
  },
  {
    id: 'emp7', code: 'EMP-007', firstName: 'José', lastName: 'Ramírez', role: 'Almacenista',
    phone: '809-555-0107', email: 'jose@almonte.do', address: 'Calle Duarte #12, Santo Domingo',
    cedula: '007-7890123-7', hireDate: '2025-02-01', active: false, baseSalary: 20000, frequency: 'semanal',
    lastPaidDate: empDate(40), nextDueDate: null,
  },
];

export const seedPayouts: Payout[] = [
  {
    id: 'pay1', employeeId: 'emp1', employeeName: 'Ronny Almonte', date: empDate(12),
    concepts: [
      { id: 'c1', type: 'sueldo_base', label: 'Sueldo Base Quincenal', amount: 22500 },
    ],
    grossPay: 22500, totalDeductions: 0, netPay: 22500, method: 'transferencia', reference: 'TRF-0012',
    registeredBy: 'admin',
    kind: 'pago',
  },
  {
    id: 'pay2', employeeId: 'emp2', employeeName: 'Carlos Méndez', date: empDate(5),
    concepts: [
      { id: 'c2', type: 'sueldo_base', label: 'Sueldo Base Semanal', amount: 22000 },
      { id: 'c3', type: 'comision', label: 'Comisión por Ventas', amount: 1850 },
    ],
    grossPay: 23850, totalDeductions: 0, netPay: 23850, method: 'efectivo_caja',
    registeredBy: 'admin',
    kind: 'pago',
  },
  {
    id: 'pay3', employeeId: 'emp3', employeeName: 'Luis Fernández', date: empDate(14),
    concepts: [
      { id: 'c4', type: 'sueldo_base', label: 'Sueldo Base Quincenal', amount: 14000 },
      { id: 'c5', type: 'bono', label: 'Bono Productividad', amount: 2000 },
      { id: 'c6', type: 'deduccion', label: 'Avance de Sueldo', amount: 3000 },
    ],
    grossPay: 16000, totalDeductions: 3000, netPay: 13000, method: 'efectivo_caja',
    registeredBy: 'admin',
    kind: 'pago',
  },
  {
    id: 'pay4', employeeId: 'emp6', employeeName: 'Ana Rosario', date: empDate(13),
    concepts: [
      { id: 'c7', type: 'sueldo_base', label: 'Sueldo Base Quincenal', amount: 19000 },
      { id: 'c8', type: 'comision', label: 'Comisión por Servicios', amount: 4500 },
    ],
    grossPay: 23500, totalDeductions: 0, netPay: 23500, method: 'transferencia', reference: 'TRF-0011',
    registeredBy: 'admin',
    kind: 'pago',
  },
  {
    id: 'pay5', employeeId: 'emp4', employeeName: 'Pedro García', date: empDate(8),
    concepts: [
      { id: 'c9', type: 'sueldo_base', label: 'Sueldo Base Semanal', amount: 25000 },
    ],
    grossPay: 25000, totalDeductions: 0, netPay: 25000, method: 'efectivo_caja',
    registeredBy: 'admin',
    kind: 'pago',
  },
  {
    id: 'pay6', employeeId: 'emp5', employeeName: 'Miguel Torres', date: empDate(6),
    concepts: [
      { id: 'c10', type: 'sueldo_base', label: 'Sueldo Base Semanal', amount: 24000 },
      { id: 'c11', type: 'deduccion', label: 'Vale', amount: 1500 },
    ],
    grossPay: 24000, totalDeductions: 1500, netPay: 22500, method: 'efectivo_caja',
    registeredBy: 'admin',
    kind: 'pago',
  },
  {
    id: 'pay7', employeeId: 'emp1', employeeName: 'Ronny Almonte', date: empDate(42),
    concepts: [
      { id: 'c12', type: 'sueldo_base', label: 'Sueldo Base Quincenal', amount: 22500 },
    ],
    grossPay: 22500, totalDeductions: 0, netPay: 22500, method: 'transferencia', reference: 'TRF-0010',
    registeredBy: 'admin',
    kind: 'pago',
  },
  {
    id: 'pay8', employeeId: 'emp2', employeeName: 'Carlos Méndez', date: empDate(40),
    concepts: [
      { id: 'c13', type: 'sueldo_base', label: 'Sueldo Base Semanal', amount: 22000 },
      { id: 'c14', type: 'comision', label: 'Comisión por Ventas', amount: 1200 },
    ],
    grossPay: 23200, totalDeductions: 0, netPay: 23200, method: 'efectivo_caja',
    registeredBy: 'admin',
    kind: 'pago',
  },
  {
    id: 'pay9', employeeId: 'emp6', employeeName: 'Ana Rosario', date: empDate(43),
    concepts: [
      { id: 'c15', type: 'sueldo_base', label: 'Sueldo Base Quincenal', amount: 19000 },
    ],
    grossPay: 19000, totalDeductions: 0, netPay: 19000, method: 'transferencia', reference: 'TRF-0009',
    registeredBy: 'admin',
    kind: 'pago',
  },
  {
    id: 'pay10', employeeId: 'emp3', employeeName: 'Luis Fernández', date: empDate(44),
    concepts: [
      { id: 'c16', type: 'sueldo_base', label: 'Sueldo Base Quincenal', amount: 14000 },
    ],
    grossPay: 14000, totalDeductions: 0, netPay: 14000, method: 'efectivo_caja',
    registeredBy: 'admin',
    kind: 'pago',
  },
];
