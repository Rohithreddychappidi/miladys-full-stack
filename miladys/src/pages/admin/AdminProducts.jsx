import { useEffect, useRef, useState } from 'react';
import { api } from '../../data/api';
import { formatINR } from '../../data/store';

const emptyForm = { name: '', category: '', price: '', mrp: '', stock: '', description: '', image: '' };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  useEffect(() => {
    refresh();
    api.getCategories().then(({ categories }) => setCategories(categories)).catch((err) => setError(err.message));
  }, []);

  function refresh() {
    api.getProducts().then(({ products }) => setProducts(products)).catch((err) => setError(err.message));
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
    if (!form.name.trim() || !form.category) return;
    setError('');

    const payload = {
      name: form.name,
      category: form.category,
      price: Number(form.price) || 0,
      mrp: Number(form.mrp) || Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      description: form.description,
      image: form.image || 'https://images.unsplash.com/photo-1717585679395-bbe39b5fb6bc?auto=format&fit=crop&w=800&q=80',
    };

    try {
      if (editingId) {
        await api.updateProduct(editingId, payload);
      } else {
        await api.createProduct(payload);
      }
      resetForm();
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(product) {
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      mrp: product.mrp,
      stock: product.stock,
      description: product.description,
      image: product.image,
    });
    setEditingId(product.id);
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this product?')) return;
    try {
      await api.deleteProduct(id);
      if (editingId === id) resetForm();
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function categoryName(id) {
    return categories.find((c) => c.id === id)?.name || id;
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>Products</h1>
        <p>Add sarees to a category, set price, MRP and stock. Set stock to 0 to mark out of stock.</p>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="cms-layout">
        <form className="cms-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit product' : 'Add a product'}</h3>

          <label>
            Product name
            <input
              type="text"
              value={form.name}
              placeholder="e.g. Purple Kanjivaram with Gold Zari"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>

          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              required
            >
              <option value="" disabled>Choose a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <div className="form-row">
            <label>
              Price (₹)
              <input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
            </label>
            <label>
              MRP (₹)
              <input type="number" min="0" value={form.mrp} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))} />
            </label>
            <label>
              Stock
              <input type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
            </label>
          </div>

          <label>
            Description
            <textarea
              rows="3"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Weave, colour, occasion..."
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
              {editingId ? 'Save Changes' : 'Add Product'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>

        <div className="cms-list">
          {products.length === 0 && <p className="empty">No products yet.</p>}
          {products.map((p) => (
            <div className="cms-row" key={p.id}>
              <img src={p.image} alt="" className="row-thumb-sq" />
              <div className="row-info">
                <strong>{p.name}</strong>
                <span>{categoryName(p.category)} · {formatINR(p.price)} · {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}</span>
              </div>
              <div className="row-actions">
                <button onClick={() => handleEdit(p)}>Edit</button>
                <button onClick={() => handleDelete(p.id)} className="danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 520px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }

        .cms-layout {
          display: grid;
          grid-template-columns: 360px 1fr;
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
        .cms-form input, .cms-form select, .cms-form textarea {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
          background: var(--paper);
        }
        .form-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .preview-thumb { width: 72px; height: 72px; border-radius: var(--radius-sm); overflow: hidden; }
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
        .row-thumb-sq { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; }
        .row-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .row-info strong { font-size: 13.5px; color: var(--ink-900); }
        .row-info span { font-size: 12px; color: var(--ink-400); }
        .row-actions { display: flex; gap: 10px; }
        .row-actions button { background: none; border: none; font-size: 12.5px; color: var(--maroon-900); }
        .row-actions .danger { color: #a13a3a; }
        .empty { color: var(--ink-400); font-size: 13.5px; }
        @media (max-width: 980px) {
          .cms-layout { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr 1fr 1fr; }
        }
        @media (max-width: 520px) {
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
