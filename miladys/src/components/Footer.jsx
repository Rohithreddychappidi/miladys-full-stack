import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src="/images/logo-white.png" alt="Milady's" className="footer-logo" />
          <p>Premium sarees, handpicked for the woman who wears tradition her own way.</p>
          <a
            className="ig-link"
            href="https://www.instagram.com/themiladys_"
            target="_blank"
            rel="noreferrer"
            aria-label="Milady's on Instagram"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
            </svg>
            Instagram
          </a>
        </div>

        <div className="footer-col">
          <h4>Explore</h4>
          <Link to="/products">Products</Link>
          <Link to="/about">About Us</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/contact">Contact Us</Link>
        </div>

        <div className="footer-col">
          <h4>Reach Us</h4>
          <a href="tel:+917842225444">+91 78422 25444</a>
          <a href="mailto:themiladysofficial@gmail.com">themiladysofficial@gmail.com</a>
          <p className="addr">Flat No. 402, JM&apos;s CNR Tower,<br />Srinagar, Kakinada, A.P. 533003</p>
        </div>

        <div className="footer-col">
          <h4>Store Hours</h4>
          <p>Mon – Sat: 10am – 9pm</p>
          <p>Sunday: 10am – 7pm</p>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Milady&apos;s. All rights reserved.</span>
      </div>

      <style>{`
        .site-footer {
          background: var(--maroon-950);
          color: var(--blush-300);
          padding-top: 64px;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr 1fr;
          gap: 40px;
          padding-bottom: 48px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .footer-brand .footer-logo {
          height: 34px;
          width: auto;
        }
        .footer-brand p {
          font-size: 13.5px;
          line-height: 1.7;
          color: var(--blush-300);
          opacity: 0.85;
          max-width: 260px;
          margin: 14px 0 16px;
        }
        .ig-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          color: var(--ivory);
          border-bottom: 1px solid var(--ivory);
          padding-bottom: 2px;
          width: fit-content;
        }
        .ig-link svg { width: 16px; height: 16px; }
        .footer-col h4 {
          font-family: var(--font-body);
          color: var(--ivory);
          font-size: 12px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 500;
          margin-bottom: 18px;
        }
        .footer-col a, .footer-col p {
          display: block;
          font-size: 13.5px;
          color: var(--blush-300);
          opacity: 0.85;
          margin-bottom: 12px;
          line-height: 1.6;
        }
        .footer-col a:hover { opacity: 1; color: var(--ivory); }
        .footer-bottom {
          padding: 22px 32px;
          font-size: 12.5px;
          opacity: 0.6;
        }
        @media (max-width: 860px) {
          .footer-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 520px) {
          .footer-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </footer>
  );
}
