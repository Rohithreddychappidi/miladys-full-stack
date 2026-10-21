import { useEffect, useState } from 'react';
import { api } from '../../data/api';
import { STORE_DEFAULTS, loadStoreInfo } from '../../data/storeInfo';

// Admin → Footer & Contact. One place for the store's details; they're used
// by the footer, the Contact page, the policy pages and the PDF invoice.
const STORE_FIELDS = ['description', 'phone', 'email', 'address', 'mapsLink', 'hours'];
const SOCIAL_FIELDS = ['whatsapp', 'instagram', 'facebook', 'twitter'];

export default function AdminStore() {
  const [form, setForm] = useState(STORE_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStoreInfo({ fresh: true })
      .then((info) => { setForm(info); setLoaded(true); })
      .catch((err) => setError(err.message));
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    const digits = String(form.whatsapp || '').replace(/\D/g, '');
    if (digits && digits.length < 11) { setError('Enter the WhatsApp number with the country code, e.g. 917842225444.'); return; }
    for (const f of ['mapsLink', 'instagram', 'facebook', 'twitter']) {
      if (form[f] && !/^https?:\/\//i.test(form[f].trim())) { setError('Links must start with https:// — check the map and social links.'); return; }
    }
    setSaving(true);
    try {
      const store = Object.fromEntries(STORE_FIELDS.map((f) => [f, String(form[f] || '').trim()]));
      const social = Object.fromEntries(SOCIAL_FIELDS.map((f) => [f, String(form[f] || '').trim()]));
      social.whatsapp = digits;
      await api.updateHomeSection('store_info', { content: store, enabled: true, title: 'Footer & Contact — Store details', sortOrder: 20 });
      await api.updateHomeSection('social_links', { content: social, enabled: true, title: 'Footer — Social & Contact Links', sortOrder: 0 });
      loadStoreInfo({ fresh: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Footer &amp; Contact</h1>
        <p>Your store&apos;s details, in one place. They appear in the website footer, on the Contact page, in the policy pages and on every PDF invoice.</p>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <form className="store-form" onSubmit={handleSave} aria-busy={!loaded}>
        <section className="store-card">
          <h3>Footer text</h3>
          <label>
            Short description (under the logo)
            <textarea rows="2" maxLength={200} value={form.description} onChange={set('description')} />
          </label>
        </section>

        <section className="store-card">
          <h3>Reach us</h3>
          <div className="row2">
            <label>
              Phone
              <input type="text" value={form.phone} onChange={set('phone')} placeholder="+91 78422 25444" />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={set('email')} placeholder="store@example.com" />
            </label>
          </div>
          <label>
            Address
            <textarea rows="3" value={form.address} onChange={set('address')} />
            <span className="hint">Use a new line where the address should break in the footer. Elsewhere it&apos;s shown on one line.</span>
          </label>
          <label>
            &ldquo;Get Directions&rdquo; link
            <input type="url" value={form.mapsLink} onChange={set('mapsLink')} placeholder="https://maps.app.goo.gl/…" />
            <span className="hint">In Google Maps, open your store, tap Share and copy the link.</span>
          </label>
        </section>

        <section className="store-card">
          <h3>Store hours</h3>
          <label>
            One line per row
            <textarea rows="3" value={form.hours} onChange={set('hours')} placeholder={'Mon – Sat: 10am – 9pm\nSunday: 10am – 7pm'} />
          </label>
        </section>

        <section className="store-card">
          <h3>WhatsApp &amp; social media</h3>
          <label>
            WhatsApp number
            <input type="text" inputMode="numeric" value={form.whatsapp} onChange={set('whatsapp')} placeholder="917842225444" />
            <span className="hint">With the country code, digits only. Used for the WhatsApp buttons on products, the footer and the Contact page.</span>
          </label>
          <label>
            Instagram link
            <input type="url" value={form.instagram} onChange={set('instagram')} placeholder="https://www.instagram.com/…" />
          </label>
          <div className="row2">
            <label>
              Facebook link
              <input type="url" value={form.facebook} onChange={set('facebook')} placeholder="https://www.facebook.com/…" />
            </label>
            <label>
              X / Twitter link
              <input type="url" value={form.twitter} onChange={set('twitter')} placeholder="https://x.com/…" />
            </label>
          </div>
          <span className="hint">Leave a link empty to hide that icon.</span>
        </section>

        <div className="store-actions">
          <button type="submit" className="btn btn-primary" disabled={saving || !loaded}>{saving ? 'Saving…' : 'Save'}</button>
          {saved && <span className="saved-msg" role="status">Saved ✓ — live on the website now</span>}
        </div>
      </form>

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 600px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }
        .store-form { display: flex; flex-direction: column; gap: 18px; max-width: 760px; }
        .store-card { background: var(--paper); border-radius: var(--radius-md); padding: 22px 24px; display: flex; flex-direction: column; gap: 14px; }
        .store-card h3 { font-family: var(--font-display); font-size: 16px; color: var(--maroon-900); margin: 0; }
        .store-card label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-600); }
        .store-card input, .store-card textarea { padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); font-family: var(--font-body); font-size: 13.5px; background: var(--paper); }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .hint { font-size: 11.5px; color: var(--ink-400); line-height: 1.5; }
        .store-actions { display: flex; align-items: center; gap: 14px; }
        .saved-msg { font-size: 12.5px; color: #1e7039; }
        @media (max-width: 640px) { .row2 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
