import { useEffect, useState } from 'react';
import { api } from './api';

// The store's contact details, edited in Admin → Footer & Contact. Kept in
// two CMS sections: 'store_info' (description, phone, email, address, map
// link, hours) and 'social_links' (WhatsApp, Instagram, Facebook, X).
// These defaults are what the site showed before the details became
// editable, so nothing changes until the admin saves new values.
export const STORE_DEFAULTS = {
  description: 'Premium sarees, handpicked for the woman who wears tradition her own way.',
  phone: '+91 78422 25444',
  email: 'themiladysofficial@gmail.com',
  address: "Flat No. 402, JM's CNR Tower,\nSrinagar, Kakinada, A.P. 533003",
  mapsLink: 'https://maps.app.goo.gl/5VFnXKQRaPAT8UxC7',
  hours: 'Mon – Sat: 10am – 9pm\nSunday: 10am – 7pm',
  whatsapp: '917842225444',
  instagram: 'https://www.instagram.com/themiladys_',
  facebook: '',
  twitter: '',
};

let cache = null; // one fetch per page load, shared by every component

export function loadStoreInfo({ fresh = false } = {}) {
  if (cache && !fresh) return cache;
  cache = Promise.all([
    api.getHomeSection('store_info').then(({ section }) => section?.content || {}).catch(() => ({})),
    api.getHomeSection('social_links').then(({ section }) => section?.content || {}).catch(() => ({})),
  ]).then(([store, social]) => {
    const info = { ...STORE_DEFAULTS };
    for (const [k, v] of Object.entries({ ...store, ...social })) {
      if (typeof v === 'string' && (v.trim() || ['facebook', 'twitter', 'instagram', 'whatsapp'].includes(k))) info[k] = v.trim();
    }
    return info;
  });
  return cache;
}

export function useStoreInfo() {
  const [info, setInfo] = useState(STORE_DEFAULTS);
  useEffect(() => {
    let active = true;
    loadStoreInfo().then((i) => active && setInfo(i));
    return () => { active = false; };
  }, []);
  return info;
}

export const telHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;
export const waHref = (number, text) => {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
export const lines = (text) => String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
// Multi-line address on one line: "Flat 402, Tower,\nCity" → "Flat 402, Tower, City".
export const addressInline = (address) => lines(address).map((l) => l.replace(/,\s*$/, '')).join(', ');
export const instagramHandle = (url) => {
  const m = String(url || '').match(/instagram\.com\/([^/?#]+)/i);
  return m ? `@${m[1]}` : url;
};
// Google Maps embed for an address (no API key needed).
export const mapEmbedUrl = (address) => `https://maps.google.com/maps?q=${encodeURIComponent(addressInline(address))}&output=embed`;
