import { useState } from 'react';
import { Lock, User, ArrowRight, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { TolselLogo } from '@/components/TolselLogo';
import type { Theme } from '@/types';

interface LoginProps {
  onLogin: (username: string, remember: boolean) => void;
  theme: Theme;
  toggleTheme: () => void;
}

export function Login({ onLogin, theme, toggleTheme }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (!username.trim()) {
        setError('Ingrese su nombre de usuario');
        return;
      }
      if (!password) {
        setError('Ingrese su contraseña');
        return;
      }
      onLogin(username, remember);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-400/5 rounded-full blur-3xl" />

      {/* Theme switch top-right */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-3 rounded-xl bg-white/60 dark:bg-neutral-800/60 backdrop-blur border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition z-10"
        title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <TolselLogo className="w-20 h-20" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="text-slate-900 dark:text-white font-bold">Tol</span><span className="text-amber-500 font-bold">sel</span>
            <span className="text-slate-900 dark:text-white font-bold"> POS</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Make it with us</p>
        </div>

        <form onSubmit={submit} className="card p-7 space-y-5">
          <div>
            <label className="label">Usuario</label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input pl-11"
                placeholder="Ingrese su usuario"
                autoComplete="username"
                required
                autoFocus
              />
            </div>
          </div>
          <div>
            <label className="label">Contraseña</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-11 pr-11"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition">
              Recordar mi usuario / Mantener sesión iniciada
            </span>
          </label>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
            {loading ? (
              <span className="w-5 h-5 border-2 border-neutral-900/30 border-t-neutral-900 rounded-full animate-spin" />
            ) : (
              <>
                Iniciar Sesión <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        <div className="flex items-center justify-center gap-2 mt-6">
          <TolselLogo className="w-5 h-5" />
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            Tolsel POS, Versión 1.0, Desarrollado por Elio Torres
          </p>
        </div>
      </div>
    </div>
  );
}
