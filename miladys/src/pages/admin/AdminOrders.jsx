import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../data/api';
import { formatINR } from '../../data/store';

const statusLabels = {
  paid: 'Paid',
  paid_oversold: 'Needs attention',
  created: 'Payment pending',
  failed: 'Failed',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAllOrders()
      .then(({ orders }) => setOrders(orders))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="admin-page-head">
        <h1>Orders</h1>
        <p>Every order placed on the store, with full shipping details, payment IDs, and links to each ordered product.</p>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="empty">Loading orders…</p>}

      {!loading && (
        <div className="orders-list">
          {orders.length === 0 && <p className="empty">No orders yet.</p>}
          {orders.map((o) => (
            <div className="order-row" key={o.id}>
              {o.status === 'paid_oversold' && (
                <div className="oversold-banner">
                  ⚠ Paid after stock ran out for one or more items — check inventory and contact the customer if needed.
                </div>
              )}

              <div className="order-row-head">
                <div>
                  <strong>#MLD{o.id}</strong>
                  <span className="order-customer">{o.customer_name} · {o.customer_email}</span>
                </div>
                <span className={`status-pill status-${o.status}`}>{statusLabels[o.status] || o.status}</span>
              </div>

              <div className="order-detail-grid">
                <div className="detail-block">
                  <p className="detail-label">Shipping address</p>
                  <p className="detail-value">{o.address_name}</p>
                  <p className="detail-value">{o.address_mobile}</p>
                  <p className="detail-value">
                    {o.address_line1}
                    {o.address_city ? `, ${o.address_city}` : ''}
                    {o.address_state ? `, ${o.address_state}` : ''}
                    {o.address_pincode ? ` – ${o.address_pincode}` : ''}
                  </p>
                </div>

                <div className="detail-block">
                  <p className="detail-label">Payment</p>
                  <p className="detail-value mono">Order: {o.razorpay_order_id || '—'}</p>
                  <p className="detail-value mono">Payment: {o.razorpay_payment_id || '—'}</p>
                  {o.coupon_code && (
                    <p className="detail-value coupon-tag">{o.coupon_code} applied · −{formatINR(o.discount)}</p>
                  )}
                </div>
              </div>

              <div className="order-row-items">
                {o.items.map((item) => (
                  <Link to={`/products/${item.product_id}`} target="_blank" rel="noopener noreferrer" className="item-link" key={item.id}>
                    {item.product_image && <img src={item.product_image} alt="" />}
                    <span>{item.product_name} × {item.qty}</span>
                  </Link>
                ))}
              </div>

              <div className="order-row-foot">
                <span>{new Date(o.created_at).toLocaleString('en-IN')}</span>
                {o.discount > 0 && <span>Subtotal {formatINR(o.subtotal)}</span>}
                <strong>{formatINR(o.subtotal - (o.discount || 0))}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 560px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }
        .empty { color: var(--ink-400); font-size: 13.5px; }

        .orders-list { display: flex; flex-direction: column; gap: 14px; }
        .order-row {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 18px 20px;
        }
        .order-row-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .order-row-head strong { color: var(--maroon-900); margin-right: 10px; }
        .order-customer { font-size: 12.5px; color: var(--ink-400); }
        .status-pill { font-size: 11px; text-transform: capitalize; padding: 4px 10px; border-radius: 999px; flex: 0 0 auto; }
        .status-paid { background: #e8f2e6; color: #3c7a3c; }
        .status-created { background: var(--blush-300); color: var(--maroon-900); }
        .status-failed { background: #f6e3e3; color: #a13a3a; }
        .status-paid_oversold { background: #fbeacb; color: #8a5a10; }
        .oversold-banner {
          background: #fbeacb;
          color: #8a5a10;
          font-size: 12px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          margin-bottom: 12px;
        }

        .order-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 14px 0;
          border-top: 1px solid var(--stone-100);
          border-bottom: 1px solid var(--stone-100);
          margin-bottom: 12px;
        }
        .detail-block { display: flex; flex-direction: column; gap: 3px; }
        .detail-label {
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-400);
          margin: 0 0 3px;
        }
        .detail-value { font-size: 12.5px; color: var(--ink-600); margin: 0; line-height: 1.5; }
        .detail-value.mono { font-family: monospace; font-size: 11.5px; word-break: break-all; }
        .coupon-tag { color: #3c7a3c; font-weight: 600; }

        .order-row-items { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
        .item-link {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--stone-100);
          border-radius: var(--radius-sm);
          padding: 6px 10px 6px 6px;
          font-size: 12px;
          color: var(--ink-600);
          text-decoration: none;
        }
        .item-link:hover { background: var(--blush-300); color: var(--maroon-900); }
        .item-link img { width: 28px; height: 28px; border-radius: 4px; object-fit: cover; flex: 0 0 auto; }

        .order-row-foot { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--ink-400); align-items: center; }
        .order-row-foot strong { margin-left: auto; color: var(--maroon-900); font-size: 14px; }
      `}</style>
    </div>
  );
}
