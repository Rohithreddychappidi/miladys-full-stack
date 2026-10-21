import { useEffect, useState } from 'react';
import { api } from './api';

// Stock left for one cart line: its colour's own stock if it has one,
// otherwise the saree's.
export function stockFor(product, color) {
  const variant = color && (product.colors || []).find((c) => c.name === color);
  if (variant && variant.stock !== '' && variant.stock != null && Number.isFinite(Number(variant.stock))) return Number(variant.stock);
  return Number(product.stock) || 0;
}

export const cartKey = (item) => item.key || (item.color ? `${item.id}__${item.color}` : item.id);

// Checks the bag against today's catalogue: sarees that are hidden or
// removed, sold out, have fewer left than the quantity, or changed price.
// Returns { checked, byKey: { [key]: { state, left, price } }, blocking }
// where state is 'ok' | 'gone' | 'soldout' | 'short', and `blocking` is
// true while any line can't be bought as it is.
export function useCartAvailability(items) {
  const [result, setResult] = useState({ checked: false, byKey: {}, blocking: false });
  const ids = [...new Set(items.map((i) => i.id))].sort().join(',');
  // Re-check when quantities change too, so "only N left" clears as soon
  // as the customer lowers the quantity.
  const signature = items.map((i) => `${cartKey(i)}:${i.qty}`).join('|');

  useEffect(() => {
    if (!ids) { setResult({ checked: true, byKey: {}, blocking: false }); return undefined; }
    let active = true;
    api.getProducts({ ids, limit: 60 })
      .then(({ products }) => {
        if (!active) return;
        const found = Object.fromEntries((products || []).map((p) => [p.id, p]));
        const byKey = {};
        let blocking = false;
        for (const item of items) {
          const p = found[item.id];
          let info;
          if (!p) info = { state: 'gone', left: 0 };
          else {
            const left = stockFor(p, item.color);
            info = { state: left <= 0 ? 'soldout' : left < item.qty ? 'short' : 'ok', left, price: Number(p.price) };
          }
          if (info.state !== 'ok') blocking = true;
          byKey[cartKey(item)] = info;
        }
        setResult({ checked: true, byKey, blocking });
      })
      // If the check itself fails (offline…), don't block — the server
      // still checks stock when the order is placed.
      .catch(() => active && setResult({ checked: true, byKey: {}, blocking: false }));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, signature]);

  return result;
}
