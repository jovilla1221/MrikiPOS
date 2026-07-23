import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  product_id: string;
  variant_id?: string | null;
  nama: string;
  harga: number;
  qty: number;
  diskon_item: number;
  catatan?: string | null;
  stok_tersedia: number;
}

interface CartStore {
  items: CartItem[];
  diskon: number;
  catatan: string | null;

  addItem: (
    product: { id: string; nama: string; harga_jual: number; stok: number },
    qty?: number,
  ) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  setDiskon: (amount: number) => void;
  setCatatan: (note: string) => void;
  clearCart: () => void;

  // Computed (selectors)
  getSubtotal: () => number;
  getGrandTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      diskon: 0,
      catatan: null,

      addItem: (product, qty = 1) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.product_id === product.id);

          if (existingItem) {
            // Check stok
            const newQty = existingItem.qty + qty;
            if (newQty > product.stok) return state; // Abaikan jika lebih dari stok

            return {
              items: state.items.map((i) =>
                i.product_id === product.id ? { ...i, qty: newQty } : i,
              ),
            };
          }

          if (qty > product.stok) return state;

          return {
            items: [
              ...state.items,
              {
                product_id: product.id,
                nama: product.nama,
                harga: product.harga_jual,
                qty,
                diskon_item: 0,
                stok_tersedia: product.stok,
              },
            ],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product_id !== productId),
        }));
      },

      updateQty: (productId, qty) => {
        set((state) => ({
          items: state.items.map((i) => {
            if (i.product_id === productId) {
              // Ensure qty does not exceed stok and is at least 1
              const safeQty = Math.max(1, Math.min(qty, i.stok_tersedia));
              return { ...i, qty: safeQty };
            }
            return i;
          }),
        }));
      },

      setDiskon: (amount) => set({ diskon: amount }),

      setCatatan: (note) => set({ catatan: note }),

      clearCart: () => set({ items: [], diskon: 0, catatan: null }),

      getSubtotal: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + (item.harga - item.diskon_item) * item.qty,
          0,
        );
      },

      getGrandTotal: () => {
        const state = get();
        const subtotal = state.getSubtotal();
        return Math.max(0, subtotal - state.diskon); // Pajak di-set 0 untuk Sprint 1
      },

      getItemCount: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.qty, 0);
      },
    }),
    {
      name: 'mrikipos-cart',
    },
  ),
);
