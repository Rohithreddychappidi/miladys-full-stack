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
  // Content-Type only when there's a body: on a plain GET it would make the
  // browser send an extra CORS preflight (OPTIONS) round trip before every
  // single API call.
  const headers = body !== undefined ? { 'Content-Type': 'application/json' } : {};
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
  if (!res.ok) {
    // status + body are kept on the error so callers can react to specific
    // cases (e.g. 409 "possible duplicate" when adding a product).
    const err = new Error(data.error || 'Something went wrong.');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// { category: 'x', page: 1, limit: 12 } -> "?category=x&page=1&limit=12"
// (empty values skipped). A plain string is still treated as a category,
// which is how older call sites use getProducts().
function productQuery(params) {
  if (!params) return '';
  if (typeof params === 'string') params = { category: params };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    qs.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// Our own uploaded images come back as absolute URLs; the duplicate check
// compares stored paths ("/uploads/img/...").
function uploadPath(url) {
  if (!url || url.startsWith('data:')) return '';
  try { return new URL(url, BASE_URL).pathname; } catch { return ''; }
}

// Separate from request() above because this response is a PDF file, not
// JSON — fetched manually (rather than a plain <a href>) so the JWT auth
// header actually gets attached, then handed to the browser as a
// synthetic download via a temporary object URL.
async function downloadFile(path, filename) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { headers });
  } catch {
    throw new Error('Could not reach the server. Is the backend running?');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not download the file.');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  // auth
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload, auth: false }),
  googleLogin: (payload) => request('/api/auth/google', { method: 'POST', body: payload, auth: false }),
  forgotPassword: (payload) => request('/api/auth/forgot-password', { method: 'POST', body: payload, auth: false }),
  resetPassword: (payload) => request('/api/auth/reset-password', { method: 'POST', body: payload, auth: false }),
  me: () => request('/api/auth/me'),
  updateMe: (payload) => request('/api/auth/me', { method: 'PUT', body: payload }),
  changePassword: (payload) => request('/api/auth/change-password', { method: 'POST', body: payload }),
  getAddresses: () => request('/api/auth/addresses'),
  addAddress: (payload) => request('/api/auth/addresses', { method: 'POST', body: payload }),
  deleteAddress: (id) => request(`/api/auth/addresses/${id}`, { method: 'DELETE' }),

  // categories
  getCategories: () => request('/api/categories', { auth: false }),
  getAllCategoriesAdmin: () => request('/api/categories/admin/all'),
  createCategory: (payload) => request('/api/categories', { method: 'POST', body: payload }),
  updateCategory: (id, payload) => request(`/api/categories/${id}`, { method: 'PUT', body: payload }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: 'DELETE' }),
  reorderCategories: (ids) => request('/api/categories/admin/order', { method: 'PUT', body: { ids } }),

  // products
  // params: { category, q, sort: newest|price_asc|price_desc, page, limit, exclude, ids }
  // Without page/limit the API returns every matching product.
  getProducts: (params) => request(`/api/products${productQuery(params)}`, { auth: false }),
  getAllProductsAdmin: () => request('/api/products/admin/all'),
  getProduct: (id) => request(`/api/products/${id}`, { auth: false }),
  // Admin view of one product — works for hidden products too.
  getProductAdmin: (id) => request(`/api/products/admin/${id}`),
  getSimilarProducts: ({ name, image, excludeId }) =>
    request(`/api/products/admin/similar${productQuery({ name, image: uploadPath(image), excludeId })}`),
  duplicateProduct: (id) => request(`/api/products/${id}/duplicate`, { method: 'POST' }),
  createProduct: (payload) => request('/api/products', { method: 'POST', body: payload }),
  updateProduct: (id, payload) => request(`/api/products/${id}`, { method: 'PUT', body: payload }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),

  // Stores one photo (data URL) as an image file; returns { url, thumb }.
  uploadImage: (dataUrl) => request('/api/uploads/image', { method: 'POST', body: { image: dataUrl } }),

  // contact form + admin inbox
  submitContact: (payload) => request('/api/contact', { method: 'POST', body: payload, auth: false }),
  getMessages: () => request('/api/contact/admin'),
  getUnreadMessages: () => request('/api/contact/admin/unread'),
  updateMessage: (id, status) => request(`/api/contact/admin/${id}`, { method: 'PUT', body: { status } }),
  deleteMessage: (id) => request(`/api/contact/admin/${id}`, { method: 'DELETE' }),

  // home sections (CMS)
  getHomeSections: () => request('/api/home-sections', { auth: false }),
  getHomeSection: (key) => request(`/api/home-sections/${key}`, { auth: false }),
  getAllHomeSections: () => request('/api/home-sections/all'),
  updateHomeSection: (key, payload) => request(`/api/home-sections/${key}`, { method: 'PUT', body: payload }),

  // reviews
  getReviews: (productId) => request(`/api/products/${productId}/reviews`, { auth: false }),
  addReview: (productId, payload) => request(`/api/products/${productId}/reviews`, { method: 'POST', body: payload }),
  getMyReview: (productId) => request(`/api/products/${productId}/reviews/mine`),
  getPendingReviews: () => request('/api/admin/reviews/pending'),
  updateReviewSettings: (payload) => request('/api/admin/reviews/settings', { method: 'PUT', body: payload }),
  bulkReviews: (payload) => request('/api/admin/reviews/bulk', { method: 'PUT', body: payload }),
  getAdminReviews: () => request('/api/admin/reviews'),
  approveReview: (id, approved) => request(`/api/admin/reviews/${id}/approve`, { method: 'PUT', body: { approved } }),
  deleteReview: (id) => request(`/api/admin/reviews/${id}`, { method: 'DELETE' }),

  // orders
  createOrder: (payload) => request('/api/orders/create', { method: 'POST', body: payload }),
  verifyOrder: (payload) => request('/api/orders/verify', { method: 'POST', body: payload }),
  getMyOrders: () => request('/api/orders'),
  getAllOrders: () => request('/api/orders/admin/all'),
  downloadInvoice: (id) => downloadFile(`/api/orders/${id}/invoice`, `Miladys-Invoice-${id}.pdf`),
  // Admin: bulk shipping status { ids, status: pending|shipped|delivered, courier, trackingNumber, trackingUrl }
  updateShipping: (payload) => request('/api/orders/admin/shipping', { method: 'PUT', body: payload }),
  downloadInvoices: (ids) => downloadFile(`/api/orders/admin/invoices?ids=${ids.join(',')}`, `Miladys-Invoices-${ids.length}.pdf`),

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
