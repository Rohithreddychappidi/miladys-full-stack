import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/products', label: 'Products' },
  { to: '/orders', label: 'Orders' },
  { to: '/contact', label: 'Contact Us' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(false);
  const [hasHero, setHasHero] = useState(false);
  const [query, setQuery] = useState('');
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // On pages with a full-bleed hero (marked with id="page-hero"), the navbar
  // stays fully transparent for as long as any part of the hero is still
  // below it, then switches to the solid maroon bar once the hero has
  // scrolled fully past. Pages without a hero just use the old scroll tint.
  useEffect(() => {
    const heroEl = document.getElementById('page-hero');

    if (!heroEl || !('IntersectionObserver' in window)) {
      setHasHero(false);
      const onScroll = () => setScrolled(window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll);
      return () => window.removeEventListener('scroll', onScroll);
    }

    setHasHero(true);
    const navHeight = window.innerWidth <= 860 ? 62 : 72;
    const observer = new IntersectionObserver(
      ([entry]) => setOverHero(entry.isIntersecting),
      { rootMargin: `-${navHeight}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, [location.pathname]);

  const navClass = hasHero ? (overHero ? 'is-transparent' : 'is-scrolled') : (scrolled ? 'is-scrolled' : '');

  function handleSearch(e) {
    e.preventDefault();
    navigate(query.trim() ? `/products?search=${encodeURIComponent(query.trim())}` : '/products');
    setSearchOpen(false);
  }

  return (
    <header className={`navbar ${navClass}`}>
      <div className="container navbar-inner">
        <button
          className="nav-toggle"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => { setMenuOpen((v) => !v); setSearchOpen(false); }}
        >
          <span />
          <span />
        </button>

        <Link to="/" className="brand-center" onClick={() => setMenuOpen(false)}>
          <img
            id="navBrandLogo"
            src="/images/logo-white.png"
            alt="Milady's"
            className="brand-logo"
            width="110"
            height="38"
          />
        </Link>

        <div className="nav-actions">
          <button
            className="icon-btn"
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <line x1="16.2" y1="16.2" x2="21" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <Link to="/profile" className="icon-btn" aria-label="Login">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
              <path d="M4.5 20c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </Link>
          <Link to="/cart" className="icon-btn cart-link" aria-label="Cart">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h2l1.6 10.2a2 2 0 0 0 2 1.7h7.4a2 2 0 0 0 2-1.6L20 8H6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="21" r="1.3" fill="currentColor" />
              <circle cx="17" cy="21" r="1.3" fill="currentColor" />
            </svg>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="search-bar">
          <form className="container search-form" onSubmit={handleSearch}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <line x1="14" y1="14" x2="18.5" y2="18.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              autoFocus
              placeholder="Search sarees..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
            />
          </form>
        </div>
      )}

      {menuOpen && (
        <button className="nav-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      )}

      <div className={`nav-popover ${menuOpen ? 'open' : ''}`}>
        <nav className="popover-links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => 'popover-link' + (isActive ? ' active' : '')}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          margin: 0 16px 0;
          background: rgba(72, 24, 30, 0.5);
          backdrop-filter: blur(20px) saturate(170%);
          -webkit-backdrop-filter: blur(20px) saturate(170%);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 999px;
          box-shadow:
            0 18px 36px rgba(20,4,7,0.22),
            inset 0 1px 0 rgba(255,255,255,0.16),
            inset 0 -1px 0 rgba(0,0,0,0.12);
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }
        .navbar.is-scrolled {
          background: rgba(72, 24, 30, 0.86);
          box-shadow:
            0 18px 36px rgba(20,4,7,0.3),
            inset 0 1px 0 rgba(255,255,255,0.14),
            inset 0 -1px 0 rgba(0,0,0,0.14);
        }
        .navbar.is-transparent {
          background: transparent;
          border-color: transparent;
          box-shadow: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }
        .navbar-inner {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 72px;
          padding: 0 8px;
        }
        .brand-center {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
        }
        .brand-logo {
          height: 38px;
          width: auto;
          display: block;
        }

        .nav-toggle {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 8px;
          position: relative;
          z-index: 250;
        }
        .nav-toggle span {
          width: 24px;
          height: 1.5px;
          background: var(--blush-300);
          display: block;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 2;
        }
        .icon-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          color: var(--blush-300);
          background: none;
          border: none;
          transition: color 0.2s ease;
        }
        .icon-btn svg { width: 21px; height: 21px; }
        .icon-btn:hover { color: var(--ivory); }
        .cart-badge {
          position: absolute;
          top: 3px;
          right: 3px;
          background: var(--gold-500);
          color: var(--maroon-950);
          font-size: 10px;
          font-weight: 600;
          min-width: 15px;
          height: 15px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
        }

        .search-bar {
          margin: 8px 16px 0;
          border-radius: 22px;
          background: var(--maroon-950);
          box-shadow: 0 12px 26px rgba(20,4,7,0.24);
          animation: searchDrop 0.25s ease;
        }
        @keyframes searchDrop {
          from { max-height: 0; opacity: 0; }
          to { max-height: 80px; opacity: 1; }
        }
        .search-form {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
        }
        .search-form svg { width: 17px; height: 17px; color: var(--blush-300); flex: 0 0 auto; }
        .search-form input {
          background: none;
          border: none;
          outline: none;
          color: var(--ivory);
          font-family: var(--font-body);
          font-size: 14px;
          width: 100%;
        }
        .search-form input::placeholder { color: var(--blush-300); opacity: 0.7; }

        .nav-backdrop {
          position: fixed;
          inset: 0;
          z-index: 150;
          background: rgba(36,26,23,0.25);
          border: none;
          padding: 0;
          cursor: default;
        }

        .nav-popover {
          position: absolute;
          top: calc(100% + 10px);
          left: 8px;
          z-index: 200;
          min-width: 210px;
          background: var(--ivory);
          border-radius: 16px;
          box-shadow: 0 18px 40px rgba(36,26,23,0.22);
          padding: 10px;
          transform-origin: top left;
          transform: scale(0.92) translateY(-6px);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
        }
        .nav-popover.open {
          opacity: 1;
          visibility: visible;
          transform: scale(1) translateY(0);
        }
        .popover-links {
          display: flex;
          flex-direction: column;
        }
        .popover-link {
          padding: 11px 14px;
          border-radius: 10px;
          font-family: var(--font-body);
          font-size: 14.5px;
          color: var(--ink-900);
          transition: background 0.15s ease, color 0.15s ease;
        }
        .popover-link:hover { background: var(--blush-400); }
        .popover-link.active { color: var(--maroon-900); font-weight: 600; background: var(--stone-200); }

        @media (max-width: 860px) {
          .navbar { margin: 0 12px 0; }
          .navbar-inner { height: 62px; }
          .brand-logo { height: 26px; }
          .icon-btn { width: 34px; height: 34px; }
          .icon-btn svg { width: 19px; height: 19px; }
          .nav-popover { left: 6px; min-width: 190px; }
          .search-bar { margin: 8px 12px 0; border-radius: 18px; }
        }
      `}</style>
    </header>
  );
}
