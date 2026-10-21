import { lazy, Suspense } from 'react';
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
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';

// Pages other than the main shopping ones load on demand, so first-time
// visitors don't download the admin panel, checkout, policies etc. up front.
// If a chunk can't be fetched (typically: a new deploy replaced it while
// this tab was open), reload once to pick up the current build.
function lazyPage(load) {
  return lazy(() =>
    load().catch((err) => {
      const key = 'miladys_chunk_reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    }).then((mod) => {
      sessionStorage.removeItem('miladys_chunk_reload');
      return mod;
    }),
  );
}

const About = lazyPage(() => import('./pages/About'));
const Orders = lazyPage(() => import('./pages/Orders'));
const Contact = lazyPage(() => import('./pages/Contact'));
const Cart = lazyPage(() => import('./pages/Cart'));
const Checkout = lazyPage(() => import('./pages/Checkout'));
const Profile = lazyPage(() => import('./pages/Profile'));
const Login = lazyPage(() => import('./pages/Login'));
const ForgotPassword = lazyPage(() => import('./pages/ForgotPassword'));
const ResetPassword = lazyPage(() => import('./pages/ResetPassword'));
const CompleteProfile = lazyPage(() => import('./pages/CompleteProfile'));
const NotFound = lazyPage(() => import('./pages/NotFound'));
const PrivacyPolicy = lazyPage(() => import('./pages/PrivacyPolicy'));
const Terms = lazyPage(() => import('./pages/Terms'));
const ReturnRefundPolicy = lazyPage(() => import('./pages/ReturnRefundPolicy'));
const AdminLayout = lazyPage(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazyPage(() => import('./pages/admin/AdminDashboard'));
const AdminHome = lazyPage(() => import('./pages/admin/AdminHome'));
const AdminAbout = lazyPage(() => import('./pages/admin/AdminAbout'));
const AdminCoupons = lazyPage(() => import('./pages/admin/AdminCoupons'));
const AdminCancellationPolicy = lazyPage(() => import('./pages/admin/AdminCancellationPolicy'));
const AdminCategories = lazyPage(() => import('./pages/admin/AdminCategories'));
const AdminProducts = lazyPage(() => import('./pages/admin/AdminProducts'));
const AdminOrders = lazyPage(() => import('./pages/admin/AdminOrders'));
const AdminReviews = lazyPage(() => import('./pages/admin/AdminReviews'));
const AdminTestimonials = lazyPage(() => import('./pages/admin/AdminTestimonials'));
const AdminMessages = lazyPage(() => import('./pages/admin/AdminMessages'));
const AdminStore = lazyPage(() => import('./pages/admin/AdminStore'));
const AdminPolicies = lazyPage(() => import('./pages/admin/AdminPolicies'));

const pageFallback = <div className="page-loading" style={{ minHeight: '70vh' }} aria-busy="true" />;

function PublicSite() {
  return (
    <>
      <SmoothScroll />
      <LogoIntro />
      <Navbar />
      <main>
        <Suspense fallback={pageFallback}>
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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/complete-profile" element={<RequireAuth><CompleteProfile /></RequireAuth>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<Terms />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/return-policy" element={<ReturnRefundPolicy />} />
          <Route path="/refund-policy" element={<ReturnRefundPolicy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
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
        <Suspense fallback={pageFallback}>
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
            <Route path="messages" element={<AdminMessages />} />
            <Route path="store" element={<AdminStore />} />
            <Route path="policies" element={<AdminPolicies />} />
            <Route path="*" element={<AdminDashboard />} />
          </Route>
        </Routes>
        </Suspense>
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
