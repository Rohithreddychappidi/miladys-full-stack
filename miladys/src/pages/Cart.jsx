import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RecommendedProducts from '../components/RecommendedProducts';
import Seo from '../components/Seo';
import { useCart } from '../context/CartContext';
import { formatINR } from '../data/store';
import { api } from '../data/api';
import { thumbUrl } from '../utils/images';
import { cartKey, useCartAvailability } from '../data/cartAvailability';

export default function Cart() {
  const { items, updateQty, updateItem, removeItem, subtotal } = useCart();
  const availability = useCartAvailability(items);
  const [priceNote, setPriceNote] = useState(false);
  // Shipping fee and free-shipping amount (Admin → Home Page → Shipping),
  // so the bag shows the real total and how far it is from free shipping.
  const [shipping, setShipping] = useState(null); // { fee, freeThreshold }
  useEffect(() => {
    api.getHomeSection('shipping_settings')
      .then(({ section }) => {
        const c = section?.content || {};
        setShipping({ fee: Number.isFinite(c.fee) ? c.fee : 100, freeThreshold: Number.isFinite(c.freeThreshold) ? c.freeThreshold : 0 });
      })
      .catch(() => setShipping({ fee: 100, freeThreshold: 0 }));
  }, []);
  const freeOn = shipping?.freeThreshold > 0;
  const shippingFee = !shipping ? null : freeOn && subtotal >= shipping.freeThreshold ? 0 : shipping.fee;
  const toFree = freeOn ? Math.max(shipping.freeThreshold - subtotal, 0) : 0;

  // Keep bag prices at today's price (the order is charged at that anyway).
  useEffect(() => {
    let changed = false;
    for (const item of items) {
      const info = availability.byKey[cartKey(item)];
      if (info?.price && info.price !== item.price) { updateItem(cartKey(item), { price: info.price }); changed = true; }
    }
    if (changed) setPriceNote(true);
  }, [availability, items, updateItem]);

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
              {items.map((item) => {
                const itemKey = cartKey(item);
                const info = availability.byKey[itemKey];
                const state = info?.state || 'ok';
                return (
                  <div className={`cart-row${state !== 'ok' ? ' has-problem' : ''}`} key={itemKey}>
                    <Link to={`/products/${item.id}`} className="cart-thumb">
                      <img src={thumbUrl(item.image)} alt={item.name} />
                    </Link>
                    <div className="cart-item-info">
                      <Link to={`/products/${item.id}`} className="cart-item-name">{item.name}</Link>
                      {item.color && <span className="cart-item-color">Color: {item.color}</span>}
                      {(item.sku || info?.sku) && <span className="cart-item-code">Code: {item.sku || info?.sku}</span>}
                      <span className="cart-item-price">{formatINR(item.price)}</span>
                      {state === 'gone' && <span className="cart-problem">No longer available — please remove it</span>}
                      {state === 'soldout' && <span className="cart-problem">Sold out — please remove it</span>}
                      {state === 'short' && (
                        <span className="cart-problem">
                          Only {info.left} left{' '}
                          <button type="button" className="fix-qty" onClick={() => updateQty(itemKey, info.left)}>Change to {info.left}</button>
                        </span>
                      )}
                    </div>
                    <div className="qty-control">
                      <button type="button" onClick={() => updateQty(itemKey, item.qty - 1)} aria-label="Decrease quantity">−</button>
                      <span>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(itemKey, item.qty + 1)} aria-label="Increase quantity" disabled={info != null && item.qty >= info.left}>+</button>
                    </div>
                    <span className="line-total">{formatINR(item.price * item.qty)}</span>
                    <button className="remove-btn" onClick={() => removeItem(itemKey)} aria-label={`Remove ${item.name}`}>Remove</button>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary">
              <h3>Order Summary</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>{shippingFee == null ? '…' : shippingFee === 0 ? 'Free' : formatINR(shippingFee)}</span>
              </div>
              {freeOn && (
                <div className="free-ship" aria-live="polite">
                  <p>{toFree > 0 ? <>Add <strong>{formatINR(toFree)}</strong> more for free shipping</> : <>🎉 You&apos;ve got <strong>free shipping</strong></>}</p>
                  <div className="free-ship-bar" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, (subtotal / shipping.freeThreshold) * 100)}%` }} />
                  </div>
                </div>
              )}
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatINR(subtotal + (shippingFee || 0))}</span>
              </div>
              <p className="cart-note">Have a coupon? Apply it at checkout.</p>
              {priceNote && <p className="cart-note">Some prices have changed since you added them — the bag shows today&apos;s price.</p>}
              {availability.blocking ? (
                <>
                  <p className="cart-block-note" role="alert">Some sarees in your bag can&apos;t be ordered as they are. Please remove them or change the quantity to continue.</p>
                  <button type="button" className="btn btn-primary checkout-btn" disabled>Proceed to Checkout</button>
                </>
              ) : (
                <Link to="/checkout" className="btn btn-primary checkout-btn">Proceed to Checkout</Link>
              )}
            </div>
          </div>
        )}
      </div>

      <RecommendedProducts title="Complete The Look" />

      <style>{`
        .cart-page { padding-bottom: 0; }
        .free-ship { margin: 4px 0 6px; }
        .free-ship p { font-size: 12.5px; color: var(--ink-700); margin: 0 0 6px; }
        .free-ship strong { color: var(--maroon-900); }
        .free-ship-bar { height: 6px; border-radius: 999px; background: var(--stone-200); overflow: hidden; }
        .free-ship-bar span { display: block; height: 100%; background: var(--maroon-800); border-radius: 999px; transition: width 0.3s; }
        .cart-row.has-problem { border-color: #e5c4c4; background: #fdf6f6; }
        .cart-item-code { display: block; font-size: 11px; color: var(--ink-400); letter-spacing: 0.02em; }
        .cart-problem { display: block; font-size: 12px; color: #a13a3a; margin-top: 4px; font-weight: 500; }
        .fix-qty { background: none; border: none; padding: 0; color: var(--maroon-900); text-decoration: underline; font-size: 12px; cursor: pointer; }
        .qty-control button:disabled { opacity: 0.3; cursor: not-allowed; }
        .cart-block-note { font-size: 12.5px; color: #a13a3a; line-height: 1.5; margin: 6px 0 0; }
        .cart-note { font-size: 12px; color: var(--ink-600); line-height: 1.5; margin: 6px 0 0; }
        .checkout-btn:disabled { opacity: 0.5; cursor: not-allowed; }
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
        .cart-item-info { display: flex; flex-direction: column; gap: 4px; }
        .cart-item-name { font-size: 13.5px; color: var(--ink-900); line-height: 1.4; }
        .cart-item-color { font-size: 11.5px; color: var(--maroon-900); font-weight: 500; }
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
