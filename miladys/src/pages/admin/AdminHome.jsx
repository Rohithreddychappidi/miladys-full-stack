import { useEffect, useRef, useState } from 'react';
import { api } from '../../data/api';

const sectionLabels = {
  hero: 'Hero Banner',
  showcase: 'Our Collections (rail)',
  featured_categories: 'Shop by Category',
  promo_banner: 'Promo Banner',
  featured: 'Featured Sarees (heading)',
  story: 'Our Craft',
  testimonials: 'Testimonials Heading',
};

// Plain text/textarea fields per section. Sections with extra custom UI
// (hero's media slides, story's photo) are handled separately below.
const sectionFields = {
  hero: [
    { key: 'eyebrow', label: 'Small label above heading', type: 'text' },
    { key: 'heading', label: 'Heading (line 1)', type: 'text' },
    { key: 'heading2', label: 'Heading (script line 2)', type: 'text' },
    { key: 'subheading', label: 'Subheading', type: 'textarea' },
    { key: 'ctaLabel', label: 'Button text', type: 'text' },
    { key: 'ctaLink', label: 'Button link', type: 'text' },
  ],
  showcase: [
    { key: 'note', label: 'Italic note (left)', type: 'textarea' },
    { key: 'heading', label: 'Heading (right)', type: 'text' },
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
  featured: [
    { key: 'eyebrow', label: 'Small label above heading', type: 'text' },
    { key: 'heading', label: 'Heading', type: 'text' },
  ],
  story: [
    { key: 'eyebrow', label: 'Small label above heading', type: 'text' },
    { key: 'heading', label: 'Heading', type: 'text' },
    { key: 'body', label: 'Paragraph', type: 'textarea' },
    { key: 'ctaLabel', label: 'Button text', type: 'text' },
    { key: 'ctaLink', label: 'Button link', type: 'text' },
  ],
  testimonials: [
    { key: 'heading', label: 'Heading', type: 'text' },
  ],
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function HeroSlidesEditor({ slides = [], onChange }) {
  const photoInput = useRef(null);
  const videoInput = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(e, type) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const added = await Promise.all(files.map(async (f) => ({ type, url: await readFileAsDataUrl(f) })));
      onChange([...slides, ...added]);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  function removeSlide(i) {
    onChange(slides.filter((_, idx) => idx !== i));
  }

  return (
    <div className="slides-editor">
      <p className="field-hint">
        These play in order on the home page banner. Mix photos and short video clips (a few seconds, no sound needed — it plays muted).
        Large videos make the page slow to load, so keep clips short and compressed.
      </p>

      {slides.length > 0 && (
        <div className="slides-grid">
          {slides.map((s, i) => (
            <div className="slide-thumb" key={i}>
              {s.type === 'video' ? (
                <video src={s.url} muted playsInline />
              ) : (
                <img src={s.url} alt="" />
              )}
              <span className="slide-type-badge">{s.type}</span>
              <button type="button" className="slide-remove" onClick={() => removeSlide(i)} aria-label="Remove slide">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="slide-upload-actions">
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => photoInput.current?.click()}>
          {busy ? 'Uploading…' : '+ Add Photo'}
        </button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => videoInput.current?.click()}>
          {busy ? 'Uploading…' : '+ Add Video'}
        </button>
        <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e, 'image')} />
        <input ref={videoInput} type="file" accept="video/*" multiple hidden onChange={(e) => handleFiles(e, 'video')} />
      </div>

      {slides.length === 0 && (
        <p className="field-hint" style={{ marginTop: 8 }}>No banners uploaded yet — the home page will show the default built-in banner until you add at least one.</p>
      )}
    </div>
  );
}

export default function AdminHome() {
  const [sections, setSections] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const storyFileInput = useRef(null);

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

  async function handleStoryImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    updateField('story', 'image', dataUrl);
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
        <p>Every section on the home screen — edit the text, upload banner media, and toggle sections on or off.</p>
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
                {s.section_key !== 'hero' && (
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={draft.enabled !== false}
                      onChange={() => toggleEnabled(s.section_key, draft.enabled !== false)}
                    />
                    Visible on home page
                  </label>
                )}
              </div>

              {fields.map((f) => (
                <label key={f.key} className="field-label">
                  {f.label}
                  {f.type === 'textarea' ? (
                    <textarea
                      rows={3}
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

              {s.section_key === 'hero' && (
                <label className="field-label">
                  Banner photos &amp; videos
                  <HeroSlidesEditor
                    slides={draft.slides || []}
                    onChange={(slides) => updateField('hero', 'slides', slides)}
                  />
                </label>
              )}

              {s.section_key === 'story' && (
                <label className="field-label">
                  Photo
                  <input type="file" accept="image/*" ref={storyFileInput} onChange={handleStoryImage} />
                  {draft.image && (
                    <div className="story-preview">
                      <img src={draft.image} alt="Preview" />
                    </div>
                  )}
                </label>
              )}

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

        .section-list { display: flex; flex-direction: column; gap: 18px; max-width: 620px; }
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
        .field-label input[type="text"], .field-label textarea, .field-label input[type="file"] {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
        }
        .field-hint { font-size: 11.5px; color: var(--ink-400); line-height: 1.6; margin: 0; }

        .story-preview { width: 90px; height: 90px; border-radius: var(--radius-sm); overflow: hidden; margin-top: 4px; }
        .story-preview img { width: 100%; height: 100%; object-fit: cover; }

        .slides-editor { display: flex; flex-direction: column; gap: 12px; }
        .slides-grid { display: flex; flex-wrap: wrap; gap: 10px; }
        .slide-thumb {
          position: relative;
          width: 100px;
          height: 72px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--stone-200);
          background: var(--stone-100);
        }
        .slide-thumb img, .slide-thumb video { width: 100%; height: 100%; object-fit: cover; }
        .slide-type-badge {
          position: absolute;
          left: 4px;
          bottom: 4px;
          background: rgba(0,0,0,0.55);
          color: #fff;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .slide-remove {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          color: #fff;
          border: none;
          font-size: 13px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .slide-upload-actions { display: flex; gap: 10px; }
        .slide-upload-actions .btn { padding: 9px 16px; font-size: 12.5px; }

        .section-card-foot { display: flex; align-items: center; gap: 12px; }
        .section-card-foot .btn { padding: 10px 18px; font-size: 13px; }
        .saved-msg { font-size: 12.5px; color: #3c7a3c; }
      `}</style>
    </div>
  );
}
