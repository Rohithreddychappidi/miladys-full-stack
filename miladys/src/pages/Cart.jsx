import { Link } from 'react-router-dom';
import RecommendedProducts from '../components/RecommendedProducts';
import Seo from '../components/Seo';
import { useCart } from '../context/CartContext';
import { formatINR } from '../data/store';

export default function Cart() {
  const { items, updateQty, removeItem, subtotal } = useCart();

  return (
    <div className="cart-page">
      <Seo title="Your Cart" path="/cart" noindex />
      <div className="container">
        <div className="page-head">
          <p className="eyebrow">Your Bag</p>
          <h1>Cart</h1>
        </div>

        {items.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty.</p>
            <Link to="/products" className="btn btn-primary">Browse Sarees</Link>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items">
              {items.map((item) => (
                <div className="cart-row" key={item.id}>
                  <Link to={`/products/${item.id}`} className="cart-thumb">
                    <img src={item.image} alt={item.name} />
                  </Link>
                  <div className="cart-item-info">
                    <Link to={`/products/${item.id}`} className="cart-item-name">{item.name}</Link>
                    <span className="cart-item-price">{formatINR(item.price)}</span>
                  </div>
                  <div className="qty-control">
                    <button type="button" onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease quantity">−</button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase quantity">+</button>
                  </div>
                  <span className="line-total">{formatINR(item.price * item.qty)}</span>
                  <button className="remove-btn" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>Remove</button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h3>Order Summary</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <Link to="/checkout" className="btn btn-primary checkout-btn">Proceed to Checkout</Link>
            </div>
          </div>
        )}
      </div>

      <RecommendedProducts title="Complete The Look" />

      <style>{`
        .cart-page { padding-bottom: 0; }
        .page-head { margin-bottom: 30px; }
        .page-head h1 { font-size: 34px; margin-top: 8px; }
        .empty-cart {
          text-align: center;
          padding: 60px 0 90px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          color: var(--ink-400);
        }
        .cart-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 40px;
          padding-bottom: 90px;
          align-items: flex-start;
        }
        .cart-items { display: flex; flex-direction: column; gap: 16px; }
        .cart-row {
          display: grid;
          grid-template-columns: 72px 1fr auto auto auto;
          align-items: center;
          gap: 18px;
          background: var(--paper);
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-md);
          padding: 14px 18px;
        }
        .cart-thumb { width: 72px; height: 88px; border-radius: var(--radius-sm); overflow: hidden; display: block; }
        .cart-thumb img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
        .cart-item-info { display: flex; flex-direction: column; gap: 6px; }
        .cart-item-name { font-size: 13.5px; color: var(--ink-900); line-height: 1.4; }
        .cart-item-price { font-size: 12.5px; color: var(--ink-400); }
        .qty-control {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--stone-200);
          border-radius: 999px;
          padding: 6px 12px;
        }
        .qty-control button { background: none; border: none; font-size: 15px; color: var(--maroon-900); width: 16px; }
        .line-total { font-size: 13.5px; font-weight: 600; color: var(--maroon-900); white-space: nowrap; }
        .remove-btn { background: none; border: none; font-size: 12px; color: #a13a3a; }

        .cart-summary {
          background: var(--stone-100);
          border-radius: var(--radius-md);
          padding: 26px;
          position: sticky;
          top: 100px;
        }
        .cart-summary h3 { font-size: 17px; margin-bottom: 18px; }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
          color: var(--ink-600);
          margin-bottom: 12px;
        }
        .summary-row.total {
          font-size: 15px;
          font-weight: 600;
          color: var(--maroon-900);
          border-top: 1px solid var(--stone-200);
          padding-top: 14px;
          margin-top: 6px;
        }
        .checkout-btn { width: 100%; margin-top: 12px; }
        @media (max-width: 900px) {
          .cart-grid { grid-template-columns: 1fr; }
          .cart-row {
            grid-template-columns: 56px 1fr;
            grid-template-areas:
              "thumb info"
              "thumb qty"
              "thumb total"
              "thumb remove";
            row-gap: 8px;
          }
          .cart-thumb { grid-area: thumb; width: 56px; height: 70px; }
          .cart-item-info { grid-area: info; }
          .qty-control { grid-area: qty; justify-self: start; }
          .line-total { grid-area: total; justify-self: start; }
          .remove-btn { grid-area: remove; justify-self: start; padding: 0; }
        }
      `}</style>
    </div>
  );
}
