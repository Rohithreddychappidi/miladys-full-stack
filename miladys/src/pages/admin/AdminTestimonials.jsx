import { useEffect, useRef, useState } from 'react';
import { api } from '../../data/api';
import { compressImageFile } from '../../utils/compressImage';

const emptyForm = { productId: '', name: '', rating: 5, text: '', photo: '', active: true };

export default function AdminTestimonials() {
  const [products, setProducts] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filterProduct, setFilterProduct] = useState('all');
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  useEffect(() => {
    refresh();
    // Real products live on the backend now — pull from there so newly
    // added products show up in the dropdown immediately, instead of the
    // stale local seed list this used to read from.
    api.getProducts().then(({ products }) => setProducts(products)).catch(() => {});
  }, []);

  function refresh() {
    api.getAllTestimonials()
      .then(({ testimonials }) => setTestimonials(testimonials))
      .catch((err) => setError(err.message));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // A testimonial photo is shown as a small avatar, so a smaller cap
    // than the default (used for product/hero photos) is plenty.
    const dataUrl = await compressImageFile(file, { maxDimension: 600 });
    setForm((f) => ({ ...f, photo: dataUrl }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.text.trim()) return;
    setError('');
    const payload = {
      productId: form.productId || null,
      name: form.name.trim(),
      rating: Number(form.rating),
      text: form.text.trim(),
      photo: form.photo || null,
      active: form.active,
    };
    try {
      if (editingId) {
        await api.updateTestimonial(editingId, payload);
      } else {
        await api.createTestimonial(payload);
      }
      resetForm();
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(t) {
    setForm({
      productId: t.product_id || '',
      name: t.name,
      rating: t.rating,
      text: t.text,
      photo: t.photo || '',
      active: t.active,
    });
    setEditingId(t.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this testimonial?')) return;
    try {
      await api.deleteTestimonial(id);
      if (editingId === id) resetForm();
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function productName(id) {
    if (!id) return 'General (homepage band)';
    return products.find((p) => p.id === id)?.name || 'Unknown product';
  }

  const visible =
    filterProduct === 'all' ? testimonials
    : filterProduct === 'general' ? testimonials.filter((t) => !t.product_id)
    : testimonials.filter((t) => t.product_id === filterProduct);

  return (
    <div>
      <div className="admin-page-head">
        <h1>Testimonials</h1>
        <p>Add customer quotes, optionally with a small photo. Leave "Product" unset to show it in the general rotating band near the footer; pick a product to show it only on that product's page.</p>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="cms-layout">
        <form className="cms-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit testimonial' : 'Add a testimonial'}</h3>

          <label>
            Product (optional)
            <select
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
            >
              <option value="">General (homepage band)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <label>
            Customer name
            <input
              type="text"
              value={form.name}
              placeholder="e.g. Ananya R."
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>

          <label>
            Rating
            <select
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{r} star{r > 1 ? 's' : ''}</option>
              ))}
            </select>
          </label>

          <label>
            Review text
            <textarea
              value={form.text}
              placeholder="What did they say?"
              rows={4}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              required
            />
          </label>

          <label>
            Photo (optional)
            <input type="file" accept="image/*" ref={fileInput} onChange={handlePhoto} />
            <span className="field-hint">Shown as a small circular photo next to the quote. Leave blank to show initials instead.</span>
          </label>
          {form.photo && (
            <div className="photo-preview">
              <img src={form.photo} alt="Preview" />
              <button type="button" onClick={() => setForm((f) => ({ ...f, photo: '' }))}>Remove photo</button>
            </div>
          )}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active (visible on the site)
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Save Changes' : 'Add Testimonial'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>

        <div className="cms-list-wrap">
          <label className="filter-row">
            Filter
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
              <option value="all">All</option>
              <option value="general">General (homepage band)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <div className="cms-list">
            {visible.length === 0 && <p className="empty">No testimonials yet.</p>}
            {visible.map((t) => (
              <div className="cms-row testimonial-row" key={t.id}>
                {t.photo ? (
                  <img src={t.photo} alt="" className="row-photo" />
                ) : (
                  <div className="row-photo row-photo-fallback">{t.name.charAt(0)}</div>
                )}
                <div className="row-info">
                  <strong>{t.name} · {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}{!t.active && ' · inactive'}</strong>
                  <span className="row-product">{productName(t.product_id)}</span>
                  <span className="row-text">{t.text}</span>
                </div>
                <div className="row-actions">
                  <button onClick={() => handleEdit(t)}>Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="danger">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 560px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }

        .cms-layout {
          display: grid;
          grid-template-columns: 340px 1fr;
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
        .cms-form input[type="text"], .cms-form select, .cms-form textarea, .cms-form input[type="file"] {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
          resize: vertical;
          background: var(--paper);
        }
        .field-hint { font-size: 11.5px; color: var(--ink-400); line-height: 1.6; }
        .checkbox-row { flex-direction: row !important; align-items: center; gap: 8px !important; }
        .checkbox-row input { width: auto; }
        .photo-preview { display: flex; align-items: center; gap: 10px; }
        .photo-preview img { width: 52px; height: 52px; border-radius: 50%; object-fit: cover; }
        .photo-preview button { background: none; border: none; font-size: 12px; color: #a13a3a; }
        .form-actions { display: flex; gap: 10px; }
        .form-actions .btn { padding: 11px 20px; font-size: 13px; }

        .cms-list-wrap { display: flex; flex-direction: column; gap: 16px; }
        .filter-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
          color: var(--ink-600);
        }
        .filter-row select {
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-size: 13px;
        }
        .cms-list { display: flex; flex-direction: column; gap: 10px; }
        .cms-row {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .row-photo { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex: 0 0 auto; }
        .row-photo-fallback {
          display: flex; align-items: center; justify-content: center;
          background: var(--blush-300); color: var(--maroon-900);
          font-weight: 600; font-size: 15px;
        }
        .row-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .row-info strong { font-size: 13.5px; color: var(--ink-900); }
        .row-product { font-size: 11.5px; color: var(--maroon-700); text-transform: uppercase; letter-spacing: 0.04em; }
        .row-text { font-size: 12.5px; color: var(--ink-400); line-height: 1.6; }
        .row-actions { display: flex; gap: 10px; flex: 0 0 auto; }
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
