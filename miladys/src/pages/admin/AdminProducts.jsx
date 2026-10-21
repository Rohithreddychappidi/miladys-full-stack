import { useEffect, useRef, useState } from 'react';
import { api } from '../../data/api';
import { formatINR } from '../../data/store';
import { compressImageFile } from '../../utils/compressImage';
import { thumbUrl } from '../../utils/images';

const emptyForm = { name: '', category: '', price: '', mrp: '', discountPercent: '', stock: '', description: '', image: '', images: [], colors: [], active: true };

const SAREE_COLOR_PRESETS = [
  { name: 'Maroon', hex: '#48181e' },
  { name: 'Ruby Red', hex: '#9b111e' },
  { name: 'Rani Pink', hex: '#db2777' },
  { name: 'Peacock Blue', hex: '#005f73' },
  { name: 'Royal Blue', hex: '#1e3a8a' },
  { name: 'Bottle Green', hex: '#0f5132' },
  { name: 'Mustard Gold', hex: '#d97706' },
  { name: 'Plum Wine', hex: '#581c87' },
  { name: 'Jet Black', hex: '#1a1a1a' },
  { name: 'Ivory Cream', hex: '#fdfbf7' },
];

// Keeps MRP / discount % / price in sync with each other, whichever one the
// admin actually typed into. Rounds to whole rupees since that's what the
// rest of the site displays.
function discountFromPrices(mrp, price) {
  const m = Number(mrp);
  const p = Number(price);
  if (!m || !p || p >= m) return '';
  return Math.round(((m - p) / m) * 100);
}

function priceFromDiscount(mrp, discountPercent) {
  const m = Number(mrp);
  if (!m || discountPercent === '' || discountPercent === null || discountPercent === undefined) return '';
  const pct = Number(discountPercent);
  if (Number.isNaN(pct)) return '';
  return Math.max(0, Math.round(m * (1 - pct / 100)));
}

function mrpFromDiscount(price, discountPercent) {
  const p = Number(price);
  if (!p || discountPercent === '' || discountPercent === null || discountPercent === undefined) return '';
  const pct = Number(discountPercent);
  if (Number.isNaN(pct) || pct >= 100) return '';
  return Math.round(p / (1 - pct / 100));
}

// Product photos are kept large enough for the fabric zoom on the product
// page; the server makes the small thumbnails itself.
const PRODUCT_PHOTO = { maxDimension: 2400, quality: 0.85 };

