import { useMemo, useState } from 'react';
import { api } from '../../data/api';
import { thumbUrl } from '../../utils/images';
import { sameNameKey, suggestDistinctName } from '../../data/sareeColors';

// Admin → Products: lists sarees that share the same name (customers and
// Google can't tell them apart) with a suggested distinct name taken from
// each one's description — e.g. "Dharmavaram Pattu – Rani Pink & Purple".
// Every suggestion can be edited before renaming.
export default function SameNameFixer({ products, onRenamed }) {
  const groups = useMemo(() => {
    const byKey = new Map();
    for (const p of products) {
      const k = sameNameKey(p.name);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(p);
    }
    return [...byKey.values()].filter((g) => g.length > 1).sort((a, b) => b.length - a.length);
  }, [products]);

  // Suggestions: one colour, or two where one would clash within the group.
  const initial = useMemo(() => {
    const out = {};
    for (const g of groups) {
      const one = g.map((p) => suggestDistinctName(p.name, p.description, 1));
      g.forEach((p, i) => {
        const clash = one[i] && one.filter((x) => x === one[i]).length > 1;
        out[p.id] = (clash ? suggestDistinctName(p.name, p.description, 2) : one[i]) || '';
      });
    }
    return out;
  }, [groups]);

  const [open, setOpen] = useState(false);
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const value = (p) => names[p.id] ?? initial[p.id] ?? '';

  if (!groups.length) return null;
  const total = groups.reduce((s, g) => s + g.length, 0);

  async function rename(list) {
    const todo = list.filter((p) => value(p).trim() && value(p).trim() !== p.name);
    if (!todo.length) return;
    setBusy(true);
    setMessage('');
    let done = 0;
    const failed = [];
    for (const p of todo) {
      try {
        await api.updateProduct(p.id, { name: value(p).trim() });
        done += 1;
      } catch (err) {
        failed.push(`${p.sku || p.name}: ${err.message}`);
      }
    }
    setBusy(false);
    setMessage(`${done} renamed.${failed.length ? ` Not renamed: ${failed.join('; ')}` : ''}`);
    onRenamed();
  }

  // Names that would still be shared after renaming.
  const clashes = new Set();
  const seen = new Map();
  for (const g of groups) for (const p of g) {
    const k = sameNameKey(value(p) || p.name);
    if (seen.has(k)) { clashes.add(p.id); clashes.add(seen.get(k)); } else seen.set(k, p.id);
  }

  return (
    <div className="samename">
      <button type="button" className="samename-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span><strong>{total} sarees share a name</strong> with another saree — customers can&apos;t tell them apart in listings and search.</span>
        <span className="samename-toggle">{open ? 'Hide' : 'Fix names'}</span>
      </button>
      {open && (
        <div className="samename-body">
          <p className="samename-hint">Suggested names use the colours in each saree&apos;s description. Edit any of them, then rename one at a time or all at once. Blank means no colour was found — type a name.</p>
          {groups.map((g) => (
            <div className="samename-group" key={g[0].id}>
              <p className="samename-group-title">&ldquo;{g[0].name}&rdquo; × {g.length}</p>
              {g.map((p) => (
                <div className={`samename-row${clashes.has(p.id) ? ' clash' : ''}`} key={p.id}>
                  <img src={p.thumb || thumbUrl(p.image)} alt="" loading="lazy" />
                  <span className="samename-sku">{p.sku}</span>
                  <input
                    type="text"
                    value={value(p)}
                    placeholder={p.name}
                    onChange={(e) => setNames((n) => ({ ...n, [p.id]: e.target.value }))}
                    aria-label={`New name for ${p.sku}`}
                    title={p.description || ''}
                  />
                  <button type="button" className="btn btn-outline small" disabled={busy || !value(p).trim() || value(p).trim() === p.name} onClick={() => rename([p])}>Rename</button>
                </div>
              ))}
            </div>
          ))}
          <div className="samename-actions">
            <button type="button" className="btn btn-primary small" disabled={busy} onClick={() => rename(groups.flat())}>
              {busy ? 'Renaming…' : 'Rename all'}
            </button>
            {clashes.size > 0 && <span className="samename-warn">Rows in red would still share a name — edit them.</span>}
            {message && <span className="samename-msg" role="status">{message}</span>}
          </div>
        </div>
      )}
      <style>{`
        .samename { background: #fff8ec; border: 1px solid #f0dcb4; border-radius: var(--radius-md); margin-bottom: 14px; }
        .samename-head { width: 100%; display: flex; gap: 12px; align-items: center; justify-content: space-between; background: none; border: none; padding: 12px 16px; text-align: left; font-size: 12.5px; color: #6d4a0f; cursor: pointer; }
        .samename-toggle { flex: none; font-weight: 600; color: var(--maroon-900); text-decoration: underline; }
        .samename-body { padding: 0 16px 16px; }
        .samename-hint { font-size: 12px; color: var(--ink-600); margin: 0 0 10px; line-height: 1.5; }
        .samename-group { margin-bottom: 12px; }
        .samename-group-title { font-size: 12px; font-weight: 600; color: var(--ink-800); margin: 0 0 6px; }
        .samename-row { display: grid; grid-template-columns: 34px 72px minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 4px 0; }
        .samename-row img { width: 34px; height: 42px; object-fit: cover; border-radius: 4px; }
        .samename-sku { font-size: 11px; font-family: monospace; color: var(--ink-500); }
        .samename-row input { padding: 7px 9px; border: 1px solid var(--stone-200); border-radius: var(--radius-sm); font-size: 12.5px; background: var(--paper); min-width: 0; }
        .samename-row.clash input { border-color: #d98a8a; background: #fdf3f3; }
        .samename-row .btn.small { padding: 6px 10px; font-size: 11.5px; }
        .samename-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .samename-warn { font-size: 12px; color: #a13a3a; }
        .samename-msg { font-size: 12px; color: #1e7039; }
        @media (max-width: 560px) { .samename-row { grid-template-columns: 34px minmax(0, 1fr) auto; } .samename-sku { display: none; } }
      `}</style>
    </div>
  );
}
