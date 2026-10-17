import { api } from './api';

// A small pool of recent products for "Featured" / "Recommended" strips,
// plus any admin-curated ids that aren't already in it. Replaces fetching
// the entire catalogue just to show four cards. limit: 0 = curated ids only.
export async function loadProductPool({ ids = [], limit = 24 } = {}) {
  const wanted = [...new Set(ids.filter(Boolean))];
  const [{ products: recent }, { products: curated }] = await Promise.all([
    limit > 0 ? api.getProducts({ page: 1, limit }) : Promise.resolve({ products: [] }),
    wanted.length ? api.getProducts({ ids: wanted }) : Promise.resolve({ products: [] }),
  ]);
  const byId = new Map();
  for (const p of [...curated, ...recent]) byId.set(p.id, p);
  return [...byId.values()];
}
