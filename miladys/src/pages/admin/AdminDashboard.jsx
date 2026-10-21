import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../data/api';
import { thumbUrl } from '../../utils/images';

// Live store figures. (This page used to read leftover demo data from the
// browser, so its numbers were never the real store's.)
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getAllProductsAdmin(),
      api.getAllCategoriesAdmin(),
      api.getAllOrders(),
      api.getUnreadMessages().catch(() => ({ unread: 0 })),
    ])
      .then(([{ products }, { categories }, { orders }, { unread }]) => {
        if (!active) return;
        const live = products.filter((p) => p.active !== false);
        const paid = orders.filter((o) => o.status === 'paid' || o.status === 'paid_oversold');
        setStats({
          products: live.length,
          hidden: products.length - live.length,
          outOfStock: live.filter((p) => Number(p.stock) === 0).length,
          lowStock: live
            .filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 5)
            .sort((a, b) => a.stock - b.stock),
          categories: categories.filter((c) => c.active !== false).length,
          paidOrders: paid.length,
          toShip: paid.filter((o) => (o.shipping_status || 'pending') === 'pending').length,
          attention: orders.filter((o) => o.status === 'paid_oversold').length,
          unread,
        });
      })
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, []);

  const cards = [
    { to: '/admin/orders?tab=to_ship', label: 'Orders to ship', value: stats?.toShip, alert: stats?.toShip > 0, note: stats?.attention ? `${stats.attention} need attention` : '' },
    { to: '/admin/messages', label: 'Unread messages', value: stats?.unread, alert: stats?.unread > 0 },
    { to: '/admin/products?stock=out', label: 'Out of stock', value: stats?.outOfStock },
    { to: '/admin/products?stock=low', label: 'Low stock (1–5 left)', value: stats?.lowStock?.length },
    { to: '/admin/products', label: 'Products on the store', value: stats?.products, note: stats?.hidden ? `${stats.hidden} hidden` : '' },
    { to: '/admin/categories', label: 'Categories', value: stats?.categories },
    { to: '/admin/orders', label: 'Paid orders', value: stats?.paidOrders },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <h1>Dashboard</h1>
        <p>Your store at a glance. Select a figure to open that section.</p>
      </div>

      {error && <p className="admin-error">Could not load the figures: {error}</p>}

      <div className="stat-grid">
        {cards.map((c) => (
          <Link to={c.to} className={'stat-card' + (c.alert ? ' is-alert' : '')} key={c.label}>
            <span className="stat-num">{c.value ?? '–'}</span>
            <span className="stat-label">{c.label}</span>
            {c.note && <span className="stat-note">{c.note}</span>}
          </Link>
        ))}
      </div>

      {stats?.lowStock?.length > 0 && (
        <section className="low-stock">
          <h2>Running low</h2>
          <p className="low-stock-sub">Sarees with 5 or fewer left. Update the stock in Products when new pieces arrive.</p>
          <ul>
            {stats.lowStock.slice(0, 10).map((p) => (
              <li key={p.id}>
                <img src={p.thumb || thumbUrl(p.image)} alt="" loading="lazy" />
                <span className="low-name">{p.name}</span>
                <span className="low-left">{p.stock} left</span>
              </li>
            ))}
          </ul>
          {stats.lowStock.length > 10 && <Link to="/admin/products?stock=low" className="low-more">See all {stats.lowStock.length} →</Link>}
        </section>
      )}

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 460px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; max-width: 860px; }
        .stat-card {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 26px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: inherit;
          text-decoration: none;
          transition: box-shadow 0.2s;
        }
        .stat-card:hover, .stat-card:focus-visible { box-shadow: 0 6px 18px rgba(72, 24, 30, 0.1); }
        .stat-num { font-family: var(--font-display); font-size: 32px; color: var(--maroon-900); font-variant-numeric: tabular-nums; }
        .stat-label { font-size: 12.5px; color: var(--ink-400); }
        .stat-note { font-size: 11.5px; color: var(--ink-400); }
        .stat-card.is-alert { box-shadow: inset 3px 0 0 var(--maroon-800); }
        .low-stock { margin-top: 34px; max-width: 860px; background: var(--paper); border-radius: var(--radius-md); padding: 22px 24px; }
        .low-stock h2 { font-size: 18px; color: var(--maroon-900); margin: 0 0 4px; }
        .low-stock-sub { font-size: 12.5px; color: var(--ink-400); margin: 0 0 14px; }
        .low-stock ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; }
        .low-stock li { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-top: 1px solid var(--stone-100); font-size: 13px; }
        .low-stock li:first-child { border-top: none; }
        .low-stock img { width: 34px; height: 42px; object-fit: cover; border-radius: 4px; flex: none; }
        .low-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink-800); }
        .low-left { font-size: 12px; color: #8a5a10; background: #fbeacb; padding: 3px 9px; border-radius: 999px; flex: none; }
        .low-more { display: inline-block; margin-top: 10px; font-size: 12.5px; color: var(--maroon-900); }
        @media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .stat-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
