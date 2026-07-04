import { getCart } from './cartService';
import { getLimitedPlants } from './limitedService';
import { getAllOrders } from './orderService';
import { getAllProducts } from './productService';
import { getAllUsers } from './userService';
import { getWishlist } from './wishlistService';

export async function getBusinessAnalysisData() {
  const [orders, users, products, limitedProducts] = await Promise.all([
    getAllOrders(),
    getAllUsers(),
    getAllProducts(),
    getLimitedPlants({ availableOnly: false }),
  ]);

  const userItems = await Promise.all(
    users.map(async (user) => {
      const [cart, wishlist] = await Promise.all([
        getCart(user.uid),
        getWishlist(user.uid),
      ]);

      return {
        cartEntries: cart.map((item) => ({ user, item })),
        wishlistEntries: wishlist.map((item) => ({ user, item })),
      };
    })
  );

  return {
    orders,
    users,
    products: [...products, ...limitedProducts],
    cartEntries: userItems.flatMap((entry) => entry.cartEntries),
    wishlistEntries: userItems.flatMap((entry) => entry.wishlistEntries),
  };
}
