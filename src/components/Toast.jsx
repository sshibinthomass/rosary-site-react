import { useToast } from '../context/ToastContext';

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[90vw] sm:max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            animate-slide-up flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
            ${toast.type === 'success' ? 'bg-[var(--color-forest)] text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${toast.type === 'info' ? 'bg-[var(--color-terracotta)] text-white' : ''}
          `}
          onClick={() => removeToast(toast.id)}
        >
          {/* Icon */}
          <span className="text-lg">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
          </span>
          
          {/* Message */}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          
          {/* Close */}
          <button 
            className="opacity-70 hover:opacity-100 transition-opacity"
            onClick={() => removeToast(toast.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
