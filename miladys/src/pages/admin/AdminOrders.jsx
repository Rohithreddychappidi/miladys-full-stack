import { useEffect, useState } from 'react';
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
        <p>Every order placed on the store, with Razorpay payment status and shipping details.</p>
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
              <div className="order-row-items">
                {o.items.map((item) => (
                  <span key={item.id}>{item.product_name} × {item.qty}</span>
                ))}
              </div>
              <div className="order-row-foot">
                <span>{new Date(o.created_at).toLocaleString('en-IN')}</span>
                <span>{o.address_city}, {o.address_pincode}</span>
                {o.razorpay_payment_id && <span>Payment: {o.razorpay_payment_id}</span>}
                {o.coupon_code && <span className="coupon-tag">{o.coupon_code} · −{formatINR(o.discount)}</span>}
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

        .orders-list { display: flex; flex-direction: column; gap: 12px; }
        .order-row {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 16px 20px;
        }
        .order-row-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .order-row-head strong { color: var(--maroon-900); margin-right: 10px; }
        .order-customer { font-size: 12.5px; color: var(--ink-400); }
        .status-pill { font-size: 11px; text-transform: capitalize; padding: 4px 10px; border-radius: 999px; }
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
          margin-bottom: 10px;
        }
        .coupon-tag { color: #3c7a3c; }
        .order-row-items { font-size: 12.5px; color: var(--ink-600); display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
        .order-row-foot { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: var(--ink-400); align-items: center; }
        .order-row-foot strong { margin-left: auto; color: var(--maroon-900); font-size: 14px; }
      `}</style>
    </div>
  );
}
