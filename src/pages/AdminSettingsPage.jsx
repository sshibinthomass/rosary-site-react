import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { updateSettings } from '../services/settingsService';
import { useToast } from '../context/ToastContext';

function ToggleRow({ label, description, value, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-[var(--border-color)] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-forest)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
          ${value ? 'bg-[var(--color-forest)]' : 'bg-[var(--bg-tertiary)]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
            ${value ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { settings, setSettings } = useSettings();
  const { success: toastSuccess, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);

  async function handleToggle(key, value) {
    setSaving(true);
    try {
      const next = { ...settings, [key]: value };
      await updateSettings({ [key]: value });
      setSettings(next);
      toastSuccess('Settings saved');
    } catch {
      toastError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in pb-20 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-forest)]">Site Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Configure what is shown to customers on the home page.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">
          Home Page
        </h2>

        <ToggleRow
          label="Show plant description"
          description="When off, the 'About this plant' section is hidden in the quick-view modal on the home page. Reduces data sent to customers."
          value={settings.showPlantDescription}
          onChange={(v) => handleToggle('showPlantDescription', v)}
          disabled={saving}
        />
      </div>
    </div>
  );
}
