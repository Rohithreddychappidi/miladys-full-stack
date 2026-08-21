import { useEffect, useState } from 'react';
import { getCategories, getProducts } from '../../data/store';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ categories: 0, products: 0, outOfStock: 0 });

  useEffect(() => {
    const categories = getCategories();
    const products = getProducts();
    setStats({
      categories: categories.length,
      products: products.length,
      outOfStock: products.filter((p) => p.stock === 0).length,
    });
  }, []);

  return (
    <div>
      <div className="admin-page-head">
        <h1>Dashboard</h1>
        <p>Frontend preview — this data is stored in your browser until the backend is connected.</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-num">{stats.categories}</span>
          <span className="stat-label">Categories</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{stats.products}</span>
          <span className="stat-label">Products</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{stats.outOfStock}</span>
          <span className="stat-label">Out of Stock</span>
        </div>
      </div>

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 460px; line-height: 1.6; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 640px; }
        .stat-card {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 26px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .stat-num { font-family: var(--font-display); font-size: 32px; color: var(--maroon-900); }
        .stat-label { font-size: 12.5px; color: var(--ink-400); }
        @media (max-width: 640px) { .stat-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
