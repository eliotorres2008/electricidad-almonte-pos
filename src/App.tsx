import { useState, useEffect } from 'react';
import { ShoppingCart, Boxes, BarChart3, Shield, Settings, Wallet, Zap, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Login } from '@/components/Login';
import { Header } from '@/components/Header';
import { TolselLogo } from '@/components/TolselLogo';
import { Sales } from '@/modules/Sales';
import { Inventory } from '@/modules/Inventory';
import { Reports } from '@/modules/Reports';
import { Security } from '@/modules/Security';
import { Config } from '@/modules/Config';
import { Cash } from '@/modules/Cash';
import { Payroll } from '@/modules/Payroll';
import { Modal } from '@/components/Modal';
import { NumberField } from '@/components/NumberField';
import { Wallet as WalletIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

type Tab = 'ventas' | 'caja' | 'inventario' | 'nomina' | 'reportes' | 'seguridad' | 'configuracion';

const ALL_TABS: { key: Tab; label: string; icon: React.ReactNode; perm: string | null }[] = [
  { key: 'ventas', label: 'Ventas', icon: <ShoppingCart size={20} />, perm: 'ventas' },
  { key: 'caja', label: 'Caja', icon: <Wallet size={20} />, perm: null },
  { key: 'inventario', label: 'Inventario', icon: <Boxes size={20} />, perm: 'inventario' },
  { key: 'nomina', label: 'Nómina', icon: <Users size={20} />, perm: 'inventario' },
  { key: 'reportes', label: 'Reportes', icon: <BarChart3 size={20} />, perm: 'reportes' },
  { key: 'seguridad', label: 'Seguridad', icon: <Shield size={20} />, perm: 'seguridad' },
  { key: 'configuracion', label: 'Configuración', icon: <Settings size={20} />, perm: 'configuracion' },
];

const VALID_TABS: Tab[] = ['ventas', 'caja', 'inventario', 'nomina', 'reportes', 'seguridad', 'configuracion'];

function hashToTab(): Tab {
  const h = window.location.hash.replace('#/', '').replace('#', '') as Tab;
  return VALID_TABS.includes(h) ? h : 'ventas';
}

function App() {
  const app = useApp();
  const [tab, setTab] = useState<Tab>(hashToTab());
  const [accessDenied, setAccessDenied] = useState(false);
  const [cashOpenModal, setCashOpenModal] = useState(false);
  const [openAmount, setOpenAmount] = useState(0);

  // Hash-based routing: keep tab in sync with location.hash
  useEffect(() => {
    if (!app.loggedIn) return;
    const onHashChange = () => {
      const requested = hashToTab();
      const allowed = visibleTabs.some((t) => t.key === requested);
      if (!allowed) {
        setAccessDenied(true);
        setTab('ventas');
        window.location.hash = '#/ventas';
        setTimeout(() => setAccessDenied(false), 3000);
      } else {
        setAccessDenied(false);
        setTab(requested);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [app.loggedIn]);

  const navigate = (newTab: Tab) => {
    window.location.hash = `#/${newTab}`;
    setTab(newTab);
    setAccessDenied(false);
  };

  const handleLogin = (username: string, remember: boolean) => {
    app.login(username, remember);
    if (!app.cashSession) setCashOpenModal(true);
  };

  const handleLogout = () => app.logout();

  const openCash = () => {
    app.openCash(openAmount);
    setCashOpenModal(false);
    setOpenAmount(0);
  };

  const visibleTabs = ALL_TABS.filter((t) => !t.perm || (app.currentUser?.permissions?.[t.perm] ?? false));

  if (!app.loggedIn) {
    return <Login onLogin={handleLogin} theme={app.theme} toggleTheme={app.toggleTheme} />;
  }

  return (
    <div className="h-screen bg-neutral-100 dark:bg-neutral-950 flex flex-col overflow-hidden">
      <Header theme={app.theme} toggleTheme={app.toggleTheme} onLogout={handleLogout} config={app.config} activeTab={tab} userName={app.currentUser?.name?.split(' ')[0] ?? app.config.cashier.split(' ')[0]} />

      {accessDenied && (
        <div className="bg-red-500 text-white text-center py-2 text-sm font-semibold animate-slide-up">
          Acceso Restringido — No tiene permiso para ver esta sección. Redirigiendo a Ventas...
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-16 lg:w-56 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 backdrop-blur p-2 lg:p-3 flex flex-col gap-1 overflow-y-auto">
          {visibleTabs.map((t) => (
            <button key={t.key} onClick={() => navigate(t.key)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl font-semibold text-sm transition group ${tab === t.key ? 'bg-brand-500 text-neutral-900 shadow-lg shadow-brand-500/20' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 hover:text-neutral-800 dark:hover:text-neutral-200'}`}>
              <span className="shrink-0">{t.icon}</span>
              <span className="hidden lg:inline">{t.label}</span>
            </button>
          ))}

          {/* Cash status indicator */}
          <div className="mt-auto hidden lg:block">
            <div className={`p-3 rounded-xl border text-xs ${app.isCashOpen ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' : 'bg-neutral-100 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/40 text-neutral-500'}`}>
              <p className="font-semibold flex items-center gap-1.5">
                <WalletIcon size={14} /> {app.isCashOpen ? 'Caja Abierta' : 'Caja Cerrada'}
              </p>
              {app.isCashOpen && <p className="mt-1 tabular-nums">{formatCurrency(app.cashBalance ?? 0)}</p>}
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto">
            {tab === 'ventas' && (
              <Sales />
            )}
            {tab === 'caja' && (
              <Cash />
            )}
            {tab === 'inventario' && (
              <Inventory />
            )}
            {tab === 'nomina' && (
              <Payroll />
            )}
            {tab === 'reportes' && (
              <Reports />
            )}
            {tab === 'seguridad' && (
              <Security />
            )}
            {tab === 'configuracion' && (
              <Config />
            )}
          </div>

          {/* Footer */}
          <footer className="mt-4 py-3 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <p className="text-xs text-neutral-400 dark:text-neutral-600">
              <TolselLogo className="w-5 h-5 inline-block mr-1 align-middle" /> Tolsel POS, Versión 1.0, Desarrollado por Elio Torres
            </p>
          </footer>
        </main>
      </div>

      {/* Cash Opening Modal */}
      <Modal
        open={cashOpenModal}
        onClose={() => setCashOpenModal(false)}
        title="Apertura de Caja"
        subtitle="Ingresa el fondo inicial de cambio para iniciar el turno"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setCashOpenModal(false)} className="btn-ghost flex-1">Saltar</button>
            <button onClick={openCash} className="btn-primary flex-1"><WalletIcon size={18} /> Abrir Caja</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-brand-500/10 border border-brand-500/30 p-4 text-center">
            <WalletIcon size={32} className="text-brand-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Bienvenido, <span className="font-bold text-brand-500">{app.config.cashier}</span></p>
            <p className="text-xs text-neutral-400 mt-1">Registra el monto inicial de efectivo en caja</p>
          </div>
          <div>
            <label className="label">Fondo Inicial (Monto de Cambio)</label>
            <NumberField value={openAmount} onChange={setOpenAmount} min={0} prefix="RD$" />
          </div>
          <p className="text-xs text-neutral-400">Mínimo recomendado: {formatCurrency(app.config.minCashFloat)}</p>
        </div>
      </Modal>
    </div>
  );
}

export default App;
