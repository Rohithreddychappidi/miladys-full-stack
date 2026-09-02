import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import LogoIntro from './components/LogoIntro';
import RequireAuth from './components/RequireAuth';
import ScrollToTop from './components/ScrollToTop';
import SmoothScroll from './components/SmoothScroll';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Home from './pages/Home';
import About from './pages/About';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Orders from './pages/Orders';
import Contact from './pages/Contact';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminHome from './pages/admin/AdminHome';
import AdminAbout from './pages/admin/AdminAbout';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminCancellationPolicy from './pages/admin/AdminCancellationPolicy';
import AdminCategories from './pages/admin/AdminCategories';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminReviews from './pages/admin/AdminReviews';
import AdminTestimonials from './pages/admin/AdminTestimonials';

function PublicSite() {
  return (
    <>
      <SmoothScroll />
      <LogoIntro />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="home" element={<AdminHome />} />
            <Route path="about" element={<AdminAbout />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="cancellation-policy" element={<AdminCancellationPolicy />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="testimonials" element={<AdminTestimonials />} />
            <Route path="*" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CartProvider>
        <PublicSite />
      </CartProvider>
    </AuthProvider>
  );
}
