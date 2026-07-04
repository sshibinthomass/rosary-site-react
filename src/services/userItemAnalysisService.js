import { getCart } from './cartService';
import { getAllUsers } from './userService';
import { getWishlist } from './wishlistService';

const ITEM_LOADERS = {
  cart: getCart,
  wishlist: getWishlist,
};

export async function getAllUserItemEntries(type) {
  const loadItems = ITEM_LOADERS[type];

  if (!loadItems) {
    throw new Error(`Unsupported user item analysis type: ${type}`);
  }

  const users = await getAllUsers();
  const userEntries = await Promise.all(
    users.map(async (user) => {
      const items = await loadItems(user.uid);
      return items.map((item) => ({ user, item }));
    })
  );

  return {
    users,
    entries: userEntries.flat(),
  };
}
