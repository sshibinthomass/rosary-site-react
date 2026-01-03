import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  getCart, 
  addToCart as addToCartService, 
  removeFromCart as removeFromCartService,
  updateCartQuantity as updateCartQuantityService,
  clearCart as clearCartService
} from '../services/cartService';
import {
  getWishlist,
  addToWishlist as addToWishlistService,
  removeFromWishlist as removeFromWishlistService
} from '../services/wishlistService';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { success } = useToast();
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load cart and wishlist when user changes
  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      setCart([]);
      setWishlist([]);
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cartData, wishlistData] = await Promise.all([
        getCart(user.uid),
        getWishlist(user.uid)
      ]);
      setCart(cartData);
      setWishlist(wishlistData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = useCallback(async (product, quantity = 1) => {
    if (!user) {
      throw new Error('Please sign in to add items to cart');
    }
    try {
      await addToCartService(user.uid, product, quantity);
      setCart(prev => {
        const existing = prev.find(item => item.productId === product.id);
        if (existing) {
          return prev.map(item => 
            item.productId === product.id 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prev, { ...product, productId: product.id, quantity }];
      });
      success(`${product.name} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }, [user, success]);

  const removeFromCart = useCallback(async (productId) => {
    if (!user) return;
    try {
      await removeFromCartService(user.uid, productId);
      setCart(prev => prev.filter(item => item.productId !== productId));
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }, [user]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (!user) return;
    if (quantity < 1) {
      return removeFromCart(productId);
    }
    try {
      await updateCartQuantityService(user.uid, productId, quantity);
      setCart(prev => prev.map(item => 
        item.productId === productId ? { ...item, quantity } : item
      ));
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  }, [user, removeFromCart]);

  const clearCart = useCallback(async () => {
    if (!user) return;
    try {
      await clearCartService(user.uid);
      setCart([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }, [user]);

  const addToWishlist = useCallback(async (product) => {
    if (!user) {
      throw new Error('Please sign in to add items to wishlist');
    }
    try {
      await addToWishlistService(user.uid, product);
      setWishlist(prev => {
        if (prev.find(item => item.productId === product.id)) {
          return prev;
        }
        return [...prev, { ...product, productId: product.id, addedAt: new Date() }];
      });
      success(`${product.name} added to wishlist!`);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  }, [user, success]);

  const removeFromWishlist = useCallback(async (productId) => {
    if (!user) return;
    try {
      await removeFromWishlistService(user.uid, productId);
      setWishlist(prev => prev.filter(item => item.productId !== productId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  }, [user]);

  const isInCart = useCallback((productId) => {
    return cart.some(item => item.productId === productId);
  }, [cart]);

  const isInWishlist = useCallback((productId) => {
    return wishlist.some(item => item.productId === productId);
  }, [wishlist]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const value = {
    cart,
    wishlist,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    addToWishlist,
    removeFromWishlist,
    isInCart,
    isInWishlist,
    cartTotal,
    cartCount,
    refreshData: loadUserData
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export default CartContext;
