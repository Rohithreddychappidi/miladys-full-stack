import { useEffect, useState } from 'react';
import { getProducts, getTestimonials, saveTestimonials } from '../../data/store';

const emptyForm = { id: null, productId: '', name: '', rating: 5, text: '' };

export default function AdminTestimonials() {
  const [products, setProducts] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filterProduct, setFilterProduct] = useState('all');

  useEffect(() => {
    setProducts(getProducts());
    setTestimonials(getTestimonials());
  }, []);

  function persist(next) {
    setTestimonials(next);
    saveTestimonials(next);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.productId || !form.name.trim() || !form.text.trim()) return;

    if (editingId) {
      const next = testimonials.map((t) =>
        t.id === editingId ? { ...t, ...form, rating: Number(form.rating) } : t
      );
      persist(next);
    } else {
      const id = `t${Date.now()}`;
      const next = [...testimonials, { ...form, id, rating: Number(form.rating) }];
      persist(next);
    }
    resetForm();
  }

  function handleEdit(t) {
    setForm({ id: t.id, productId: t.productId, name: t.name, rating: t.rating, text: t.text });
    setEditingId(t.id);
  }

  function handleDelete(id) {
    if (!window.confirm('Remove this testimonial?')) return;
    persist(testimonials.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
  }

  function productName(id) {
    return products.find((p) => p.id === id)?.name || 'Unknown product';
  }

  const visible = filterProduct === 'all' ? testimonials : testimonials.filter((t) => t.productId === filterProduct);

  return (
    <div>
      <div className="admin-page-head">
        <h1>Testimonials</h1>
        <p>Add customer reviews to show on a specific product&apos;s page. They rotate automatically every few seconds.</p>
      </div>

      <div className="cms-layout">
        <form className="cms-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit testimonial' : 'Add a testimonial'}</h3>

          <label>
            Product
            <select
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              required
            >
              <option value="" disabled>Select a product</option>
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
              placeholder="What did they say about this saree?"
              rows={4}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              required
            />
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
            Filter by product
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
              <option value="all">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <div className="cms-list">
            {visible.length === 0 && <p className="empty">No testimonials yet.</p>}
            {visible.map((t) => (
              <div className="cms-row testimonial-row" key={t.id}>
                <div className="row-info">
                  <strong>{t.name} · {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</strong>
                  <span className="row-product">{productName(t.productId)}</span>
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
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 500px; line-height: 1.6; }

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
        .cms-form input[type="text"], .cms-form select, .cms-form textarea {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
          resize: vertical;
        }
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
