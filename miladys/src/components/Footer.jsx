import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../data/api';

const defaultSocial = {
  whatsapp: '',
  facebook: '',
  twitter: '',
  instagram: 'https://www.instagram.com/themiladys_',
};

function whatsappUrl(number) {
  const digits = (number || '').replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

export default function Footer() {
  const [social, setSocial] = useState(defaultSocial);

  useEffect(() => {
    api
      .getHomeSections()
      .then(({ sections }) => {
        const found = sections.find((s) => s.section_key === 'social_links');
        if (found?.content) setSocial({ ...defaultSocial, ...found.content });
      })
      .catch(() => {});
  }, []);

  const wa = whatsappUrl(social.whatsapp);

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src="/images/logo-white.png" alt="Milady's" className="footer-logo" />
          <p>Premium sarees, handpicked for the woman who wears tradition her own way.</p>

          <div className="social-links">
            {social.instagram && (
              <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Milady's on Instagram" className="social-link">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
                </svg>
              </a>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" aria-label="Chat with Milady's on WhatsApp" className="social-link">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8.5 8.7c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.4.2.5.7 1.6.7 1.7.1.1.1.3 0 .4-.1.2-.2.3-.3.4l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.2.1.4.2.4.4.1.5-.1 1.4-.6 1.8-.6.5-1.6.8-2.6.5-1.8-.5-3.7-1.6-5.1-3.1-1.3-1.3-2.1-2.7-2.4-3.4-.3-.7-.4-1.7.2-2.4z" fill="currentColor" />
                </svg>
              </a>
            )}
            {social.facebook && (
              <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Milady's on Facebook" className="social-link">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15.5 8.5h-2a1 1 0 0 0-1 1V12h3l-.4 3h-2.6v7h-3v-7H8v-3h2.5V9.2c0-2.3 1.4-3.7 3.6-3.7h1.9v3z" fill="currentColor" />
                </svg>
              </a>
            )}
            {social.twitter && (
              <a href={social.twitter} target="_blank" rel="noreferrer" aria-label="Milady's on Twitter / X" className="social-link">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 4l7.2 9.4L4.4 20H6l6-6.4 4.5 6.4H20l-7.5-9.9L19 4h-1.6l-5.5 5.9L8 4H4z" fill="currentColor" />
                </svg>
              </a>
            )}
          </div>
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
          <a href="https://maps.app.goo.gl/5VFnXKQRaPAT8UxC7" target="_blank" rel="noreferrer">Get Directions →</a>
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
        .social-links { display: flex; gap: 10px; }
        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.25);
          color: var(--ivory);
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        .social-link svg { width: 16px; height: 16px; }
        .social-link:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.5); }
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
