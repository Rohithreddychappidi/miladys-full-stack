// Lightweight front-end data layer.
// Backed by localStorage for now so the CMS demo feels real to the client.
// Swap these functions for real API calls once the backend is ready —
// every screen already reads through this file, so that's the only place to change.

const CATEGORY_KEY = 'miladys_categories';
const PRODUCT_KEY = 'miladys_products';

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

const seedCategories = [
  { id: 'kanjivaram', name: 'Kanjivaram Silk', image: img('photo-1618901185975-d59f7091bcfe'), tagline: 'Temple-woven silk, heirloom weight' },
  { id: 'banarasi', name: 'Banarasi', image: img('photo-1727430228383-aa1fb59db8bf'), tagline: 'Brocade zari from the ghats' },
  { id: 'tussar', name: 'Tussar & Cotton', image: img('photo-1676696706907-0e04665b80bd'), tagline: 'Everyday drape, breathable weave' },
  { id: 'bridal', name: 'Bridal Edit', image: img('photo-1692992193981-d3d92fabd9cb'), tagline: 'Curated for the big day' },
  { id: 'linen', name: 'Linen', image: img('photo-1609748340041-f5d61e061ebc'), tagline: 'Light weaves for warm days' },
  { id: 'organza', name: 'Organza', image: img('photo-1610189012906-4c0aa9b9781e'), tagline: 'Sheer, modern, festive' },
];

const seedProducts = [
  { id: 'p1', name: 'Purple Kanjivaram with Gold Zari', category: 'kanjivaram', price: 18500, mrp: 24000, image: img('photo-1641699862936-be9f49b1c38d'), stock: 4, description: 'Handwoven Kanjivaram silk saree in deep purple with a temple-border gold zari pallu.' },
  { id: 'p2', name: 'Maroon Banarasi Silk', category: 'banarasi', price: 15200, mrp: 19000, image: img('photo-1610030469983-98e550d6193c'), stock: 0, description: 'Classic Banarasi weave in maroon with fine brocade work through the body and pallu.' },
  { id: 'p3', name: 'Emerald Tussar Cotton', category: 'tussar', price: 4200, mrp: 5200, image: img('photo-1717585679395-bbe39b5fb6bc'), stock: 12, description: 'Breathable tussar-cotton blend, ideal for daily wear and office festivities.' },
  { id: 'p4', name: 'Ivory Bridal Kanjivaram', category: 'bridal', price: 32500, mrp: 39000, image: img('photo-1619516388835-2b60acc4049e'), stock: 2, description: 'Statement bridal Kanjivaram in ivory and gold, paired with a heavy contrast pallu.' },
  { id: 'p5', name: 'Sage Linen Saree', category: 'linen', price: 3600, mrp: 4400, image: img('photo-1609748340041-f5d61e061ebc'), stock: 9, description: 'Handloom linen in sage green with a woven self-border, styled for warm afternoons.' },
  { id: 'p6', name: 'Blush Organza Festive', category: 'organza', price: 6800, mrp: 8500, image: img('photo-1610189013429-a703f4b245cf'), stock: 6, description: 'Sheer organza with sequin scatter work, light enough for festive evenings.' },
  { id: 'p7', name: 'Teal Kanjivaram Temple Border', category: 'kanjivaram', price: 21000, mrp: 26500, image: img('photo-1676696706907-0e04665b80bd'), stock: 3, description: 'Rich teal Kanjivaram with a wide temple-border pallu and contrast blouse piece.' },
  { id: 'p8', name: 'Gold Banarasi Tissue', category: 'banarasi', price: 17800, mrp: 22000, image: img('photo-1727430228383-aa1fb59db8bf'), stock: 5, description: 'Tissue-finish Banarasi in gold with all-over floral butis.' },
  { id: 'p9', name: 'Rust Cotton Handloom', category: 'tussar', price: 3800, mrp: 4600, image: img('photo-1588140686379-1b76a52103dc'), stock: 15, description: 'Rust handloom cotton with a simple striped border, easy for daily wear.' },
  { id: 'p10', name: 'Wine Bridal Silk', category: 'bridal', price: 28900, mrp: 35000, image: img('photo-1618901185975-d59f7091bcfe'), stock: 0, description: 'Deep wine bridal silk with heavy gold zari work through the pallu and border.' },
  { id: 'p11', name: 'Mustard Linen Weave', category: 'linen', price: 3900, mrp: 4700, image: img('photo-1617627143750-d86bc21e42bb'), stock: 7, description: 'Mustard handloom linen with a fine self-check pattern.' },
  { id: 'p12', name: 'Peacock Blue Organza', category: 'organza', price: 7200, mrp: 8900, image: img('photo-1610189012906-4c0aa9b9781e'), stock: 8, description: 'Peacock-blue organza with delicate thread embroidery along the border.' },
];

function read(key, seed) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  } catch (e) {
    return seed;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* storage unavailable — demo still works in-memory for this session */
  }
}

export function getCategories() {
  return read(CATEGORY_KEY, seedCategories);
}

export function saveCategories(categories) {
  write(CATEGORY_KEY, categories);
}

export function getProducts() {
  return read(PRODUCT_KEY, seedProducts);
}

export function saveProducts(products) {
  write(PRODUCT_KEY, products);
}

export function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

// --- Customer profile, addresses, cart ---
// All demo-only, localStorage backed — same swap-out note as above applies
// once Google login and a real orders/checkout API are wired in.

const PROFILE_KEY = 'miladys_profile';
const ADDRESSES_KEY = 'miladys_addresses';
const CART_KEY = 'miladys_cart';

const emptyProfile = { name: '', mobile: '', email: '' };

export function getProfile() {
  return read(PROFILE_KEY, emptyProfile);
}

export function saveProfile(profile) {
  write(PROFILE_KEY, profile);
}

export function getAddresses() {
  return read(ADDRESSES_KEY, []);
}

export function saveAddresses(addresses) {
  write(ADDRESSES_KEY, addresses);
}

export function getCart() {
  return read(CART_KEY, []);
}

export function saveCart(cart) {
  write(CART_KEY, cart);
}

// --- Testimonials ---
// Each testimonial is linked to a productId and shown on that product's
// detail page. Managed from the admin panel (Testimonials tab).

const TESTIMONIAL_KEY = 'miladys_testimonials';

const seedTestimonials = [
  { id: 't1', productId: 'p1', name: 'Ananya R.', rating: 5, text: 'The zari work is even richer in person. Wore it for my sister\'s wedding and got so many compliments.' },
  { id: 't2', productId: 'p1', name: 'Meera K.', rating: 5, text: 'Beautiful drape, true to the photos, and the pallu sits perfectly without adjusting all evening.' },
  { id: 't4', productId: 'p4', name: 'Sowmya P.', rating: 5, text: 'This was my bridal saree and it exceeded every expectation. Worth every rupee.' },
];

export function getTestimonials(productId) {
  const all = read(TESTIMONIAL_KEY, seedTestimonials);
  return productId ? all.filter((t) => t.productId === productId) : all;
}

export function saveTestimonials(testimonials) {
  write(TESTIMONIAL_KEY, testimonials);
}
