import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { useToast } from '../context/ToastContext';
import { CURRENCY } from '../config/constants';
import { compressImage } from '../utils/imageCompressor';
import {
  getLimitedPlants,
  addLimitedPlant,
  updateLimitedPlant,
  deleteLimitedPlant
} from '../services/limitedService';

const emptyLimited = {
  available: true,
  commonName: '',
  title: '',
  price: '',
  size: '',
  sunlight: 'Moderate',
  watering: 'Moderate',
  transit: 'Low',
  imageUrls: []
};

export default function AdminLimitedPage() {
  const { success, error } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(emptyLimited);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLimited();
  }, []);

  const loadLimited = async () => {
    setLoading(true);
    try {
      const data = await getLimitedPlants({ availableOnly: false });
      setItems(data);
    } catch (e) {
      console.error(e);
      error('Failed to load limited plants');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const compressed = await compressImage(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '');
        // Reuse the same root folder as normal products
        const fileName = `products/limited_${Date.now()}_${safeName}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, compressed);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      }

      setFormData((prev) => ({
        ...prev,
        imageUrls: [...(prev.imageUrls || []), ...urls]
      }));
      success('Image(s) uploaded!');
    } catch (e) {
      console.error(e);
      error('Failed to upload image(s)');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleRemoveImage = (url) => {
    setFormData((prev) => ({
      ...prev,
      imageUrls: (prev.imageUrls || []).filter((u) => u !== url)
    }));
  };

  const resetForm = () => {
    setFormData(emptyLimited);
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      available: item.available ?? true,
      commonName: item.commonName || '',
      title: item.title || '',
      price: (item.price ?? '').toString(),
      size: item.size || '',
      sunlight: item.sunlight || 'Moderate',
      watering: item.watering || 'Moderate',
      transit: item.transit || 'Low',
      imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : [])
    });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete limited plant ${item.id}?`)) return;
    try {
      const imageUrls =
        (item.imageUrls && item.imageUrls.length)
          ? item.imageUrls
          : (item.imageUrl ? [item.imageUrl] : []);

      await deleteLimitedPlant(item.id, imageUrls);
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      if (editingId === item.id) {
        resetForm();
      }
      success('Limited plant deleted');
    } catch (e) {
      console.error(e);
      error('Failed to delete limited plant');
    }
  };

  const handleToggleAvailable = async (item) => {
    try {
      const next = !item.available;
      await updateLimitedPlant(item.id, { available: next });
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, available: next } : p))
      );
      success(next ? 'Plant marked available' : 'Plant hidden');
    } catch (e) {
      console.error(e);
      error('Failed to update availability');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    if (!formData.commonName || !formData.price) {
      error('Common name and price are required');
      return;
    }

    const payload = {
      available: formData.available,
      commonName: formData.commonName.trim(),
      title: formData.title.trim(),
      price: parseFloat(formData.price),
      size: formData.size.trim(),
      sunlight: formData.sunlight,
      watering: formData.watering,
      transit: formData.transit,
      imageUrls: formData.imageUrls || []
    };

    try {
      setSaving(true);
      if (!editingId) {
        // Close the add form immediately so the card disappears on click
        setShowForm(false);
      }

      if (editingId) {
        await updateLimitedPlant(editingId, payload);
        setItems((prev) =>
          prev.map((p) =>
            p.id === editingId ? { ...p, ...payload } : p
          )
        );
        success('Limited plant updated');
      } else {
        const created = await addLimitedPlant(payload);
        setItems((prev) => [...prev, created]);
        success('Limited plant added');
        // After adding a new limited plant, hide the form (like "Add Product")
        setShowForm(false);
      }
      resetForm();
    } catch (e) {
      console.error(e);
      error('Failed to save limited plant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h1 className="text-xl font-semibold text-[var(--color-forest)]">
          Limited Plants
        </h1>
        <div className="flex flex-wrap gap-2">
          <NavLink
            to="/admin"
            className="btn btn-secondary text-sm"
          >
            ← Back
          </NavLink>
          <button
            type="button"
            onClick={() => {
              // Opening fresh form always resets it
              if (!showForm) {
                resetForm();
              }
              setShowForm((v) => !v);
            }}
            className="btn btn-primary text-sm"
          >
            {showForm ? 'Close Form' : '+ Add Limited Plant'}
          </button>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
      <form
        onSubmit={handleSubmit}
        className="card p-4 mb-6 animate-slide-up space-y-4"
      >
        <h2 className="font-semibold text-[var(--color-forest)]">
          {editingId ? `Edit ${editingId}` : 'Add Limited Plant'}
        </h2>

        {/* Basic fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
              Common Name *
            </label>
            <input
              type="text"
              className="input"
              value={formData.commonName}
              onChange={(e) => handleFieldChange('commonName', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
              Title / Display Name
            </label>
            <input
              type="text"
              className="input"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
              Price ({CURRENCY}) *
            </label>
            <input
              type="number"
              className="input"
              min="0"
              step="1"
              value={formData.price}
              onChange={(e) => handleFieldChange('price', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
              Size
            </label>
            <input
              type="text"
              className="input"
              placeholder='e.g. (2"-3")'
              value={formData.size}
              onChange={(e) => handleFieldChange('size', e.target.value)}
            />
          </div>
        </div>

        {/* Care fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
              Watering
            </label>
            <select
              className="input"
              value={formData.watering}
              onChange={(e) => handleFieldChange('watering', e.target.value)}
            >
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
              Sunlight
            </label>
            <select
              className="input"
              value={formData.sunlight}
              onChange={(e) => handleFieldChange('sunlight', e.target.value)}
            >
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
              Transit
            </label>
            <select
              className="input"
              value={formData.transit}
              onChange={(e) => handleFieldChange('transit', e.target.value)}
            >
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>

        {/* Availability */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded"
            checked={formData.available}
            onChange={(e) => handleFieldChange('available', e.target.checked)}
          />
          <span className="text-sm text-[var(--color-forest)]">
            Available for sale
          </span>
        </label>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
            Images (you can add multiple)
          </label>
          <div className="flex flex-wrap gap-3 mb-3">
            {formData.imageUrls.map((url) => (
              <div
                key={url}
                className="relative w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-cream-dark)]"
              >
                <img
                  src={url}
                  alt="Limited plant"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(url)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            id="limited-image-upload"
          />
          <label
            htmlFor="limited-image-upload"
            className={`btn btn-secondary text-sm cursor-pointer ${
              uploading ? 'opacity-60' : ''
            }`}
          >
            {uploading ? 'Uploading…' : 'Choose image files'}
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-[var(--color-forest)]/10">
          <button
            type="button"
            className="btn btn-secondary flex-1"
            onClick={resetForm}
            disabled={saving}
          >
            Clear
          </button>
          <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Add'} Limited Plant
          </button>
        </div>
      </form>
      )}

      {/* List */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-[var(--color-forest)]">
          Existing Limited Plants ({items.length})
        </h2>
      </div>

      <div className="space-y-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="card p-3 flex gap-3 animate-pulse">
              <div className="w-16 h-16 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-[var(--color-forest)]/60">
            No limited plants added yet.
          </div>
        ) : (
          items.map((item) => (
            <React.Fragment key={item.id}>
              <div
                className={`card p-3 flex gap-3 items-center ${
                  editingId === item.id ? 'ring-2 ring-[var(--color-forest)]' : ''
                }`}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-cream-dark)] flex-shrink-0">
                  <img
                    src={
                      (item.imageUrls && item.imageUrls[0]) ||
                      item.imageUrl ||
                      '/placeholder-plant.jpg'
                    }
                    alt={item.commonName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--color-forest)] truncate">
                        {item.id} · {item.title || item.commonName}
                      </p>
                      <p className="text-sm text-[var(--color-forest)]/70">
                        {CURRENCY}
                        {(item.price ?? 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailable(item)}
                        className={`w-10 h-5 md:w-11 md:h-6 rounded-full transition-colors relative focus:outline-none ${
                          item.available ? 'bg-[var(--color-forest)]' : 'bg-gray-300'
                        }`}
                        title={
                          item.available
                            ? 'Mark as unavailable'
                            : 'Mark as available'
                        }
                      >
                        <span
                          className={`absolute top-0.5 md:top-1 left-0.5 md:left-1 bg-white w-4 h-4 md:w-4 md:h-4 rounded-full transition-transform ${
                            item.available
                              ? 'translate-x-5 md:translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="px-2 py-1 text-xs rounded-lg bg-[var(--color-cream-dark)] text-[var(--color-forest)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline edit form for this limited plant */}
              {editingId === item.id && (
                <form
                  onSubmit={handleSubmit}
                  className="card p-4 mt-2 mb-2 border-2 border-[var(--color-forest)] space-y-4 bg-[var(--bg-secondary)]"
                >
                  <h3 className="font-semibold text-[var(--color-forest)]">
                    Edit {item.id}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                        Common Name *
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={formData.commonName}
                        onChange={(e) => handleFieldChange('commonName', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                        Title / Display Name
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={formData.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                        Price ({CURRENCY}) *
                      </label>
                      <input
                        type="number"
                        className="input"
                        min="0"
                        step="1"
                        value={formData.price}
                        onChange={(e) => handleFieldChange('price', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                        Size
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder='e.g. (2"-3")'
                        value={formData.size}
                        onChange={(e) => handleFieldChange('size', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                        Watering
                      </label>
                      <select
                        className="input"
                        value={formData.watering}
                        onChange={(e) => handleFieldChange('watering', e.target.value)}
                      >
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                        Sunlight
                      </label>
                      <select
                        className="input"
                        value={formData.sunlight}
                        onChange={(e) => handleFieldChange('sunlight', e.target.value)}
                      >
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                        Transit
                      </label>
                      <select
                        className="input"
                        value={formData.transit}
                        onChange={(e) => handleFieldChange('transit', e.target.value)}
                      >
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded"
                      checked={formData.available}
                      onChange={(e) =>
                        handleFieldChange('available', e.target.checked)
                      }
                    />
                    <span className="text-sm text-[var(--color-forest)]">
                      Available for sale
                    </span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                      Images
                    </label>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {formData.imageUrls.map((url) => (
                        <div
                          key={url}
                          className="relative w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-cream-dark)]"
                        >
                          <img
                            src={url}
                            alt="Limited plant"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id={`limited-image-upload-${item.id}`}
                    />
                    <label
                      htmlFor={`limited-image-upload-${item.id}`}
                      className={`btn btn-secondary text-sm cursor-pointer ${
                        uploading ? 'opacity-60' : ''
                      }`}
                    >
                      {uploading ? 'Uploading…' : 'Change images'}
                    </label>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-[var(--color-forest)]/10">
                    <button
                      type="button"
                      className="btn btn-secondary flex-1"
                      onClick={resetForm}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
                      {saving ? 'Saving…' : 'Update Limited Plant'}
                    </button>
                  </div>
                </form>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}

