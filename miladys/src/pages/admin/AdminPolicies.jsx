import { useEffect, useState } from 'react';
import { api } from '../../data/api';
import { POLICY_PAGES } from '../../data/policyDefaults';
import { PolicyContent, PolicyStyles } from '../../components/PolicyPage';

// Admin → Policy Pages. Edits the wording of Privacy / Terms / Return &
// Refund. The text uses a simple format (help box below) and the preview
// shows exactly how the page will look on the website.
const KEYS = Object.keys(POLICY_PAGES);
const FIELDS = ['eyebrow', 'title', 'lastUpdated', 'body'];
const pick = (page) => Object.fromEntries(FIELDS.map((f) => [f, page[f] || '']));

export default function AdminPolicies() {
  const [active, setActive] = useState(KEYS[0]);
  const [forms, setForms] = useState(() => Object.fromEntries(KEYS.map((k) => [k, pick(POLICY_PAGES[k])])));
  const [tiers, setTiers] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    api.getAllHomeSections()
      .then(({ sections }) => {
        setForms((prev) => {
          const next = { ...prev };
          for (const s of sections || []) {
            if (!KEYS.includes(s.section_key) || !s.content) continue;
            const c = Object.fromEntries(Object.entries(s.content).filter(([, v]) => typeof v === 'string' && v.trim()));
            next[s.section_key] = { ...prev[s.section_key], ...pick({ ...prev[s.section_key], ...c }) };
          }
          return next;
        });
      })
      .catch((err) => setError(err.message));
    api.getCancellationPolicy().then(({ policy }) => Array.isArray(policy) && setTiers(policy)).catch(() => {});
  }, []);

  const form = forms[active];
  const page = POLICY_PAGES[active];
  const set = (field) => (e) => setForms((f) => ({ ...f, [active]: { ...f[active], [field]: e.target.value } }));

  async function handleSave() {
    setError('');
    if (!form.title.trim() || !form.body.trim()) { setError('The title and the page text can\'t be empty.'); return; }
    setSaving(true);
    try {
      await api.updateHomeSection(active, { content: form, enabled: true, title: `Policy — ${page.label}`, sortOrder: 30 });
      setSaved(active);
      setTimeout(() => setSaved(''), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!window.confirm(`Put back the original wording of the ${page.label}? You still need to click Save afterwards.`)) return;
    setForms((f) => ({ ...f, [active]: pick(POLICY_PAGES[active]) }));
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Policy Pages</h1>
        <p>Edit the wording of your policy pages. Phone, email and address come from <strong>Footer &amp; Contact</strong> automatically, and the refund table from <strong>Cancellation Policy</strong>.</p>
      </div>

      <div className="policy-tabs" role="tablist">
        {KEYS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={active === k} className={'policy-tab' + (active === k ? ' active' : '')} onClick={() => setActive(k)}>
            {POLICY_PAGES[k].label}
          </button>
        ))}
        <a className="view-live" href={page.path} target="_blank" rel="noreferrer">View on website ↗</a>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <div className="policy-editor">
        <div className="policy-form">
          <div className="row3">
            <label>Small heading<input type="text" value={form.eyebrow} onChange={set('eyebrow')} /></label>
            <label>Title<input type="text" value={form.title} onChange={set('title')} /></label>
            <label>Last updated<input type="text" value={form.lastUpdated} onChange={set('lastUpdated')} placeholder="October 2026" /></label>
          </div>
          <label>
            Page text
            <textarea className="policy-body" value={form.body} onChange={set('body')} spellCheck />
          </label>

          <button type="button" className="help-toggle" onClick={() => setShowHelp((v) => !v)} aria-expanded={showHelp}>
            {showHelp ? '▾' : '▸'} How to format the text
          </button>
          {showHelp && (
            <div className="format-help">
              <table>
                <tbody>
                  <tr><td><code>## Heading</code></td><td>Starts a new section with a heading</td></tr>
                  <tr><td><code>- item</code></td><td>A bullet point</td></tr>
                  <tr><td><code>**bold**</code> · <code>*italic*</code></td><td>Bold / italic text</td></tr>
                  <tr><td><code>[My Orders](/orders)</code></td><td>A link (website page or full https:// link)</td></tr>
                  <tr><td><code>{'{phone}'} {'{email}'} {'{address}'}</code></td><td>Your store details from Footer &amp; Contact</td></tr>
                  <tr><td><code>[box]</code> … <code>[/box]</code></td><td>The bordered contact box</td></tr>
                  <tr><td><code>[callout]</code> … <code>[/callout]</code></td><td>A highlighted box</td></tr>
                  <tr><td><code>[note] text</code></td><td>Small grey note</td></tr>
                  <tr><td><code>[refund table]</code></td><td>The refund table from Cancellation Policy</td></tr>
                </tbody>
              </table>
              <p>Leave an empty line between paragraphs.</p>
            </div>
          )}

          <div className="policy-actions">
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn btn-outline" onClick={handleReset}>Reset to original</button>
            {saved === active && <span className="saved-msg" role="status">Saved ✓ — live on the website now</span>}
          </div>
        </div>

        <div className="policy-preview" aria-label="Preview">
          <p className="preview-label">Preview</p>
          <div className="policy-page preview-inner">
            <header className="policy-header">
              <p className="eyebrow">{form.eyebrow}</p>
              <h1>{form.title}</h1>
              {form.lastUpdated && <p className="last-updated">Last updated: {form.lastUpdated}</p>}
            </header>
            <PolicyContent body={form.body} tiers={tiers} />
          </div>
        </div>
      </div>

      <PolicyStyles />
      <style>{`
        .admin-page-head { margin-bottom: 26px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 640px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }
        .policy-tabs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 18px; }
        .policy-tab { padding: 9px 16px; border-radius: 999px; border: 1px solid var(--stone-200); background: var(--paper); font-size: 13px; color: var(--ink-600); cursor: pointer; }
        .policy-tab.active { background: var(--maroon-900); border-color: var(--maroon-900); color: var(--ivory); }
        .view-live { margin-left: auto; font-size: 12.5px; color: var(--maroon-900); }
        .policy-editor { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
        .policy-form { background: var(--paper); border-radius: var(--radius-md); padding: 20px; display: flex; flex-direction: column; gap: 14px; }
        .policy-form label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-600); }
        .policy-form input, .policy-form textarea { padding: 9px 11px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200); font-size: 13px; font-family: var(--font-body); background: var(--paper); }
        .policy-body { min-height: 520px; font-family: ui-monospace, Menlo, monospace !important; font-size: 12.5px !important; line-height: 1.6; resize: vertical; }
        .row3 { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 10px; }
        .help-toggle { align-self: flex-start; background: none; border: none; color: var(--maroon-900); font-size: 12.5px; cursor: pointer; padding: 0; }
        .format-help { background: #faf7f5; border-radius: var(--radius-sm); padding: 12px 14px; font-size: 12px; color: var(--ink-600); }
        .format-help table { border-collapse: collapse; width: 100%; }
        .format-help td { padding: 4px 8px 4px 0; vertical-align: top; }
        .format-help code { background: var(--paper); padding: 1px 5px; border-radius: 3px; font-size: 11.5px; }
        .format-help p { margin: 8px 0 0; }
        .policy-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
        .saved-msg { font-size: 12.5px; color: #1e7039; }
        .policy-preview { background: var(--paper); border-radius: var(--radius-md); padding: 20px 24px; max-height: 900px; overflow: auto; position: sticky; top: 20px; }
        .preview-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-400); margin-bottom: 12px; }
        .policy-page.preview-inner { padding: 0; }
        .preview-inner .policy-header h1 { font-size: 28px; }
        @media (max-width: 1100px) { .policy-editor { grid-template-columns: 1fr; } .policy-preview { position: static; max-height: none; } }
        @media (max-width: 640px) { .row3 { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
