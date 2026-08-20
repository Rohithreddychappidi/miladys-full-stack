import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import RecommendedProducts from '../components/RecommendedProducts';
import { api } from '../data/api';
import { getCategories, getProducts } from '../data/store';

const sortOptions = [
  { id: 'popular', label: 'Popularity' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'name', label: 'Name: A to Z' },
];

export default function Products() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'all';
  const searchTerm = searchParams.get('search') || '';
  const [sort, setSort] = useState('popular');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    api.getCategories().then(({ categories }) => setCategories(categories)).catch(() => setCategories(getCategories()));
    api.getProducts().then(({ products }) => setProducts(products)).catch(() => setProducts(getProducts()));
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== 'all') list = list.filter((p) => p.category === activeCategory);
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [products, activeCategory, searchTerm, sort]);

  function setCategory(id) {
    const next = new URLSearchParams(searchParams);
    if (id === 'all') next.delete('category');
    else next.set('category', id);
    setSearchParams(next);
  }

  function clearSearch() {
    const next = new URLSearchParams(searchParams);
    next.delete('search');
    setSearchParams(next);
  }

  function selectCategory(id) {
    setCategory(id);
    setFiltersOpen(false);
  }

  return (
    <div className="products-page">
      <div className="sparkle-bg" aria-hidden="true">
        <img src="/images/sparkle-bg.svg" alt="" />
      </div>

      <div className="container products-layout">
        {filtersOpen && (
          <div className="sidebar-overlay" onClick={() => setFiltersOpen(false)} aria-hidden="true" />
        )}
        <aside className={`sidebar ${filtersOpen ? 'open' : ''}`}>
          <div className="sidebar-head mobile-only-flex">
            <h4>Filter Sarees</h4>
            <button className="sidebar-close" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>×</button>
          </div>

          <div className="sidebar-block">
            <h4>Categories</h4>
            <ul className="category-list">
              <li>
                <button className={activeCategory === 'all' ? 'active' : ''} onClick={() => selectCategory('all')}>
                  All Sarees
                </button>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <button className={activeCategory === c.id ? 'active' : ''} onClick={() => selectCategory(c.id)}>
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="sidebar-block">
            <h4>Sort By</h4>
            <div className="sort-options">
              {sortOptions.map((s) => (
                <label key={s.id} className="sort-option">
                  <input
                    type="radio"
                    name="sort"
                    checked={sort === s.id}
                    onChange={() => setSort(s.id)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div className="products-main">
          <div className="page-head">
            <div>
              <p className="eyebrow">The Collection</p>
              <h1>Products</h1>
            </div>
            <button className="filter-toggle" onClick={() => setFiltersOpen(true)}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 5h14M6 10h8M8.5 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Categories
            </button>
            {searchTerm && (
              <div className="search-chip">
                Results for &ldquo;{searchTerm}&rdquo;
                <button onClick={clearSearch} aria-label="Clear search">×</button>
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="empty">No sarees match this search — try another category or keyword.</p>
          ) : (
            <div className="product-grid">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      <RecommendedProducts />

      <style>{`
        .products-page { position: relative; overflow: hidden; }
        .peacock-bg {
          position: absolute;
          top: -60px;
          right: -140px;
          width: 640px;
          opacity: 0.16;
          pointer-events: none;
          z-index: 0;
        }
        .sparkle-bg {
          position: absolute;
          top: -40px;
          right: -60px;
          width: 320px;
          opacity: 0.14;
          pointer-events: none;
          z-index: 0;
        }
        .products-layout {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 44px;
          padding: 44px 32px 20px;
          align-items: flex-start;
        }
        .sidebar { position: sticky; top: 100px; display: flex; flex-direction: column; gap: 30px; }
        .sidebar-head.mobile-only-flex { display: none; }
        .sidebar-close { display: none; }
        .sidebar-overlay { display: none; }
        .filter-toggle { display: none; }
        .sidebar-block h4 {
          font-family: var(--font-body);
          font-size: 11.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--gold-600);
          margin-bottom: 14px;
        }
        .category-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
        .category-list button {
          background: none;
          border: none;
          text-align: left;
          width: 100%;
          padding: 9px 0;
          font-size: 13.5px;
          color: var(--ink-600);
        }
        .category-list button:hover { color: var(--maroon-900); }
        .category-list button.active { color: var(--maroon-900); font-weight: 600; }

        .sort-options { display: flex; flex-direction: column; gap: 10px; }
        .sort-option { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--ink-600); }
        .sort-option input { accent-color: var(--maroon-900); }

        .products-main { min-width: 0; }
        .page-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 28px; }
        .page-head h1 { font-size: 34px; margin-top: 8px; }
        .search-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--stone-100);
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 13px;
          color: var(--ink-600);
        }
        .search-chip button { background: none; border: none; font-size: 16px; color: var(--ink-400); line-height: 1; }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 26px;
          padding-bottom: 20px;
        }
        .empty { color: var(--ink-400); font-size: 14px; padding: 40px 0; }

        @media (max-width: 980px) {
          .products-layout { grid-template-columns: 1fr; }
          .filter-toggle {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: var(--stone-100);
            border: 1px solid var(--stone-200);
            border-radius: 999px;
            padding: 9px 16px;
            font-size: 13px;
            color: var(--maroon-900);
          }
          .filter-toggle svg { width: 16px; height: 16px; }
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 82%;
            max-width: 300px;
            background: var(--paper);
            z-index: 70;
            flex-direction: column;
            flex-wrap: nowrap;
            gap: 26px;
            padding: 22px 22px 32px;
            transform: translateX(-105%);
            transition: transform 0.3s ease;
            overflow-y: auto;
            box-shadow: 12px 0 30px rgba(0,0,0,0.18);
          }
          .sidebar.open { transform: translateX(0); }
          .sidebar-head.mobile-only-flex {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--stone-200);
            padding-bottom: 12px;
            margin-bottom: 4px;
          }
          .sidebar-head.mobile-only-flex h4 { margin: 0; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--maroon-900); }
          .sidebar-close {
            display: block;
            background: none;
            border: none;
            font-size: 22px;
            line-height: 1;
            color: var(--ink-600);
            padding: 4px 8px;
          }
          .sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(36,26,23,0.45);
            z-index: 65;
          }
          .product-grid { grid-template-columns: repeat(2, 1fr); }
          .sparkle-bg { width: 200px; top: -20px; right: -40px; }
        }
        @media (max-width: 520px) {
          .product-grid { grid-template-columns: 1fr 1fr; gap: 16px; }
          .products-layout { padding: 32px 20px 20px; }
        }
      `}</style>
    </div>
  );
}
