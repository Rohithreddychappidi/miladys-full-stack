// Delivery address and phone rules for the forms — mirrors
// server/src/lib/address.js (the server's check is the one that counts).
// India: 10-digit mobile (6–9…), 6-digit pincode, state from the list.
// Elsewhere: phone with its country code (8–15 digits in all), postal code
// in that country's format (or any short code; optional where a country
// has none), state/province as typed.

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// name, dial code, postal code pattern (null = none used), state required.
export const COUNTRIES = [
  ['India', '91', /^[1-9]\d{5}$/, true],
  ['United States', '1', /^\d{5}(-\d{4})?$/, true],
  ['United Kingdom', '44', /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, false],
  ['Canada', '1', /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i, true],
  ['Australia', '61', /^\d{4}$/, true],
  ['New Zealand', '64', /^\d{4}$/, false],
  ['United Arab Emirates', '971', null, false],
  ['Saudi Arabia', '966', /^\d{5}(-\d{4})?$/, false],
  ['Qatar', '974', null, false],
  ['Kuwait', '965', /^\d{5}$/, false],
  ['Oman', '968', /^\d{3}$/, false],
  ['Bahrain', '973', /^\d{3,4}$/, false],
  ['Singapore', '65', /^\d{6}$/, false],
  ['Malaysia', '60', /^\d{5}$/, true],
  ['Hong Kong', '852', null, false],
  ['Japan', '81', /^\d{3}-?\d{4}$/, false],
  ['Sri Lanka', '94', /^\d{5}$/, false],
  ['Nepal', '977', /^\d{5}$/, false],
  ['Bangladesh', '880', /^\d{4}$/, false],
  ['Mauritius', '230', /^\d{5}$/, false],
  ['South Africa', '27', /^\d{4}$/, false],
  ['Kenya', '254', /^\d{5}$/, false],
  ['Germany', '49', /^\d{5}$/, false],
  ['France', '33', /^\d{5}$/, false],
  ['Netherlands', '31', /^\d{4} ?[A-Z]{2}$/i, false],
  ['Ireland', '353', /^[A-Z\d]{3} ?[A-Z\d]{4}$/i, false],
  ['Italy', '39', /^\d{5}$/, false],
  ['Spain', '34', /^\d{5}$/, false],
  ['Switzerland', '41', /^\d{4}$/, false],
  ['Belgium', '32', /^\d{4}$/, false],
  ['Sweden', '46', /^\d{3} ?\d{2}$/, false],
  ['Norway', '47', /^\d{4}$/, false],
  ['Denmark', '45', /^\d{4}$/, false],
  ['Fiji', '679', null, false],
  ['Trinidad and Tobago', '1', null, false],
].map(([name, dial, postal, stateRequired]) => ({ name, dial, postal, stateRequired }));

export const OTHER_COUNTRY = 'Other';
const findCountry = (name) => COUNTRIES.find((c) => c.name.toLowerCase() === String(name || '').trim().toLowerCase());

// Indian mobile: "+91 98765-43210" / "098765 43210" → "9876543210", else null.
export function normalizeIndianMobile(value) {
  let d = String(value || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

// Any phone: an Indian mobile ("9876543210"), or an international number
// with its country code ("+44 7911 123456" → "+447911123456"). For an
// address abroad, the country's code is added if the number lacks it.
export function normalizePhone(value, country = 'India') {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const c = findCountry(country);
  if (!c || c.name === 'India') {
    if (raw.startsWith('+') && !digits.startsWith('91')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
    return normalizeIndianMobile(raw);
  }
  let full = digits;
  if (!raw.startsWith('+') && !raw.startsWith('00')) full = c.dial + digits.replace(/^0+/, '');
  else if (raw.startsWith('00')) full = digits.slice(2);
  return full.length >= 8 && full.length <= 15 ? `+${full}` : null;
}

export function normalizeState(value) {
  const ALIASES = { ap: 'Andhra Pradesh', ts: 'Telangana', tn: 'Tamil Nadu', ka: 'Karnataka', mh: 'Maharashtra', up: 'Uttar Pradesh', wb: 'West Bengal', 'new delhi': 'Delhi', orissa: 'Odisha', pondicherry: 'Puducherry' };
  const v = String(value || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  if (!v) return null;
  return INDIAN_STATES.find((s) => s.toLowerCase() === v) || ALIASES[v] || null;
}

export const isIndia = (country) => !country || String(country).trim().toLowerCase() === 'india';

// Checks a whole delivery address. Returns { address } (cleaned) or { error }.
// `country` is a name from COUNTRIES, or any other country name typed in.
export function checkAddress(a = {}) {
  const name = String(a.name || '').trim();
  const line1 = String(a.line1 || '').trim();
  const city = String(a.city || '').trim();
  const countryRaw = String(a.country || 'India').trim();
  if (!countryRaw || countryRaw === OTHER_COUNTRY) return { error: 'Please enter the country.' };
  const known = findCountry(countryRaw);
  const country = known ? known.name : countryRaw.slice(0, 60);
  if (!name || !line1 || !city) return { error: 'Please fill in the name, address and city.' };

  if (country === 'India') {
    const mobile = normalizeIndianMobile(a.mobile);
    if (!mobile) return { error: 'Please enter a valid 10-digit mobile number for the delivery.' };
    const pincode = String(a.pincode || '').trim();
    if (!/^[1-9]\d{5}$/.test(pincode)) return { error: 'Please enter a valid 6-digit pincode.' };
    const state = normalizeState(a.state);
    if (!state) return { error: 'Please choose the state from the list.' };
    return { address: { name: name.slice(0, 120), mobile, line1: line1.slice(0, 300), city: city.slice(0, 80), state, pincode, country } };
  }

  const mobile = normalizePhone(a.mobile, country);
  if (!mobile || (!known && !String(a.mobile || '').trim().startsWith('+'))) {
    return { error: 'Please enter the phone number with its country code, e.g. +44 7911 123456.' };
  }
  const pincode = String(a.pincode || '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (known && known.postal === null) {
    // Country without postal codes — accept whatever was typed (often blank).
  } else if (known && known.postal) {
    if (!known.postal.test(pincode)) return { error: `Please enter a valid postal code for ${country}.` };
  } else if (pincode && !/^[A-Z0-9][A-Z0-9 -]{1,9}$/.test(pincode)) {
    return { error: 'Please enter a valid postal code (letters, numbers, spaces or dashes).' };
  }
  const state = String(a.state || '').trim().slice(0, 80);
  if (known?.stateRequired && !state) return { error: `Please enter the state / province for ${country}.` };
  return { address: { name: name.slice(0, 120), mobile, line1: line1.slice(0, 300), city: city.slice(0, 80), state, pincode, country } };
}
