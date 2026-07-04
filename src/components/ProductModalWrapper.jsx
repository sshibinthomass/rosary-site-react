import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { getProductById } from '../services/productService';
import { getLimitedById } from '../services/limitedService';
import ProductModal from './ProductModal';
import { extractProductIdFromParam } from '../utils/productSeo';

export default function ProductModalWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = useParams();
  
  const { addToCart, isInCart, addToWishlist, removeFromWishlist, isInWishlist } = useCart();
  const { success, error } = useToast();
  const { settings } = useSettings();

  const initialProduct = location.state?.product;
  const [product, setProduct] = useState(initialProduct);

  useEffect(() => {
    // If the admin has disabled full descriptions, don't waste data fetching the full object.
    if (!productId || !settings.showPlantDescription) return;
    
    const fetchFullProduct = async () => {
      try {
        const cleanId = extractProductIdFromParam(productId);
        const isLimited = typeof cleanId === 'string' && /^L/i.test(cleanId);
        const fullData = isLimited
          ? await getLimitedById(cleanId)
          : await getProductById(cleanId);
        
        if (fullData) setProduct(fullData);
      } catch (err) {
        console.error('Failed to fetch full product details in modal', err);
      }
    };
    fetchFullProduct();
  }, [productId, settings.showPlantDescription]);

  const handleClose = () => {
    // If there's no previous history (e.g. opened in a new tab magically), go to home.
    // Otherwise just go back to close the modal over the background.
    navigate(-1);
  };

  const handleAddToCart = async (productData, quantity = 1) => {
    if (!product) return;
    try {
      if (isInCart(product.id)) return;
      await addToCart(productData, quantity);
      success(`Added ${quantity} ${productData.name} to cart`);
    } catch {
      error('Failed to add to cart');
    }
  };

  const handleToggleWishlist = async () => {
    if (!product) return;
    try {
      if (isInWishlist(product.id)) {
        await removeFromWishlist(product.id);
      } else {
        await addToWishlist({ 
          ...product, 
          id: product.id, 
          name: product.title || product.name || product.commonName, 
          price: product.salesPrice || product.price 
        });
      }
    } catch {
      error('Failed to update wishlist');
    }
  };

  // Safe fallback if product is missing, though React Router's backgroundLocation 
  // pattern generally ensures it's only rendered when state exists.
  if (!product) return null;

  return (
    <ProductModal
      product={product}
      isOpen={true}
      onClose={handleClose}
      onAddToCart={handleAddToCart}
      inCart={isInCart(product.id)}
      inWishlist={isInWishlist(product.id)}
      onToggleWishlist={handleToggleWishlist}
    />
  );
}
