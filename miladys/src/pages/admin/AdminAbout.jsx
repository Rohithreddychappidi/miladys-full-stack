import { useEffect, useRef, useState } from 'react';
import { api } from '../../data/api';
import { compressImageFile } from '../../utils/compressImage';

function GalleryEditor({ images = [], onChange }) {
  const fileInput = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      const added = await Promise.all(files.map((f) => compressImageFile(f)));
      onChange([...images, ...added]);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  function remove(i) {
    onChange(images.filter((_, idx) => idx !== i));
  }

  return (
    <div className="slides-editor">
      <p className="field-hint">
        Optional extra photos shown in a strip below the story text. Add as many as you like — each one is
        cropped to a square so mismatched photo sizes still line up neatly.
      </p>

      {images.length > 0 && (
        <div className="slides-grid">
          {images.map((src, i) => (
            <div className="slide-thumb" key={i}>
              <img src={src} alt="" />
              <button type="button" className="slide-remove" onClick={() => remove(i)} aria-label="Remove image">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="slide-upload-actions">
        <button type="button" className="btn btn-outline" disabled={busy} onClick={() => fileInput.current?.click()}>
          {busy ? 'Uploading…' : '+ Add Photo'}
        </button>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      </div>
    </div>
  );
}

export default function AdminAbout() {
  const [sections, setSections] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const storyFileInput = useRef(null);

  useEffect(() => {
    api
      .getAllHomeSections()
      .then(({ sections: all }) => {
        const relevant = all.filter((s) => s.section_key === 'about_hero' || s.section_key === 'about_story');
        setSections(relevant);
        const map = {};
        relevant.forEach((s) => { map[s.section_key] = { ...s.content, enabled: s.enabled }; });
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
    const dataUrl = await compressImageFile(file);
    updateField('about_story', 'image', dataUrl);
  }

  function paragraphsToText(paragraphs) {
    return (paragraphs || []).join('\n\n');
  }

  function textToParagraphs(text) {
    return text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  async function handleSave(key) {
    setError('');
    const { enabled, ...content } = drafts[key] || {};
    try {
      const { section } = await api.updateHomeSection(key, { content, enabled: true, title: key === 'about_hero' ? 'About Page — Header' : 'About Page — Our Story', sortOrder: key === 'about_hero' ? 8 : 9 });
      setSections((prev) => {
        const exists = prev.some((s) => s.section_key === key);
        return exists ? prev.map((s) => (s.section_key === key ? section : s)) : [...prev, section];
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(''), 2000);
    } catch (err) {
      setError(err.message);
    }
  }

  const heroDraft = drafts.about_hero || {};
  const storyDraft = drafts.about_story || {};

  return (
    <div>
      <div className="admin-page-head">
        <h1>About Page</h1>
        <p>Everything on the &quot;Read our story&quot; page — header text, the story copy, the main photo, and any extra gallery photos.</p>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="section-list">
        <div className="section-card">
          <div className="section-card-head">
            <h3>Header</h3>
          </div>
          <label className="field-label">
            Small label above heading
            <input
              type="text"
              value={heroDraft.eyebrow || ''}
              onChange={(e) => updateField('about_hero', 'eyebrow', e.target.value)}
            />
          </label>
          <label className="field-label">
            Heading
            <textarea
              rows={2}
              value={heroDraft.heading || ''}
              onChange={(e) => updateField('about_hero', 'heading', e.target.value)}
            />
          </label>
          <div className="section-card-foot">
            <button className="btn btn-primary" onClick={() => handleSave('about_hero')}>Save</button>
            {savedKey === 'about_hero' && <span className="saved-msg">Saved ✓</span>}
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-head">
            <h3>Our Story</h3>
          </div>
          <label className="field-label">
            Heading
            <input
              type="text"
              value={storyDraft.heading || ''}
              onChange={(e) => updateField('about_story', 'heading', e.target.value)}
            />
          </label>
          <label className="field-label">
            Paragraphs
            <textarea
              rows={7}
              value={paragraphsToText(storyDraft.paragraphs)}
              onChange={(e) => updateField('about_story', 'paragraphs', textToParagraphs(e.target.value))}
            />
            <span className="field-hint">Leave a blank line between paragraphs to split them — each one renders as its own paragraph.</span>
          </label>

          <label className="field-label">
            Main photo
            <input type="file" accept="image/*" ref={storyFileInput} onChange={handleStoryImage} />
            {storyDraft.image && (
              <div className="story-preview">
                <img src={storyDraft.image} alt="Preview" />
              </div>
            )}
          </label>

          <label className="field-label">
            Gallery photos
            <GalleryEditor
              images={storyDraft.gallery || []}
              onChange={(gallery) => updateField('about_story', 'gallery', gallery)}
            />
          </label>

          <div className="section-card-foot">
            <button className="btn btn-primary" onClick={() => handleSave('about_story')}>Save</button>
            {savedKey === 'about_story' && <span className="saved-msg">Saved ✓</span>}
          </div>
        </div>
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
          width: 90px;
          height: 90px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--stone-200);
          background: var(--stone-100);
        }
        .slide-thumb img { width: 100%; height: 100%; object-fit: cover; }
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
