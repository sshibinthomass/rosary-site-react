import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';

import Layout from './components/Layout';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import CartPage from './pages/CartPage';
import WishlistPage from './pages/WishlistPage';
import AccountPage from './pages/AccountPage';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BrowserRouter basename="/rosary-site-react">
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </Layout>
            <Toast />
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
