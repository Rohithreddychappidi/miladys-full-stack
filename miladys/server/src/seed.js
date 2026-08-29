import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, ensureSchema } from './db.js';

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

const categories = [
  { id: 'kanjivaram', name: 'Kanjivaram Silk', image: img('photo-1618901185975-d59f7091bcfe'), tagline: 'Temple-woven silk, heirloom weight', sort: 1 },
  { id: 'banarasi', name: 'Banarasi', image: img('photo-1727430228383-aa1fb59db8bf'), tagline: 'Brocade zari from the ghats', sort: 2 },
  { id: 'tussar', name: 'Tussar & Cotton', image: img('photo-1676696706907-0e04665b80bd'), tagline: 'Everyday drape, breathable weave', sort: 3 },
  { id: 'bridal', name: 'Bridal Edit', image: img('photo-1692992193981-d3d92fabd9cb'), tagline: 'Curated for the big day', sort: 4 },
  { id: 'linen', name: 'Linen', image: img('photo-1609748340041-f5d61e061ebc'), tagline: 'Light weaves for warm days', sort: 5 },
  { id: 'organza', name: 'Organza', image: img('photo-1610189012906-4c0aa9b9781e'), tagline: 'Sheer, modern, festive', sort: 6 },
];

const products = [
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

const homeSections = [
  { key: 'hero', title: 'Hero Banner', sort: 1, content: {
    eyebrow: "Milady's Premium Sarees",
    heading: 'tradition in every',
    heading2: 'thread',
    subheading: "Handwoven silks and everyday weaves, sourced directly from India's weaving clusters and curated for the modern woman.",
    ctaLabel: 'Order Now',
    ctaLink: '/products',
    // Each slide is { type: 'image' | 'video', url }. Uploaded from the
    // admin panel as a data URL, or any external URL. Falls back to a
    // built-in default set if this is empty.
    slides: [],
  } },
  { key: 'showcase', title: 'Our Collections (rail)', sort: 2, content: {
    note: "Milady's combination of heritage weave and modern drape helps create a look that's as timeless as you are.",
    heading: 'Our Collections',
  } },
  { key: 'featured_categories', title: 'Shop by Category', sort: 3, content: {
    heading: 'Shop by category',
    categoryIds: ['kanjivaram', 'banarasi', 'bridal', 'organza'],
  } },
  { key: 'promo_banner', title: 'Promo Banner', sort: 4, enabled: false, content: {
    heading: 'Festive edit is live',
    subheading: 'Free shipping on orders above ₹5,000.',
    ctaLabel: 'Explore now',
    ctaLink: '/products',
  } },
  { key: 'featured', title: 'Featured Sarees (heading)', sort: 5, content: {
    eyebrow: 'This week',
    heading: 'Featured Sarees',
  } },
  { key: 'story', title: 'Our Craft', sort: 6, content: {
    eyebrow: 'Our craft',
    heading: 'Woven by hand, worn with intention',
    body: "Every Milady's saree is sourced directly from weaving families across Kanchipuram, Varanasi and the Coromandel coast. We work with a small circle of artisans so each piece keeps its handloom character — no two drapes are quite the same.",
    ctaLabel: 'Read our story',
    ctaLink: '/about',
    image: img('photo-1692992193981-d3d92fabd9cb'),
  } },
  { key: 'testimonials', title: 'Customer Testimonials', sort: 7, content: {
    heading: 'Loved by our customers',
  } },
  { key: 'social_links', title: 'Footer — Social & Contact Links', sort: 20, content: {
    whatsapp: '',
    facebook: '',
    twitter: '',
    instagram: 'https://www.instagram.com/themiladys_',
  } },
  { key: 'about_hero', title: 'About Page — Header', sort: 8, content: {
    eyebrow: "About Milady's",
    heading: 'A saree house built on the weave, not the trend',
  } },
  { key: 'about_story', title: 'About Page — Our Story', sort: 9, content: {
    heading: 'Our story',
    // Each string here becomes its own paragraph on the About page.
    paragraphs: [
      "Milady's started as a promise to bring genuine handloom sarees — the kind woven over weeks, not printed overnight — to women who want their wardrobe to hold real craft. Based in Kakinada, we work directly with weaving families across South India to source each piece.",
      'Every saree that reaches you has been checked by hand for weave quality, zari work and finish before it leaves our store.',
    ],
    image: img('photo-1717585679395-bbe39b5fb6bc'),
    // Optional extra photos shown as a strip below the story text.
    gallery: [],
  } },
];

const testimonials = [
  { name: 'Ananya R.', rating: 5, text: "The zari work is even richer in person. Wore it for my sister's wedding and got so many compliments.", productId: 'p1', sort: 1 },
  { name: 'Meera K.', rating: 5, text: 'Beautiful drape, true to the photos, and the pallu sits perfectly without adjusting all evening.', productId: 'p1', sort: 2 },
  { name: 'Sowmya P.', rating: 5, text: 'This was my bridal saree and it exceeded every expectation. Worth every rupee.', productId: 'p4', sort: 1 },
  // General homepage band — productId left blank so these rotate site-wide.
  { name: 'Divya N.', rating: 5, text: "Fast shipping, careful packaging, and the saree itself is even more beautiful in hand. Milady's is now my go-to.", productId: null, sort: 1 },
  { name: 'Priya S.', rating: 5, text: 'Genuinely handwoven quality at a fair price. I appreciate that they work directly with weaving families.', productId: null, sort: 2 },
  { name: 'Kavya M.', rating: 4, text: 'Lovely collection and easy ordering experience. Would love to see more everyday cotton options.', productId: null, sort: 3 },
];

const cancellationPolicy = [
  { label: 'Within 24 hours of payment', maxDays: 1, refundPercent: 100, sort: 1 },
  { label: '2–3 days after payment', maxDays: 3, refundPercent: 75, sort: 2 },
  { label: '4–7 days after payment', maxDays: 7, refundPercent: 40, sort: 3 },
];

async function main() {
  await ensureSchema();

  for (const c of categories) {
    await pool.query(
      `INSERT INTO categories (id,name,image,tagline,sort_order) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET name=$2, image=$3, tagline=$4, sort_order=$5`,
      [c.id, c.name, c.image, c.tagline, c.sort]
    );
  }
  console.log(`Seeded ${categories.length} categories`);

  for (const p of products) {
    await pool.query(
      `INSERT INTO products (id,name,category_id,price,mrp,stock,description,image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET name=$2, category_id=$3, price=$4, mrp=$5, stock=$6, description=$7, image=$8`,
      [p.id, p.name, p.category, p.price, p.mrp, p.stock, p.description, p.image]
    );
  }
  console.log(`Seeded ${products.length} products`);

  for (const s of homeSections) {
    await pool.query(
      `INSERT INTO home_sections (section_key,title,enabled,content,sort_order) VALUES ($1,$2,$5,$3,$4)
       ON CONFLICT (section_key) DO UPDATE SET title=$2, content=$3, sort_order=$4`,
      [s.key, s.title, JSON.stringify(s.content), s.sort, s.enabled !== false]
    );
  }
  console.log(`Seeded ${homeSections.length} home sections`);

  const { rows: existingTestimonials } = await pool.query('SELECT id FROM testimonials LIMIT 1');
  if (!existingTestimonials.length) {
    for (const t of testimonials) {
      await pool.query(
        `INSERT INTO testimonials (product_id,name,rating,text,active,sort_order) VALUES ($1,$2,$3,$4,TRUE,$5)`,
        [t.productId, t.name, t.rating, t.text, t.sort]
      );
    }
    console.log(`Seeded ${testimonials.length} testimonials`);
  } else {
    console.log('Testimonials already exist, skipped seeding.');
  }

  const { rows: existingPolicy } = await pool.query('SELECT id FROM cancellation_policy LIMIT 1');
  if (!existingPolicy.length) {
    for (const t of cancellationPolicy) {
      await pool.query(
        `INSERT INTO cancellation_policy (label,max_days,refund_percent,sort_order) VALUES ($1,$2,$3,$4)`,
        [t.label, t.maxDays, t.refundPercent, t.sort]
      );
    }
    console.log(`Seeded ${cancellationPolicy.length} cancellation policy tiers`);
  } else {
    console.log('Cancellation policy already exists, skipped seeding.');
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@miladys.com').toLowerCase();
  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [adminEmail]);
  if (!existing.rows.length) {
    const hash = await bcrypt.hash('ChangeMe123!', 10);
    await pool.query(
      `INSERT INTO users (name,email,password_hash,is_admin) VALUES ($1,$2,$3,TRUE)`,
      ['Admin', adminEmail, hash]
    );
    console.log(`Created admin user: ${adminEmail} / ChangeMe123!  (change this password after first login)`);
  } else {
    console.log(`Admin user ${adminEmail} already exists`);
  }

  await pool.end();
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
