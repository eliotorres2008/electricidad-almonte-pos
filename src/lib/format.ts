import type { UnitType, Product } from '@/types';

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO').format(n);
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return '¡Buenos días';
  if (h < 19) return '¡Buenas tardes';
  return '¡Buenas noches';
}

export function nowString(): string {
  return new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function dateString(): string {
  const parts = new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return parts.replace(/\bDe\b/g, 'de');
}

export function capitalizeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function genId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function genNcf(prefix: string, currentSeq: number): string {
  return `${prefix}-${String(currentSeq + 1).padStart(7, '0')}`;
}

// Generate internal code like EL-003, IL-104
export function genInternalCode(category: string, existing: { code: string }[]): string {
  const prefixMap: Record<string, string> = {
    'Eléctrica': 'EL',
    'Iluminación': 'IL',
    'Herramientas': 'HE',
    'Cableado': 'EL',
    'Cerrajería': 'CE',
    'Plomería': 'PL',
    'Protección': 'PR',
  };
  const prefix = prefixMap[category] ?? 'PR';
  const maxNum = existing
    .filter((p) => p.code.startsWith(prefix + '-'))
    .map((p) => parseInt(p.code.split('-')[1] ?? '0', 10))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
}

// Generate EAN-13 barcode
export function genBarcode(): string {
  const base = '750' + String(Math.floor(Math.random() * 1000000000)).padStart(10, '0').slice(0, 12);
  // EAN-13 checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return base + checksum;
}

// Unit conversion: convert from one unit to the product's base stock unit
// Returns the equivalent quantity in the product's stock unit
export function convertToStock(qty: number, fromUnit: UnitType, product: Product): number {
  if (fromUnit === product.unit) return qty;
  // If product uses a baseUnit (e.g. Rollos), convert length/weight to base
  if (product.baseUnit && product.baseUnitFactor) {
    const factor = product.baseUnitFactor; // e.g. 100 metros per rollo
    switch (fromUnit) {
      case 'Metro': return qty; // stock is in metros
      case 'Pies': return qty * 0.3048; // 1 pie = 0.3048 metros
      case 'Yardas': return qty * 0.9144; // 1 yarda = 0.9144 metros
      case 'Libras': return qty; // weight-based, 1:1
      case 'Kilo': return qty;
      case 'Rollos': return qty * factor; // 1 rollo = factor metros
      default: return qty;
    }
  }
  return qty;
}

// Calculate price for a given unit based on product base price
export function unitPrice(product: Product, unit: UnitType): number {
  if (unit === product.unit) return product.price;
  if (product.baseUnit && product.baseUnitFactor) {
    const factor = product.baseUnitFactor;
    switch (unit) {
      case 'Metro': return product.price; // base price is per metro
      case 'Pies': return product.price * 0.3048;
      case 'Yardas': return product.price * 0.9144;
      case 'Rollos': return product.price * factor;
      case 'Libras': return product.price;
      case 'Kilo': return product.price;
      default: return product.price;
    }
  }
  return product.price;
}

// Available units for a product based on its unit type
export function availableUnits(product: Product): UnitType[] {
  if (product.baseUnit && product.baseUnitFactor) {
    return ['Metro', 'Pies', 'Yardas', 'Rollos'] as UnitType[];
  }
  if (product.unit === 'Libras' || product.unit === 'Kilo') {
    return ['Libras', 'Kilo'] as UnitType[];
  }
  return [product.unit];
}

export function stockState(stock: number, minStock: number): 'ok' | 'bajo' | 'critico' | 'agotado' {
  if (stock <= 0) return 'agotado';
  if (stock <= minStock * 0.5) return 'critico';
  if (stock <= minStock) return 'bajo';
  return 'ok';
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
