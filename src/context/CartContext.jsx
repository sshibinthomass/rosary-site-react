import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { withStorefrontProductTitle } from '../utils/productPresentation';

const CartContext = createContext(null);
let cartServicePromise = null;
let wishlistServicePromise = null;

function loadCartService() {
  if (!cartServicePromise) {
    cartServicePromise = import('../services/cartService');
  }

  return cartServicePromise;
}

function loadWishlistService() {
  if (!wishlistServicePromise) {
    wishlistServicePromise = import('../services/wishlistService');
  }

  return wishlistServicePromise;
}

// LocalStorage keys
const LOCAL_CART_KEY = 'rosary_guest_cart';
const LOCAL_WISHLIST_KEY = 'rosary_guest_wishlist';

// Helper functions for localStorage
const getLocalCart = () => {
  try {
    const data = localStorage.getItem(LOCAL_CART_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setLocalCart = (cart) => {
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error('Error saving cart to localStorage:', e);
  }
};

const getLocalWishlist = () => {
  try {
    const data = localStorage.getItem(LOCAL_WISHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setLocalWishlist = (wishlist) => {
  try {
    localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(wishlist));
  } catch (e) {
    console.error('Error saving wishlist to localStorage:', e);
  }
};

const clearLocalData = () => {
  localStorage.removeItem(LOCAL_CART_KEY);
  localStorage.removeItem(LOCAL_WISHLIST_KEY);
};

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
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingCloudData, setPendingCloudData] = useState({ cart: [], wishlist: [] });
  const previousUserRef = useRef(null);

  // Initialize with localStorage on mount
  useEffect(() => {
    if (!user) {
      setCart(getLocalCart());
      setWishlist(getLocalWishlist());
    }
  }, []);

  // Handle user login/logout
  useEffect(() => {
    const wasLoggedOut = previousUserRef.current === null;
    const nowLoggedIn = user !== null;
    
    if (wasLoggedOut && nowLoggedIn) {
      // User just logged in - check for merge
      handleUserLogin();
    } else if (!nowLoggedIn) {
      // User logged out - load from localStorage
      setCart(getLocalCart());
      setWishlist(getLocalWishlist());
    }
    
    previousUserRef.current = user;
  }, [user]);

  const handleUserLogin = async () => {
    setLoading(true);
    try {
      const [cartService, wishlistService] = await Promise.all([
        loadCartService(),
        loadWishlistService()
      ]);

      // Get cloud data
      const [cloudCart, cloudWishlist] = await Promise.all([
        cartService.getCart(user.uid),
        wishlistService.getWishlist(user.uid)
      ]);

      // Get local data
      const localCart = getLocalCart();
      const localWishlist = getLocalWishlist();

      // Check if there's local data to merge
      const hasLocalData = localCart.length > 0 || localWishlist.length > 0;
      const hasCloudData = cloudCart.length > 0 || cloudWishlist.length > 0;

      if (hasLocalData && hasCloudData) {
        // Show merge dialog
        setPendingCloudData({ cart: cloudCart, wishlist: cloudWishlist });
        setShowMergeDialog(true);
      } else if (hasLocalData && !hasCloudData) {
        // Only local data - sync to cloud
        await syncLocalToCloud(localCart, localWishlist);
        clearLocalData();
      } else {
        // Only cloud data or no data - use cloud
        setCart(cloudCart);
        setWishlist(cloudWishlist);
        clearLocalData();
      }
    } catch (error) {
      console.error('Error handling login:', error);
      // Fall back to local data on error
      setCart(getLocalCart());
      setWishlist(getLocalWishlist());
    } finally {
      setLoading(false);
    }
  };

  const syncLocalToCloud = async (localCart, localWishlist) => {
    if (!user) return;
    const [cartService, wishlistService] = await Promise.all([
      loadCartService(),
      loadWishlistService()
    ]);
    
    // Sync cart items to cloud
    for (const item of localCart) {
      await cartService.addToCart(user.uid, {
        id: item.productId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        ...item
      }, item.quantity);
    }
    
    // Sync wishlist items to cloud
    for (const item of localWishlist) {
      await wishlistService.addToWishlist(user.uid, {
        id: item.productId,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        ...item
      });
    }
    
    // Reload from cloud
    const [newCart, newWishlist] = await Promise.all([
      cartService.getCart(user.uid),
      wishlistService.getWishlist(user.uid)
    ]);
    setCart(newCart);
    setWishlist(newWishlist);
  };

  // Merge dialog handlers
  const handleKeepLocal = async () => {
    // Keep browser cart, sync to cloud
    const localCart = getLocalCart();
    const localWishlist = getLocalWishlist();
    const { clearCart: clearCartService } = await loadCartService();
    
    // Clear cloud data first
    await clearCartService(user.uid);
    
    // Sync local to cloud
    await syncLocalToCloud(localCart, localWishlist);
    clearLocalData();
    setShowMergeDialog(false);
    success('Using your browser cart!');
  };

  const handleKeepCloud = () => {
    // Use cloud data, discard local
    setCart(pendingCloudData.cart);
    setWishlist(pendingCloudData.wishlist);
    clearLocalData();
    setShowMergeDialog(false);
    success('Using your account cart!');
  };

  const handleMergeBoth = async () => {
    // Merge local and cloud
    const localCart = getLocalCart();
    const localWishlist = getLocalWishlist();
    
    // Start with cloud data
    setCart(pendingCloudData.cart);
    setWishlist(pendingCloudData.wishlist);
    
    // Add local items that aren't in cloud
    const [cartService, wishlistService] = await Promise.all([
      loadCartService(),
      loadWishlistService()
    ]);

    for (const item of localCart) {
      const existsInCloud = pendingCloudData.cart.some(c => c.productId === item.productId);
      if (!existsInCloud) {
        await cartService.addToCart(user.uid, {
          id: item.productId,
          ...item
        }, item.quantity);
      }
    }
    
    for (const item of localWishlist) {
      const existsInCloud = pendingCloudData.wishlist.some(w => w.productId === item.productId);
      if (!existsInCloud) {
        await wishlistService.addToWishlist(user.uid, {
          id: item.productId,
          ...item
        });
      }
    }
    
    // Reload merged data
    const [newCart, newWishlist] = await Promise.all([
      cartService.getCart(user.uid),
      wishlistService.getWishlist(user.uid)
    ]);
    setCart(newCart);
    setWishlist(newWishlist);
    clearLocalData();
    setShowMergeDialog(false);
    success('Carts merged!');
  };

  const addToCart = useCallback(async (product, quantity = 1) => {
    const normalizedProduct = withStorefrontProductTitle(product);
    const productData = {
      ...normalizedProduct,
      productId: product.id,
      price: product.salesPrice || product.price,
      imageUrl: product.imageUrl,
      quantity
    };

    if (user) {
      // Logged in - save to Firestore
      try {
        const { addToCart: addToCartService } = await loadCartService();
        await addToCartService(user.uid, normalizedProduct, quantity);
        setCart(prev => {
          const existing = prev.find(item => item.productId === product.id);
          if (existing) {
            return prev.map(item => 
              item.productId === product.id 
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );
          }
          return [...prev, productData];
        });
        success(`${productData.name} added to cart!`);
      } catch (error) {
        console.error('Error adding to cart:', error);
        throw error;
      }
    } else {
      // Guest - save to localStorage
      setCart(prev => {
        const existing = prev.find(item => item.productId === product.id);
        let newCart;
        if (existing) {
          newCart = prev.map(item => 
            item.productId === product.id 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          newCart = [...prev, productData];
        }
        setLocalCart(newCart);
        return newCart;
      });
      success(`${productData.name} added to cart!`);
    }
  }, [user, success]);

  const removeFromCart = useCallback(async (productId) => {
    if (user) {
      try {
        const { removeFromCart: removeFromCartService } = await loadCartService();
        await removeFromCartService(user.uid, productId);
        setCart(prev => prev.filter(item => item.productId !== productId));
      } catch (error) {
        console.error('Error removing from cart:', error);
        throw error;
      }
    } else {
      setCart(prev => {
        const newCart = prev.filter(item => item.productId !== productId);
        setLocalCart(newCart);
        return newCart;
      });
    }
  }, [user]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (quantity < 1) {
      return removeFromCart(productId);
    }
    
    if (user) {
      try {
        const { updateCartQuantity: updateCartQuantityService } = await loadCartService();
        await updateCartQuantityService(user.uid, productId, quantity);
        setCart(prev => prev.map(item => 
          item.productId === productId ? { ...item, quantity } : item
        ));
      } catch (error) {
        console.error('Error updating quantity:', error);
        throw error;
      }
    } else {
      setCart(prev => {
        const newCart = prev.map(item => 
          item.productId === productId ? { ...item, quantity } : item
        );
        setLocalCart(newCart);
        return newCart;
      });
    }
  }, [user, removeFromCart]);

  const clearCart = useCallback(async () => {
    if (user) {
      try {
        const { clearCart: clearCartService } = await loadCartService();
        await clearCartService(user.uid);
        setCart([]);
      } catch (error) {
        console.error('Error clearing cart:', error);
        throw error;
      }
    } else {
      setCart([]);
      setLocalCart([]);
    }
  }, [user]);

  const addToWishlist = useCallback(async (product) => {
    const normalizedProduct = withStorefrontProductTitle(product);
    const productData = {
      ...normalizedProduct,
      productId: product.id,
      price: product.salesPrice || product.price,
      imageUrl: product.imageUrl,
      addedAt: new Date().toISOString()
    };

    if (user) {
      try {
        const { addToWishlist: addToWishlistService } = await loadWishlistService();
        await addToWishlistService(user.uid, normalizedProduct);
        setWishlist(prev => {
          if (prev.find(item => item.productId === product.id)) {
            return prev;
          }
          return [...prev, productData];
        });
        success(`${productData.name} added to wishlist!`);
      } catch (error) {
        console.error('Error adding to wishlist:', error);
        throw error;
      }
    } else {
      setWishlist(prev => {
        if (prev.find(item => item.productId === product.id)) {
          return prev;
        }
        const newWishlist = [...prev, productData];
        setLocalWishlist(newWishlist);
        return newWishlist;
      });
      success(`${productData.name} added to wishlist!`);
    }
  }, [user, success]);

  const removeFromWishlist = useCallback(async (productId) => {
    if (user) {
      try {
        const { removeFromWishlist: removeFromWishlistService } = await loadWishlistService();
        await removeFromWishlistService(user.uid, productId);
        setWishlist(prev => prev.filter(item => item.productId !== productId));
      } catch (error) {
        console.error('Error removing from wishlist:', error);
        throw error;
      }
    } else {
      setWishlist(prev => {
        const newWishlist = prev.filter(item => item.productId !== productId);
        setLocalWishlist(newWishlist);
        return newWishlist;
      });
    }
  }, [user]);

  const clearWishlist = useCallback(async () => {
    if (user) {
      try {
        const { clearWishlist: clearWishlistService } = await loadWishlistService();
        await clearWishlistService(user.uid);
        setWishlist([]);
      } catch (error) {
        console.error('Error clearing wishlist:', error);
        throw error;
      }
    } else {
      setWishlist([]);
      setLocalWishlist([]);
    }
  }, [user]);

  const isInCart = useCallback((productId) => {
    return cart.some(item => item.productId === productId);
  }, [cart]);

  const isInWishlist = useCallback((productId) => {
    return wishlist.some(item => item.productId === productId);
  }, [wishlist]);

  const loadUserData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [cartService, wishlistService] = await Promise.all([
        loadCartService(),
        loadWishlistService()
      ]);
      const [cartData, wishlistData] = await Promise.all([
        cartService.getCart(user.uid),
        wishlistService.getWishlist(user.uid)
      ]);
      setCart(cartData);
      setWishlist(wishlistData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

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
    clearWishlist,
    isInCart,
    isInWishlist,
    cartTotal,
    cartCount,
    refreshData: loadUserData,
    // Merge dialog
    showMergeDialog,
    pendingCloudData,
    handleKeepLocal,
    handleKeepCloud,
    handleMergeBoth,
    getLocalCart,
    getLocalWishlist
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export default CartContext;
