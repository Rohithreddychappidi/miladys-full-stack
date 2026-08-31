import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RecommendedProducts from '../components/RecommendedProducts';
import Seo from '../components/Seo';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../data/api';
import { formatINR } from '../data/store';

const emptyAddress = { name: '', mobile: '', line1: '', city: '', state: '', pincode: '' };

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay checkout.'));
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAddress);
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null); // { code, discount }
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const navigate = useNavigate();

  const discount = coupon?.discount || 0;
  const total = Math.max(subtotal - discount, 0);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    setCouponError('');
    try {
      const result = await api.validateCoupon({ code: couponInput.trim(), subtotal });
      setCoupon({ code: result.code, discount: result.discount });
    } catch (err) {
      setCoupon(null);
      setCouponError(err.message);
    } finally {
      setApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setCoupon(null);
    setCouponInput('');
    setCouponError('');
  }

  useEffect(() => {
    api
      .getAddresses()
      .then(({ addresses }) => {
        setAddresses(addresses);
        if (addresses.length) setSelectedId(addresses[0].id);
        else {
          setForm((f) => ({ ...f, name: user?.name || '', mobile: user?.mobile || '' }));
          setShowForm(true);
        }
      })
      .catch(() => setShowForm(true));
  }, [user]);

  async function handleSaveAddress(e) {
    e.preventDefault();
    if (!form.line1.trim() || !form.city.trim() || !form.pincode.trim()) return;
    try {
      const { address } = await api.addAddress(form);
      setAddresses((prev) => [address, ...prev]);
      setSelectedId(address.id);
      setShowForm(false);
      setForm(emptyAddress);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePlaceOrder() {
    const address = addresses.find((a) => a.id === selectedId);
    if (!address || items.length === 0) return;
    setError('');
    setPlacing(true);

    try {
      await loadRazorpayScript();

      const orderPayload = {
        items: items.map((i) => ({ productId: i.id, qty: i.qty })),
        address: {
          name: address.name,
          mobile: address.mobile,
          line1: address.line1,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        couponCode: coupon?.code || undefined,
      };
      const { orderId: localOrderId, razorpayOrderId, amount, currency, keyId } = await api.createOrder(orderPayload);

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: "Milady's",
        description: `Order #MLD${localOrderId}`,
        prefill: { name: address.name, contact: address.mobile, email: user?.email },
        theme: { color: '#48181e' },
        handler: async (response) => {
          try {
            await api.verifyOrder(response);
            setOrderId(`MLD${localOrderId}`);
            setPlaced(true);
            clearCart();
          } catch (err) {
            setError(err.message || 'Payment verification failed. Please contact support.');
          } finally {
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => setPlacing(false),
        },
      });
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setPlacing(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  }

  if (placed) {
    return (
      <div className="container checkout-page">
        <div className="order-confirmed">
          <h1>Order placed</h1>
          <p>Your order <strong>{orderId}</strong> has been confirmed and paid. A confirmation email is on its way.</p>
          <div className="confirm-actions">
            <Link to="/orders" className="btn btn-primary">View Orders</Link>
            <Link to="/products" className="btn btn-outline">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container checkout-page">
        <p>Your cart is empty.</p>
        <Link to="/products" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Sarees</Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <Seo title="Checkout" path="/checkout" noindex />
      <div className="container">
        <div className="page-head">
          <p className="eyebrow">Almost there</p>
          <h1>Checkout</h1>
        </div>

        <div className="checkout-grid">
          <div className="checkout-main">
            <h3>Delivery Address</h3>

            {addresses.map((a) => (
              <label className={`address-card ${selectedId === a.id ? 'selected' : ''}`} key={a.id}>
                <input
                  type="radio"
                  name="address"
                  checked={selectedId === a.id}
                  onChange={() => setSelectedId(a.id)}
                />
                <div>
                  <strong>{a.name}</strong> · {a.mobile}
                  <p>{a.line1}, {a.city}, {a.state} — {a.pincode}</p>
                </div>
              </label>
            ))}

            {!showForm && (
              <button type="button" className="btn btn-outline add-address-btn" onClick={() => setShowForm(true)}>
                + Add a new address
              </button>
            )}

            {showForm && (
              <form className="address-form" onSubmit={handleSaveAddress}>
                <div className="form-row">
                  <label>
                    Full name
                    <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                  </label>
                  <label>
                    Mobile number
                    <input type="tel" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} required />
                  </label>
                </div>
                <label>
                  Address
                  <input type="text" placeholder="House no, street, area" value={form.line1} onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))} required />
                </label>
                <div className="form-row three">
                  <label>
                    City
                    <input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required />
                  </label>
                  <label>
                    State
                    <input type="text" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} required />
                  </label>
                  <label>
                    Pincode
                    <input type="text" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} required />
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Save Address</button>
                  {addresses.length > 0 && (
                    <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                  )}
                </div>
              </form>
            )}

            <h3 className="items-heading">Items</h3>
            <div className="checkout-items">
              {items.map((item) => (
                <div className="checkout-item" key={item.id}>
                  <img src={item.image} alt={item.name} />
                  <div>
                    <p>{item.name}</p>
                    <span>Qty {item.qty}</span>
                  </div>
                  <span className="item-total">{formatINR(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="checkout-summary">
            <h3>Order Summary</h3>

            <div className="coupon-box">
              {coupon ? (
                <div className="coupon-applied">
                  <span>
                    <strong>{coupon.code}</strong> applied — you saved {formatINR(coupon.discount)}
                  </span>
                  <button type="button" onClick={handleRemoveCoupon}>Remove</button>
                </div>
              ) : (
                <>
                  <div className="coupon-input-row">
                    <input
                      type="text"
                      placeholder="Coupon code"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                    />
                    <button type="button" className="btn btn-outline" disabled={applyingCoupon || !couponInput.trim()} onClick={handleApplyCoupon}>
                      {applyingCoupon ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="coupon-error">{couponError}</p>}
                </>
              )}
            </div>

            <div className="summary-row"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
            {discount > 0 && (
              <div className="summary-row discount-row"><span>Coupon discount</span><span>−{formatINR(discount)}</span></div>
            )}
            <div className="summary-row"><span>Shipping</span><span>Free</span></div>
            <div className="summary-row total"><span>Total</span><span>{formatINR(total)}</span></div>
            {error && <p className="checkout-error">{error}</p>}
            <button
              className="btn btn-primary place-order-btn"
              disabled={!selectedId || placing}
              onClick={handlePlaceOrder}
            >
              {placing ? 'Processing…' : `Pay ${formatINR(total)} with Razorpay`}
            </button>
            <p className="payment-note">Secure checkout via Razorpay — UPI, cards, net banking &amp; wallets.</p>
          </div>
        </div>
      </div>

      <RecommendedProducts title="Add To Your Order" />

      <style>{`
        .checkout-page { padding: 56px 0 0; }
        .page-head { margin-bottom: 30px; }
        .page-head h1 { font-size: 34px; margin-top: 8px; }
        .checkout-grid { display: grid; grid-template-columns: 1fr 340px; gap: 40px; align-items: flex-start; margin-bottom: 60px; }
        .checkout-main h3 { font-size: 16px; margin: 0 0 16px; color: var(--maroon-900); }
        .items-heading { margin-top: 34px; }

        .address-card {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-md);
          padding: 16px 18px;
          margin-bottom: 12px;
          cursor: pointer;
          font-size: 13.5px;
        }
        .address-card.selected { border-color: var(--gold-500); background: var(--stone-100); }
        .address-card input { margin-top: 3px; accent-color: var(--maroon-900); }
        .address-card p { margin: 4px 0 0; color: var(--ink-600); }

        .add-address-btn { margin-bottom: 20px; padding: 11px 18px; font-size: 13px; }

        .address-form {
          background: var(--stone-100);
          border-radius: var(--radius-md);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 20px;
        }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-row.three { grid-template-columns: 1fr 1fr 1fr; }
        .address-form label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-600); }
        .address-form input {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
        }
        .form-actions { display: flex; gap: 10px; }

        .checkout-items { display: flex; flex-direction: column; gap: 12px; }
        .checkout-item {
          display: grid;
          grid-template-columns: 52px 1fr auto;
          align-items: center;
          gap: 14px;
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
        }
        .checkout-item img { width: 52px; height: 64px; object-fit: cover; object-position: top center; border-radius: 4px; }
        .checkout-item p { margin: 0 0 4px; font-size: 13px; }
        .checkout-item span:not(.item-total) { font-size: 12px; color: var(--ink-400); }
        .item-total { font-size: 13px; font-weight: 600; color: var(--maroon-900); }

        .checkout-summary {
          background: var(--stone-100);
          border-radius: var(--radius-md);
          padding: 26px;
          position: sticky;
          top: 100px;
        }
        .checkout-summary h3 { font-size: 17px; margin-bottom: 18px; }

        .coupon-box { margin-bottom: 18px; }
        .coupon-input-row { display: flex; gap: 8px; }
        .coupon-input-row input {
          flex: 1;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-size: 13px;
          text-transform: uppercase;
          background: var(--paper);
        }
        .coupon-input-row .btn { padding: 10px 16px; font-size: 12.5px; white-space: nowrap; }
        .coupon-error { font-size: 12px; color: #a13a3a; margin: 8px 0 0; }
        .coupon-applied {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: #e8f2e6;
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          font-size: 12.5px;
          color: #3c7a3c;
        }
        .coupon-applied button {
          background: none; border: none; font-size: 12px; color: #3c7a3c;
          text-decoration: underline; flex: 0 0 auto;
        }
        .discount-row span:last-child { color: #3c7a3c; font-weight: 600; }

        .summary-row { display: flex; justify-content: space-between; font-size: 13.5px; color: var(--ink-600); margin-bottom: 12px; }
        .summary-row.total {
          font-size: 15px; font-weight: 600; color: var(--maroon-900);
          border-top: 1px solid var(--stone-200); padding-top: 14px; margin-top: 6px;
        }
        .place-order-btn { width: 100%; margin-top: 12px; }
        .place-order-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .payment-note { font-size: 11.5px; color: var(--ink-400); margin-top: 12px; line-height: 1.5; }
        .checkout-error { font-size: 12.5px; color: #a13a3a; margin: 4px 0 0; }

        .order-confirmed { text-align: center; padding: 90px 20px; max-width: 480px; margin: 0 auto; }
        .order-confirmed h1 { font-size: 30px; margin-bottom: 16px; }
        .order-confirmed p { font-size: 14.5px; color: var(--ink-600); line-height: 1.7; margin-bottom: 30px; }
        .confirm-actions { display: flex; gap: 12px; justify-content: center; }

        @media (max-width: 900px) {
          .checkout-grid { grid-template-columns: 1fr; }
          .form-row, .form-row.three { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
