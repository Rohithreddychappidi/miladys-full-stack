// Colour words found in saree names/descriptions, with a swatch shade.
// Longer phrases first so "rani pink" wins over "pink".
const COLOURS = [
  ['rani pink', '#db2777'], ['baby pink', '#f4b6c2'], ['onion pink', '#e8a0a8'], ['magenta pink', '#c2185b'],
  ['royal blue', '#1e3a8a'], ['sky blue', '#7cb9e8'], ['peacock blue', '#005f73'], ['navy blue', '#1b2a4a'], ['ink blue', '#1f2f5c'],
  ['bottle green', '#0f5132'], ['parrot green', '#5cb800'], ['deep green', '#14532d'], ['dark green', '#14532d'], ['mint green', '#98d7c2'], ['olive green', '#6b7a2a'], ['sea green', '#2e8b57'],
  ['mustard yellow', '#d4a017'], ['lemon yellow', '#f5e050'], ['golden yellow', '#e0a800'], ['mustard gold', '#d97706'],
  ['off-white', '#f5f0e6'], ['off white', '#f5f0e6'], ['ivory cream', '#fdfbf7'], ['silver-lavender', '#c4b8d8'],
  ['wine', '#5b1a2e'], ['plum', '#581c87'], ['maroon', '#48181e'], ['ruby red', '#9b111e'], ['brick red', '#8b3a2b'],
  ['magenta', '#c2185b'], ['mauve', '#b784a7'], ['lavender', '#b8a1d9'], ['lilac', '#c8a2c8'], ['purple', '#6b21a8'], ['violet', '#7c3aed'],
  ['teal', '#0f766e'], ['turquoise', '#1aa7a1'], ['navy', '#1b2a4a'], ['blue', '#1d4ed8'],
  ['green', '#15803d'], ['mint', '#98d7c2'], ['olive', '#6b7a2a'],
  ['yellow', '#eab308'], ['mustard', '#d4a017'], ['gold', '#c9973f'], ['golden', '#c9973f'], ['orange', '#ea580c'], ['peach', '#f6b38f'], ['coral', '#f47c6a'], ['rust', '#b7410e'],
  ['red', '#b91c1c'], ['pink', '#ec4899'], ['cream', '#f3e9d2'], ['beige', '#e3d3b5'], ['white', '#ffffff'], ['silver', '#c0c0c0'],
  ['grey', '#8a8a8a'], ['gray', '#8a8a8a'], ['black', '#1a1a1a'], ['brown', '#7b4b2a'], ['copper', '#b87333'],
];

const title = (s) => s.replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());

// First colour mentioned in the text → { name: 'Rani Pink', hex } or null.
export function detectColour(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  let best = null;
  for (const [word, hex] of COLOURS) {
    const i = t.search(new RegExp(`[^a-z]${word.replace(/[-\s]/g, '[-\\s]')}[^a-z]`));
    if (i >= 0 && (!best || i < best.i || (i === best.i && word.length > best.word.length))) best = { i, word, hex };
  }
  return best ? { name: title(best.word), hex: best.hex } : null;
}

// All colours mentioned, in order of appearance (no repeats, and "pink"
// isn't listed again after "rani pink").
export function detectColours(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  const hits = [];
  for (const [word, hex] of COLOURS) {
    const re = new RegExp(`[^a-z]${word.replace(/[-\s]/g, '[-\\s]')}(?=[^a-z])`, 'g');
    let m;
    while ((m = re.exec(t))) hits.push({ i: m.index, end: m.index + m[0].length, word, hex });
  }
  hits.sort((a, b) => a.i - b.i || b.word.length - a.word.length);
  const out = [];
  let lastEnd = -1;
  for (const h of hits) {
    if (h.i < lastEnd) continue; // inside a longer phrase already taken
    lastEnd = h.end;
    const name = title(h.word);
    if (!out.some((o) => o.name.toLowerCase().includes(name.toLowerCase()) || o.hex === h.hex)) out.push({ name, hex: h.hex });
  }
  return out;
}

// Hex shade for a colour name the admin typed ("Royal Blue" → #1e3a8a).
export function hexForColour(name) {
  return detectColour(name)?.hex || null;
}

// Name comparison ignoring case, spacing, punctuation and a trailing "s"
// ("Dharmavaram Pattu Sarees" = "dharmavaram pattu saree").
export const sameNameKey = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/s$/, '');

// "Dharmavaram Pattu" + description → "Dharmavaram Pattu – Rani Pink".
// With `colourCount` 2: "Dharmavaram Pattu – Green & Purple".
export function suggestDistinctName(name, description, colourCount = 1) {
  const base = String(name || '').replace(/\s+[–-]\s+.*$/, '').trim();
  const colours = detectColours(description).filter((c) => !base.toLowerCase().includes(c.name.toLowerCase())).slice(0, colourCount);
  return colours.length ? `${base} – ${colours.map((c) => c.name).join(' & ')}` : null;
}
