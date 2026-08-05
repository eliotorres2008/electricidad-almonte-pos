import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-4">
          <div className="card p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Ocurrió un error inesperado</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              La aplicación encontró un problema al cargar. Puede recargar la página para continuar.
            </p>
            <button onClick={() => window.location.reload()} className="btn-primary w-full">
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
