import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { updateSettings } from '../services/settingsService';
import { useToast } from '../context/ToastContext';
import {
  getAllPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode
} from '../services/promoService';
import { CURRENCY } from '../config/constants';

const BG_PRESETS = [
  { label: 'Forest', value: '#2d6a4f' },
  { label: 'Terracotta', value: '#c25a3a' },
  { label: 'Navy', value: '#1e3a5f' },
  { label: 'Purple', value: '#6b2d8e' },
  { label: 'Amber', value: '#b45309' },
  { label: 'Rose', value: '#be185d' },
  { label: 'Teal', value: '#0f766e' },
  { label: 'Slate', value: '#334155' },
];

const EMPTY_POPUP = {
  enabled: false,
  title: '',
  message: '',
  emoji: '🎉',
  buttonText: '',
  buttonLink: '',
  bgColor: '#2d6a4f',
  textColor: '#ffffff',
  showOnce: true,
};

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

const EMPTY_FORM = {
  code: '',
  type: 'percentage',
  value: '',
  minOrderAmount: '',
  active: true,
  description: ''
};

export default function AdminSettingsPage() {
  const { settings, setSettings } = useSettings();
  const { success: toastSuccess, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);

  // Popup state
  const [popupForm, setPopupForm] = useState(EMPTY_POPUP);
  const [popupSaving, setPopupSaving] = useState(false);
  const [showPopupPreview, setShowPopupPreview] = useState(false);

  // Promo codes state
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoLoading, setPromoLoading] = useState(true);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [editingCode, setEditingCode] = useState(null); // null = create, string = editing existing code key
  const [promoForm, setPromoForm] = useState(EMPTY_FORM);
  const [promoSaving, setPromoSaving] = useState(false);
  const [deletingCode, setDeletingCode] = useState(null);

  useEffect(() => {
    loadPromoCodes();
  }, []);

  // Load popup form from settings once available
  const popupInitialized = !!settings.popup;
  useEffect(() => {
    if (settings.popup) {
      setPopupForm({ ...EMPTY_POPUP, ...settings.popup });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupInitialized]);

  async function loadPromoCodes() {
    setPromoLoading(true);
    try {
      const codes = await getAllPromoCodes();
      setPromoCodes(codes.sort((a, b) => a.code.localeCompare(b.code)));
    } catch {
      toastError('Failed to load promo codes');
    } finally {
      setPromoLoading(false);
    }
  }

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

  async function handlePopupToggle(value) {
    const next = { ...popupForm, enabled: value };
    setPopupForm(next);
    setSaving(true);
    try {
      await updateSettings({ popup: next });
      setSettings(s => ({ ...s, popup: next }));
      toastSuccess(value ? 'Popup enabled' : 'Popup disabled');
    } catch {
      toastError('Failed to update popup');
      setPopupForm(f => ({ ...f, enabled: !value }));
    } finally {
      setSaving(false);
    }
  }

  async function handlePopupSave(e) {
    e.preventDefault();
    if (!popupForm.title.trim() && !popupForm.message.trim()) {
      return toastError('Add a title or message for the popup');
    }
    setPopupSaving(true);
    try {
      await updateSettings({ popup: popupForm });
      setSettings(s => ({ ...s, popup: popupForm }));
      toastSuccess('Popup saved');
    } catch {
      toastError('Failed to save popup');
    } finally {
      setPopupSaving(false);
    }
  }

  function openCreate() {
    setEditingCode(null);
    setPromoForm(EMPTY_FORM);
    setShowPromoForm(true);
  }

  function openEdit(promo) {
    setEditingCode(promo.code);
    setPromoForm({
      code: promo.code,
      type: promo.type,
      value: String(promo.value),
      minOrderAmount: String(promo.minOrderAmount || ''),
      active: promo.active,
      description: promo.description || ''
    });
    setShowPromoForm(true);
  }

  async function handlePromoSubmit(e) {
    e.preventDefault();
    if (!promoForm.code.trim()) return toastError('Code is required');
    if (!promoForm.value || isNaN(Number(promoForm.value)) || Number(promoForm.value) <= 0) {
      return toastError('Discount value must be a positive number');
    }
    if (promoForm.type === 'percentage' && Number(promoForm.value) > 100) {
      return toastError('Percentage discount cannot exceed 100%');
    }

    setPromoSaving(true);
    try {
      if (editingCode) {
        await updatePromoCode(editingCode, {
          type: promoForm.type,
          value: Number(promoForm.value),
          minOrderAmount: Number(promoForm.minOrderAmount) || 0,
          active: promoForm.active,
          description: promoForm.description
        });
        toastSuccess('Promo code updated');
      } else {
        const existing = promoCodes.find(p => p.code === promoForm.code.toUpperCase().trim());
        if (existing) return toastError('A promo code with this name already exists');
        await createPromoCode(promoForm);
        toastSuccess('Promo code created');
      }
      setShowPromoForm(false);
      await loadPromoCodes();
    } catch {
      toastError('Failed to save promo code');
    } finally {
      setPromoSaving(false);
    }
  }

  async function handleToggleActive(promo) {
    try {
      await updatePromoCode(promo.code, { active: !promo.active });
      setPromoCodes(prev =>
        prev.map(p => p.code === promo.code ? { ...p, active: !p.active } : p)
      );
    } catch {
      toastError('Failed to update promo code');
    }
  }

  async function handleDelete(code) {
    setDeletingCode(code);
    try {
      await deletePromoCode(code);
      setPromoCodes(prev => prev.filter(p => p.code !== code));
      toastSuccess('Promo code deleted');
    } catch {
      toastError('Failed to delete promo code');
    } finally {
      setDeletingCode(null);
    }
  }

  return (
    <div className="animate-fade-in pb-20 max-w-2xl space-y-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-forest)]">Site Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Configure what is shown to customers on the home page.
        </p>
      </div>

      {/* Display Settings */}
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

      {/* Announcement Popup */}
      <div className="card p-5 space-y-5">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Announcement Popup
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Show a customizable popup to customers when they visit the site.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium ${popupForm.enabled ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-secondary)]'}`}>
              {popupForm.enabled ? 'Live' : 'Off'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={popupForm.enabled}
              disabled={saving}
              onClick={() => handlePopupToggle(!popupForm.enabled)}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-forest)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                ${popupForm.enabled ? 'bg-green-500' : 'bg-[var(--bg-tertiary)]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${popupForm.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        <form onSubmit={handlePopupSave} className="space-y-4">
          {/* Emoji + Title row */}
          <div className="flex gap-3">
            <div className="w-24 shrink-0">
              <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">Emoji</label>
              <input
                type="text"
                value={popupForm.emoji}
                onChange={e => setPopupForm(f => ({ ...f, emoji: e.target.value }))}
                className="input text-center text-2xl"
                placeholder="🎉"
                maxLength={4}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">Title</label>
              <input
                type="text"
                value={popupForm.title}
                onChange={e => setPopupForm(f => ({ ...f, title: e.target.value }))}
                className="input text-sm"
                placeholder="e.g. Weekend Special Offer!"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">Message</label>
            <textarea
              value={popupForm.message}
              onChange={e => setPopupForm(f => ({ ...f, message: e.target.value }))}
              className="input text-sm resize-none"
              rows={3}
              placeholder="e.g. Get 20% off on all succulents this weekend. Use code SAVE20 at checkout."
            />
          </div>

          {/* Button Text + Link */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">
                Button Text <span className="text-[var(--text-secondary)]">(optional)</span>
              </label>
              <input
                type="text"
                value={popupForm.buttonText}
                onChange={e => setPopupForm(f => ({ ...f, buttonText: e.target.value }))}
                className="input text-sm"
                placeholder="e.g. Shop Now"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">
                Button Link <span className="text-[var(--text-secondary)]">(optional)</span>
              </label>
              <input
                type="text"
                value={popupForm.buttonLink}
                onChange={e => setPopupForm(f => ({ ...f, buttonLink: e.target.value }))}
                className="input text-sm"
                placeholder="e.g. /category/Succulent"
                disabled={!popupForm.buttonText.trim()}
              />
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-2">Background Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {BG_PRESETS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  onClick={() => setPopupForm(f => ({ ...f, bgColor: value }))}
                  className={`w-8 h-8 rounded-lg transition-all hover:scale-110 active:scale-95 ${popupForm.bgColor === value ? 'ring-2 ring-offset-2 ring-[var(--color-forest)] scale-110' : ''}`}
                  style={{ backgroundColor: value }}
                />
              ))}
              {/* Custom color */}
              <label className="relative w-8 h-8 rounded-lg overflow-hidden cursor-pointer border-2 border-dashed border-[var(--border-color)] flex items-center justify-center hover:border-[var(--color-forest)] transition-colors" title="Custom color">
                <span className="text-[10px] text-[var(--text-secondary)] font-bold leading-none text-center">+</span>
                <input
                  type="color"
                  value={popupForm.bgColor}
                  onChange={e => setPopupForm(f => ({ ...f, bgColor: e.target.value }))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Selected: <code className="font-mono">{popupForm.bgColor}</code></p>
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-2">Text Color</label>
            <div className="flex gap-2">
              {[{ label: 'White', value: '#ffffff' }, { label: 'Dark', value: '#1a1a1a' }, { label: 'Light Gray', value: '#f0f0f0' }].map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPopupForm(f => ({ ...f, textColor: value }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${popupForm.textColor === value ? 'ring-2 ring-[var(--color-forest)]' : 'border-[var(--border-color)]'}`}
                  style={{ backgroundColor: value, color: value === '#ffffff' || value === '#f0f0f0' ? '#333' : '#fff' }}
                >
                  {label}
                </button>
              ))}
              <label className="relative px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-[var(--border-color)] flex items-center cursor-pointer hover:border-[var(--color-forest)] transition-colors gap-1" title="Custom text color">
                <span className="w-3 h-3 rounded-full border border-[var(--border-color)]" style={{ backgroundColor: popupForm.textColor }} />
                <span className="text-[var(--text-secondary)]">Custom</span>
                <input
                  type="color"
                  value={popupForm.textColor}
                  onChange={e => setPopupForm(f => ({ ...f, textColor: e.target.value }))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>

          {/* Show Once toggle */}
          <div className="flex items-center justify-between gap-4 py-3 border-t border-[var(--border-color)]">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Show once per session</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                When on, popup won't reappear after a customer closes it (until they reopen their browser).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={popupForm.showOnce}
              onClick={() => setPopupForm(f => ({ ...f, showOnce: !f.showOnce }))}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none
                ${popupForm.showOnce ? 'bg-[var(--color-forest)]' : 'bg-[var(--bg-tertiary)]'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${popupForm.showOnce ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Live Preview + Save row */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowPopupPreview(p => !p)}
              className="btn btn-secondary text-sm flex-1"
            >
              {showPopupPreview ? 'Hide Preview' : 'Preview Popup'}
            </button>
            <button
              type="submit"
              disabled={popupSaving}
              className="btn btn-primary text-sm flex-1 flex items-center justify-center gap-2"
            >
              {popupSaving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Save Popup'}
            </button>
          </div>
        </form>

        {/* Inline Preview */}
        {showPopupPreview && (
          <div className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-[var(--text-secondary)] ml-2">Customer view (preview)</span>
            </div>
            <div className="p-6 flex items-center justify-center bg-black/10">
              <div
                className="w-full max-w-xs rounded-2xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: popupForm.bgColor, color: popupForm.textColor }}
              >
                <div className="px-6 pt-6 pb-5 text-center relative">
                  <div
                    className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: 'rgba(0,0,0,0.25)', color: popupForm.textColor }}
                  >✕</div>
                  {popupForm.emoji && (
                    <div className="text-4xl mb-3 leading-none">{popupForm.emoji}</div>
                  )}
                  {popupForm.title && (
                    <h2 className="text-lg font-bold mb-2 leading-tight">{popupForm.title || 'Your Title Here'}</h2>
                  )}
                  {popupForm.message && (
                    <p className="text-xs leading-relaxed mb-4" style={{ opacity: 0.9 }}>
                      {popupForm.message || 'Your message will appear here.'}
                    </p>
                  )}
                  <div className={`flex gap-2 ${popupForm.buttonText.trim() ? '' : 'justify-center'}`}>
                    {popupForm.buttonText.trim() && (
                      <div
                        className="flex-1 py-2 px-3 rounded-xl font-semibold text-xs text-center"
                        style={{ backgroundColor: popupForm.textColor, color: popupForm.bgColor }}
                      >
                        {popupForm.buttonText}
                      </div>
                    )}
                    <div
                      className={`py-2 px-3 rounded-xl font-medium text-xs ${popupForm.buttonText.trim() ? '' : 'flex-1'}`}
                      style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: popupForm.textColor }}
                    >
                      Close
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Promo Codes master toggle */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">
          Promotions
        </h2>
        <ToggleRow
          label="Enable promo codes"
          description="When off, the promo code input is hidden from the cart page and no discounts can be applied by customers. Existing promo codes are preserved."
          value={settings.promoCodesEnabled ?? true}
          onChange={(v) => handleToggle('promoCodesEnabled', v)}
          disabled={saving}
        />
      </div>

      {/* Promo Codes */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Promo Codes
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Create and manage discount codes for customers.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="btn btn-primary text-sm px-3 py-1.5"
          >
            + New Code
          </button>
        </div>

        {/* Create / Edit Form */}
        {showPromoForm && (
          <form
            onSubmit={handlePromoSubmit}
            className="border border-[var(--border-color)] rounded-xl p-4 space-y-3 bg-[var(--bg-tertiary)] animate-fade-in"
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {editingCode ? `Edit: ${editingCode}` : 'New Promo Code'}
            </h3>

            {/* Code */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">
                Promo Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={promoForm.code}
                onChange={(e) => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="input text-sm uppercase"
                placeholder="e.g. SAVE20"
                disabled={!!editingCode}
                required
              />
              {editingCode && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Code key cannot be changed after creation.</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">
                Description (internal label)
              </label>
              <input
                type="text"
                value={promoForm.description}
                onChange={(e) => setPromoForm(p => ({ ...p, description: e.target.value }))}
                className="input text-sm"
                placeholder="e.g. Summer sale 20%"
              />
            </div>

            {/* Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">
                  Discount Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={promoForm.type}
                  onChange={(e) => setPromoForm(p => ({ ...p, type: e.target.value }))}
                  className="input text-sm"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="amount">Fixed Amount ({CURRENCY})</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">
                  {promoForm.type === 'percentage' ? 'Discount %' : `Discount ${CURRENCY}`}
                  <span className="text-red-500"> *</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={promoForm.type === 'percentage' ? '100' : undefined}
                  step="1"
                  value={promoForm.value}
                  onChange={(e) => setPromoForm(p => ({ ...p, value: e.target.value }))}
                  className="input text-sm"
                  placeholder={promoForm.type === 'percentage' ? 'e.g. 10' : 'e.g. 50'}
                  required
                />
              </div>
            </div>

            {/* Minimum Order Amount */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-primary)]/70 mb-1">
                Minimum Order Amount ({CURRENCY})
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={promoForm.minOrderAmount}
                onChange={(e) => setPromoForm(p => ({ ...p, minOrderAmount: e.target.value }))}
                className="input text-sm"
                placeholder="e.g. 500 (leave 0 for no minimum)"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Customer's cart must be at least this amount to use the code.
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={promoForm.active}
                onClick={() => setPromoForm(p => ({ ...p, active: !p.active }))}
                className={`relative shrink-0 w-10 h-5 rounded-full transition-colors duration-200
                  ${promoForm.active ? 'bg-[var(--color-forest)]' : 'bg-[var(--bg-secondary)] border border-[var(--border-color)]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
                  ${promoForm.active ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm text-[var(--text-primary)]">
                {promoForm.active ? 'Active (customers can use this code)' : 'Inactive (code is disabled)'}
              </span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPromoForm(false)}
                className="btn btn-secondary flex-1 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={promoSaving}
                className="btn btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {promoSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : editingCode ? 'Save Changes' : 'Create Code'}
              </button>
            </div>
          </form>
        )}

        {/* Promo Codes List */}
        {promoLoading ? (
          <div className="flex justify-center py-6">
            <span className="w-6 h-6 border-2 border-[var(--color-forest)]/30 border-t-[var(--color-forest)] rounded-full animate-spin" />
          </div>
        ) : promoCodes.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-secondary)] py-6">
            No promo codes yet. Create one above.
          </p>
        ) : (
          <div className="space-y-2">
            {promoCodes.map((promo) => (
              <div
                key={promo.code}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]"
              >
                {/* Active dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${promo.active ? 'bg-green-500' : 'bg-[var(--text-secondary)]/30'}`} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{promo.code}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                      ${promo.type === 'percentage'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                      {promo.type === 'percentage' ? `${promo.value}% off` : `${CURRENCY}${promo.value} off`}
                    </span>
                    {promo.minOrderAmount > 0 && (
                      <span className="text-xs text-[var(--text-secondary)]">
                        min {CURRENCY}{promo.minOrderAmount?.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  {promo.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{promo.description}</p>
                  )}
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Used {promo.usageCount || 0} time{promo.usageCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle active */}
                  <button
                    onClick={() => handleToggleActive(promo)}
                    className={`text-xs px-2 py-1 rounded-md font-medium transition-colors
                      ${promo.active
                        ? 'text-green-700 bg-green-100 hover:bg-green-200 dark:text-green-300 dark:bg-green-900/30 dark:hover:bg-green-900/50'
                        : 'text-[var(--text-secondary)] bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)]'}`}
                    title={promo.active ? 'Deactivate' : 'Activate'}
                  >
                    {promo.active ? 'Active' : 'Off'}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(promo)}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-1"
                    title="Edit"
                  >
                    ✏️
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(promo.code)}
                    disabled={deletingCode === promo.code}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors px-1 disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingCode === promo.code ? (
                      <span className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin inline-block" />
                    ) : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
