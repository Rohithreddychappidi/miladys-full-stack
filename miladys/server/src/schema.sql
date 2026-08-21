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

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  approved   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_order_id  TEXT UNIQUE,
  razorpay_payment_id TEXT,
  status             TEXT NOT NULL DEFAULT 'created', -- created | paid | failed
  subtotal           INTEGER NOT NULL,
  address_name       TEXT,
  address_mobile     TEXT,
  address_line1      TEXT,
  address_city       TEXT,
  address_state      TEXT,
  address_pincode    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at            TIMESTAMPTZ
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
