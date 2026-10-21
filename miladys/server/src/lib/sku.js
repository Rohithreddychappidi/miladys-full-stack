import { query } from '../db.js';

// Product codes ("SKU"): MLDY001, MLDY002, … — given automatically to every
// product (existing ones were numbered by date added, see schema.sql) and
// editable in Admin → Products. Codes are unique, ignoring upper/lower case.
export const SKU_PREFIX = 'MLDY';
export const formatSku = (n) => `${SKU_PREFIX}${n < 1000 ? String(n).padStart(3, '0') : n}`;

export async function nextSku(db = { query }) {
  const { rows } = await db.query(
    `SELECT COALESCE(MAX(substring(sku FROM ${SKU_PREFIX.length + 1})::int), 0) AS m
       FROM products WHERE sku ~ '^${SKU_PREFIX}[0-9]+$'`
  );
  return formatSku(rows[0].m + 1);
}

// Admin-entered code: trimmed, upper-case; letters, digits and dashes only.
// Returns { sku } or { error }.
export function cleanSku(value) {
  const sku = String(value || '').trim().toUpperCase();
  if (!sku) return { sku: null };
  if (!/^[A-Z0-9][A-Z0-9-]{1,23}$/.test(sku)) {
    return { error: 'Product code can only use letters, numbers and dashes (2–24 characters), e.g. MLDY014.' };
  }
  return { sku };
}

export async function skuTaken(sku, exceptId = null) {
  const { rows } = await query('SELECT id, name FROM products WHERE upper(sku) = upper($1) AND id IS DISTINCT FROM $2', [sku, exceptId]);
  return rows[0] || null;
}
