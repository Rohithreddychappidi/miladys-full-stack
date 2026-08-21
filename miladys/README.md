# Milady's — Frontend

React + Vite frontend for Milady's premium sarees, built to the reference
homepage layout, in Myntra-style white/minimal spirit. No backend yet —
this is the piece to show the client before wiring up real data.

## Run it

```
npm install
npm run dev
```

Opens at http://localhost:5173

## Pages

- `/` — Home (hero, category strip, featured products, brand story)
- `/about` — About Us
- `/products` — Product grid with category filter
- `/products/:id` — Product detail
- `/orders` — Order history preview (static sample data for now)
- `/contact` — Contact form + store details
- `/admin` — CMS: Dashboard, Categories, Products (add/edit/delete, photo upload)

## Admin CMS

Visit `/admin` to manage categories and products — add a photo, name, price,
stock, etc. Data is saved to the browser's localStorage for this demo, so it
persists on reload but only on this device/browser. Every screen reads
through `src/data/store.js`, so once the backend is ready, that's the one
file to swap for real API calls — the rest of the app doesn't need to change.

## Notes for next phase (backend)

- Swap `src/data/store.js` functions for API calls (categories, products CRUD)
- Add auth (Google login) for customers, separate auth for `/admin`
- Wire Razorpay at the `Add to Cart` / checkout step
- Replace the sample `Orders` data with real order history per user
- Replace the placeholder photography (`public/images/model-saree.png`) with
  final product photography per category/product

## Stack

React 19, Vite, react-router-dom. No UI framework — plain CSS with design
tokens in `src/index.css` (colors, fonts, spacing) so the palette is easy to
adjust in one place.
