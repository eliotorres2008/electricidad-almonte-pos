import { useEffect, useState } from 'react';
import { Sun, Moon, LogOut, Clock } from 'lucide-react';
import { TolselLogo } from '@/components/TolselLogo';
import type { Theme, CompanyConfig } from '@/types';
import { greeting, nowString, dateString } from '@/lib/format';

interface HeaderProps {
  theme: Theme;
  toggleTheme: () => void;
  onLogout: () => void;
  config: CompanyConfig;
  activeTab: string;
  userName: string;
}

const TAB_LABELS: Record<string, string> = {
  ventas: 'Ventas / Caja',
  inventario: 'Inventario',
  nomina: 'Nómina y Personal',
  reportes: 'Reportes & Dashboard',
  seguridad: 'Seguridad y Auditoría',
  configuracion: 'Configuración',
  caja: 'Caja / Finanzas',
};

export function Header({ theme, toggleTheme, onLogout, config, activeTab, userName }: HeaderProps) {
  const [time, setTime] = useState(nowString());

  useEffect(() => {
    const t = setInterval(() => setTime(nowString()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800">
      <div className="px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <TolselLogo className="w-16 h-16 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-extrabold leading-tight truncate">
              <span className="text-slate-900 dark:text-white font-bold text-xl">Tol</span><span className="text-amber-500 font-bold text-xl">sel</span>
            </h1>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate hidden sm:block">
              {TAB_LABELS[activeTab] ?? 'POS'}
            </p>
          </div>
        </div>

        {/* Center-left: greeting + date (aligned left) */}
        <div className="hidden lg:block flex-1 pl-6">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            {greeting()}, <span className="text-brand-500">{userName || config.cashier.split(' ')[0]}</span>!
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{dateString()}</p>
        </div>

        {/* Right: clock + theme + logout */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/50">
            <Clock size={16} className="text-brand-500" />
            <span className="font-mono font-semibold text-sm text-neutral-700 dark:text-neutral-200 tabular-nums">{time}</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 hover:bg-neutral-200 dark:hover:bg-neutral-700/80 text-neutral-600 dark:text-neutral-300 transition"
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={onLogout} className="btn-ghost text-sm">
            <LogOut size={16} />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Mobile greeting + clock */}
      <div className="lg:hidden px-4 pb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          {greeting()}, <span className="text-brand-500">{config.cashier.split(' ')[0]}</span>!
        </p>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-brand-500" />
          <span className="font-mono font-semibold text-xs text-neutral-600 dark:text-neutral-300 tabular-nums">{time}</span>
        </div>
      </div>
    </header>
  );
}
