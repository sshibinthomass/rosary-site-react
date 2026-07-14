import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { getAnalysisRoute } from './utils/adminAnalysisTabs';

import Layout from './components/Layout';
import Toast from './components/Toast';
import MergeDataModal from './components/MergeDataModal';
import ProfileSetupModal from './components/ProfileSetupModal';
import LoginPopup from './components/LoginPopup';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import AppLifecycle from './components/AppLifecycle';

// Lazy-load page components so only the home page is fetched on first visit
import HomePage from './pages/HomePage';
const ShopPage = lazy(() => import('./pages/ShopPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const AdminHome = lazy(() => import('./pages/AdminHome'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminAnalysisPage = lazy(() => import('./pages/AdminAnalysisPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const PoliciesPage = lazy(() => import('./pages/PoliciesPage'));
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

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const InstaReviewsPage = lazy(() => import('./pages/InstaReviewsPage'));
const GuidesPage = lazy(() => import('./pages/GuidesPage'));
const ContentHubPage = lazy(() => import('./pages/ContentHubPage'));
const ProductModalWrapper = lazy(() => import('./components/ProductModalWrapper'));
const PlantCareFeature = lazy(() => import('./features/plantCare/PlantCareFeature'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--color-forest)] border-t-transparent animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes location={backgroundLocation || location}>
          {/* Standard Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/index.html" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/shop.html" element={<ShopPage />} />
          <Route path="/category/:categoryName" element={<ShopPage />} />
          <Route path="/plant/:productId" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/cart.html" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/wishlist.html" element={<WishlistPage />} />
          <Route path="/care/*" element={<PlantCareFeature />} />
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
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/policies.html" element={<PoliciesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/contact.html" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/about.html" element={<AboutPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/reviews.html" element={<ReviewsPage />} />
          <Route path="/insta-reviews" element={<InstaReviewsPage />} />
          <Route path="/guides" element={<GuidesPage />} />
          <Route path="/guides.html" element={<GuidesPage />} />
          <Route path="/guides/:hubSlug" element={<ContentHubPage />} />
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
            path="/admin/analysis"
            element={
              <ProtectedRoute requireAdmin>
                <AdminAnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analysis.html"
            element={
              <ProtectedRoute requireAdmin>
                <AdminAnalysisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/plant-analysis"
            element={
              <ProtectedRoute requireAdmin>
                <Navigate to={getAnalysisRoute('plants')} replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/plant-analysis.html"
            element={
              <ProtectedRoute requireAdmin>
                <Navigate to={getAnalysisRoute('plants')} replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/order-analysis"
            element={
              <ProtectedRoute requireAdmin>
                <Navigate to={getAnalysisRoute('orders')} replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/order-analysis.html"
            element={
              <ProtectedRoute requireAdmin>
                <Navigate to={getAnalysisRoute('orders')} replace />
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
          {/* 404 Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      {/* Render the modal OVER the background route if backgroundLocation is present */}
      {backgroundLocation && (
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/plant/:productId" element={<ProductModalWrapper />} />
          </Routes>
        </Suspense>
      )}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AppLifecycle />
      <ScrollToTop />
      <ThemeProvider>
        <SettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <Layout>
                <AppRoutes />
              </Layout>
              <Toast />
              <MergeDataModal />
              <ProfileSetupModal />
              <LoginPopup />
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
