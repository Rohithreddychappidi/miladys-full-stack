import { useState } from 'react';
import { api } from '../../data/api';
import { formatINR } from '../../data/store';
import { thumbUrl } from '../../utils/images';
import { detectColour, hexForColour } from '../../data/sareeColors';

// Admin → Products: turn several products (the same design in different
// colours) into one product with a colour each. The kept product keeps its
// name, price, code and description; each product becomes a colour with
// its own photos and stock; the others are hidden (orders and invoices
// that mention them stay as they are) and their reviews move across.
export default function CombineColours({ products, onDone, onCancel }) {
  const [targetId, setTargetId] = useState(products[0].id);
  const [parts, setParts] = useState(() => products.map((p) => {
    const c = detectColour(`${p.name} ${p.description || ''}`);
    return { id: p.id, colorName: c?.name || '', hex: c?.hex || '#48181e' };
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const target = products.find((p) => p.id === targetId);
  const prices = new Set(products.map((p) => p.price));
  const set = (id, patch) => setParts((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  async function submit() {
    setError('');
    if (parts.some((x) => !x.colorName.trim())) { setError('Give every product a colour name.'); return; }
    const lower = parts.map((x) => x.colorName.trim().toLowerCase());
    if (new Set(lower).size !== lower.length) { setError('Each colour name must be different.'); return; }
    const others = products.filter((p) => p.id !== targetId).length;
    if (!window.confirm(`Combine into "${target.name}" (${target.sku})? The other ${others} product${others === 1 ? '' : 's'} will be hidden, and their photos and stock become colours of this one.`)) return;
    setBusy(true);
    try {
      await api.combineProducts({ targetId, parts: parts.map((x) => ({ ...x, colorName: x.colorName.trim() })) });
      onDone(target);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="combine" role="dialog" aria-label="Combine as colours">
      <h3>Combine {products.length} products as colours of one saree</h3>
      <p className="combine-hint">For the <strong>same design in different colours</strong>. Choose which product to keep (its name, price, code and description stay), and name each colour.</p>
      {prices.size > 1 && <p className="combine-warn">These have different prices — the combined saree will use the kept product&apos;s price ({formatINR(target.price)}) for every colour.</p>}
      <div className="combine-list">
        {products.map((p) => {
          const part = parts.find((x) => x.id === p.id);
          return (
            <div className={`combine-row${p.id === targetId ? ' is-target' : ''}`} key={p.id}>
              <label className="combine-keep" title="Keep this product">
                <input type="radio" name="combine-target" checked={p.id === targetId} onChange={() => setTargetId(p.id)} />
                <span>Keep</span>
              </label>
              <img src={p.thumb || thumbUrl(p.image)} alt="" />
              <div className="combine-info">
                <strong>{p.name}</strong>
                <span>{p.sku} · {formatINR(p.price)} · {p.stock} in stock</span>
              </div>
              <span className="combine-swatch" style={{ backgroundColor: part.hex }} />
              <input
                type="text"
                value={part.colorName}
                placeholder="Colour name"
                aria-label={`Colour name for ${p.sku}`}
                onChange={(e) => set(p.id, { colorName: e.target.value, hex: hexForColour(e.target.value) || part.hex })}
              />
            </div>
          );
        })}
      </div>
      {error && <p className="combine-error" role="alert">{error}</p>}
      <div className="combine-actions">
        <button type="button" className="btn btn-primary small" disabled={busy} onClick={submit}>{busy ? 'Combining…' : 'Combine'}</button>
        <button type="button" className="btn btn-outline small" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
      <style>{`
        .combine { background: var(--paper); border: 1px solid var(--maroon-800); border-radius: var(--radius-md); padding: 16px 18px; margin-bottom: 14px; }
        .combine h3 { font-family: var(--font-display); font-size: 16px; color: var(--maroon-900); margin: 0 0 6px; }
        .combine-hint { font-size: 12.5px; color: var(--ink-600); margin: 0 0 8px; line-height: 1.5; }
        .combine-warn { font-size: 12px; color: #8a5a10; background: #fbeacb; padding: 7px 10px; border-radius: var(--radius-sm); margin: 0 0 8px; }
        .combine-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
        .combine-row { display: grid; grid-template-columns: 58px 38px minmax(0, 1fr) 18px 150px; gap: 10px; align-items: center; padding: 6px 8px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); }
        .combine-row.is-target { border-color: var(--maroon-800); background: #fbf6f6; }
        .combine-keep { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--ink-600); cursor: pointer; }
        .combine-row img { width: 38px; height: 48px; object-fit: cover; border-radius: 4px; }
        .combine-info { display: flex; flex-direction: column; min-width: 0; }
        .combine-info strong { font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .combine-info span { font-size: 11px; color: var(--ink-400); }
        .combine-swatch { width: 18px; height: 18px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.15); }
        .combine-row input[type="text"] { padding: 7px 9px; border: 1px solid var(--stone-200); border-radius: var(--radius-sm); font-size: 12.5px; min-width: 0; }
        .combine-error { font-size: 12px; color: #a13a3a; margin: 0 0 8px; }
        .combine-actions { display: flex; gap: 8px; }
        @media (max-width: 640px) { .combine-row { grid-template-columns: 54px 38px minmax(0, 1fr); } .combine-swatch { display: none; } .combine-row input[type="text"] { grid-column: 1 / -1; } }
      `}</style>
    </div>
  );
}
