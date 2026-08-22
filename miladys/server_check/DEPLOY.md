# Deploying the API to your VPS

Your frontend is already live on Vercel. This covers the other half: running
`/server` (Express + Postgres) on your own VPS, with Postgres also on that
VPS instead of Neon, fronted by Nginx with a free SSL certificate.

Nothing in the code needs to change to move databases — `DATABASE_URL` just
points at a different Postgres instance either way.

Assumes Ubuntu 22.04/24.04. Run these as a non-root sudo user, not directly
as root.

---

## 1. Basic server setup

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v   # should print v20.x
npm -v
```

Firewall — only allow SSH, HTTP, HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 2. Install Postgres on the VPS

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql --now
```

Create the database and a dedicated app user (don't use the `postgres`
superuser for the app):

```bash
sudo -u postgres psql
```

Inside the `psql` prompt:

```sql
CREATE USER miladys WITH PASSWORD 'pick-a-strong-password-here';
CREATE DATABASE miladys OWNER miladys;
\q
```

Your `DATABASE_URL` will be:

```
postgresql://miladys:pick-a-strong-password-here@localhost:5432/miladys
```

No `?sslmode=require` needed — that flag is only for Neon. Local Postgres on
the same box doesn't need SSL for the connection, and `server/src/db.js`
already only turns SSL on when it sees `sslmode=require` in the string, so
this just works without touching code.

**Migrating your existing Neon data over (optional):** if you already have
real products/orders/reviews in Neon you want to keep, dump and restore
instead of re-seeding from scratch:

```bash
# On your local machine / wherever you have the Neon URL:
pg_dump "postgresql://user:pass@ep-xxxx-pooler.../miladys?sslmode=require" \
  --no-owner --no-privileges -f miladys.sql

# Copy it to the VPS, then on the VPS:
psql "postgresql://miladys:yourpassword@localhost:5432/miladys" -f miladys.sql
```

If you're fine starting fresh on the VPS, skip this and just run
`npm run seed` in step 4 instead.

---

## 3. Get the code onto the VPS

Easiest is a private Git repo:

```bash
cd /var/www          # or wherever you keep apps
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
git clone <your-repo-url> miladys
cd miladys/server
```

No repo yet? `scp` the `server/` folder up directly:

```bash
# from your local machine
scp -r server your-user@your-vps-ip:/var/www/miladys-server
```

---

## 4. Configure and start the API

```bash
cd /var/www/miladys/server        # adjust path to wherever you put it
cp .env.example .env
nano .env
```

Fill in:
- `DATABASE_URL` — the local Postgres URL from step 2
- `CLIENT_URL` — your Vercel URL(s), comma-separated if you have more than
  one (e.g. `https://miladys.vercel.app,https://your-custom-domain.com`)
- `JWT_SECRET` — a long random string (`openssl rand -hex 32` works well)
- `ADMIN_EMAIL`, Razorpay keys, Resend keys — same as before

Then:

```bash
npm install
npm run seed     # creates tables + seed data, or restores from your dump above
```

Run it once directly to check it boots cleanly:

```bash
npm start
# should print: Milady's API listening on http://localhost:4000
# Ctrl+C once you've confirmed it, then use PM2 below for real
```

### Keep it running with PM2

```bash
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup       # prints a command — copy/paste and run it, so PM2
                   # survives a server reboot
```

Useful PM2 commands going forward:

```bash
pm2 status
pm2 logs miladys-api
pm2 restart miladys-api    # after deploying new code
```

---

## 5. Nginx reverse proxy + SSL

The API runs on `localhost:4000`; Nginx sits in front on ports 80/443 and
proxies to it, so you get a clean HTTPS URL instead of exposing the raw
Node port.

You'll need a domain (or subdomain, e.g. `api.yourdomain.com`) pointed at
your VPS's IP via an A record first.

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/miladys-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Uploaded product/CMS photos are stored as base64 in Postgres for now,
    # so requests can be a few MB — match the 30mb limit already set in
    # server/src/index.js.
    client_max_body_size 30m;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/miladys-api /etc/nginx/sites-enabled/
sudo nginx -t          # check config syntax
sudo systemctl reload nginx
```

Free SSL cert via Let's Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

Certbot edits the Nginx config to add the HTTPS block and sets up
auto-renewal. Confirm with:

```bash
curl https://api.yourdomain.com/api/health
# should return: {"ok":true}
```

---

## 6. Point Vercel at the new API

In your Vercel project settings → **Environment Variables**, set:

```
VITE_API_URL=https://api.yourdomain.com
```

Redeploy on Vercel (env var changes need a redeploy to take effect — Vercel
usually prompts this automatically, or trigger it manually from the
dashboard). Then double check `CLIENT_URL` in the VPS's `server/.env`
matches your actual Vercel URL exactly (including `https://`, no trailing
slash), since that's what CORS checks against.

---

## 7. Deploying updates later

```bash
cd /var/www/miladys/server
git pull                # or re-scp your changed files
npm install              # only if package.json changed
pm2 restart miladys-api
```

Schema changes (like the `images` column added for product galleries) apply
automatically on the next boot — `ensureSchema()` runs `schema.sql` on every
start, and every statement in it is `IF NOT EXISTS`, so it's safe to run
repeatedly without wiping data.

---

## Checklist before going fully live

- [ ] Changed the seeded admin password
- [ ] Razorpay keys switched from Test to Live
- [ ] Resend sending domain verified (not the shared `onboarding@resend.dev`)
- [ ] `JWT_SECRET` is a real random value, not the placeholder
- [ ] Postgres password is strong and not reused elsewhere
- [ ] `ufw status` shows only SSH/80/443 open
- [ ] Set up automated Postgres backups (`pg_dump` via cron is a fine start)
