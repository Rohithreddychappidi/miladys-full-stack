import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

export default function NotFound() {
  return (
    <div className="not-found-page">
      <Seo title="Page Not Found" path="/404" noindex />
      <div className="container">
        <p className="eyebrow">Error 404</p>
        <h1>This page doesn't exist</h1>
        <p className="not-found-sub">
          The link you followed might be broken, or the page may have moved. Let's get you back to somewhere useful.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">Back to Home</Link>
          <Link to="/products" className="btn btn-outline">Shop Sarees</Link>
        </div>
      </div>

      <style>{`
        .not-found-page {
          min-height: 60vh;
          display: flex;
          align-items: center;
          padding: 100px 0 80px;
        }
        .not-found-page .container { text-align: center; max-width: 520px; margin: 0 auto; }
        .not-found-page h1 { font-size: 32px; margin: 10px 0 16px; }
        .not-found-sub { font-size: 14.5px; color: var(--ink-400); line-height: 1.7; margin-bottom: 32px; }
        .not-found-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        @media (max-width: 600px) {
          .not-found-page { padding: 70px 0 60px; }
          .not-found-page h1 { font-size: 24px; }
        }
      `}</style>
    </div>
  );
}
