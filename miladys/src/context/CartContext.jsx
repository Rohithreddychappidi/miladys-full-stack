import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCart, saveCart } from '../data/store';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(getCart());
  }, []);

  function getItemKey(item) {
    return item.key || (item.color ? `${item.id}__${item.color}` : item.id);
  }

  function addItem(product, qty = 1, color = null, image = null) {
    const chosenColor = color || product.selectedColor || null;
    const chosenImage = image || product.selectedImage || product.image;
    const itemKey = chosenColor ? `${product.id}__${chosenColor}` : product.id;

    setItems((prev) => {
      const existing = prev.find((i) => getItemKey(i) === itemKey);
      const next = existing
        ? prev.map((i) => (getItemKey(i) === itemKey ? { ...i, qty: i.qty + qty } : i))
        : [
            ...prev,
            {
              key: itemKey,
              id: product.id,
              name: product.name,
              price: product.price,
              image: chosenImage,
              color: chosenColor,
              qty,
            },
          ];
      saveCart(next);
      return next;
    });
  }

  function updateQty(keyOrId, qty) {
    setItems((prev) => {
      const next = qty <= 0
        ? prev.filter((i) => getItemKey(i) !== keyOrId && i.id !== keyOrId)
        : prev.map((i) => (getItemKey(i) === keyOrId || i.id === keyOrId ? { ...i, qty } : i));
      saveCart(next);
      return next;
    });
  }

  function removeItem(keyOrId) {
    setItems((prev) => {
      const next = prev.filter((i) => getItemKey(i) !== keyOrId && i.id !== keyOrId);
      saveCart(next);
      return next;
    });
  }

  // Update one line's details (e.g. today's price) without touching qty.
  function updateItem(keyOrId, patch) {
    setItems((prev) => {
      const next = prev.map((i) => (getItemKey(i) === keyOrId || i.id === keyOrId ? { ...i, ...patch } : i));
      saveCart(next);
      return next;
    });
  }

  function clearCart() {
    setItems([]);
    saveCart([]);
  }

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.qty * i.price, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, updateItem, removeItem, clearCart, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
