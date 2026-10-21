import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RecommendedProducts from '../components/RecommendedProducts';
import Seo from '../components/Seo';
import { useAuth } from '../context/AuthContext';
import { api } from '../data/api';
import { checkAddress } from '../data/address';
import AddressFields from '../components/AddressFields';

const emptyAddress = { name: '', mobile: '', line1: '', city: '', state: '', pincode: '', country: 'India' };
const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({ name: '', mobile: '' });
  const [savedMsg, setSavedMsg] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAddress);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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

  const [addressError, setAddressError] = useState('');
  async function handleAddAddress(e) {
    e.preventDefault();
    const checked = checkAddress(form);
    if (checked.error) { setAddressError(checked.error); return; }
    setAddressError('');
    try {
      const { address } = await api.addAddress(checked.address);
      setAddresses((prev) => [address, ...prev]);
      setForm(emptyAddress);
      setShowForm(false);
    } catch (err) {
      setAddressError(err.message);
    }
  }

  async function handleDeleteAddress(id) {
    await api.deleteAddress(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    setChangingPassword(true);
    try {
      await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(emptyPasswordForm);
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="profile-page">
      <Seo title="My Profile" path="/profile" noindex />
      <div className="container">
        <div className="page-head">
          <p className="eyebrow">Your Account</p>
          <h1>Profile</h1>
        </div>

        <div className="profile-grid">
          <div className="profile-col">
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
                  placeholder="10-digit mobile, or +country code"
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

            <form className="profile-card" onSubmit={handlePasswordSubmit}>
              <h3>Change Password</h3>
              <label>
                Current password
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  required
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  minLength={6}
                  required
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  minLength={6}
                  required
                />
              </label>
              {passwordError && <p className="password-error">{passwordError}</p>}
              <button type="submit" className="btn btn-outline" disabled={changingPassword}>
                {changingPassword ? 'Updating…' : 'Update Password'}
              </button>
              {passwordSaved && <span className="saved-msg">Password updated ✓</span>}
            </form>
          </div>

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
                  <p>{a.line1}, {a.city}{a.state ? `, ${a.state}` : ''}{a.pincode ? ` — ${a.pincode}` : ''}{a.country && a.country !== 'India' ? `, ${a.country}` : ''}</p>
                </div>
                <button onClick={() => handleDeleteAddress(a.id)} className="danger">Remove</button>
              </div>
            ))}

            {showForm && (
              <form className="address-form" onSubmit={handleAddAddress}>
                <AddressFields form={form} setForm={setForm} />
                {addressError && <p className="address-error" role="alert">{addressError}</p>}
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
        .address-error { font-size: 12.5px; color: #a13a3a; margin: 0; }
        .profile-page { padding: 56px 0 0; }
        .page-head { margin-bottom: 30px; }
        .page-head h1 { font-size: 34px; margin-top: 8px; }
        .profile-grid { display: grid; grid-template-columns: 360px 1fr; gap: 28px; align-items: flex-start; margin-bottom: 60px; }
        .profile-col { display: flex; flex-direction: column; gap: 20px; }

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
        .password-error { font-size: 12.5px; color: #a13a3a; margin: 0; }
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
