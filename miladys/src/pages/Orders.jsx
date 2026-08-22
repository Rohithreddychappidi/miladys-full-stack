import { useEffect, useState } from 'react';
import RecommendedProducts from '../components/RecommendedProducts';
import { api } from '../data/api';
import { formatINR } from '../data/store';

const statusTone = {
  paid: 'tone-delivered',
  paid_oversold: 'tone-delivered',
  created: 'tone-processing',
  failed: 'tone-failed',
};

const statusLabel = {
  paid: 'Paid',
  paid_oversold: 'Paid',
  created: 'Payment pending',
  failed: 'Payment failed',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getMyOrders()
      .then(({ orders }) => setOrders(orders))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="orders-page">
      <div className="container">
        <div className="page-head">
          <p className="eyebrow">Your Account</p>
          <h1>Orders</h1>
          <p className="page-sub">Every order you've placed, with live payment status and item details.</p>
        </div>

        {loading && <p className="empty-msg">Loading your orders…</p>}
        {!loading && error && <p className="empty-msg error">{error}</p>}
        {!loading && !error && orders.length === 0 && (
          <p className="empty-msg">You haven't placed any orders yet.</p>
        )}

        {!loading && orders.length > 0 && (
          <div className="orders-list">
            {orders.map((o) => (
              <div className="order-card" key={o.id}>
                <div className="order-card-head">
                  <div>
                    <span className="order-id">#MLD{o.id}</span>
                    <span className="order-date">{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <span className={`status ${statusTone[o.status] || ''}`}>{statusLabel[o.status] || o.status}</span>
                </div>
                <div className="order-items">
                  {o.items.map((item) => (
                    <div className="order-item" key={item.id}>
                      {item.product_image && <img src={item.product_image} alt={item.product_name} />}
                      <div>
                        <p>{item.product_name}</p>
                        <span>Qty {item.qty} · {formatINR(item.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="order-card-foot">
                  <div className="order-address">
                    Shipping to {o.address_line1}, {o.address_city} — {o.address_pincode}
                  </div>
                  <div className="order-total">
                    Total <strong>{formatINR(o.subtotal)}</strong>
                    {o.razorpay_payment_id && <span className="payment-id">Payment ID: {o.razorpay_payment_id}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RecommendedProducts title="Shop Again" />

      <style>{`
        .orders-page { padding: 56px 0 0; }
        .orders-page .container { padding-bottom: 60px; }
        .page-head { max-width: 520px; margin-bottom: 36px; }
        .page-head h1 { font-size: 34px; margin: 8px 0 12px; }
        .page-sub { font-size: 13.5px; color: var(--ink-400); line-height: 1.6; }
        .empty-msg { font-size: 14px; color: var(--ink-400); padding: 40px 0; }
        .empty-msg.error { color: #a13a3a; }

        .orders-list { display: flex; flex-direction: column; gap: 18px; }
        .order-card {
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-md);
          padding: 20px 22px;
        }
        .order-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 14px;
          margin-bottom: 14px;
          border-bottom: 1px solid var(--stone-200);
        }
        .order-id { font-weight: 600; color: var(--maroon-900); margin-right: 12px; }
        .order-date { font-size: 12.5px; color: var(--ink-400); }
        .status {
          display: inline-flex;
          width: fit-content;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
        }
        .tone-delivered { background: #e8f2e6; color: #3c7a3c; }
        .tone-processing { background: var(--blush-300); color: var(--maroon-900); }
        .tone-failed { background: #f6e3e3; color: #a13a3a; }

        .order-items { display: flex; flex-direction: column; gap: 10px; }
        .order-item { display: flex; align-items: center; gap: 12px; font-size: 13.5px; }
        .order-item img { width: 44px; height: 56px; object-fit: cover; border-radius: 4px; }
        .order-item p { margin: 0 0 2px; }
        .order-item span { font-size: 12px; color: var(--ink-400); }

        .order-card-foot {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 14px;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid var(--stone-200);
          font-size: 12.5px;
          color: var(--ink-600);
        }
        .order-total { text-align: right; }
        .order-total strong { color: var(--maroon-900); font-size: 15px; }
        .payment-id { display: block; font-size: 11px; color: var(--ink-400); margin-top: 2px; }

        @media (max-width: 600px) {
          .order-card-foot { flex-direction: column; align-items: flex-start; }
          .order-total { text-align: left; }
        }
      `}</style>
    </div>
  );
}
