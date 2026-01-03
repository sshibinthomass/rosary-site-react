import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getAllUsers, getUserProfile } from '../services/userService';
import { getCart } from '../services/cartService';
import { getWishlist } from '../services/wishlistService';
import { CURRENCY } from '../config/constants';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userData, setUserData] = useState({ cart: [], wishlist: [], profile: null, loading: false });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setUserData({ cart: [], wishlist: [], profile: null, loading: true });
    
    try {
      const [cart, wishlist, profile] = await Promise.all([
        getCart(user.uid),
        getWishlist(user.uid),
        getUserProfile(user.uid)
      ]);
      setUserData({ cart, wishlist, profile, loading: false });
    } catch (error) {
      console.error('Failed to load user data', error);
      setUserData(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Management</h1>
        <span className="badge badge-forest">{users.length} Users</span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-xs uppercase">
              <tr>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Last Login</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                /* Skeleton Loading */
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 w-10 bg-[var(--bg-tertiary)] rounded-full" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-[var(--bg-tertiary)] rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-20 bg-[var(--bg-tertiary)] rounded" /></td>
                  </tr>
                ))
              ) : (
                users.map(user => (
                  <tr key={user.uid} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-[var(--border-color)]" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--color-forest)] text-white flex items-center justify-center font-bold text-xs">
                          {user.displayName?.[0] || user.email?.[0] || '?'}
                        </div>
                      )}
                      <span className="font-medium text-[var(--text-primary)]">{user.displayName || 'No Name'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {user.lastLogin?.seconds 
                        ? new Date(user.lastLogin.seconds * 1000).toLocaleDateString() 
                        : 'Unknown'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleViewUser(user)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--color-forest)] hover:text-white transition-all"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-5xl bg-[var(--bg-primary)] rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-forest)] text-white flex items-center justify-center font-bold text-lg">
                  {selectedUser.displayName?.[0] || selectedUser.email?.[0] || '?'}
                </div>
                <div>
                  <h2 className="font-bold text-[var(--text-primary)]">{selectedUser.displayName || 'User Details'}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">{selectedUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-8">
              {userData.loading ? (
                <div className="text-center py-12">
                   <div className="animate-spin w-8 h-8 border-2 border-[var(--color-forest)] border-t-transparent rounded-full mx-auto" />
                   <p className="mt-2 text-[var(--text-secondary)]">Loading user data...</p>
                </div>
              ) : (
                <>
                  {/* PERSONAL DETAILS SECTION */}
                  <div className="bg-[var(--bg-secondary)] rounded-xl p-5 border border-[var(--border-color)]">
                    <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
                      <span>👤</span> Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs text-[var(--text-secondary)] uppercase font-bold tracking-wider mb-1">Contact</p>
                        <p className="text-[var(--text-primary)] whitespace-pre-wrap">
                          {userData.profile?.phone || 'No Phone Provided'}<br/>
                          {selectedUser.email}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-[var(--text-secondary)] uppercase font-bold tracking-wider mb-1">Shipping Address</p>
                        {userData.profile?.address ? (
                           <p className="text-[var(--text-primary)]">
                             {userData.profile.address}<br/>
                             {userData.profile.city}, {userData.profile.state}<br/>
                             {userData.profile.pincode}
                           </p>
                        ) : (
                           <p className="text-[var(--text-secondary)] italic">No address saved</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* USER CART */}
                    <div className="space-y-4">
                       <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                         <span>🛒</span> User Cart ({userData.cart.length})
                       </h3>
                       {userData.cart.length === 0 ? (
                         <div className="p-8 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl">
                           <p className="text-[var(--text-secondary)]">Cart is empty</p>
                         </div>
                       ) : (
                         <div className="space-y-3">
                           {userData.cart.map(item => (
                             <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                               <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-[var(--bg-tertiary)]" />
                               <div className="flex-1 min-w-0">
                                 <p className="font-medium truncate">{item.name}</p>
                                 <div className="flex justify-between text-sm mt-1">
                                   <span className="text-[var(--text-secondary)]">Qty: {item.quantity}</span>
                                   <span>{CURRENCY}{item.price}</span>
                                 </div>
                               </div>
                             </div>
                           ))}
                           <div className="flex justify-between font-bold pt-2 text-[var(--text-primary)]">
                             <span>Total Value</span>
                             <span>{CURRENCY}{userData.cart.reduce((s, i) => s + (i.price * i.quantity), 0).toLocaleString()}</span>
                           </div>
                         </div>
                       )}
                    </div>

                    {/* USER WISHLIST */}
                    <div className="space-y-4">
                       <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                         <span>💚</span> User Wishlist ({userData.wishlist.length})
                       </h3>
                       {userData.wishlist.length === 0 ? (
                         <div className="p-8 text-center border-2 border-dashed border-[var(--border-color)] rounded-xl">
                           <p className="text-[var(--text-secondary)]">Wishlist is empty</p>
                         </div>
                       ) : (
                         <div className="space-y-3">
                           {userData.wishlist.map(item => (
                             <div key={item.id} className="flex gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                               <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-[var(--bg-tertiary)]" />
                               <div className="flex-1 min-w-0">
                                 <p className="font-medium truncate">{item.name}</p>
                                 <p className="text-sm text-[var(--text-secondary)] mt-1">{CURRENCY}{item.price}</p>
                               </div>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
