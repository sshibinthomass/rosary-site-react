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

import HomePage from './pages/HomePage';
import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';
import AccountPage from './pages/AccountPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import FAQPage from './pages/FAQPage';
import ContactPage from './pages/ContactPage';
import OrderPage from './pages/OrderPage';
import AdminOrdersPage from './pages/AdminOrdersPage';
import UserOrdersPage from './pages/UserOrdersPage';

function App() {
  return (
    <BrowserRouter basename="/rosary-site-react">
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <CartProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/category/:categoryName" element={<HomePage />} />
                  <Route path="/plant/:productId" element={<HomePage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/orders" element={<UserOrdersPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                <Route path="/contact" element={<ContactPage />} />
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
                    path="/admin/users" 
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
                </Routes>
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
