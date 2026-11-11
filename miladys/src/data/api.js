// Thin fetch wrapper around the backend at VITE_API_URL (defaults to
// localhost:4000 for dev). Attaches the JWT automatically when present.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'miladys_token';

// Where the sign-in is kept:
// - customers: localStorage — they stay signed in for 30 days.
// - admins: sessionStorage — gone once the browser is closed, so the admin
//   panel asks for the password again (the server also ends admin sign-ins
//   after 8 hours). Other open tabs of the site share the admin sign-in
//   (see shareSessionWithOtherTabs below).
function tokenPayload(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
}
const store = (kind) => {
  try { return kind === 'session' ? window.sessionStorage : window.localStorage; } catch { return null; }
};

export function getToken() {
  const s = store('session')?.getItem(TOKEN_KEY);
  if (s) return s;
  const l = store('local')?.getItem(TOKEN_KEY);
  // An admin sign-in saved by the older site (in localStorage) is dropped,
  // so the admin signs in once more and it's kept the new way.
  if (l && tokenPayload(l)?.isAdmin) {
    store('local')?.removeItem(TOKEN_KEY);
    return null;
  }
  return l || null;
}

const SYNC_KEY = 'miladys_session_sync';
function broadcast(message) {
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify({ ...message, at: Date.now(), nonce: Math.random() }));
    localStorage.removeItem(SYNC_KEY);
  } catch { /* storage blocked — tabs just don't share */ }
}

export function setToken(token, { silent = false } = {}) {
  const hadAdmin = !!store('session')?.getItem(TOKEN_KEY);
  store('session')?.removeItem(TOKEN_KEY);
  store('local')?.removeItem(TOKEN_KEY);
  if (!token) {
    if (hadAdmin && !silent) broadcast({ type: 'logout' });
    return;
  }
  if (tokenPayload(token)?.isAdmin) store('session')?.setItem(TOKEN_KEY, token);
  else store('local')?.setItem(TOKEN_KEY, token);
}

// Admin sign-in shared between open tabs: a new tab asks, an open tab that
// is signed in answers (the token passes through localStorage only for an
// instant). Signing out in one tab signs out the others.
let onRemoteLogout = () => {};
export function onSessionEnded(fn) { onRemoteLogout = fn; }
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== SYNC_KEY || !e.newValue) return;
    let msg;
    try { msg = JSON.parse(e.newValue); } catch { return; }
    const mine = store('session')?.getItem(TOKEN_KEY);
    if (msg.type === 'ask' && mine) broadcast({ type: 'share', token: mine });
    else if (msg.type === 'share' && msg.token && !mine && !store('local')?.getItem(TOKEN_KEY) && tokenPayload(msg.token)?.isAdmin) {
      store('session')?.setItem(TOKEN_KEY, msg.token);
      window.dispatchEvent(new Event('miladys:session-shared'));
    } else if (msg.type === 'logout' && mine) {
      store('session')?.removeItem(TOKEN_KEY);
      onRemoteLogout();
    }
  });
}
// Called once on start-up when this tab has no sign-in: waits briefly for
// another open tab to share its admin sign-in.
export function askOtherTabsForSession(waitMs = 250) {
  if (getToken()) return Promise.resolve(getToken());
  return new Promise((resolve) => {
    const done = () => { window.removeEventListener('miladys:session-shared', done); clearTimeout(t); resolve(getToken()); };
    const t = setTimeout(done, waitMs);
    window.addEventListener('miladys:session-shared', done);
    broadcast({ type: 'ask' });
  });
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
    // Admin sign-in ended on the server (8 hours passed, or the password
    // was changed elsewhere) — show the admin sign-in again.
    if (res.status === 401 && data.code === 'SIGNED_OUT' && auth && token && tokenPayload(token)?.isAdmin) {
      setToken(null, { silent: true });
      window.dispatchEvent(new Event('miladys:admin-signed-out'));
    }
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
  adminSecurity: () => request('/api/auth/admin/security'),
  saveAdminSecurity: (payload) => request('/api/auth/admin/security', { method: 'PUT', body: payload }),
  adminChangePassword: (payload) => request('/api/auth/admin/change-password', { method: 'POST', body: payload }),
  adminRecoveryQuestions: (payload) => request('/api/auth/admin/recovery/questions', { method: 'POST', body: payload, auth: false }),
  adminRecoveryReset: (payload) => request('/api/auth/admin/recovery/reset', { method: 'POST', body: payload, auth: false }),
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
  combineProducts: (payload) => request('/api/products/admin/combine', { method: 'POST', body: payload }),
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
  adminCancelOrder: (id, payload) => request(`/api/orders/admin/${id}/cancel`, { method: 'POST', body: payload }),
  adminRefundOrder: (id, payload) => request(`/api/orders/admin/${id}/refund`, { method: 'POST', body: payload }),
  retryRefund: (refundId) => request(`/api/orders/admin/refunds/${refundId}/retry`, { method: 'POST' }),
  deleteOrders: (ids) => request('/api/orders/admin/delete', { method: 'POST', body: { ids } }),
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
