import { useEffect, useRef, useState } from 'react';
import { api } from '../../data/api';
import { formatINR } from '../../data/store';
import { compressImageFile } from '../../utils/compressImage';

const emptyForm = { name: '', category: '', price: '', mrp: '', stock: '', description: '', image: '', images: [] };

function stockTone(stock) {
  if (stock === 0) return 'stock-out';
  if (stock <= 5) return 'stock-low';
  return 'stock-ok';
}

function stockLabel(stock) {
  if (stock === 0) return 'Out of stock';
  if (stock <= 5) return `Low stock · ${stock} left`;
  return `${stock} in stock`;
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const fileInput = useRef(null);
  const galleryInput = useRef(null);
  const [galleryBusy, setGalleryBusy] = useState(false);

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
    compressImageFile(file).then((dataUrl) => setForm((f) => ({ ...f, image: dataUrl })));
  }

  async function handleGalleryFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGalleryBusy(true);
    try {
      const added = await Promise.all(files.map((f) => compressImageFile(f)));
      setForm((f) => ({ ...f, images: [...(f.images || []), ...added] }));
    } finally {
      setGalleryBusy(false);
      e.target.value = '';
    }
  }

  function removeGalleryImage(i) {
    setForm((f) => ({ ...f, images: (f.images || []).filter((_, idx) => idx !== i) }));
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
      images: form.images || [],
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
      images: product.images || [],
    });
    setEditingId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const stockNum = form.stock === '' ? null : Number(form.stock) || 0;

  return (
    <div>
      <div className="admin-page-head">
        <h1>Products</h1>
        <p>Add sarees to a category, set price, MRP and stock. Set stock to 0 to intentionally mark a product out of stock.</p>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="cms-layout">
        <form className="cms-form" onSubmit={handleSubmit}>
          <h3>{editingId ? 'Edit product' : 'Add a product'}</h3>

          <div className="form-section">
            <p className="section-label">Basic details</p>
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

            <label>
              Description
              <textarea
                rows="3"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Weave, colour, occasion..."
              />
            </label>
          </div>

          <div className="form-section">
            <p className="section-label">Pricing &amp; inventory</p>
            <div className="form-row">
              <label>
                Price (₹)
                <input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
              </label>
              <label>
                MRP (₹)
                <input type="number" min="0" value={form.mrp} placeholder="Same as price if blank" onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))} />
                <span className="field-hint">Shown crossed out next to the price. Leave blank to hide the discount.</span>
              </label>
            </div>

            <label>
              Stock <span className="required-mark">*</span>
              <input
                type="number"
                min="0"
                value={form.stock}
                placeholder="e.g. 25"
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                required
              />
            </label>
            {stockNum === 0 && (
              <p className="stock-warning">
                Stock is set to 0 — this product will show as <strong>Out of Stock</strong> on the site the moment you save it. Enter the actual quantity available if that's not intended.
              </p>
            )}
          </div>

          <div className="form-section">
            <p className="section-label">Photos</p>
            <label>
              Main photo
              <input type="file" accept="image/*" ref={fileInput} onChange={handleImage} />
            </label>

            {form.image && (
              <div className="preview-thumb">
                <img src={form.image} alt="Preview" />
              </div>
            )}

            <label>
              Gallery photos
              <span className="field-hint">Extra angles or close-ups shown as thumbnails on the product page. Any size works — they're cropped to fit.</span>
            </label>

            {form.images?.length > 0 && (
              <div className="gallery-grid">
                {form.images.map((src, i) => (
                  <div className="gallery-thumb" key={i}>
                    <img src={src} alt="" />
                    <button type="button" className="gallery-remove" onClick={() => removeGalleryImage(i)} aria-label="Remove image">×</button>
                  </div>
                ))}
              </div>
            )}

            <button type="button" className="btn btn-outline" disabled={galleryBusy} onClick={() => galleryInput.current?.click()}>
              {galleryBusy ? 'Uploading…' : '+ Add gallery photo'}
            </button>
            <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={handleGalleryFiles} />
          </div>

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
          {products.map((p) => {
            const hasDiscount = p.mrp > p.price;
            const discountPct = hasDiscount ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
            return (
              <div className="cms-row" key={p.id}>
                <img src={p.image} alt="" className="row-thumb-sq" />
                <div className="row-info">
                  <strong>{p.name}</strong>
                  <span className="row-category">{categoryName(p.category)}</span>
                  <span className="row-price-line">
                    <span className="row-price">{formatINR(p.price)}</span>
                    {hasDiscount && (
                      <>
                        <span className="row-mrp">{formatINR(p.mrp)}</span>
                        <span className="row-discount">{discountPct}% off</span>
                      </>
                    )}
                  </span>
                </div>
                <span className={`stock-badge ${stockTone(p.stock)}`}>{stockLabel(p.stock)}</span>
                <div className="row-actions">
                  <button onClick={() => handleEdit(p)}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="danger">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .admin-page-head { margin-bottom: 30px; }
        .admin-page-head h1 { font-size: 26px; margin-bottom: 8px; }
        .admin-page-head p { font-size: 13px; color: var(--ink-400); max-width: 560px; line-height: 1.6; }
        .admin-error { font-size: 12.5px; color: #a13a3a; margin-bottom: 16px; }

        .cms-layout {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 28px;
          align-items: flex-start;
        }
        .cms-form {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 26px;
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .cms-form h3 { font-family: var(--font-display); font-size: 18px; color: var(--maroon-900); margin: 0; }

        .form-section { display: flex; flex-direction: column; gap: 14px; padding-top: 18px; border-top: 1px solid var(--stone-100); }
        .form-section:first-of-type { padding-top: 0; border-top: none; }
        .section-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--maroon-700, var(--maroon-900));
          margin: 0;
        }

        .cms-form label { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--ink-600); }
        .required-mark { color: #a13a3a; }
        .cms-form input, .cms-form select, .cms-form textarea {
          padding: 11px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          font-family: var(--font-body);
          font-size: 13.5px;
          background: var(--paper);
        }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .field-hint { font-size: 11.5px; color: var(--ink-400); line-height: 1.6; }
        .stock-warning {
          font-size: 11.5px;
          color: #8a5a10;
          background: #fbeacb;
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          line-height: 1.6;
          margin: 0;
        }

        .preview-thumb { width: 72px; height: 72px; border-radius: var(--radius-sm); overflow: hidden; }
        .preview-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .gallery-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .gallery-thumb {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--stone-200);
          background: var(--stone-100);
        }
        .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .gallery-remove {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          color: #fff;
          border: none;
          font-size: 11px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .form-actions { display: flex; gap: 10px; }
        .form-actions .btn { padding: 11px 20px; font-size: 13px; }

        .cms-list { display: flex; flex-direction: column; gap: 10px; }
        .cms-row {
          background: var(--paper);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .row-thumb-sq { width: 52px; height: 52px; border-radius: var(--radius-sm); object-fit: cover; flex: 0 0 auto; }
        .row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .row-info strong { font-size: 13.5px; color: var(--ink-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .row-category { font-size: 11.5px; color: var(--ink-400); }
        .row-price-line { display: flex; align-items: baseline; gap: 8px; }
        .row-price { font-size: 13px; font-weight: 600; color: var(--maroon-900); }
        .row-mrp { font-size: 11.5px; color: var(--ink-400); text-decoration: line-through; }
        .row-discount { font-size: 11px; color: #3c7a3c; font-weight: 600; }

        .stock-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 5px 11px;
          border-radius: 999px;
          white-space: nowrap;
          flex: 0 0 auto;
        }
        .stock-ok { background: #e8f2e6; color: #3c7a3c; }
        .stock-low { background: #fbeacb; color: #8a5a10; }
        .stock-out { background: #f6e3e3; color: #a13a3a; }

        .row-actions { display: flex; gap: 10px; flex: 0 0 auto; }
        .row-actions button { background: none; border: none; font-size: 12.5px; color: var(--maroon-900); }
        .row-actions .danger { color: #a13a3a; }
        .empty { color: var(--ink-400); font-size: 13.5px; }
        @media (max-width: 980px) {
          .cms-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .form-row { grid-template-columns: 1fr; }
          .cms-row { flex-wrap: wrap; }
          .row-info { flex-basis: 100%; order: 1; }
          .row-thumb-sq { order: 0; }
          .stock-badge { order: 2; }
          .row-actions { order: 3; margin-left: auto; }
        }
      `}</style>
    </div>
  );
}
