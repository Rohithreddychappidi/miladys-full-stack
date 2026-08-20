import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RecommendedProducts from '../components/RecommendedProducts';
import { useAuth } from '../context/AuthContext';
import { api } from '../data/api';

const emptyAddress = { name: '', mobile: '', line1: '', city: '', state: '', pincode: '' };

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({ name: '', mobile: '' });
  const [savedMsg, setSavedMsg] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAddress);

  useEffect(() => {
    if (user) setProfile({ name: user.name, mobile: user.mobile || '' });
    api.getAddresses().then(({ addresses }) => setAddresses(addresses)).catch(() => {});
  }, [user]);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    await api.updateMe(profile);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  }

  async function handleAddAddress(e) {
    e.preventDefault();
    if (!form.line1.trim() || !form.city.trim() || !form.pincode.trim()) return;
    const { address } = await api.addAddress(form);
    setAddresses((prev) => [address, ...prev]);
    setForm(emptyAddress);
    setShowForm(false);
  }

  async function handleDeleteAddress(id) {
    await api.deleteAddress(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="page-head">
          <p className="eyebrow">Your Account</p>
          <h1>Profile</h1>
        </div>

        <div className="profile-grid">
          <form className="profile-card" onSubmit={handleProfileSubmit}>
            <h3>Personal Details</h3>
            <label>
              Name
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                placeholder="Your full name"
              />
            </label>
            <label>
              Mobile
              <input
                type="tel"
                value={profile.mobile}
                onChange={(e) => setProfile((p) => ({ ...p, mobile: e.target.value }))}
                placeholder="10-digit mobile number"
              />
            </label>
            <label>
              Email
              <input type="email" value={user?.email || ''} disabled />
            </label>
            <button type="submit" className="btn btn-primary">Save Details</button>
            {savedMsg && <span className="saved-msg">Saved ✓</span>}
            <div className="profile-links">
              <Link to="/orders">View your orders →</Link>
              <button type="button" className="logout-btn" onClick={logout}>Log out</button>
            </div>
          </form>

          <div className="address-card-panel">
            <div className="panel-head">
              <h3>Saved Addresses</h3>
              {!showForm && (
                <button type="button" className="add-link" onClick={() => setShowForm(true)}>+ Add address</button>
              )}
            </div>

            {addresses.length === 0 && !showForm && <p className="empty">No addresses saved yet.</p>}

            {addresses.map((a) => (
              <div className="saved-address" key={a.id}>
                <div>
                  <strong>{a.name}</strong> · {a.mobile}
                  <p>{a.line1}, {a.city}, {a.state} — {a.pincode}</p>
                </div>
                <button onClick={() => handleDeleteAddress(a.id)} className="danger">Remove</button>
              </div>
            ))}

            {showForm && (
              <form className="address-form" onSubmit={handleAddAddress}>
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
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <RecommendedProducts />

      <style>{`
        .profile-page { padding: 56px 0 0; }
        .page-head { margin-bottom: 30px; }
        .page-head h1 { font-size: 34px; margin-top: 8px; }
        .profile-grid { display: grid; grid-template-columns: 360px 1fr; gap: 28px; align-items: flex-start; margin-bottom: 60px; }

        .profile-card, .address-card-panel {
          background: var(--paper);
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-md);
          padding: 26px;
        }
        .profile-card { display: flex; flex-direction: column; gap: 16px; }
        .profile-card h3, .address-card-panel h3 { font-family: var(--font-display); font-size: 18px; color: var(--maroon-900); margin: 0; }
        .profile-card label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-600); }
        .profile-card input {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
        }
        .profile-card input:disabled { background: var(--stone-100); color: var(--ink-400); }
        .saved-msg { font-size: 12.5px; color: #3c7a3c; }
        .profile-links { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 12.5px; }
        .profile-links a { color: var(--gold-600); border-bottom: 1px solid var(--gold-500); }
        .logout-btn { background: none; border: none; color: #a13a3a; font-size: 12.5px; }

        .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .add-link { background: none; border: none; font-size: 12.5px; color: var(--gold-600); border-bottom: 1px solid var(--gold-500); }
        .empty { color: var(--ink-400); font-size: 13.5px; }

        .saved-address {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-sm);
          padding: 14px 16px;
          margin-bottom: 12px;
          font-size: 13.5px;
        }
        .saved-address p { margin: 4px 0 0; color: var(--ink-600); }
        .saved-address .danger { background: none; border: none; font-size: 12px; color: #a13a3a; white-space: nowrap; }

        .address-form {
          background: var(--stone-100);
          border-radius: var(--radius-md);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 8px;
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

        @media (max-width: 860px) {
          .profile-grid { grid-template-columns: 1fr; }
          .form-row, .form-row.three { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
