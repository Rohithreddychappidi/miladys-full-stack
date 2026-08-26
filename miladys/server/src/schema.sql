-- Milady's — full schema. Works on Neon now, and on plain Postgres (VPS) later
-- with zero changes — just point DATABASE_URL at the new instance.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  mobile        TEXT,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  mobile     TEXT NOT NULL,
  line1      TEXT NOT NULL,
  city       TEXT NOT NULL,
  state      TEXT,
  pincode    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  image      TEXT,
  tagline    TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  price       INTEGER NOT NULL DEFAULT 0,
  mrp         INTEGER NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  image       TEXT,
  -- Extra gallery photos beyond the main `image` (cover), shown as a
  -- thumbnail strip on the product page. Array of image URLs / data URLs.
  images      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe on every boot: adds the column for databases created before the
-- gallery feature existed. No-op once it's there.
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Home page CMS — every section on the home screen is a row here, keyed by
-- a stable `section_key` (e.g. 'hero', 'promo_banner', 'featured_categories').
-- `content` is free-form JSON so the admin panel can add fields per-section
-- without a migration every time.
CREATE TABLE IF NOT EXISTS home_sections (
  section_key TEXT PRIMARY KEY,
  title       TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  content     JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Testimonials — short customer quotes used in two places: a general
-- rotating band on the homepage (product_id NULL) and/or tied to a specific
-- product's detail page. Backend-stored (not localStorage) so an admin's
-- edits are visible to every visitor, not just their own browser.
CREATE TABLE IF NOT EXISTS testimonials (
  id         SERIAL PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  rating     INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  text       TEXT NOT NULL,
  photo      TEXT,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  -- Up to 3 customer-uploaded photos of the product they received.
  photos     JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe on every boot: adds the column for databases created before review
-- photos existed. No-op once present.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Coupons — admin-created discount codes. `type` is 'percent' or 'flat'.
-- One redemption per user per coupon is enforced at the DB level via the
-- unique constraint on coupon_redemptions below, not just app logic, so it
-- holds up even under concurrent requests.
CREATE TABLE IF NOT EXISTS coupons (
  id          SERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL DEFAULT 'percent', -- percent | flat
  value       INTEGER NOT NULL,                -- percent: 1-100, flat: rupees
  min_order   INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_order_id  TEXT UNIQUE,
  razorpay_payment_id TEXT,
  status             TEXT NOT NULL DEFAULT 'created', -- created | paid | failed | paid_oversold | cancelled
  subtotal           INTEGER NOT NULL,
  coupon_id          INTEGER REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code        TEXT,
  discount           INTEGER NOT NULL DEFAULT 0,
  address_name       TEXT,
  address_mobile     TEXT,
  address_line1      TEXT,
  address_city       TEXT,
  address_state      TEXT,
  address_pincode    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at            TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,
  refund_percent     INTEGER,
  refund_amount      INTEGER
);

-- Safe on every boot: adds these columns for databases created before
-- coupons/cancellation existed. No-op once present.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_percent INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount INTEGER;

-- Cancellation policy — fully admin-editable tiers, e.g. "within 1 day,
-- 100% refund" / "within 3 days, 50% refund". max_days is the cutoff (in
-- whole days since payment) that tier applies up to; the app picks the
-- first tier (sorted by max_days ascending) the order still qualifies for.
CREATE TABLE IF NOT EXISTS cancellation_policy (
  id             SERIAL PRIMARY KEY,
  label          TEXT NOT NULL,
  max_days       INTEGER NOT NULL,
  refund_percent INTEGER NOT NULL CHECK (refund_percent BETWEEN 0 AND 100),
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Records that a user has used a given coupon. Inserted once payment is
-- confirmed (not just on "apply"), so an abandoned checkout doesn't burn a
-- customer's one-time use of a code. The unique constraint is what actually
-- guarantees "once per account", even if two requests race.
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id           SERIAL PRIMARY KEY,
  coupon_id    INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id     INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  price        INTEGER NOT NULL,
  qty          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_product ON testimonials(product_id);
