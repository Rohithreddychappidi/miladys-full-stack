import { COUNTRIES, INDIAN_STATES, OTHER_COUNTRY, isIndia, normalizeState } from '../data/address';

// The fields of a delivery address — used by Checkout and Profile.
// India: state list, 6-digit pincode, 10-digit mobile. Abroad: phone with
// country code, postal code and state/province as the country uses them.
// `form.country` holds the country name; "Other" shows a box to type it
// (kept in `form.otherCountry`).
export default function AddressFields({ form, setForm }) {
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const choice = COUNTRIES.some((c) => c.name === form.country) ? form.country : (form.country ? OTHER_COUNTRY : 'India');
  const india = isIndia(form.country);
  const known = COUNTRIES.find((c) => c.name === form.country);
  const noPostal = known && known.postal === null;

  return (
    <>
      <label>
        Country
        <select
          value={choice}
          onChange={(e) => setForm((f) => ({
            ...f,
            country: e.target.value === OTHER_COUNTRY ? (f.otherCountry || OTHER_COUNTRY) : e.target.value,
            state: '',
          }))}
        >
          {COUNTRIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          <option value={OTHER_COUNTRY}>Other country…</option>
        </select>
      </label>
      {choice === OTHER_COUNTRY && (
        <label>
          Country name
          <input
            type="text"
            value={form.otherCountry || ''}
            placeholder="e.g. Portugal"
            onChange={(e) => setForm((f) => ({ ...f, otherCountry: e.target.value, country: e.target.value || OTHER_COUNTRY }))}
            required
          />
        </label>
      )}
      <div className="form-row">
        <label>
          Full name
          <input type="text" autoComplete="name" value={form.name} onChange={set('name')} required />
        </label>
        <label>
          {india ? 'Mobile number' : 'Phone (with country code)'}
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            placeholder={india ? '10-digit mobile' : `e.g. +${known?.dial || '44'} …`}
            value={form.mobile}
            onChange={set('mobile')}
            required
          />
        </label>
      </div>
      <label>
        Address
        <input type="text" autoComplete="street-address" placeholder={india ? 'House no, street, area' : 'House / flat, street, area'} value={form.line1} onChange={set('line1')} required />
      </label>
      <div className="form-row three">
        <label>
          {india ? 'City' : 'City / town'}
          <input type="text" autoComplete="address-level2" value={form.city} onChange={set('city')} required />
        </label>
        <label>
          {india ? 'State' : 'State / province'}
          {india ? (
            <select value={normalizeState(form.state) || ''} onChange={set('state')} required>
              <option value="" disabled>Choose state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input type="text" autoComplete="address-level1" value={form.state} onChange={set('state')} required={Boolean(known?.stateRequired)} placeholder={known?.stateRequired ? '' : 'Optional'} />
          )}
        </label>
        <label>
          {india ? 'Pincode' : 'Postal code'}
          <input
            type="text"
            inputMode={india ? 'numeric' : 'text'}
            autoComplete="postal-code"
            maxLength={india ? 6 : 10}
            placeholder={india ? '6 digits' : noPostal ? 'Not needed' : ''}
            value={form.pincode}
            onChange={(e) => setForm((f) => ({ ...f, pincode: india ? e.target.value.replace(/\D/g, '') : e.target.value }))}
            required={india || (known && known.postal !== null)}
          />
        </label>
      </div>
      <style>{`
        .address-form select { padding: 11px 12px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); font-size: 13.5px; background: var(--paper); font-family: var(--font-body); width: 100%; }
      `}</style>
    </>
  );
}
