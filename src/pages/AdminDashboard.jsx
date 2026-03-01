import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { getAllProducts, addProduct, updateProduct, deleteProduct } from '../services/productService';
import { seedProducts, getProductCount, clearAllProducts } from '../services/seedService';
import { compressImage } from '../utils/imageCompressor';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { 
  CATEGORIES, 
  CURRENCY,
  WATERING_LEVELS,
  SUNLIGHT_LEVELS,
  TRANSIT_LEVELS,
  QTY_AVAILABLE_OPTIONS,
  DEMAND_LEVELS,
  PLACE_OPTIONS
} from '../config/constants';
import { useToast } from '../context/ToastContext';

const emptyProduct = {
  // Basic info
  commonName: '',
  title: '',
  imageUrl: '',
  
  // Pricing
  salesPrice: '',
  originalPrice: '',
  
  // Availability
  available: true,
  qtyAvailable: 'Available',
  isRestocked: false,
  
  // Categories & Tags
  category: 'Succulent',
  mother: false,
  hanging: false,
  combo: false,
  indoor: false,
  
  // Plant care
  size: '',
  watering: 'Moderate',
  sunlight: 'Moderate',
  transit: 'Low',
  
  // Other
  placeAvailable: 'Both',
  demand: 'Medium'
};

