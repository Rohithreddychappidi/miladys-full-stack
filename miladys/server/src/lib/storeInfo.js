import { query } from '../db.js';

// The store's contact details, edited in Admin → Footer & Contact and
// stored as two CMS sections: 'store_info' (description, phone, email,
// address, map link, hours) and 'social_links' (WhatsApp, Instagram, …).
// The website, the PDF invoice and the emails all read from here, so the
// details are changed in one place. These defaults are what the site
// showed before the details became editable.
export const STORE_DEFAULTS = {
  name: "Milady's",
  description: 'Premium sarees, handpicked for the woman who wears tradition her own way.',
  phone: '+91 78422 25444',
  email: 'themiladysofficial@gmail.com',
  address: "Flat No. 402, JM's CNR Tower,\nSrinagar, Kakinada, A.P. 533003",
  mapsLink: 'https://maps.app.goo.gl/5VFnXKQRaPAT8UxC7',
  hours: 'Mon – Sat: 10am – 9pm\nSunday: 10am – 7pm',
};

export async function getStoreInfo() {
  const { rows } = await query(
    "SELECT section_key, content FROM home_sections WHERE section_key IN ('store_info', 'social_links')"
  );
  const byKey = Object.fromEntries(rows.map((r) => [r.section_key, r.content || {}]));
  const info = { ...STORE_DEFAULTS };
  for (const [k, v] of Object.entries(byKey.store_info || {})) {
    if (typeof v === 'string' && v.trim()) info[k] = v.trim();
  }
  info.whatsapp = String(byKey.social_links?.whatsapp || '').replace(/\D/g, '');
  return info;
}
