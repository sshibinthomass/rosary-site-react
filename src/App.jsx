import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';

import Layout from './components/Layout';
import Toast from './components/Toast';
import MergeDataModal from './components/MergeDataModal';
import ProfileSetupModal from './components/ProfileSetupModal';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy-load page components so only the home page is fetched on first visit
import HomePage from './pages/HomePage';
const CartPage = lazy(() => import('./pages/CartPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const OrderPage = lazy(() => import('./pages/OrderPage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const UserOrdersPage = lazy(() => import('./pages/UserOrdersPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--color-forest)] border-t-transparent animate-spin" />
    </div>
  );
}

function App() {
  const currentPath = window.location.pathname;
  // If the user visits the root HTML file directly, we need to adapt the basename
  // otherwise React Router fails to match the path and throws an error inside chunk-EPOLDU6W.mjs
  const basename = currentPath === '/rosary-site-react.html' 
    ? '/rosary-site-react.html' 
    : '/rosary-site-react';

  return (
    <BrowserRouter basename={basename}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <Layout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Standard Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/index.html" element={<HomePage />} />
                    <Route path="/category/:categoryName" element={<HomePage />} />
                    <Route path="/plant/:productId" element={<HomePage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/cart.html" element={<CartPage />} />
                    <Route path="/wishlist" element={<WishlistPage />} />
                    <Route path="/wishlist.html" element={<WishlistPage />} />
                    <Route path="/account" element={<AccountPage />} />
                    <Route path="/account.html" element={<AccountPage />} />
                    <Route 
                      path="/orders" 
                      element={
                        <ProtectedRoute>
                          <UserOrdersPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/orders.html" 
                      element={
                        <ProtectedRoute>
                          <UserOrdersPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/faq" element={<FAQPage />} />
                    <Route path="/faq.html" element={<FAQPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/contact.html" element={<ContactPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/about.html" element={<AboutPage />} />
                    <Route path="/reviews" element={<ReviewsPage />} />
                    <Route path="/reviews.html" element={<ReviewsPage />} />
                    <Route path="/order/:orderId" element={<OrderPage />} />
                    <Route 
                      path="/admin" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin.html" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/users" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminUsersPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/users.html" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminUsersPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/orders" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminOrdersPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/orders.html" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminOrdersPage />
                        </ProtectedRoute>
                      } 
                    />
                  </Routes>
                </Suspense>
              </Layout>
              <Toast />
              <MergeDataModal />
              <ProfileSetupModal />
            </CartProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
