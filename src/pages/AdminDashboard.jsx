import { useState, useEffect, useRef } from 'react';
import { getAllProducts, addProduct, updateProduct, deleteProduct } from '../services/productService';
import { seedProducts, getProductCount, clearAllProducts } from '../services/seedService';
import { compressImage } from '../utils/imageCompressor';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { 
  CATEGORIES, 
  CURRENCY, 
  CARE_LEVELS,
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
    setEditingProduct(product);
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
      watering: product.watering || 'Medium',
      sunlight: product.sunlight || 'Indirect Light',
      transit: product.transit || 'Easy',
      placeAvailable: product.placeAvailable || 'Indoor',
      demand: product.demand || 'Medium'
    });
    setShowForm(true);
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

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[var(--color-forest)]">Admin Dashboard</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary text-sm"
        >
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
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

      {/* Clear All Products (only show if there are products) */}
      {products.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleSeedProducts}
            disabled={seeding}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-cream-dark)] text-[var(--color-forest)] hover:bg-[var(--color-cream)]"
          >
            {seeding ? `Importing ${seedProgress.current}/${seedProgress.total}...` : '📥 Re-Import Excel'}
          </button>
          <button
            onClick={handleClearAllProducts}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
          >
            🗑️ Clear All
          </button>
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
                    {CARE_LEVELS.map(type => (
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
                    {CARE_LEVELS.map(type => (
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
                    {CARE_LEVELS.map(type => (
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

      {/* Products List */}
      <div className="space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="card p-3 flex gap-3 animate-pulse">
              <div className="w-16 h-16 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">📦</span>
            <p className="text-[var(--color-forest)]/60 mt-3">No products yet</p>
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="card p-3 flex gap-3">
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
                      {product.commonName || product.name}
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
                    <span className={`badge text-[10px] ${(product.available && product.qtyAvailable > 0) ? 'badge-forest' : 'bg-red-100 text-red-600'}`}>
                      {product.qtyAvailable > 0 ? `${product.qtyAvailable} left` : 'Out'}
                    </span>
                    {product.isRestocked && (
                      <span className="badge badge-terracotta text-[10px]">Restocked</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-cream-dark)] rounded text-[var(--color-forest)]/60">
                    {product.category}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-cream-dark)] rounded text-[var(--color-forest)]/60">
                    {product.size || 'Medium'}
                  </span>
                  {product.indoor && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-100 rounded text-green-700">Indoor</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 text-[var(--color-forest)] hover:bg-[var(--color-cream-dark)] rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
