# Milady's — Full Setup Guide

This project now has two parts:

- **`/src`** — the React storefront + admin panel (unchanged in look/feel, now wired to a real backend)
- **`/server`** — a new Node/Express API: auth, Razorpay payments, Resend emails, CMS, reviews, orders

Everything below is what you need to get both running, using **Neon** (serverless Postgres) as the database for now, moving to your own VPS Postgres later with just an env-var change.

---

## 1. Database — Neon (for now)

1. Create a free project at https://neon.tech
2. In the Neon dashboard, copy the **pooled connection string** (Dashboard → Connection Details → "Pooled connection"). It looks like:
   ```
   postgresql://user:password@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/miladys?sslmode=require
   ```
3. You'll paste this into `server/.env` as `DATABASE_URL` (step 3 below).

**Moving to your VPS later:** install Postgres on the VPS, create a database, and just point `DATABASE_URL` at that instance instead (e.g. `postgresql://user:pass@your-vps-ip:5432/miladys`). No code changes needed — the app talks to Postgres over the standard `pg` driver both times.

---

## 2. Razorpay (payments)

1. Sign up at https://dashboard.razorpay.com
2. Go to **Settings → API Keys** and generate a **Test Mode** key pair first (switch to Live keys only when you're ready to accept real payments).
3. You'll need both `Key ID` and `Key Secret` for `server/.env`.
4. Test card for Test Mode checkout: `4111 1111 1111 1111`, any future expiry, any CVV. Test UPI: `success@razorpay`.

## 3. Resend (transactional email)

1. Sign up at https://resend.com
2. Create an API key (**API Keys** in the dashboard).
3. Add and verify a sending domain, or start with Resend's shared `onboarding@resend.dev` sender for testing (no domain setup needed, limited to your own verified email as recipient until you verify a domain).

---

## 4. Configure and run the backend

```bash
cd server
cp .env.example .env
# now edit .env and fill in:
#   DATABASE_URL        <- your Neon connection string
#   JWT_SECRET           <- any long random string
#   ADMIN_EMAIL           <- the email you want as the admin login
#   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
#   RESEND_API_KEY / RESEND_FROM_EMAIL

npm install
npm run seed     # creates tables, seeds categories/products/home sections, creates the admin user
npm run dev      # starts the API on http://localhost:4000
```

`npm run seed` prints the admin login it created, e.g.:
```
Created admin user: admin@miladys.com / ChangeMe123!  (change this password after first login)
```
Log in with that at `/admin`, then update your profile/password as needed (there's no "change password" screen yet — for now you'd update it directly in the database, or re-run seed after deleting the user row).

## 5. Configure and run the frontend

```bash
cd ..            # project root
cp .env.example .env
# VITE_API_URL defaults to http://localhost:4000, only change if your API runs elsewhere

npm install
npm run dev       # starts the storefront on http://localhost:5173
```

Visit `http://localhost:5173` for the storefront and `http://localhost:5173/admin` for the CMS.

---

## What's wired up

- **Auth** — real signup/login (JWT), used to gate `/profile`, `/orders`, `/checkout`. The account whose email matches `ADMIN_EMAIL` gets admin rights automatically on signup, or you can seed one directly (see step 4).
- **Razorpay** — Checkout creates a Razorpay order server-side (price is looked up from the DB, never trusted from the browser), opens the Razorpay popup, and verifies the payment signature server-side before marking the order paid and decrementing stock.
- **Resend email** — sent on every login, and on every successful payment (order confirmation with itemized total and shipping address). If keys aren't configured, emails are skipped and logged to the server console instead of failing the request.
- **Admin panel (`/admin`)**
  - **Home Page** — edit every section's text (hero, collections rail, promo banner, featured heading, "Our Craft" story), upload hero banner photos/videos, upload the "Our Craft" photo, and toggle sections on/off — all reflected live on the storefront home page. Re-running `npm run seed` resets home-page content back to the defaults, so avoid re-seeding once you've customized it through the admin panel (categories/products are safe to re-seed, they use upserts on ID rather than replacing your edits).
  - **Categories / Products** — same UI as before, now backed by the database instead of localStorage.
  - **Orders** — every order placed, with Razorpay payment ID and status.
  - **Reviews** — moderate (hide/show/delete) star ratings & comments left on products.
  - **Testimonials** — unchanged, still the curated-quote block (separate from the new user-submitted Reviews).
- **Reviews on product pages** — logged-in users can leave a 1–5 star rating + comment; approved reviews show in a horizontally-scrolling card carousel (like Google reviews) with a running average.
- **My Orders (`/orders`)** — logged-in users see their own order history with live payment status and items.

## Notes / things to do before going to production

- Change the seeded admin password.
- Move `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` to Razorpay **Live** keys, and verify a real sending domain in Resend.
- Set `CLIENT_URL` in `server/.env` to your deployed frontend origin (used for CORS).
- Consider adding a Razorpay webhook (`/api/orders/webhook`, verification helper already included in `server/src/lib/razorpay.js`) as a backstop for payments that succeed but where the browser never calls `/verify` (closed tab, dropped connection).
