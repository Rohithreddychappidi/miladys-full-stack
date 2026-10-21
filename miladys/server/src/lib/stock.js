// Stock for sarees that come in colours. Each colour keeps its own stock
// (colors[].stock) and the saree's `stock` is always their total. Sarees
// without colours just use `stock`.

// Cleans the colours sent from the admin form. Every colour needs a name
// and a stock number. Returns { colors, total } or { error }.
export function normalizeColors(colors) {
  if (!Array.isArray(colors) || colors.length === 0) return { colors: [], total: null };
  const seen = new Set();
  const out = [];
  for (const c of colors) {
    const name = String(c?.name || '').trim();
    if (!name) return { error: 'Every colour needs a name.' };
    const key = name.toLowerCase();
    if (seen.has(key)) return { error: `The colour "${name}" is listed twice.` };
    seen.add(key);
    const raw = c.stock;
    if (raw === '' || raw === null || raw === undefined || !Number.isFinite(Number(raw))) {
      return { error: `Enter the stock for ${name} (0 if it's sold out).` };
    }
    const stock = Math.max(0, Math.floor(Number(raw)));
    out.push({ ...c, name, stock });
  }
  return { colors: out, total: out.reduce((s, c) => s + c.stock, 0) };
}

const colorIndex = (product, color) =>
  color && Array.isArray(product.colors) ? product.colors.findIndex((c) => c.name === color) : -1;

// Stock left for one cart line (colour stock when the saree has colours).
export function stockForLine(product, color) {
  const i = colorIndex(product, color);
  if (i >= 0) {
    const s = product.colors[i].stock;
    // Colours saved before per-colour stock was required may have none —
    // those share the saree's stock.
    return s === '' || s == null || !Number.isFinite(Number(s)) ? Number(product.stock) || 0 : Number(s);
  }
  return Number(product.stock) || 0;
}

// Takes up to `qty` units for an order line, inside a transaction (the
// product row is locked). Returns how many were actually taken (fewer
// means it sold out in the meantime).
export async function takeStock(client, productId, color, qty) {
  const { rows } = await client.query('SELECT stock, colors FROM products WHERE id = $1 FOR UPDATE', [productId]);
  const p = rows[0];
  if (!p) return 0;
  const i = colorIndex(p, color);
  if (i >= 0 && Number.isFinite(Number(p.colors[i].stock)) && p.colors[i].stock !== '' && p.colors[i].stock != null) {
    const take = Math.max(0, Math.min(qty, Number(p.colors[i].stock), Number(p.stock)));
    const colors = p.colors.map((c, j) => (j === i ? { ...c, stock: Number(c.stock) - take } : c));
    await client.query('UPDATE products SET colors = $1::jsonb, stock = stock - $2 WHERE id = $3', [JSON.stringify(colors), take, productId]);
    return take;
  }
  const take = Math.max(0, Math.min(qty, Number(p.stock)));
  await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [take, productId]);
  return take;
}

// Puts units back (cancellation) — to the colour they came from.
export async function returnStock(client, productId, color, qty) {
  if (!(qty > 0)) return;
  const { rows } = await client.query('SELECT colors FROM products WHERE id = $1 FOR UPDATE', [productId]);
  const p = rows[0];
  if (!p) return;
  const i = colorIndex(p, color);
  if (i >= 0 && p.colors[i].stock !== '' && p.colors[i].stock != null && Number.isFinite(Number(p.colors[i].stock))) {
    const colors = p.colors.map((c, j) => (j === i ? { ...c, stock: Number(c.stock) + qty } : c));
    await client.query('UPDATE products SET colors = $1::jsonb, stock = stock + $2 WHERE id = $3', [JSON.stringify(colors), qty, productId]);
  } else {
    await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [qty, productId]);
  }
}
