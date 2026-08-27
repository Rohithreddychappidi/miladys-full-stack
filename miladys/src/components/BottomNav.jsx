import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const items = [
  {
    to: '/products',
    label: 'Shop',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h2l1.6 10.2a2 2 0 0 0 2 1.7h7.4a2 2 0 0 0 2-1.6L20 8H6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 6a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/orders',
    label: 'Orders',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4.5" y="4" width="15" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/cart',
    label: 'Cart',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h2l1.6 10.2a2 2 0 0 0 2 1.7h7.4a2 2 0 0 0 2-1.6L20 8H6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="21" r="1.3" fill="currentColor" />
        <circle cx="17" cy="21" r="1.3" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4.5 20c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const { count } = useCart();

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      <div className="bottom-nav-glass">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 'bottom-nav-link' + (isActive ? ' active' : '')}
          >
            <span className="bottom-nav-icon">
              {item.icon}
              {item.to === '/cart' && count > 0 && <span className="bottom-nav-badge">{count}</span>}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </div>

      <style>{`
        .bottom-nav { display: none; }

        @media (max-width: 860px) {
          .bottom-nav {
            display: block;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 80;
            padding: 0 24px calc(10px + env(safe-area-inset-bottom, 0px));
            pointer-events: none;
          }
          .bottom-nav-glass {
            pointer-events: auto;
            margin: 0 auto;
            max-width: 380px;
            display: flex;
            align-items: center;
            justify-content: space-around;
            gap: 4px;
            padding: 6px 14px;
            border-radius: 999px;
            background: rgba(58, 14, 21, 0.62);
            backdrop-filter: blur(18px) saturate(160%);
            -webkit-backdrop-filter: blur(18px) saturate(160%);
            border: 1px solid rgba(255,255,255,0.16);
            box-shadow: 0 14px 34px rgba(44, 10, 16, 0.35), inset 0 1px 0 rgba(255,255,255,0.12);
          }
          .bottom-nav-link {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            color: var(--blush-300);
            padding: 5px 14px;
            border-radius: 999px;
            transition: color 0.2s ease, background 0.2s ease;
          }
          .bottom-nav-link.active {
            color: var(--ivory);
          }
          .bottom-nav-icon { position: relative; display: flex; }
          .bottom-nav-link.active .bottom-nav-icon::before {
            content: '';
            position: absolute;
            inset: -8px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(232,196,183,0.6) 0%, rgba(232,196,183,0.18) 55%, rgba(232,196,183,0) 75%);
            z-index: -1;
          }
          .bottom-nav-icon svg { width: 18px; height: 18px; }
          .bottom-nav-label { font-size: 9px; letter-spacing: 0.03em; font-weight: 500; }
          .bottom-nav-badge {
            position: absolute;
            top: -6px;
            right: -8px;
            background: var(--gold-500);
            color: var(--maroon-950);
            font-size: 9px;
            font-weight: 600;
            min-width: 15px;
            height: 15px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 3px;
          }
        }
      `}</style>
    </nav>
  );
}