export default function AdminDashboard() {
  const { success, error } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState({ current: 0, total: 0 });
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // all, available, hidden
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (err) {
      error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedProducts = async () => {
    if (!confirm(`This will add ${getProductCount()} products from Excel to Firestore. Continue?`)) return;
    
    setSeeding(true);
    setSeedProgress({ current: 0, total: getProductCount() });
    
    try {
      await seedProducts((current, total) => {
        setSeedProgress({ current, total });
      });
      success(`Successfully added ${getProductCount()} products!`);
      loadProducts(); // Refresh the list
    } catch (err) {
      error('Failed to seed products: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleClearAllProducts = async () => {
    if (!confirm('⚠️ This will DELETE ALL products! Are you sure?')) return;
    if (!confirm('This action cannot be undone. Type YES to confirm.')) return;
    
    try {
      const result = await clearAllProducts();
      success(`Deleted ${result.deleted} products`);
      setProducts([]);
    } catch (err) {
      error('Failed to clear products');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fileName = `products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, imageUrl: url }));
      success('Image uploaded!');
    } catch (err) {
      error('Failed to upload image');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.commonName || !formData.salesPrice) {
      error('Please fill in required fields');
      return;
    }

    if (formData.originalPrice && parseFloat(formData.salesPrice) > parseFloat(formData.originalPrice)) {
      error('Sales price cannot be greater than original price');
      return;
    }

    try {
      const productData = {
        ...formData,
        salesPrice: parseFloat(formData.salesPrice),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        qtyAvailable: formData.qtyAvailable ? parseInt(formData.qtyAvailable) : 0,
        // Legacy field mapping for compatibility
        name: formData.commonName,
        price: parseFloat(formData.salesPrice),
        inStock: formData.available && formData.qtyAvailable > 0
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        setProducts(prev => prev.map(p => 
          p.id === editingProduct.id ? { ...p, ...productData } : p
        ));
        success('Product updated!');
      } else {
        const newProduct = await addProduct(productData);
        setProducts(prev => [...prev, newProduct]);
        success('Product added!');
      }

      resetForm();
    } catch (err) {
      error('Failed to save product');
    }
  };

  const handleEdit = (product) => {
    // If already editing this product, close it
    if (editingProduct?.id === product.id) {
      resetForm();
      return;
    }
    setEditingProduct(product);
    setShowForm(false); // close "Add new" form if open
    setFormData({
      commonName: product.commonName || product.name || '',
      title: product.title || '',
      imageUrl: product.imageUrl || '',
      salesPrice: (product.salesPrice || product.price || '').toString(),
      originalPrice: (product.originalPrice || '').toString(),
      available: product.available ?? product.inStock ?? true,
      qtyAvailable: (product.qtyAvailable || '').toString(),
      isRestocked: product.isRestocked || false,
      category: product.category || 'Succulents',
      mother: product.mother || false,
      hanging: product.hanging || false,
      combo: product.combo || false,
      indoor: product.indoor ?? true,
      size: product.size || 'Medium',
      watering: product.watering || 'Moderate',
      sunlight: product.sunlight || 'Moderate',
      transit: product.transit || 'Low',
      placeAvailable: product.placeAvailable || 'Indoor',
      demand: product.demand || 'Medium'
    });
    setActiveTab('basic');
  };

  const handleDelete = async (productId) => {
    if (!confirm('Delete this product?')) return;
    
    try {
      await deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      success('Product deleted!');
    } catch (err) {
      error('Failed to delete product');
    }
  };

  const handleToggleAvailable = async (product) => {
    try {
      const newStatus = !product.available;
      await updateProduct(product.id, { available: newStatus });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, available: newStatus } : p));
      success(newStatus ? 'Product is now available' : 'Product is hidden');
    } catch (err) {
      error('Failed to update availability');
    }
  };

  const resetForm = () => {
    setFormData(emptyProduct);
    setEditingProduct(null);
    setShowForm(false);
    setActiveTab('basic');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredProducts = products.filter(p => {
    if (availabilityFilter === 'available') return p.available;
    if (availabilityFilter === 'hidden') return !p.available;
    return true; // all
  }).sort((a, b) => {
    // Attempt numeric sort based on ID (which we assume is stringified number from Excel import)
    const idA = parseInt(a.id, 10);
    const idB = parseInt(b.id, 10);
    if (!isNaN(idA) && !isNaN(idB)) {
      return idA - idB;
    }
    // Fallback to string comparison if IDs aren't pure numbers
    return a.id.toString().localeCompare(b.id.toString());
  });

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h1 className="text-xl font-semibold text-[var(--color-forest)]">Admin Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <NavLink to="/admin/orders" className="btn btn-secondary text-sm flex items-center gap-2">
            <span>📋</span> Orders
          </NavLink>
          <NavLink to="/admin/users" className="btn btn-secondary text-sm flex items-center gap-2">
            <span>👥</span> Users
          </NavLink>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary text-sm"
          >
            {showForm ? 'Cancel' : '+ Add Product'}
          </button>
        </div>
      </div>

      {/* Seed Products Panel */}
      {products.length === 0 && !loading && (
        <div className="card p-4 mb-4 bg-gradient-to-r from-[var(--color-forest)] to-[var(--color-forest-light)] text-white">
          <h3 className="font-semibold mb-2">📦 Import Products from Excel</h3>
          <p className="text-sm text-white/80 mb-3">
            You have {getProductCount()} products ready to import from your Excel file.
          </p>
          {seeding ? (
            <div>
              <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                <div 
                  className="bg-white h-2 rounded-full transition-all" 
                  style={{ width: `${(seedProgress.current / seedProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm">Importing... {seedProgress.current} / {seedProgress.total}</p>
            </div>
          ) : (
            <button
              onClick={handleSeedProducts}
              className="btn bg-white text-[var(--color-forest)] hover:bg-white/90"
            >
              🚀 Import All Products
            </button>
          )}
        </div>
      )}



      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-6 animate-slide-up">
          <h2 className="font-semibold text-[var(--color-forest)] mb-4">
            {editingProduct ? 'Edit Product' : 'New Product'}
          </h2>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
            {['basic', 'pricing', 'care', 'tags'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? 'bg-[var(--color-forest)] text-white' 
                    : 'bg-[var(--color-cream-dark)] text-[var(--color-forest)]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-fade-in">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                  Product Image
                </label>
                <div className="flex items-center gap-4">
                  {formData.imageUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-cream-dark)]">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className={`btn btn-secondary text-sm cursor-pointer ${uploading ? 'opacity-50' : ''}`}
                    >
                      {uploading ? 'Uploading...' : 'Choose Image'}
                    </label>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Or paste image URL"
                  value={formData.imageUrl}
                  onChange={(e) => updateField('imageUrl', e.target.value)}
                  className="input mt-2 text-sm"
                />
              </div>

              {/* Common Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                  Common Name *
                </label>
                <input
                  type="text"
                  value={formData.commonName}
                  onChange={(e) => updateField('commonName', e.target.value)}
                  className="input"
                  placeholder="e.g. Echeveria Elegans"
                  required
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                  Title/Display Name
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="input"
                  placeholder="e.g. Beautiful Mexican Snowball"
                />
              </div>

              {/* Category & Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="input"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                    Size
                  </label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => updateField('size', e.target.value)}
                    className="input"
                    placeholder='e.g. (2"-3")'
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                    Sales Price ({CURRENCY}) *
                  </label>
                  <input
                    type="number"
                    value={formData.salesPrice}
                    onChange={(e) => updateField('salesPrice', e.target.value)}
                    className="input"
                    min="0"
                    step="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                    Original Price ({CURRENCY})
                  </label>
                  <input
                    type="number"
                    value={formData.originalPrice}
                    onChange={(e) => updateField('originalPrice', e.target.value)}
                    className="input"
                    min="0"
                    step="1"
                    placeholder="For discount display"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                    Qty Available
                  </label>
                  <select
                    value={formData.qtyAvailable}
                    onChange={(e) => updateField('qtyAvailable', e.target.value)}
                    className="input"
                  >
                    {QTY_AVAILABLE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                    Demand Level
                  </label>
                  <select
                    value={formData.demand}
                    onChange={(e) => updateField('demand', e.target.value)}
                    className="input"
                  >
                    {DEMAND_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Availability toggles */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.available}
                    onChange={(e) => updateField('available', e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm text-[var(--color-forest)]">Available for sale</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRestocked}
                    onChange={(e) => updateField('isRestocked', e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm text-[var(--color-forest)]">Recently Restocked</span>
                </label>
              </div>
            </div>
          )}

          {/* Care Tab */}
          {activeTab === 'care' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                    Watering
                  </label>
                  <select
                    value={formData.watering}
                    onChange={(e) => updateField('watering', e.target.value)}
                    className="input"
                  >
                    {WATERING_LEVELS.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                    Sunlight
                  </label>
                  <select
                    value={formData.sunlight}
                    onChange={(e) => updateField('sunlight', e.target.value)}
                    className="input"
                  >
                    {SUNLIGHT_LEVELS.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                    Transit Difficulty
                  </label>
                  <select
                    value={formData.transit}
                    onChange={(e) => updateField('transit', e.target.value)}
                    className="input"
                  >
                    {TRANSIT_LEVELS.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                    Best Place
                  </label>
                  <select
                    value={formData.placeAvailable}
                    onChange={(e) => updateField('placeAvailable', e.target.value)}
                    className="input"
                  >
                    {PLACE_OPTIONS.map(place => (
                      <option key={place} value={place}>{place}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-[var(--color-forest)]/60 mb-2">Special tags for this plant:</p>
              
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-[var(--color-cream-dark)]">
                <input
                  type="checkbox"
                  checked={formData.indoor}
                  onChange={(e) => updateField('indoor', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--color-forest)]">Indoor Plant</span>
                  <p className="text-xs text-[var(--color-forest)]/60">Suitable for indoor spaces</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-[var(--color-cream-dark)]">
                <input
                  type="checkbox"
                  checked={formData.hanging}
                  onChange={(e) => updateField('hanging', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--color-forest)]">Hanging Plant</span>
                  <p className="text-xs text-[var(--color-forest)]/60">Perfect for hanging baskets</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-[var(--color-cream-dark)]">
                <input
                  type="checkbox"
                  checked={formData.mother}
                  onChange={(e) => updateField('mother', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--color-forest)]">Mother Plant</span>
                  <p className="text-xs text-[var(--color-forest)]/60">Mature plant that produces babies</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-[var(--color-cream-dark)]">
                <input
                  type="checkbox"
                  checked={formData.combo}
                  onChange={(e) => updateField('combo', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--color-forest)]">Combo Pack</span>
                  <p className="text-xs text-[var(--color-forest)]/60">Multiple plants in one package</p>
                </div>
              </label>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-4 mt-4 border-t border-[var(--color-forest)]/10">
            <button type="button" onClick={resetForm} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {editingProduct ? 'Update' : 'Add'} Product
            </button>
          </div>
        </form>
      )}

      {/* Products List & Filters */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-[var(--color-forest)]">Products ({filteredProducts.length})</h2>
        <select
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
          className="input !py-1.5 !w-auto text-sm"
        >
          <option value="all">All Products</option>
          <option value="available">Available Only</option>
          <option value="hidden">Hidden Only</option>
        </select>
      </div>

      <div className="space-y-3">
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
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-forest)]/60">
            No products match the selected filter.
          </div>
        ) : (
          filteredProducts.map((product) => (
            <React.Fragment key={product.id}>
              {/* Product Row */}
              <div className={`card p-3 flex gap-3 transition-all ${
                editingProduct?.id === product.id ? 'ring-2 ring-[var(--color-forest)]' : ''
              }`}>
                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-cream-dark)] flex-shrink-0">
                  <img
                    src={product.imageUrl || '/placeholder-plant.jpg'}
                    alt={product.commonName || product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-[var(--color-forest)] truncate">
                        #{product.id} - {product.commonName || product.name}
                      </h3>
                      <p className="text-sm text-[var(--color-forest)]/60">
                        {CURRENCY}{(product.salesPrice || product.price)?.toLocaleString('en-IN')}
                        {product.originalPrice && (
                          <span className="ml-2 line-through text-xs">
                            {CURRENCY}{product.originalPrice?.toLocaleString('en-IN')}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                    </div>
                  </div>
                </div>

                {/* Actions — edit only, delete moved inside edit form */}
                <div className="flex flex-col gap-2 items-center justify-center">
                  <button
                    onClick={() => handleToggleAvailable(product)}
                    className={`w-10 h-5 md:w-11 md:h-6 rounded-full transition-colors relative focus:outline-none ${
                      product.available ? 'bg-[var(--color-forest)]' : 'bg-gray-300'
                    }`}
                    title={product.available ? "Make unavailable" : "Make available"}
                  >
                    <span
                      className={`absolute top-0.5 md:top-1 left-0.5 md:left-1 bg-white w-4 h-4 md:w-4 md:h-4 rounded-full transition-transform ${
                        product.available ? 'translate-x-5 md:translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => handleEdit(product)}
                    className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                      editingProduct?.id === product.id
                        ? 'bg-[var(--color-forest)] text-white'
                        : 'text-[var(--color-forest)] hover:bg-[var(--color-cream-dark)]'
                    }`}
                    title="Edit Product"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Inline Edit Form — renders right below this product */}
              {editingProduct?.id === product.id && (
                <form onSubmit={handleSubmit} className="card p-4 border-2 border-[var(--color-forest)] animate-slide-up">
                  <h2 className="font-semibold text-[var(--color-forest)] mb-4">Edit: {product.commonName || product.name}</h2>

                  {/* Tabs */}
                  <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
                    {['basic', 'others', 'care', 'tags'].map(tab => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          activeTab === tab
                            ? 'bg-[var(--color-forest)] text-white'
                            : 'bg-[var(--color-cream-dark)] text-[var(--color-forest)]'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Reuse same tab content — JSX is identical to the top form */}
                  {activeTab === 'basic' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Read-only image preview */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-cream-dark)]">
                          <img 
                            src={formData.imageUrl || '/placeholder-plant.jpg'} 
                            alt={formData.commonName || 'Preview'} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--color-forest)]">Product Image</p>
                          <p className="text-xs text-[var(--color-forest)]/60">Editable in 'Others' tab</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Common Name *</label>
                        <input type="text" value={formData.commonName} onChange={(e) => updateField('commonName', e.target.value)} className="input" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Sales Price ({CURRENCY}) *</label>
                          <input type="number" value={formData.salesPrice} onChange={(e) => updateField('salesPrice', e.target.value)} className="input" min="0" step="1" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Original Price ({CURRENCY})</label>
                          <input type="number" value={formData.originalPrice} onChange={(e) => updateField('originalPrice', e.target.value)} className="input" min="0" step="1" placeholder="For discount display" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={formData.available} onChange={(e) => updateField('available', e.target.checked)} className="w-5 h-5 rounded" />
                          <span className="text-sm text-[var(--color-forest)]">Available for sale</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {activeTab === 'others' && (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Product Image</label>
                        <div className="flex items-center gap-4">
                          {formData.imageUrl && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-cream-dark)]">
                              <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1">
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="image-upload-inline-others" />
                            <label htmlFor="image-upload-inline-others" className={`btn btn-secondary text-sm cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                              {uploading ? 'Uploading...' : 'Choose Image'}
                            </label>
                          </div>
                        </div>
                        <input type="text" placeholder="Or paste image URL" value={formData.imageUrl} onChange={(e) => updateField('imageUrl', e.target.value)} className="input mt-2 text-sm" />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Title/Display Name</label>
                        <input type="text" value={formData.title} onChange={(e) => updateField('title', e.target.value)} className="input" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Category</label>
                          <select value={formData.category} onChange={(e) => updateField('category', e.target.value)} className="input">
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Size</label>
                          <input type="text" value={formData.size} onChange={(e) => updateField('size', e.target.value)} className="input" placeholder='e.g. (2"-3")' />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Qty Available</label>
                          <select value={formData.qtyAvailable} onChange={(e) => updateField('qtyAvailable', e.target.value)} className="input">
                            {QTY_AVAILABLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Demand Level</label>
                          <select value={formData.demand} onChange={(e) => updateField('demand', e.target.value)} className="input">
                            {DEMAND_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={formData.isRestocked} onChange={(e) => updateField('isRestocked', e.target.checked)} className="w-5 h-5 rounded" />
                          <span className="text-sm text-[var(--color-forest)]">Recently Restocked</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {activeTab === 'care' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Watering</label>
                          <select value={formData.watering} onChange={(e) => updateField('watering', e.target.value)} className="input">
                            {WATERING_LEVELS.map(type => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Sunlight</label>
                          <select value={formData.sunlight} onChange={(e) => updateField('sunlight', e.target.value)} className="input">
                            {SUNLIGHT_LEVELS.map(type => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Transit Difficulty</label>
                          <select value={formData.transit} onChange={(e) => updateField('transit', e.target.value)} className="input">
                            {TRANSIT_LEVELS.map(type => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">Best Place</label>
                          <select value={formData.placeAvailable} onChange={(e) => updateField('placeAvailable', e.target.value)} className="input">
                            {PLACE_OPTIONS.map(place => <option key={place} value={place}>{place}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'tags' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-3">
                        {[['indoor', 'Indoor Plant', 'Suitable for indoor spaces'], ['hanging', 'Hanging Plant', 'Perfect for hanging baskets'], ['mother', 'Mother Plant', 'Mature plant that produces babies'], ['combo', 'Combo Pack', 'Multiple plants in one package']].map(([field, label, desc]) => (
                          <label key={field} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg bg-[var(--color-cream-dark)]">
                            <input type="checkbox" checked={formData[field]} onChange={(e) => updateField(field, e.target.checked)} className="w-5 h-5 rounded" />
                            <div>
                              <span className="text-sm font-medium text-[var(--color-forest)]">{label}</span>
                              <p className="text-xs text-[var(--color-forest)]/60">{desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Delete Product (only when editing) */}
                      {editingProduct?.id === product.id && (
                        <div className="pt-4 border-t border-red-500/10">
                          <button
                            type="button"
                            onClick={() => { resetForm(); handleDelete(product.id); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium transition-colors"
                          >
                            🗑️ Delete Product permanently
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 mt-4 border-t border-[var(--color-forest)]/10">
                    <button type="button" onClick={resetForm} className="btn btn-secondary flex-1">Cancel</button>
                    <button type="submit" className="btn btn-primary flex-1">Update</button>
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
