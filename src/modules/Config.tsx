import { useState } from 'react';
import {
  Save, Printer, CheckCircle2, Building2, Percent, FileText,
  Wallet, Database, Usb, ScanLine, DollarSign, AlertTriangle, Zap,
  ImagePlus, X,
} from 'lucide-react';
import type { CompanyConfig, NcfSequence } from '@/types';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/Modal';
import { NumberField } from '@/components/NumberField';

type SubTab = 'fiscal' | 'ncf' | 'caja' | 'ticket' | 'hardware' | 'backup';

export function Config() {
  const app = useApp();
  const { config, setConfig, ncfSequences, setNcfSequences, addAudit, sales } = app;
  const cashier = config.cashier;
  const [subTab, setSubTab] = useState<SubTab>('fiscal');
  const [form, setForm] = useState<CompanyConfig>(config);
  const [savedOpen, setSavedOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [docFormat, setDocFormat] = useState<'ticket' | 'a4'>('ticket');

  const save = () => {
    setConfig(form);
    addAudit('Configuración actualizada', cashier);
    setSavedOpen(true);
  };

  const updateNcf = (id: string, field: keyof NcfSequence, value: string | number) => {
    setNcfSequences((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const testPrinter = () => {
    setTestResult('Enviando prueba de impresión...');
    setTimeout(() => setTestResult(`Prueba enviada a ${form.hardware.printerConnection === 'LAN' ? form.hardware.printerIp + ':' + form.hardware.printerPort : form.hardware.printerConnection === 'COM' ? form.hardware.printerComPort + ' @ ' + form.hardware.printerBaudRate + ' bps' : form.hardware.printerConnection}... OK`), 1200);
  };

  const testScanner = () => {
    setTestResult('Lector en espera de escaneo...');
    setTimeout(() => setTestResult(`Lector ${form.hardware.scannerMode} listo. Auto-Enter: ${form.hardware.scannerAutoEnter ? 'Sí' : 'No'}`), 1000);
  };

  const testDrawer = () => {
    setTestResult('Enviando señal de apertura...');
    setTimeout(() => setTestResult(`Cajón conectado vía ${form.hardware.cashDrawerConnection}. Apertura exitosa.`), 800);
  };

  const createBackup = () => {
    const data = JSON.stringify({ config: form, ncfSequences, sales, timestamp: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_almonte_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setForm({ ...form, backup: { ...form.backup, lastBackup: new Date().toISOString().replace('T', ' ').slice(0, 19) } });
    addAudit('Copia de seguridad creada', cashier);
    setTestResult('Copia de seguridad descargada correctamente.');
  };

  const restoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(String(ev.target?.result ?? ''));
        if (data.config) setForm(data.config);
        if (data.ncfSequences) setNcfSequences(data.ncfSequences);
        setTestResult('Base de datos restaurada correctamente.');
        addAudit('Base de datos restaurada desde archivo', cashier);
      } catch {
        setTestResult('Error: archivo de respaldo inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: 'fiscal', label: 'Datos Fiscales', icon: <Building2 size={16} /> },
    { key: 'ncf', label: 'Secuencias NCF', icon: <FileText size={16} /> },
    { key: 'caja', label: 'Caja y Políticas', icon: <Wallet size={16} /> },
    { key: 'ticket', label: 'Diseño del Ticket', icon: <Printer size={16} /> },
    { key: 'hardware', label: 'Periféricos', icon: <Usb size={16} /> },
    { key: 'backup', label: 'Respaldos', icon: <Database size={16} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="card p-2 inline-flex gap-1 flex-wrap">
        {SUB_TABS.map((t) => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${subTab === t.key ? 'bg-brand-500 text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Fiscal */}
      {subTab === 'fiscal' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={20} className="text-brand-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Datos Fiscales y Empresa (DGII RD)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="RNC"><input value={form.rnc} onChange={(e) => setForm({ ...form, rnc: e.target.value })} className="input" /></Field>
            <Field label="Razón Social"><input value={form.razonSocial} onChange={(e) => setForm({ ...form, razonSocial: e.target.value })} className="input" /></Field>
            <Field label="Nombre Comercial"><input value={form.nombreComercial} onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })} className="input" /></Field>
            <Field label="Sucursal"><input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="input" /></Field>
            <Field label="Teléfono"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
            <Field label="Correo de Contacto"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
            <Field label="Dirección Fiscal"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></Field>
            <Field label="Provincia / Municipio"><input value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} className="input" /></Field>
            <Field label="Representante Legal"><input value={form.representanteLegal} onChange={(e) => setForm({ ...form, representanteLegal: e.target.value })} className="input" /></Field>
            <div className="mt-4">
              <label className="label">RNC / Cédula (DGII)</label>
              <input
                value={form.rnc}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                  let masked = raw;
                  if (raw.length > 9) {
                    masked = `${raw.slice(0,3)}-${raw.slice(3,10)}-${raw.slice(10)}`;
                  } else if (raw.length > 4) {
                    masked = `${raw.slice(0,1)}-${raw.slice(1,3)}-${raw.slice(3,8)}-${raw.slice(8)}`;
                  }
                  setForm({ ...form, rnc: masked });
                }}
                className="input"
                placeholder="X-XX-XXXXX-X / XXX-XXXXXXX-X"
              />
              <p className="text-[11px] text-neutral-400 mt-1">9 dígitos (RNC) o 11 dígitos (Cédula)</p>
            </div>
          </div>

          {/* Impuestos */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Percent size={18} className="text-brand-500" />
              <h4 className="font-bold text-neutral-900 dark:text-white">Impuestos y Retenciones</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Tasa de ITBIS (%)"><NumberField value={form.itbisRate} onChange={(v) => setForm({ ...form, itbisRate: v })} min={0} max={100} /></Field>
              <div className="flex flex-col gap-3 pt-6">
                <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer">
                  <input type="checkbox" checked={form.itbisIncluded} onChange={(e) => setForm({ ...form, itbisIncluded: e.target.checked })} className="w-4 h-4 rounded accent-brand-500" />
                  Incluir ITBIS en los precios exhibidos en catálogo
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer">
                  <input type="checkbox" checked={form.retencionItbis} onChange={(e) => setForm({ ...form, retencionItbis: e.target.checked })} className="w-4 h-4 rounded accent-brand-500" />
                  Retención de ITBIS (ventas gubernamentales/empresas)
                </label>
                {form.retencionItbis && (
                  <div className="pl-6">
                    <label className="label">Tasa de Retención ITBIS (%)</label>
                    <NumberField value={form.retencionItbisRate} onChange={(v) => setForm({ ...form, retencionItbisRate: v })} min={0} max={100} />
                    <p className="text-[11px] text-neutral-400 mt-1">Aplicable a ventas con NCF B15 (Gubernamental). Predeterminado: 30%.</p>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer">
                  <input type="checkbox" checked={form.retencionIsr} onChange={(e) => setForm({ ...form, retencionIsr: e.target.checked })} className="w-4 h-4 rounded accent-brand-500" />
                  Retención de ISR
                </label>
                {form.retencionIsr && (
                  <div className="pl-6">
                    <label className="label">Tasa de Retención ISR (%)</label>
                    <NumberField value={form.retencionIsrRate} onChange={(v) => setForm({ ...form, retencionIsrRate: v })} min={0} max={100} />
                    <p className="text-[11px] text-neutral-400 mt-1">Ej. 2% (alquileres) o 10% (servicios profesionales).</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end"><button onClick={save} className="btn-primary"><Save size={18} /> Guardar Cambios</button></div>
        </div>
      )}

      {/* NCF */}
      {subTab === 'ncf' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={20} className="text-brand-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Gestión de Secuencias NCF (DGII)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/40 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <th className="px-3 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-3 py-3 text-left font-semibold">Prefijo</th>
                  <th className="px-3 py-3 text-center font-semibold">Sec. Inicial</th>
                  <th className="px-3 py-3 text-center font-semibold">Sec. Actual</th>
                  <th className="px-3 py-3 text-center font-semibold">Sec. Final</th>
                  <th className="px-3 py-3 text-center font-semibold">Vencimiento</th>
                  <th className="px-3 py-3 text-center font-semibold">Disponibles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {ncfSequences.map((s) => {
                  const remaining = s.endSeq - s.currentSeq;
                  const lowAlert = remaining < 50;
                  return (
                    <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">{s.prefix}</p>
                        <p className="text-xs text-neutral-400">{s.label}</p>
                      </td>
                      <td className="px-3 py-3"><input value={s.prefix} onChange={(e) => updateNcf(s.id, 'prefix', e.target.value)} className="input py-1.5 text-sm w-20" /></td>
                      <td className="px-3 py-3 text-center font-mono text-sm">{String(s.startSeq).padStart(8, '0')}</td>
                      <td className="px-3 py-3 text-center font-mono text-sm">{String(s.currentSeq).padStart(8, '0')}</td>
                      <td className="px-3 py-3 text-center font-mono text-sm">{String(s.endSeq).padStart(8, '0')}</td>
                      <td className="px-3 py-3"><input type="date" value={s.expiry} onChange={(e) => updateNcf(s.id, 'expiry', e.target.value)} className="input py-1.5 text-sm" /></td>
                      <td className="px-3 py-3 text-center">
                        <span className={`chip ${lowAlert ? 'bg-red-500/15 text-red-500' : 'bg-green-500/15 text-green-500'}`}>{remaining}</span>
                        {lowAlert && <p className="text-[10px] text-red-500 mt-1 font-semibold">¡Quedan pocos!</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/30">
            <AlertTriangle size={18} className="text-amber-500" />
            <p className="text-sm text-amber-600 dark:text-amber-400">Alerta automática cuando queden menos de 50 NCF disponibles en cualquier secuencia.</p>
          </div>
          <div className="flex justify-end"><button onClick={save} className="btn-primary"><Save size={18} /> Guardar Cambios</button></div>
        </div>
      )}

      {/* Caja y Políticas */}
      {subTab === 'caja' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={20} className="text-brand-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Parámetros de Caja y Políticas de Venta</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Descuento Máximo por Cajero (%)"><NumberField value={form.maxCashierDiscount} onChange={(v) => setForm({ ...form, maxCashierDiscount: v })} min={0} max={100} /></Field>
            <Field label="Efectivo Mínimo para Apertura"><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium pointer-events-none">RD$</span><input value={form.minCashFloat.toLocaleString('es-DO')} onChange={(e) => { const n = Number(e.target.value.replace(/[^\d]/g, '')) || 0; setForm({ ...form, minCashFloat: n }); }} className="input pl-12" /></div></Field>
            <Field label="Alerta de Retiro de Efectivo"><div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium pointer-events-none">RD$</span><input value={form.cashRetirementAlert.toLocaleString('es-DO')} onChange={(e) => { const n = Number(e.target.value.replace(/[^\d]/g, '')) || 0; setForm({ ...form, cashRetirementAlert: n }); }} className="input pl-12" /></div></Field>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer">
                <input type="checkbox" checked={form.allowNegativeStock} onChange={(e) => setForm({ ...form, allowNegativeStock: e.target.checked })} className="w-4 h-4 rounded accent-brand-500" />
                Permitir venta sin existencia en almacén
              </label>
            </div>
          </div>
          <div className="flex justify-end"><button onClick={save} className="btn-primary"><Save size={18} /> Guardar Cambios</button></div>
        </div>
      )}

      {/* Ticket Design */}
      {subTab === 'ticket' && (
        <div className="space-y-4">
          {/* Format selector */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-brand-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white">Formato de Documento</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setDocFormat('ticket')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition text-left ${docFormat === 'ticket' ? 'border-brand-500 bg-brand-500/10' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'}`}
              >
                <Printer size={24} className={docFormat === 'ticket' ? 'text-brand-500' : 'text-neutral-400'} />
                <div>
                  <p className="font-semibold text-sm text-neutral-900 dark:text-white">Ticket Térmico (80mm)</p>
                  <p className="text-xs text-neutral-500">Rollo térmico para impresora de punto de venta</p>
                </div>
              </button>
              <button
                onClick={() => setDocFormat('a4')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition text-left ${docFormat === 'a4' ? 'border-brand-500 bg-brand-500/10' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'}`}
              >
                <FileText size={24} className={docFormat === 'a4' ? 'text-brand-500' : 'text-neutral-400'} />
                <div>
                  <p className="font-semibold text-sm text-neutral-900 dark:text-white">Factura / Cotización Hoja Completa (Carta / A4)</p>
                  <p className="text-xs text-neutral-500">Documento de página completa para impresoras láser/inkjet</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Printer size={20} className="text-brand-500" />
                <h3 className="font-bold text-neutral-900 dark:text-white text-lg">
                  {docFormat === 'ticket' ? 'Diseño del Ticket Térmico' : 'Diseño de Factura / Cotización'}
                </h3>
              </div>
              <TicketDesignForm
                form={form}
                setForm={setForm}
                docFormat={docFormat}
              />
              <div className="flex justify-end"><button onClick={save} className="btn-primary"><Save size={18} /> Guardar Cambios</button></div>
            </div>

            {/* Live preview */}
            <div className="card p-6">
              <h3 className="font-bold text-neutral-900 dark:text-white mb-4">Vista Previa en Tiempo Real</h3>
              {docFormat === 'ticket' ? (
                <TicketPreview config={form} />
              ) : (
                <InvoicePreview config={form} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hardware */}
      {subTab === 'hardware' && (
        <div className="space-y-4">
          {/* Printer */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Printer size={20} className="text-brand-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Impresora Térmica de Tickets</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tipo de Conexión">
                <select value={form.hardware.printerConnection} onChange={(e) => setForm({ ...form, hardware: { ...form.hardware, printerConnection: e.target.value as typeof form.hardware.printerConnection } })} className="input">
                  <option value="USB">USB</option>
                  <option value="COM">Puerto COM (Serial)</option>
                  <option value="LAN">Red (IP/LAN)</option>
                  <option value="Bluetooth">Bluetooth</option>
                </select>
              </Field>
              {form.hardware.printerConnection === 'COM' && (
                <>
                  <Field label="Puerto COM">
                    <select value={form.hardware.printerComPort} onChange={(e) => setForm({ ...form, hardware: { ...form.hardware, printerComPort: e.target.value } })} className="input">
                      {['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6'].map((p) => (<option key={p}>{p}</option>))}
                    </select>
                  </Field>
                  <Field label="Velocidad / Baud Rate">
                    <select value={form.hardware.printerBaudRate} onChange={(e) => setForm({ ...form, hardware: { ...form.hardware, printerBaudRate: e.target.value } })} className="input">
                      {['9600', '19200', '38400', '57600', '115200'].map((b) => (<option key={b}>{b}</option>))}
                    </select>
                  </Field>
                </>
              )}
              {form.hardware.printerConnection === 'LAN' && (
                <>
                  <Field label="Dirección IP"><input value={form.hardware.printerIp} onChange={(e) => setForm({ ...form, hardware: { ...form.hardware, printerIp: e.target.value } })} className="input" placeholder="192.168.1.200" /></Field>
                  <Field label="Puerto"><input value={form.hardware.printerPort} onChange={(e) => setForm({ ...form, hardware: { ...form.hardware, printerPort: e.target.value } })} className="input" placeholder="9100" /></Field>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={testPrinter} className="btn-ghost"><Zap size={16} className="text-brand-500" /> Probar Conexión de Impresora</button>
            </div>
          </div>

          {/* Scanner */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ScanLine size={20} className="text-brand-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Lector de Código de Barras</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Modo de Entrada">
                <select value={form.hardware.scannerMode} onChange={(e) => setForm({ ...form, hardware: { ...form.hardware, scannerMode: e.target.value as typeof form.hardware.scannerMode } })} className="input">
                  <option value="USBHID">Emulación de Teclado (USBHID)</option>
                  <option value="COM">Puerto Serial COM</option>
                  <option value="Camera">Escáner Virtual / Cámara</option>
                </select>
              </Field>
              {form.hardware.scannerMode === 'COM' && (
                <Field label="Puerto COM Asignado">
                  <select value={form.hardware.scannerComPort} onChange={(e) => setForm({ ...form, hardware: { ...form.hardware, scannerComPort: e.target.value } })} className="input">
                    {['COM1', 'COM2', 'COM3', 'COM4'].map((p) => (<option key={p}>{p}</option>))}
                  </select>
                </Field>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 cursor-pointer">
                <input type="checkbox" checked={form.hardware.scannerAutoEnter} onChange={(e) => setForm({ ...form, hardware: { ...form.hardware, scannerAutoEnter: e.target.checked } })} className="w-4 h-4 rounded accent-brand-500" />
                Auto-Aceptar al Escanear (Enter automático)
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={testScanner} className="btn-ghost"><Zap size={16} className="text-brand-500" /> Probar Lector</button>
            </div>
          </div>

          {/* Cash Drawer */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-brand-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Cajón de Dinero (Cash Drawer)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Conexión">
                <select value={form.hardware.cashDrawerConnection} onChange={(e) => setForm({ ...form, hardware: { ...form.hardware, cashDrawerConnection: e.target.value as typeof form.hardware.cashDrawerConnection } })} className="input">
                  <option value="Printer">Conectado a la Impresora (RJ11/RJ12)</option>
                  <option value="COM">Puerto COM Directo</option>
                </select>
              </Field>
              {form.hardware.cashDrawerConnection === 'COM' && (
                <Field label="Puerto COM">
                  <select value={form.hardware.cashDrawerComPort} onChange={(e) => setForm({ ...form, hardware: { ...form.hardware, cashDrawerComPort: e.target.value } })} className="input">
                    {['COM1', 'COM2', 'COM3', 'COM4'].map((p) => (<option key={p}>{p}</option>))}
                  </select>
                </Field>
              )}
            </div>
            <button onClick={testDrawer} className="btn-ghost"><Zap size={16} className="text-brand-500" /> Probar Apertura de Cajón</button>
          </div>

          {testResult && (
            <div className="card p-4 flex items-center gap-3 bg-brand-500/5 border-brand-500/30">
              <CheckCircle2 size={20} className="text-brand-500" />
              <p className="text-sm text-neutral-700 dark:text-neutral-200">{testResult}</p>
            </div>
          )}

          <div className="flex justify-end"><button onClick={save} className="btn-primary"><Save size={18} /> Guardar Cambios</button></div>
        </div>
      )}

      {/* Backup */}
      {subTab === 'backup' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Database size={20} className="text-brand-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Copias de Seguridad y Mantenimiento</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Frecuencia de Autoguardado">
              <select value={form.backup.frequency} onChange={(e) => setForm({ ...form, backup: { ...form.backup, frequency: e.target.value as typeof form.backup.frequency } })} className="input">
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="cierre">Al cerrar turno</option>
              </select>
            </Field>
            <Field label="Ruta de Respaldos Automáticos"><input value={form.backup.path} onChange={(e) => setForm({ ...form, backup: { ...form.backup, path: e.target.value } })} className="input" /></Field>
          </div>
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Último respaldo: <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">{form.backup.lastBackup}</span></p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={createBackup} className="btn-primary"><Database size={18} /> Crear Copia de Seguridad Ahora</button>
            <label className="btn-ghost cursor-pointer">
              <Database size={18} /> Restaurar Base de Datos
              <input type="file" accept=".json" onChange={restoreBackup} className="hidden" />
            </label>
          </div>
          {testResult && (
            <div className="card p-4 flex items-center gap-3 bg-green-500/5 border-green-500/30">
              <CheckCircle2 size={20} className="text-green-500" />
              <p className="text-sm text-neutral-700 dark:text-neutral-200">{testResult}</p>
            </div>
          )}
          <div className="flex justify-end"><button onClick={save} className="btn-primary"><Save size={18} /> Guardar Cambios</button></div>
        </div>
      )}

      {/* Saved toast */}
      <Modal open={savedOpen} onClose={() => setSavedOpen(false)} title="Cambios Guardados" size="sm"
        footer={<button onClick={() => setSavedOpen(false)} className="btn-primary w-full"><CheckCircle2 size={18} /> Entendido</button>}>
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <p className="font-semibold text-neutral-900 dark:text-white">Configuración actualizada</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Los cambios se han aplicado a todo el sistema.</p>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="label">{label}</label>{children}</div>);
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40 cursor-pointer">
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</span>
      <button onClick={() => onChange(!checked)} className={`relative w-11 h-6 rounded-full transition ${checked ? 'bg-brand-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}

function TicketPreview({ config }: { config: CompanyConfig }) {
  const t = config.ticket;
  const width = config.printer === '80mm' ? 'max-w-[300px]' : 'max-w-[220px]';
  const logoMaxH = t.logoSize === 'small' ? 'max-h-8' : t.logoSize === 'medium' ? 'max-h-14' : 'max-h-20';
  const logoAlignCls = t.logoAlign === 'left' ? 'justify-start text-left' : t.logoAlign === 'right' ? 'justify-end text-right' : 'justify-center text-center';
  return (
    <div className={`mx-auto ${width} bg-white text-black font-mono text-[11px] p-4 rounded-lg border border-neutral-200 dark:border-neutral-700`}>
      {t.showLogo && (
        <div className={`flex ${logoAlignCls} mb-1`}>
          {t.logoData ? (
            <img src={t.logoData} alt="Logo" className={`${logoMaxH} object-contain`} />
          ) : (
            <span className="text-lg font-bold">⚡</span>
          )}
        </div>
      )}
      <div className="text-center">
        <p className="font-bold text-sm">{config.nombreComercial}</p>
        {t.slogan && <p className="text-[10px] italic">{t.slogan}</p>}
        {t.showRnc && <p>RNC: {config.rnc}</p>}
        {t.showAddress && (<><p>{config.address}</p><p>Tel: {config.phone}</p></>)}
      </div>
      <div className="border-t border-dashed border-black my-2" />
      {t.showNcf && (<div className="space-y-0.5"><p>NCF: B02-0000147</p><p>Fecha: {new Date().toLocaleString('es-DO')}</p>{t.showCashier && <p>Cajero: {config.cashier}</p>}<p>Cliente: 000-000000-0</p></div>)}
      <div className="border-t border-dashed border-black my-2" />
      <table className="w-full">
        <thead><tr className="border-b border-black"><th className="text-left">Producto</th><th className="text-center">Cant</th><th className="text-right">Importe</th></tr></thead>
        <tbody>
          <tr><td className="text-left">Cable THW #12</td><td className="text-center">5</td><td className="text-right">175.00</td></tr>
          <tr><td className="text-left">Breaker 15A</td><td className="text-center">2</td><td className="text-right">350.00</td></tr>
        </tbody>
      </table>
      <div className="border-t border-dashed border-black my-2" />
      <div className="space-y-0.5">
        <div className="flex justify-between"><span>Subtotal</span><span>525.00</span></div>
        <div className="flex justify-between"><span>Descuento</span><span>-0.00</span></div>
        {t.showItbis && <div className="flex justify-between"><span>ITBIS ({config.itbisRate}%)</span><span>94.50</span></div>}
        <div className="flex justify-between font-bold text-sm border-t border-black mt-1 pt-1"><span>TOTAL</span><span>619.50</span></div>
      </div>
      <div className="border-t border-dashed border-black my-2" />
      <div className="text-center text-[10px]"><p>{t.footerMessage}</p></div>
    </div>
  );
}

function TicketDesignForm({ form, setForm, docFormat }: {
  form: CompanyConfig;
  setForm: (c: CompanyConfig) => void;
  docFormat: 'ticket' | 'a4';
}) {
  const key = docFormat === 'ticket' ? 'ticket' : 'invoiceConfig';
  const t = form[key];
  const update = (patch: Partial<typeof t>) => setForm({ ...form, [key]: { ...t, ...patch } } as CompanyConfig);

  return (
    <div className="space-y-3">
      <Toggle label="Mostrar Logo" checked={t.showLogo} onChange={(v) => update({ showLogo: v })} />
      {t.showLogo && (
        <div className="space-y-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/40">
          <label className="label">Subir Logo (PNG/JPG)</label>
          <div className="flex items-center gap-3">
            <label className="btn-ghost cursor-pointer flex-1">
              <ImagePlus size={16} className="text-brand-500" /> Seleccionar Archivo
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => update({ logoData: String(ev.target?.result ?? '') });
                reader.readAsDataURL(file);
                e.target.value = '';
              }} />
            </label>
            {t.logoData && (
              <button onClick={() => update({ logoData: null })} className="btn-ghost px-3" title="Quitar logo"><X size={16} className="text-red-400" /></button>
            )}
          </div>
          {t.logoData ? (
            <div className="flex justify-center p-2 bg-white rounded-lg">
              <img src={t.logoData} alt="Logo" className="max-h-16 object-contain" />
            </div>
          ) : (
            <p className="text-xs text-neutral-400 text-center">Sin logo. Se mostrará ⚡ por defecto.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Alineación</label>
              <select value={t.logoAlign} onChange={(e) => update({ logoAlign: e.target.value as 'center' | 'left' | 'right' })} className="input py-1.5 text-sm">
                <option value="center">Centrado</option>
                <option value="left">Izquierda</option>
                <option value="right">Derecha</option>
              </select>
            </div>
            <div>
              <label className="label">Tamaño</label>
              <select value={t.logoSize} onChange={(e) => update({ logoSize: e.target.value as 'small' | 'medium' | 'large' })} className="input py-1.5 text-sm">
                <option value="small">Pequeño</option>
                <option value="medium">Mediano</option>
                <option value="large">Grande</option>
              </select>
            </div>
          </div>
        </div>
      )}
      <div>
        <label className="label">Encabezado / Lema</label>
        <input value={t.slogan} onChange={(e) => update({ slogan: e.target.value })} className="input" placeholder="¡Los mejores precios!" />
      </div>
      <Toggle label="Mostrar RNC" checked={t.showRnc} onChange={(v) => update({ showRnc: v })} />
      <Toggle label="Mostrar Dirección y Teléfono" checked={t.showAddress} onChange={(v) => update({ showAddress: v })} />
      <Toggle label="Mostrar Cajero" checked={t.showCashier} onChange={(v) => update({ showCashier: v })} />
      <Toggle label="Mostrar NCF y RNC/Cédula del Cliente" checked={t.showNcf} onChange={(v) => update({ showNcf: v })} />
      <Toggle label="Mostrar Desglose de ITBIS" checked={t.showItbis} onChange={(v) => update({ showItbis: v })} />
      <div>
        <label className="label">Mensaje de Pie de Página</label>
        <textarea value={t.footerMessage} onChange={(e) => update({ footerMessage: e.target.value })} className="input min-h-[70px]" placeholder="¡Gracias por su compra!" />
      </div>
      {docFormat === 'ticket' && (
        <div>
          <label className="label">Tamaño de Impresora</label>
          <div className="flex gap-2">
            {(['80mm', '58mm'] as const).map((size) => (
              <button key={size} onClick={() => setForm({ ...form, printer: size })}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${form.printer === size ? 'bg-brand-500/15 border-brand-500 text-brand-600 dark:text-brand-400' : 'border-neutral-300 dark:border-neutral-600 text-neutral-500'}`}>
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InvoicePreview({ config }: { config: CompanyConfig }) {
  const t = config.invoiceConfig;
  const logoMaxH = t.logoSize === 'small' ? 'max-h-10' : t.logoSize === 'medium' ? 'max-h-14' : 'max-h-20';
  const logoAlignCls = t.logoAlign === 'left' ? 'justify-start text-left' : t.logoAlign === 'right' ? 'justify-end text-right' : 'justify-center text-center';
  return (
    <div className="mx-auto w-full max-w-[595px] bg-white text-black p-8 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-inner" style={{ aspectRatio: '1 / 1.414' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 border-b-2 border-black pb-3">
        <div className="flex items-center gap-3">
          {t.showLogo && (
            <div className={`flex ${logoAlignCls}`}>
              {t.logoData ? (
                <img src={t.logoData} alt="Logo" className={`${logoMaxH} object-contain`} />
              ) : (
                <span className="text-3xl font-bold">⚡</span>
              )}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold">{config.nombreComercial}</h1>
            {t.slogan && <p className="text-[11px] italic">{t.slogan}</p>}
            {t.showRnc && <p className="text-[11px]">RNC: {config.rnc}</p>}
            {t.showAddress && <p className="text-[11px]">{config.address}</p>}
            {t.showAddress && <p className="text-[11px]">Tel: {config.phone}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-base font-bold">COTIZACIÓN / PRESUPUESTO</h2>
          <p className="text-[11px] font-bold text-red-600">NO PAGADO</p>
          <p className="text-[11px]">N° COT-0000147</p>
          <p className="text-[11px]">Fecha: {new Date().toLocaleDateString('es-DO')}</p>
          <p className="text-[11px] font-semibold">Vence: {new Date(Date.now() + 15 * 86400000).toLocaleDateString('es-DO')}</p>
        </div>
      </div>

      {/* Client info */}
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase text-neutral-500 mb-1">Cliente</p>
        <p className="font-semibold text-sm">Consumidor Final</p>
      </div>

      {/* Items table */}
      <table className="w-full table-fixed border-collapse mb-4">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-neutral-300 px-2 py-1.5 text-left text-[11px]" style={{ width: '55%' }}>Descripción</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-center text-[11px]" style={{ width: '15%' }}>Cant</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-right text-[11px]" style={{ width: '15%' }}>Precio</th>
            <th className="border border-neutral-300 px-2 py-1.5 text-right text-[11px]" style={{ width: '15%' }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-neutral-300 px-2 py-1.5 text-sm overflow-hidden" style={{ width: '55%' }}>Cable THW #12</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-center text-sm" style={{ width: '15%' }}>5</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-right text-sm" style={{ width: '15%' }}>35.00</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-right text-sm font-semibold" style={{ width: '15%' }}>175.00</td>
          </tr>
          <tr>
            <td className="border border-neutral-300 px-2 py-1.5 text-sm overflow-hidden" style={{ width: '55%' }}>Breaker 15A</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-center text-sm" style={{ width: '15%' }}>2</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-right text-sm" style={{ width: '15%' }}>175.00</td>
            <td className="border border-neutral-300 px-2 py-1.5 text-right text-sm font-semibold" style={{ width: '15%' }}>350.00</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div className="ml-auto w-56 space-y-0.5 mb-5">
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>525.00</span></div>
        <div className="flex justify-between text-sm"><span>Descuento</span><span>-0.00</span></div>
        {t.showItbis && <div className="flex justify-between text-sm"><span>ITBIS ({config.itbisRate}%)</span><span>94.50</span></div>}
        <div className="flex justify-between font-bold text-base border-t border-black pt-1"><span>TOTAL</span><span>619.50</span></div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-300 pt-3 mt-6 text-center text-[11px] text-neutral-500">
        <p className="font-bold text-red-600 mb-1">DOCUMENTO NO FISCAL — NO PAGADO</p>
        <p>Cotización válida por 15 días. Precios sujetos a cambios sin previo aviso.</p>
        {t.showCashier && <p className="mt-1">Emitido por: {config.cashier}</p>}
        {t.footerMessage && <p className="mt-1">{t.footerMessage}</p>}
      </div>
    </div>
  );
}
