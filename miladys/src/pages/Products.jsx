import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import RecommendedProducts from '../components/RecommendedProducts';
import Seo from '../components/Seo';
import { api } from '../data/api';
import { getCategories, getProducts } from '../data/store';

const PAGE_SIZE = 12;

// Sorts the API can do itself (so results can be fetched a page at a time).
// "Name" and keyword search (which also matches descriptions) aren't
// supported server-side, so those fetch the small, image-free list once
// and filter/sort it here instead — still shown PAGE_SIZE at a time.
const SERVER_SORT = { popular: 'newest', 'price-asc': 'price_asc', 'price-desc': 'price_desc' };

const sortOptions = [
  { id: 'popular', label: 'Popularity' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'name', label: 'Name: A to Z' },
];

export default function Products() {
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'all';
  const searchTerm = searchParams.get('search') || '';
  const [sort, setSort] = useState('popular');
  // Arriving here via "Explore" on the Our Collections rail opens straight
  // to the category list (the same sidebar panel the mobile "Filter
  // Sarees" button opens) instead of dropping straight into the mixed
  // all-products grid — same panel, just already open on arrival.
  const [filtersOpen, setFiltersOpen] = useState(!!location.state?.openFilters);

  const serverPaged = !searchTerm.trim() && SERVER_SORT[sort] !== undefined;

  useEffect(() => {
    api.getCategories().then(({ categories }) => setCategories(categories)).catch(() => setCategories(getCategories()));
  }, []);

  // (Re)load from page 1 whenever the category, sort or search changes.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setPage(1);
    const category = activeCategory !== 'all' ? activeCategory : undefined;
    const request = serverPaged
      ? api.getProducts({ category, sort: SERVER_SORT[sort], page: 1, limit: PAGE_SIZE })
      : api.getProducts({ category });
    request
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        setTotal(serverPaged ? data.total ?? data.products.length : data.products.length);
      })
      .catch(() => {
        if (!active) return;
        const fallback = getProducts().filter((p) => !category || p.category === category);
        setProducts(fallback);
        setTotal(fallback.length);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [activeCategory, sort, searchTerm, serverPaged]);

  // Client-side filtering/sorting — only does anything for search and
  // name-sort; server-paged results arrive already filtered and sorted.
  const filtered = useMemo(() => {
    if (serverPaged) return products;
    let list = products;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [products, searchTerm, sort, serverPaged]);

  const visible = serverPaged ? filtered : filtered.slice(0, page * PAGE_SIZE);
  const matchCount = serverPaged ? total : filtered.length;
  const hasMore = visible.length < matchCount;

  function loadMore() {
    const next = page + 1;
    if (!serverPaged) {
      setPage(next);
      return;
    }
    setLoading(true);
    api
      .getProducts({ category: activeCategory !== 'all' ? activeCategory : undefined, sort: SERVER_SORT[sort], page: next, limit: PAGE_SIZE })
      .then((data) => {
        // Skip anything already shown, in case the catalogue changed between pages.
        setProducts((prev) => [...prev, ...data.products.filter((p) => !prev.some((x) => x.id === p.id))]);
        setTotal(data.total ?? total);
        setPage(next);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

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

  const activeCategoryName = activeCategory !== 'all'
    ? categories.find((c) => c.id === activeCategory)?.name
    : null;
  const seoTitle = activeCategoryName ? `${activeCategoryName} Sarees` : 'Shop All Sarees';

  return (
    <div className="products-page">
      <Seo
        title={seoTitle}
        path={activeCategory !== 'all' ? `/products?category=${activeCategory}` : '/products'}
        description={
          activeCategoryName
            ? `Shop handwoven ${activeCategoryName} sarees at Milady's — sourced directly from India's weaving clusters.`
            : "Browse Milady's full collection of handwoven silk and everyday sarees — Kanjivaram, Banarasi, bridal, organza and more."
        }
      />
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

          {visible.length === 0 ? (
            loading
              ? <p className="empty">Loading sarees…</p>
              : <p className="empty">No sarees match this search — try another category or keyword.</p>
          ) : (
            <>
              <div className="product-grid">
                {visible.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="load-more">
                <p className="load-more-count">Showing {visible.length} of {matchCount}</p>
                {hasMore && (
                  <button type="button" className="btn btn-outline" onClick={loadMore} disabled={loading}>
                    {loading ? 'Loading…' : 'Load more sarees'}
                  </button>
                )}
              </div>
            </>
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
        .load-more { display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 40px; }
        .load-more-count { font-size: 12.5px; color: var(--ink-400); }

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
