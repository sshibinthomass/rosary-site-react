import { useToast } from '../context/ToastContext';
import Icon from './Icon';

const TOAST_TONES = {
  success: {
    className: 'bg-[var(--panel-deep)] text-[var(--panel-deep-text)]',
    icon: 'check',
  },
  error: {
    className: 'bg-[var(--color-accent-700)] text-[var(--color-accent-100)]',
    icon: 'alert',
  },
  info: {
    className: 'bg-[var(--color-terracotta)] text-[#f5ead8]',
    icon: 'info',
  },
};

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[100] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0">
      {toasts.map((toast) => {
        const tone = TOAST_TONES[toast.type] || TOAST_TONES.info;

        return (
          <div
            key={toast.id}
            role="status"
            className={`animate-slide-up flex items-center gap-3 rounded-full px-4 py-3 shadow-[var(--shadow-lifted)] ${tone.className}`}
            onClick={() => removeToast(toast.id)}
          >
            <Icon name={tone.icon} className="h-[18px] w-[18px] shrink-0" />
            <p className="flex-1 text-sm font-semibold">{toast.message}</p>
            <button
              type="button"
              className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
