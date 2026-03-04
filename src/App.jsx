import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';

import Layout from './components/Layout';
import Toast from './components/Toast';
import MergeDataModal from './components/MergeDataModal';
import ProfileSetupModal from './components/ProfileSetupModal';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';

// Lazy-load page components so only the home page is fetched on first visit
import HomePage from './pages/HomePage';
const CartPage = lazy(() => import('./pages/CartPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const AdminHome = lazy(() => import('./pages/AdminHome'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminPlantAnalysis = lazy(() => import('./pages/AdminPlantAnalysis'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const OrderPage = lazy(() => import('./pages/OrderPage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const AdminCreateOrderPage = lazy(() => import('./pages/AdminCreateOrderPage'));
const UserOrdersPage = lazy(() => import('./pages/UserOrdersPage'));
const AdminLimitedPage = lazy(() => import('./pages/AdminLimitedPage'));
const AdminExportPage = lazy(() => import('./pages/AdminExportPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const AdminPlantTesterPage = lazy(() => import('./pages/AdminPlantTesterPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--color-forest)] border-t-transparent animate-spin" />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ScrollToTop />
      <ThemeProvider>
        <SettingsProvider>
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
                          <AdminHome />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin.html" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminHome />
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
                    <Route 
                      path="/admin/orders/new" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminCreateOrderPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/orders/new.html" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminCreateOrderPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/products" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/products.html" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/limited" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminLimitedPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/limited.html" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminLimitedPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/export" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminExportPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/export.html" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminExportPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/plant-analysis" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminPlantAnalysis />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/plant-analysis.html" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminPlantAnalysis />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/plant-tester" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminPlantTesterPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/settings" 
                      element={
                        <ProtectedRoute requireAdmin>
                          <AdminSettingsPage />
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
        </SettingsProvider>
      </ThemeProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
