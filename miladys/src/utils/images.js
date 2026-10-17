// Uploaded photos are stored as "<hash>.webp" (full size) plus
// "<hash>-sm.webp" (600px thumbnail). Anything else — external URLs,
// legacy data URLs — has no thumbnail and is returned unchanged.
export function thumbUrl(src) {
  if (typeof src !== 'string' || !src.includes('/uploads/img/') || src.endsWith('-sm.webp')) return src;
  return src.replace(/\.webp$/, '-sm.webp');
}

export function fullUrl(src) {
  if (typeof src !== 'string' || !src.includes('/uploads/img/')) return src;
  return src.replace(/-sm\.webp$/, '.webp');
}
