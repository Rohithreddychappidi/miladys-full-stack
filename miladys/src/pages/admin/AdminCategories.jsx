import { useEffect, useRef, useState } from 'react';
import { api } from '../../data/api';

const emptyForm = { id: null, name: '', tagline: '', image: '' };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    api.getCategories().then(({ categories }) => setCategories(categories)).catch((err) => setError(err.message));
  }

  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError('');
    try {
      if (editingId) {
        await api.updateCategory(editingId, { name: form.name, tagline: form.tagline, image: form.image || undefined });
      } else {
        const id = form.name.trim().toLowerCase().replace(/\s+/g, '-');
        await api.createCategory({
          id,
          name: form.name,
          tagline: form.tagline,
          image: form.image || 'https://images.unsplash.com/photo-1717585679395-bbe39b5fb6bc?auto=format&fit=crop&w=800&q=80',
        });
      }
      resetForm();
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(category) {
    setForm({ id: category.id, name: category.name, tagline: category.tagline, image: category.image });
    setEditingId(category.id);
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this category?')) return;
    try {
      await api.deleteCategory(id);
      if (editingId === id) resetForm();
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Categories</h1>
        <p>Add the saree types shown on the homepage and products page. Each needs a small photo.</p>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="cms-layout">
        <form className="cms-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit category' : 'Add a category'}</h3>

          <label>
            Category name
            <input
              type="text"
              value={form.name}
              placeholder="e.g. Kanjivaram Silk"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>

          <label>
            Short tagline
            <input
              type="text"
              value={form.tagline}
              placeholder="e.g. Temple-woven silk, heirloom weight"
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            />
          </label>

          <label>
            Photo
            <input type="file" accept="image/*" ref={fileInput} onChange={handleImage} />
          </label>

          {form.image && (
            <div className="preview-thumb">
              <img src={form.image} alt="Preview" />
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Save Changes' : 'Add Category'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>

        <div className="cms-list">
          {categories.length === 0 && <p className="empty">No categories yet.</p>}
          {categories.map((c) => (
            <div className="cms-row" key={c.id}>
              <img src={c.image} alt="" className="row-thumb" />
              <div className="row-info">
                <strong>{c.name}</strong>
                <span>{c.tagline}</span>
              </div>
              <div className="row-actions">
                <button onClick={() => handleEdit(c)}>Edit</button>
                <button onClick={() => handleDelete(c.id)} className="danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 500px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }

        .cms-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 28px;
          align-items: flex-start;
        }
        .cms-form {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 26px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .cms-form h3 { font-family: var(--font-display); font-size: 18px; color: var(--maroon-900); margin: 0; }
        .cms-form label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-600); }
        .cms-form input[type="text"] {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
        }
        .preview-thumb { width: 64px; height: 64px; border-radius: 50%; overflow: hidden; }
        .preview-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .form-actions { display: flex; gap: 10px; }
        .form-actions .btn { padding: 11px 20px; font-size: 13px; }

        .cms-list { display: flex; flex-direction: column; gap: 10px; }
        .cms-row {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .row-thumb { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
        .row-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .row-info strong { font-size: 13.5px; color: var(--ink-900); }
        .row-info span { font-size: 12px; color: var(--ink-400); }
        .row-actions { display: flex; gap: 10px; }
        .row-actions button { background: none; border: none; font-size: 12.5px; color: var(--maroon-900); }
        .row-actions .danger { color: #a13a3a; }
        .empty { color: var(--ink-400); font-size: 13.5px; }
        @media (max-width: 900px) {
          .cms-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
