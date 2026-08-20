import { useEffect, useState } from 'react';
import { api } from '../../data/api';

const sectionLabels = {
  hero: 'Hero Banner',
  featured_categories: 'Shop by Category',
  promo_banner: 'Promo Banner',
  testimonials: 'Testimonials Heading',
};

const sectionFields = {
  hero: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'subheading', label: 'Subheading', type: 'textarea' },
    { key: 'ctaLabel', label: 'Button text', type: 'text' },
    { key: 'ctaLink', label: 'Button link', type: 'text' },
  ],
  promo_banner: [
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'subheading', label: 'Subheading', type: 'text' },
    { key: 'ctaLabel', label: 'Button text', type: 'text' },
    { key: 'ctaLink', label: 'Button link', type: 'text' },
  ],
  featured_categories: [
    { key: 'heading', label: 'Heading', type: 'text' },
  ],
  testimonials: [
    { key: 'heading', label: 'Heading', type: 'text' },
  ],
};

export default function AdminHome() {
  const [sections, setSections] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [savedKey, setSavedKey] = useState('');

  useEffect(() => {
    api
      .getAllHomeSections()
      .then(({ sections }) => {
        setSections(sections);
        const map = {};
        sections.forEach((s) => { map[s.section_key] = { ...s.content, enabled: s.enabled }; });
        setDrafts(map);
      })
      .catch((err) => setError(err.message));
  }, []);

  function updateField(key, field, value) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  async function handleSave(key) {
    setError('');
    const { enabled, ...content } = drafts[key] || {};
    try {
      const { section } = await api.updateHomeSection(key, { content, enabled });
      setSections((prev) => prev.map((s) => (s.section_key === key ? section : s)));
      setSavedKey(key);
      setTimeout(() => setSavedKey(''), 2000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleEnabled(key, current) {
    updateField(key, 'enabled', !current);
    try {
      await api.updateHomeSection(key, { enabled: !current });
      setSections((prev) => prev.map((s) => (s.section_key === key ? { ...s, enabled: !current } : s)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Home Page</h1>
        <p>Every section on the home screen — edit the text, links, and toggle sections on or off.</p>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="section-list">
        {sections.map((s) => {
          const fields = sectionFields[s.section_key] || [];
          const draft = drafts[s.section_key] || {};
          return (
            <div className="section-card" key={s.section_key}>
              <div className="section-card-head">
                <h3>{sectionLabels[s.section_key] || s.title || s.section_key}</h3>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={draft.enabled !== false}
                    onChange={() => toggleEnabled(s.section_key, draft.enabled !== false)}
                  />
                  Visible on home page
                </label>
              </div>

              {fields.map((f) => (
                <label key={f.key} className="field-label">
                  {f.label}
                  {f.type === 'textarea' ? (
                    <textarea
                      rows={2}
                      value={draft[f.key] || ''}
                      onChange={(e) => updateField(s.section_key, f.key, e.target.value)}
                    />
                  ) : (
                    <input
                      type="text"
                      value={draft[f.key] || ''}
                      onChange={(e) => updateField(s.section_key, f.key, e.target.value)}
                    />
                  )}
                </label>
              ))}

              <div className="section-card-foot">
                <button className="btn btn-primary" onClick={() => handleSave(s.section_key)}>Save</button>
                {savedKey === s.section_key && <span className="saved-msg">Saved ✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 560px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }

        .section-list { display: flex; flex-direction: column; gap: 18px; max-width: 560px; }
        .section-card {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .section-card-head { display: flex; align-items: center; justify-content: space-between; }
        .section-card-head h3 { font-family: var(--font-display); font-size: 16px; color: var(--maroon-900); margin: 0; }
        .toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-600); }
        .toggle input { accent-color: var(--maroon-900); }

        .field-label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-600); }
        .field-label input, .field-label textarea {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
        }
        .section-card-foot { display: flex; align-items: center; gap: 12px; }
        .section-card-foot .btn { padding: 10px 18px; font-size: 13px; }
        .saved-msg { font-size: 12.5px; color: #3c7a3c; }
      `}</style>
    </div>
  );
}
