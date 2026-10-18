import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../data/api';

// Live store figures. (This page used to read leftover demo data from the
// browser, so its numbers were never the real store's.)
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.getAllProductsAdmin(), api.getAllCategoriesAdmin(), api.getAllOrders()])
      .then(([{ products }, { categories }, { orders }]) => {
        if (!active) return;
        const live = products.filter((p) => p.active !== false);
        setStats({
          products: live.length,
          hidden: products.length - live.length,
          outOfStock: live.filter((p) => Number(p.stock) === 0).length,
          categories: categories.filter((c) => c.active !== false).length,
          paidOrders: orders.filter((o) => o.status === 'paid' || o.status === 'paid_oversold').length,
        });
      })
      .catch((err) => active && setError(err.message));
    return () => { active = false; };
  }, []);

  const cards = [
    { to: '/admin/products', label: 'Products on the store', value: stats?.products, note: stats?.hidden ? `${stats.hidden} hidden` : '' },
    { to: '/admin/products', label: 'Out of stock', value: stats?.outOfStock },
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
          <Link to={c.to} className="stat-card" key={c.label}>
            <span className="stat-num">{c.value ?? '–'}</span>
            <span className="stat-label">{c.label}</span>
            {c.note && <span className="stat-note">{c.note}</span>}
          </Link>
        ))}
      </div>

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
        @media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .stat-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
