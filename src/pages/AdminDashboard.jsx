import { useState, useEffect, useRef } from 'react';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../services/productService';
import { compressImage } from '../utils/imageCompressor';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { CATEGORIES, CURRENCY } from '../config/constants';
import { useToast } from '../context/ToastContext';

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  category: 'Succulents',
  imageUrl: '',
  inStock: true
};

export default function AdminDashboard() {
  const { success, error } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Compress image
      const compressed = await compressImage(file);
      
      // Upload to Firebase Storage
      const fileName = `products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, compressed);
      
      // Get download URL
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
    
    if (!formData.name || !formData.price) {
      error('Please fill in required fields');
      return;
    }

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price)
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
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category,
      imageUrl: product.imageUrl || '',
      inStock: product.inStock
    });
    setShowForm(true);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 mb-6 animate-slide-up">
          <h2 className="font-semibold text-[var(--color-forest)] mb-4">
            {editingProduct ? 'Edit Product' : 'New Product'}
          </h2>

          <div className="space-y-4">
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
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                className="input mt-2 text-sm"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input min-h-[80px] resize-none"
              />
            </div>

            {/* Price & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                  Price ({CURRENCY}) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="input"
                  min="0"
                  step="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-forest)] mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="input"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock Status */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.inStock}
                onChange={(e) => setFormData(prev => ({ ...prev, inStock: e.target.checked }))}
                className="w-5 h-5 rounded border-[var(--color-forest)]/20 text-[var(--color-forest)] focus:ring-[var(--color-forest)]"
              />
              <span className="text-sm text-[var(--color-forest)]">In Stock</span>
            </label>

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={resetForm} className="btn btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary flex-1">
                {editingProduct ? 'Update' : 'Add'} Product
              </button>
            </div>
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
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-[var(--color-forest)] truncate">{product.name}</h3>
                    <p className="text-sm text-[var(--color-forest)]/60">
                      {CURRENCY}{product.price?.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className={`badge ${product.inStock ? 'badge-forest' : 'bg-red-100 text-red-600'}`}>
                    {product.inStock ? 'In Stock' : 'Out'}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-forest)]/40 mt-1">{product.category}</p>
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
