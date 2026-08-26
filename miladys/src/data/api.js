// Thin fetch wrapper around the backend at VITE_API_URL (defaults to
// localhost:4000 for dev). Attaches the JWT automatically when present.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'miladys_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export const api = {
  // auth
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/api/auth/me'),
  updateMe: (payload) => request('/api/auth/me', { method: 'PUT', body: payload }),
  getAddresses: () => request('/api/auth/addresses'),
  addAddress: (payload) => request('/api/auth/addresses', { method: 'POST', body: payload }),
  deleteAddress: (id) => request(`/api/auth/addresses/${id}`, { method: 'DELETE' }),

  // categories
  getCategories: () => request('/api/categories', { auth: false }),
  createCategory: (payload) => request('/api/categories', { method: 'POST', body: payload }),
  updateCategory: (id, payload) => request(`/api/categories/${id}`, { method: 'PUT', body: payload }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),

  // products
  getProducts: (category) => request(`/api/products${category ? `?category=${category}` : ''}`, { auth: false }),
  getProduct: (id) => request(`/api/products/${id}`, { auth: false }),
  createProduct: (payload) => request('/api/products', { method: 'POST', body: payload }),
  updateProduct: (id, payload) => request(`/api/products/${id}`, { method: 'PUT', body: payload }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),

  // home sections (CMS)
  getHomeSections: () => request('/api/home-sections', { auth: false }),
  getAllHomeSections: () => request('/api/home-sections/all'),
  updateHomeSection: (key, payload) => request(`/api/home-sections/${key}`, { method: 'PUT', body: payload }),

  // reviews
  getReviews: (productId) => request(`/api/products/${productId}/reviews`, { auth: false }),
  addReview: (productId, payload) => request(`/api/products/${productId}/reviews`, { method: 'POST', body: payload }),
  getAdminReviews: () => request('/api/admin/reviews'),
  approveReview: (id, approved) => request(`/api/admin/reviews/${id}/approve`, { method: 'PUT', body: { approved } }),
  deleteReview: (id) => request(`/api/admin/reviews/${id}`, { method: 'DELETE' }),

  // orders
  createOrder: (payload) => request('/api/orders/create', { method: 'POST', body: payload }),
  verifyOrder: (payload) => request('/api/orders/verify', { method: 'POST', body: payload }),
  getMyOrders: () => request('/api/orders'),
  getAllOrders: () => request('/api/orders/admin/all'),

  // coupons
  validateCoupon: (payload) => request('/api/coupons/validate', { method: 'POST', body: payload }),
  getCoupons: () => request('/api/coupons'),
  createCoupon: (payload) => request('/api/coupons', { method: 'POST', body: payload }),
  updateCoupon: (id, payload) => request(`/api/coupons/${id}`, { method: 'PUT', body: payload }),
  deleteCoupon: (id) => request(`/api/coupons/${id}`, { method: 'DELETE' }),

  // testimonials
  getTestimonials: (productId) => request(`/api/testimonials${productId ? `?productId=${productId}` : ''}`, { auth: false }),
  getAllTestimonials: () => request('/api/testimonials/admin/all'),
  createTestimonial: (payload) => request('/api/testimonials', { method: 'POST', body: payload }),
  updateTestimonial: (id, payload) => request(`/api/testimonials/${id}`, { method: 'PUT', body: payload }),
  deleteTestimonial: (id) => request(`/api/testimonials/${id}`, { method: 'DELETE' }),

  // cancellation policy
  getCancellationPolicy: () => request('/api/cancellation-policy', { auth: false }),
  createPolicyTier: (payload) => request('/api/cancellation-policy', { method: 'POST', body: payload }),
  updatePolicyTier: (id, payload) => request(`/api/cancellation-policy/${id}`, { method: 'PUT', body: payload }),
  deletePolicyTier: (id) => request(`/api/cancellation-policy/${id}`, { method: 'DELETE' }),
  cancelOrder: (id) => request(`/api/orders/${id}/cancel`, { method: 'POST' }),
};

export { BASE_URL };