const MATCH_REASON = {
  'same name': 'Same name',
  'same photo': 'Same photo',
  'similar name': 'Similar name',
};

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
  const [movingId, setMovingId] = useState(null);
  const [uploading, setUploading] = useState(0); // photos still being uploaded
  const [similar, setSimilar] = useState([]); // possible duplicates of what's being typed
  // When editing: whether the full product (gallery + colours) loaded. If it
  // didn't, those fields are left out of the save so they can't be wiped.
  const [galleryLoaded, setGalleryLoaded] = useState(true);
  const [listQuery, setListQuery] = useState('');
  const [listCategory, setListCategory] = useState('');
  // ?stock=out / low lets the dashboard link straight to a filtered list.
  const [listStock, setListStock] = useState(() => new URLSearchParams(window.location.search).get('stock') || '');

  useEffect(() => {
    refresh();
    api.getCategories().then(({ categories }) => setCategories(categories)).catch((err) => setError(err.message));
  }, []);

  function refresh() {
    // The admin list needs to see hidden products too (to unhide them),
    // unlike the public storefront endpoint used everywhere else.
    api.getAllProductsAdmin().then(({ products }) => setProducts(products)).catch((err) => setError(err.message));
  }

  // Resizes a picked photo and uploads it straight away, returning its
  // image URL — so saving the product sends a few short URLs instead of
  // megabytes of photo data. If the upload itself fails, the resized photo
  // is kept inline and the server converts it on save instead.
  async function uploadPhoto(file) {
    setUploading((n) => n + 1);
    try {
      const dataUrl = await compressImageFile(file, PRODUCT_PHOTO);
      try {
        const { url } = await api.uploadImage(dataUrl);
        return url;
      } catch {
        return dataUrl;
      }
    } finally {
      setUploading((n) => n - 1);
    }
  }

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadPhoto(file);
    setForm((f) => ({ ...f, image: url }));
  }

  async function handleGalleryFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGalleryBusy(true);
    try {
      const added = await Promise.all(files.map((f) => uploadPhoto(f)));
      setForm((f) => ({ ...f, images: [...(f.images || []), ...added] }));
    } finally {
      setGalleryBusy(false);
      e.target.value = '';
    }
  }

  function removeGalleryImage(i) {
    setForm((f) => ({ ...f, images: (f.images || []).filter((_, idx) => idx !== i) }));
  }

  function addColorVariant() {
    setForm((f) => ({
      ...f,
      colors: [
        ...(f.colors || []),
        { name: '', hex: '#48181e', image: '', images: [], stock: '' },
      ],
    }));
  }

  function updateColorVariant(idx, patch) {
    setForm((f) => ({
      ...f,
      colors: (f.colors || []).map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  }

  function removeColorVariant(idx) {
    setForm((f) => ({
      ...f,
      colors: (f.colors || []).filter((_, i) => i !== idx),
    }));
  }

  async function handleColorImage(idx, file) {
    if (!file) return;
    const url = await uploadPhoto(file);
    updateColorVariant(idx, { image: url });
  }

  async function handleColorGalleryFiles(idx, files) {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;
    const added = await Promise.all(fileList.map((f) => uploadPhoto(f)));
    setForm((f) => ({
      ...f,
      colors: (f.colors || []).map((c, i) =>
        i === idx ? { ...c, images: [...(c.images || []), ...added] } : c
      ),
    }));
  }

  function removeColorGalleryPhoto(colorIdx, photoIdx) {
    setForm((f) => ({
      ...f,
      colors: (f.colors || []).map((c, i) =>
        i === colorIdx ? { ...c, images: (c.images || []).filter((_, pi) => pi !== photoIdx) } : c
      ),
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setGalleryLoaded(true);
    setSimilar([]);
    pricingEditRef.current = null;
    if (fileInput.current) fileInput.current.value = '';
  }

  // Any two of MRP / Discount % / Price can be filled in, in any order,
  // and the third fills itself in. MRP is the "anchor" when present
  // (matches how pricing displays on the site — MRP struck through next
  // to Price) — but which field gets computed is decided ONCE per typing
  // session in a field, then stuck to for the rest of that session. Without
  // that stickiness, typing a two-digit discount (say "15") would recompute
  // MRP after the first keystroke, and then — because MRP now has a value —
  // the SECOND keystroke would see "MRP is present" and flip to recomputing
  // Price instead, silently overwriting whatever price was typed. Sticking
  // to the same target field for as long as the admin keeps typing in the
  // same box avoids that flip; it only re-decides once they move to a
  // different field.
  const pricingEditRef = useRef(null); // { editing: 'mrp' | 'discountPercent' | 'price', target: string | null }

  function computeField(target, f) {
    if (target === 'price') return priceFromDiscount(f.mrp, f.discountPercent);
    if (target === 'mrp') return mrpFromDiscount(f.price, f.discountPercent);
    if (target === 'discountPercent') return discountFromPrices(f.mrp, f.price);
    return '';
  }

  function handlePricingFieldChange(editing, value) {
    setForm((f) => {
      const next = { ...f, [editing]: value };
      let target;
      if (pricingEditRef.current?.editing === editing) {
        target = pricingEditRef.current.target;
      } else {
        // Freshly decide, based on which of the OTHER two fields already
        // have a value — MRP wins as the anchor when both are candidates.
        if (editing === 'mrp') target = next.discountPercent !== '' ? 'price' : (next.price !== '' ? 'discountPercent' : null);
        else if (editing === 'discountPercent') target = next.mrp !== '' ? 'price' : (next.price !== '' ? 'mrp' : null);
        else target = next.mrp !== '' ? 'discountPercent' : (next.discountPercent !== '' ? 'mrp' : null);
        pricingEditRef.current = { editing, target };
      }
      if (target) {
        const computed = computeField(target, next);
        if (computed !== '') next[target] = computed;
      }
      return next;
    });
  }

  function handleMrpChange(value) {
    handlePricingFieldChange('mrp', value);
  }

  function handleDiscountChange(value) {
    handlePricingFieldChange('discountPercent', value);
  }

  function handlePriceChange(value) {
    handlePricingFieldChange('price', value);
  }

  // Live "this might already exist" check while adding/editing: same or
  // similar name, or the very same cover photo.
  useEffect(() => {
    const name = form.name.trim();
    if (name.length < 3 && !form.image) { setSimilar([]); return undefined; }
    let active = true;
    const timer = setTimeout(() => {
      api.getSimilarProducts({ name, image: form.image, excludeId: editingId })
        .then(({ matches }) => active && setSimilar(matches || []))
        .catch(() => active && setSimilar([]));
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [form.name, form.image, editingId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.category) return;
    if (uploading > 0) return;
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
      colors: form.colors || [],
      active: form.active !== false,
    };
    // Gallery/colours never loaded for this edit — don't overwrite them.
    if (editingId && !galleryLoaded) {
      delete payload.images;
      delete payload.colors;
    }

    try {
      if (editingId) {
        await api.updateProduct(editingId, payload);
      } else {
        try {
          await api.createProduct(payload);
        } catch (err) {
          // The server blocks an exact duplicate (same name or same cover
          // photo) unless we confirm it's intentional.
          if (err.status !== 409) throw err;
          if (!window.confirm(`${err.message}\n\nAdd it anyway as a separate product?`)) return;
          await api.createProduct({ ...payload, allowDuplicate: true });
        }
      }
      resetForm();
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  // Copies a product (details, photos, colours) as a hidden "(Copy)" and
  // opens it for editing — the quick way to add the same design in a new
  // colour or a close variant without re-entering everything.
  async function handleDuplicate(product) {
    setMovingId(product.id);
    try {
      const { product: copy } = await api.duplicateProduct(product.id);
      refresh();
      await handleEdit(copy);
    } catch (err) {
      setError(err.message);
    } finally {
      setMovingId(null);
    }
  }

  // The product list is deliberately fetched without gallery images (see
  // the comment in server/src/routes/products.js) to keep the collection
  // page fast, so `product.images` here is always empty even for products
  // that do have a gallery. Fill the form from the list immediately for a
  // snappy feel, then fetch the single full product (which does include
  // the gallery) and patch that in — otherwise saving after editing even
  // an unrelated field like price would submit `images: []` and silently
  // wipe out the product's existing gallery photos.
  async function handleEdit(product) {
    pricingEditRef.current = null;
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      mrp: product.mrp,
      discountPercent: discountFromPrices(product.mrp, product.price),
      stock: product.stock,
      description: product.description,
      image: product.image,
      images: [],
      colors: Array.isArray(product.colors) ? product.colors : [],
      active: product.active,
    });
    setEditingId(product.id);
    setGalleryLoaded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      // Admin endpoint: works for hidden products too (the public one 404s
      // for them, which used to leave the gallery empty and wipe it on save).
      const { product: full } = await api.getProductAdmin(product.id);
      setForm((f) => ({
        ...f,
        image: full.image || f.image,
        images: f.images.length ? f.images : (full.images || []),
        colors: (f.colors && f.colors.length) ? f.colors : (full.colors || []),
      }));
      setGalleryLoaded(true);
    } catch {
      setError('Could not load this product\'s gallery photos — saving will keep its existing photos unchanged.');
    }
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

  // Quick recategorize straight from the list, for when a product was
  // uploaded under the wrong category — no need to open the full edit
  // form just to fix that one field.
  async function handleMoveCategory(product, newCategoryId) {
    if (!newCategoryId || newCategoryId === product.category) return;
    setMovingId(product.id);
    try {
      await api.updateProduct(product.id, { category: newCategoryId });
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setMovingId(null);
    }
  }

  // Hide/show — an alternative to deleting when a product just shouldn't
  // be on the live site right now (out of season, temporarily unavailable,
  // etc). Hidden products disappear from the storefront (listing, search,
  // category pages, and direct links) but stay fully visible and editable
  // here, and keep their order/review history intact.
  async function handleToggleActive(product) {
    setMovingId(product.id);
    try {
      await api.updateProduct(product.id, { active: !product.active });
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setMovingId(null);
    }
  }

  function categoryName(id) {
    return categories.find((c) => c.id === id)?.name || id;
  }

  const stockNum = form.stock === '' ? null : Number(form.stock) || 0;
  const listQueryLower = listQuery.trim().toLowerCase();
  const stockMatches = (p) => {
    if (listStock === 'out') return p.stock === 0;
    if (listStock === 'low') return p.stock > 0 && p.stock <= 5;
    if (listStock === 'in') return p.stock > 0;
    if (listStock === 'hidden') return p.active === false;
    return true;
  };
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const listedProducts = products.filter((p) =>
    (!listCategory || p.category === listCategory) &&
    stockMatches(p) &&
    (!listQueryLower || p.name.toLowerCase().includes(listQueryLower) || p.id.toLowerCase().includes(listQueryLower)));

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

            {similar.length > 0 && (
              <div className="similar-box" role="status">
                <p className="similar-title">
                  {similar.some((m) => m.reason !== 'similar name') ? 'This product may already exist' : 'Similar products already on the site'}
                </p>
                <div className="similar-list">
                  {similar.map((m) => (
                    <div className={`similar-item ${m.reason !== 'similar name' ? 'is-strong' : ''}`} key={m.id}>
                      <img src={thumbUrl(m.image)} alt="" />
                      <div className="similar-info">
                        <strong>{m.name}</strong>
                        <span>{MATCH_REASON[m.reason] || m.reason} · {categoryName(m.category)}{m.active === false ? ' · Hidden' : ''}</span>
                      </div>
                      {m.id !== editingId && (
                        <button
                          type="button"
                          className="similar-edit"
                          onClick={() => {
                            const existing = products.find((p) => p.id === m.id);
                            if (existing) handleEdit(existing);
                          }}
                        >
                          Edit this
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            <p className="field-hint pricing-hint">Fill in any two of MRP, Discount %, and Price — the third fills itself in.</p>
            <div className="form-row">
              <label>
                MRP (₹)
                <input type="number" min="0" value={form.mrp} placeholder="Original price" onChange={(e) => handleMrpChange(e.target.value)} />
              </label>
              <label>
                Discount %
                <input type="number" min="0" max="99" value={form.discountPercent} placeholder="e.g. 20" onChange={(e) => handleDiscountChange(e.target.value)} />
              </label>
            </div>

            <label>
              Price (₹) <span className="required-mark">*</span>
              <input type="number" min="0" value={form.price} onChange={(e) => handlePriceChange(e.target.value)} required />
            </label>

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

          <label className="visible-toggle">
            <input
              type="checkbox"
              checked={form.active !== false}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            <span>Visible on the store <em>(untick to keep it hidden while you finish it)</em></span>
          </label>

          <div className="form-section">
            <p className="section-label">Photos</p>
            <label>
              Main photo
              <input type="file" accept="image/*" ref={fileInput} onChange={handleImage} />
            </label>

            {form.image && (
              <div className="preview-thumb">
                <img src={thumbUrl(form.image)} alt="Preview" />
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
                    <img src={thumbUrl(src)} alt="" />
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

          <div className="form-section">
            <div className="section-head-row">
              <div>
                <p className="section-label">Color Variants &amp; Separate Photos</p>
                <p className="field-hint">
                  If this saree design comes in multiple colors, add each color here with its own photo set.
                </p>
              </div>
              <button type="button" className="btn btn-outline small-btn" onClick={addColorVariant}>
                + Add Color
              </button>
            </div>

            {(!form.colors || form.colors.length === 0) && (
              <p className="field-hint empty-colors-hint">
                No color variants added. The product will use the main photo above.
              </p>
            )}

            {form.colors?.map((c, idx) => (
              <div className="color-variant-card" key={idx}>
                <div className="variant-card-head">
                  <div className="variant-title">
                    <span className="variant-swatch-badge" style={{ backgroundColor: c.hex || '#48181e' }} />
                    <strong>{c.name || `Color #${idx + 1}`}</strong>
                  </div>
                  <button type="button" className="btn-remove-variant" onClick={() => removeColorVariant(idx)} aria-label="Remove color">
                    ✕ Remove
                  </button>
                </div>

                <div className="form-row">
                  <label>
                    Color name <span className="required-mark">*</span>
                    <input
                      type="text"
                      placeholder="e.g. Royal Blue"
                      value={c.name}
                      onChange={(e) => updateColorVariant(idx, { name: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Color shade (Hex)
                    <div className="color-picker-row">
                      <input
                        type="color"
                        value={c.hex || '#48181e'}
                        onChange={(e) => updateColorVariant(idx, { hex: e.target.value })}
                        className="color-picker-input"
                      />
                      <input
                        type="text"
                        value={c.hex || '#48181e'}
                        onChange={(e) => updateColorVariant(idx, { hex: e.target.value })}
                        placeholder="#48181e"
                        className="color-hex-text"
                      />
                    </div>
                  </label>
                </div>

                <div className="preset-chips">
                  <span className="preset-label">Quick shade:</span>
                  {SAREE_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      className="preset-chip"
                      onClick={() => updateColorVariant(idx, { name: c.name || preset.name, hex: preset.hex })}
                      title={preset.name}
                    >
                      <span className="preset-dot" style={{ backgroundColor: preset.hex }} />
                      {preset.name}
                    </button>
                  ))}
                </div>

                <div className="form-row">
                  <label>
                    Variant stock (optional override)
                    <input
                      type="number"
                      min="0"
                      placeholder="Same as base stock if blank"
                      value={c.stock ?? ''}
                      onChange={(e) => updateColorVariant(idx, { stock: e.target.value })}
                    />
                  </label>
                </div>

                <div className="variant-photos-box">
                  <p className="variant-sub-label">Photos for {c.name || 'this color'}</p>
                  <div className="variant-photos-row">
                    <label className="variant-upload-btn">
                      <span>📸 Set Color Cover Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handleColorImage(idx, e.target.files?.[0])}
                      />
                    </label>
                    <label className="variant-upload-btn">
                      <span>🖼 Add Gallery Photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => handleColorGalleryFiles(idx, e.target.files)}
                      />
                    </label>
                  </div>

                  {c.image && (
                    <div className="variant-cover-preview">
                      <span className="cover-tag">Cover</span>
                      <img src={thumbUrl(c.image)} alt="Color cover" />
                      <button
                        type="button"
                        className="gallery-remove"
                        onClick={() => updateColorVariant(idx, { image: '' })}
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {c.images?.length > 0 && (
                    <div className="gallery-grid" style={{ marginTop: 10 }}>
                      {c.images.map((src, photoIdx) => (
                        <div className="gallery-thumb" key={photoIdx}>
                          <img src={thumbUrl(src)} alt="" />
                          <button
                            type="button"
                            className="gallery-remove"
                            onClick={() => removeColorGalleryPhoto(idx, photoIdx)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={uploading > 0}>
              {uploading > 0 ? `Uploading ${uploading} photo${uploading === 1 ? '' : 's'}…` : editingId ? 'Save Changes' : 'Add Product'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>

        <div className="cms-list">
          <div className="list-filters">
            <input
              type="search"
              placeholder="Search products by name…"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
              aria-label="Search products"
            />
            <select value={listCategory} onChange={(e) => setListCategory(e.target.value)} aria-label="Filter by category">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={listStock} onChange={(e) => setListStock(e.target.value)} aria-label="Filter by stock">
              <option value="">All stock</option>
              <option value="in">In stock</option>
              <option value="low">Low stock (1–5 left)</option>
              <option value="out">Out of stock ({outOfStockCount})</option>
              <option value="hidden">Hidden from site</option>
            </select>
            <span className="list-count">{listedProducts.length} of {products.length}</span>
          </div>
          {products.length === 0 && <p className="empty">No products yet.</p>}
          {products.length > 0 && listedProducts.length === 0 && <p className="empty">No products match this search.</p>}
          {listedProducts.map((p) => {
            const hasDiscount = p.mrp > p.price;
            const discountPct = hasDiscount ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
            return (
              <div className={`cms-row ${p.active === false ? 'is-hidden' : ''}`} key={p.id}>
                <img src={p.thumb || thumbUrl(p.image)} alt="" className="row-thumb-sq" loading="lazy" />
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
                  {Array.isArray(p.colors) && p.colors.length > 0 && (
                    <div className="row-colors-strip">
                      {p.colors.map((c, ci) => (
                        <span
                          key={ci}
                          className="row-color-dot"
                          style={{ backgroundColor: c.hex || '#48181e' }}
                          title={c.name}
                        />
                      ))}
                      <span className="row-colors-count">{p.colors.length} {p.colors.length === 1 ? 'color' : 'colors'}</span>
                    </div>
                  )}
                </div>
                {p.active === false && <span className="hidden-badge">Hidden</span>}
                <span className={`stock-badge ${stockTone(p.stock)}`}>{stockLabel(p.stock)}</span>
                <div className="row-actions">
                  <select
                    className="row-move-select"
                    value={p.category}
                    disabled={movingId === p.id}
                    onChange={(e) => handleMoveCategory(p, e.target.value)}
                    aria-label={`Move ${p.name} to a different category`}
                    title="Move to a different category"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button onClick={() => handleEdit(p)}>Edit</button>
                  <button onClick={() => handleDuplicate(p)} disabled={movingId === p.id} title="Copy this product (photos and colours included) as a hidden draft">
                    Duplicate
                  </button>
                  <button onClick={() => handleToggleActive(p)} disabled={movingId === p.id}>
                    {p.active === false ? 'Show' : 'Hide'}
                  </button>
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

        .similar-box { border: 1px solid #e8c9a8; background: #fdf6ee; border-radius: var(--radius-sm); padding: 10px 12px; }
        .similar-title { font-size: 12px; font-weight: 600; color: #8a4b12; margin: 0 0 8px; }
        .similar-list { display: flex; flex-direction: column; gap: 6px; }
        .similar-item { display: flex; align-items: center; gap: 10px; font-size: 12px; }
        .similar-item img { width: 34px; height: 44px; object-fit: cover; border-radius: 4px; background: var(--stone-100); flex: none; }
        .similar-item.is-strong strong { color: #a13a3a; }
        .similar-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .similar-info strong { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .similar-info span { color: var(--ink-400); font-size: 11px; }
        .similar-edit { font-size: 11.5px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--stone-200); background: var(--paper); cursor: pointer; flex: none; }

        .cms-form label.visible-toggle { flex-direction: row; align-items: center; gap: 10px; font-size: 13px; color: var(--ink-700, var(--ink-600)); }
        .visible-toggle input { width: 16px; height: 16px; padding: 0; }
        .visible-toggle em { color: var(--ink-400); font-style: normal; font-size: 11.5px; }

        .list-filters { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
        .list-filters input, .list-filters select {
          padding: 9px 12px; border-radius: var(--radius-sm); border: 1px solid var(--stone-200);
          font-family: var(--font-body); font-size: 13px; background: var(--paper);
        }
        .list-filters input { flex: 1; min-width: 180px; }
        .list-count { font-size: 12px; color: var(--ink-400); }

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
        .pricing-hint { margin: -4px 0 12px; }

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

        /* min-width: 0 lets the list column shrink to the space it has, and the
           buttons wrap instead of pushing the row past the edge of the page. */
        .cms-list { min-width: 0; }
        .cms-list .row-info { min-width: 170px; }
        .row-actions { display: flex; align-items: center; gap: 4px 10px; flex: 0 1 auto; flex-wrap: wrap; justify-content: flex-end; }
        .row-actions button { background: none; border: none; font-size: 12.5px; color: var(--maroon-900); }
        .row-actions .danger { color: #a13a3a; }
        .cms-row.is-hidden { opacity: 0.55; }
        .hidden-badge {
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--ink-400);
          background: var(--stone-100);
          border-radius: 999px;
          padding: 3px 9px;
          flex: 0 0 auto;
        }
        .row-move-select {
          font-size: 11.5px;
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--stone-200);
          background: var(--paper);
          color: var(--ink-600);
          max-width: 130px;
        }
        .empty { color: var(--ink-400); font-size: 13.5px; }
        @media (max-width: 980px) {
          .cms-layout { grid-template-columns: 1fr; }
        }
        .section-head-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 12px;
        }
        .small-btn { padding: 6px 14px !important; font-size: 12px !important; }
        .empty-colors-hint { font-style: italic; color: var(--ink-400); }
        .color-variant-card {
          background: #faf6f4;
          border: 1px solid var(--stone-200);
          border-radius: var(--radius-sm);
          padding: 14px 16px;
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .variant-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--stone-200);
        }
        .variant-title { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--maroon-900); }
        .variant-swatch-badge {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.15);
          display: inline-block;
        }
        .btn-remove-variant {
          background: none;
          border: none;
          font-size: 11.5px;
          color: #a13a3a;
          cursor: pointer;
        }
        .color-picker-row { display: flex; align-items: center; gap: 8px; }
        .color-picker-input {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          border: 1px solid var(--stone-200);
          padding: 0;
          cursor: pointer;
        }
        .color-hex-text { width: 90px !important; }
        .preset-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 4px 0 8px; }
        .preset-label { font-size: 11px; color: var(--ink-400); }
        .preset-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #fff;
          border: 1px solid var(--stone-200);
          border-radius: 999px;
          font-size: 11px;
          padding: 3px 8px;
          cursor: pointer;
          color: var(--ink-700);
          transition: border-color 0.15s;
        }
        .preset-chip:hover { border-color: var(--maroon-900); }
        .preset-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .variant-photos-box {
          background: #fff;
          border: 1px dashed var(--stone-300);
          border-radius: var(--radius-sm);
          padding: 12px;
          margin-top: 4px;
        }
        .variant-sub-label { font-size: 11.5px; font-weight: 600; color: var(--ink-600); margin-bottom: 8px; }
        .variant-photos-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .variant-upload-btn {
          display: inline-block;
          font-size: 11.5px;
          background: #faf7f5;
          border: 1px solid var(--stone-300);
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          color: var(--maroon-900);
          font-weight: 500;
        }
        .variant-upload-btn:hover { background: #f0eae6; }
        .variant-cover-preview {
          position: relative;
          display: inline-block;
          margin-top: 10px;
          width: 64px;
          height: 72px;
          border-radius: 4px;
          overflow: hidden;
          border: 2px solid var(--maroon-900);
        }
        .variant-cover-preview img { width: 100%; height: 100%; object-fit: cover; }
        .cover-tag {
          position: absolute;
          bottom: 2px;
          left: 2px;
          background: var(--maroon-900);
          color: #fff;
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 2px;
          font-weight: 600;
        }
        .row-colors-strip { display: flex; align-items: center; gap: 4px; margin-top: 3px; }
        .row-color-dot { width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); display: inline-block; }
        .row-colors-count { font-size: 10.5px; color: var(--ink-400); margin-left: 4px; }

        @media (max-width: 640px) {
          .form-row { grid-template-columns: 1fr; }
          .cms-row { flex-wrap: wrap; }
          .row-info { flex-basis: 100%; order: 1; }
          .row-thumb-sq { order: 0; }
          .stock-badge { order: 2; }
          .row-actions { order: 3; margin-left: auto; flex-wrap: wrap; justify-content: flex-end; }
        }
      `}</style>
    </div>
  );
}
