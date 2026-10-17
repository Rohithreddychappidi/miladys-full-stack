# Deploying the image-files + pagination update (API / VPS)

This update moves product, category and other photos out of the database
into WebP files on disk, and adds pagination, search and duplicate checks
to the products API. It is **backwards compatible with the frontend that is
live now**, so deploy this first; the frontend update comes later.

Measured locally against a copy of the live data (same live frontend, mobile 4G):

| Page | Before | After |
|---|---|---|
| Home | 11.8 MB, 57 s | 1.05 MB, 6.8 s |
| /products | 12.2 MB, 55 s | 0.79 MB, 4.9 s |
| Product page | 10.6 MB, 50 s | 0.92 MB, 5.5 s |
| `GET /api/products` | 7.9 MB | 29 KB |

Takes about 10 minutes. The site stays up the whole time.

---

## 0. Before you start

SSH into the VPS and go to the API folder (the one containing
`ecosystem.config.cjs` and `package.json`). In the examples below:

```bash
cd /var/www/miladys/miladys/server     # ← adjust to your real path
```

Check free disk space. The images need about 30 MB now, plus about 0.5 MB
per new product:

```bash
df -h .
```

## 1. Back up the database (do not skip)

```bash
set -a; source .env; set +a      # loads DATABASE_URL into this shell
# pg_dump can't parse a password containing "@"; this re-encodes the URL safely.
DUMP_URL=$(node -e 'console.log(new URL(process.env.DATABASE_URL).href)')
pg_dump "$DUMP_URL" -Fc -f ~/miladys-before-images-$(date +%F).dump
ls -lh ~/miladys-before-images-*.dump      # should be roughly 30-40 MB, not 0
pg_restore --list ~/miladys-before-images-*.dump | grep -c "TABLE DATA"   # ~13
```

## 2. Get the new code

If the VPS was set up with `git clone`:

```bash
git pull
```

If you copy files manually instead, these are the changed/new files under `server/`:

```
package.json, package-lock.json, .gitignore, .env.example
src/index.js
src/lib/images.js                         (new)
src/routes/uploads.js                     (new)
src/routes/products.js
src/routes/categories.js
src/routes/testimonials.js
src/routes/homeSections.js
src/routes/reviews.js
src/routes/orders.js
src/scripts/migrate-images-to-files.js    (new)
DEPLOY-IMAGES.md                          (new, this file)
```

## 3. Install the one new dependency

```bash
npm install --omit=dev
node -e "require('sharp'); require('compression'); console.log('deps ok')"
```

## 4. Add `PUBLIC_URL` to `.env`

Image URLs in API responses are built from this:

```bash
echo 'PUBLIC_URL=https://api.themiladys.com' >> .env
```

## 5. Restart the API

```bash
pm2 restart miladys-api --update-env
pm2 logs miladys-api --lines 20 --nostream     # should end with "listening on ..."
curl -s https://api.themiladys.com/api/health    # {"ok":true}
```

The site works exactly as before at this point (images are still embedded
until step 6).

## 6. Move the images out of the database

Dry run first. It only reports and changes nothing:

```bash
node src/scripts/migrate-images-to-files.js
```

You should see something like `products 53 row(s), ~206 embedded image(s)`.
Then run it for real (takes 1-2 minutes):

```bash
node src/scripts/migrate-images-to-files.js --apply
```

Running it a second time should report `0 image(s)`. That's the check
that everything moved. It is safe to re-run at any time.

## 7. Verify

```bash
# List payload: was ~8 MB, should now be ~30 KB
curl -s -o /dev/null -w "%{size_download} bytes\n" https://api.themiladys.com/api/products

# A product image URL should load as image/webp
IMG=$(curl -s https://api.themiladys.com/api/products | grep -o 'https://api.themiladys.com/uploads/img/[^"]*' | head -1)
echo "$IMG"; curl -sI "$IMG" | grep -iE "^HTTP|content-type|cache-control"

# Should print "No embedded images left"
curl -s https://api.themiladys.com/api/products | grep -q 'data:image' && echo "STILL EMBEDDED" || echo "No embedded images left"
```

Then open https://www.themiladys.com in a private window: the home page,
/products, a product page, and the admin panel products list.

## 8. (Recommended) Let Nginx serve the image files directly

Node already serves them with a 1-year cache, so this step is optional. Nginx
is faster for static files though. In `/etc/nginx/sites-available/miladys-api`,
inside the `server { ... }` block for `api.themiladys.com` (the HTTPS one
that certbot created), add this **above** `location / {`, with the path
adjusted to your server folder:

```nginx
    # Product/category photos: content-hashed filenames, never change.
    location /uploads/img/ {
        alias /var/www/miladys/miladys/server/uploads/img/;
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header Access-Control-Allow-Origin "*";
        try_files $uri =404;
    }
```

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Nginx's user (`www-data`) must be able to read that folder. If images return
403 after this step, run `namei -l /var/www/miladys/miladys/server/uploads/img`
to see which folder blocks it.

## 9. Back up `uploads/` from now on

Photos now live in `server/uploads/` (both images and hero videos), not
in the database. Include that folder in whatever backup you take of the
database, e.g.:

```bash
tar czf ~/miladys-uploads-$(date +%F).tgz -C /var/www/miladys/miladys/server uploads
```

---

## Rollback

The old code can't read the migrated database (it would send relative
image paths the live frontend can't load), so roll back **both**:

```bash
git checkout <previous-commit> -- .         # or restore the old files
pm2 restart miladys-api
set -a; source .env; set +a
DUMP_URL=$(node -e 'console.log(new URL(process.env.DATABASE_URL).href)')
pg_restore --clean --if-exists --no-owner -d "$DUMP_URL" ~/miladys-before-images-YYYY-MM-DD.dump
```

## What changed in the API (for the frontend update)

All existing endpoints keep their response shape. Images are now absolute
URLs instead of `data:` strings.

- `GET /api/products` adds optional `page`, `limit` (max 60), `q`
  (name search), `sort=newest|price_asc|price_desc`, `exclude=<id>` and
  `ids=a,b,c`, and returns `{ products, page, limit, total, totalPages,
  hasMore }`. With no `page`/`limit` it still returns every product.
  List rows carry a small thumbnail in `image` and the full size in `image_full`.
- `GET /api/categories`: `image` is the small thumbnail. The admin list has the full image.
- `GET /api/products/admin/:id`: one product for the admin, including hidden ones.
- `GET /api/products/admin/similar?name=&image=&excludeId=` returns the
  "possible duplicates" for the add-product form.
- `POST /api/products` returns **409** if a product with the same name
  (ignoring case and punctuation) or the very same cover photo already
  exists. Send `allowDuplicate: true` to override.
- `POST /api/products/:id/duplicate` copies a product (photos and colours
  included) as a hidden "<name> (Copy)".
- `POST /api/uploads/image` with `{ image: "data:image/..." }` returns
  `{ url, thumb }`. Upload each photo as it's picked, then save the product
  with URLs.
- Every route that saves photos still accepts `data:` URLs and converts
  them to files, so the current admin panel keeps working unchanged.
