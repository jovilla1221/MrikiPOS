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

export interface HeldOrder {
  id: string;
  label: string;
  held_at: string;
  items: CartItem[];
  diskon: number;
  catatan: string | null;
}

interface CartStore {
  items: CartItem[];
  diskon: number;
  catatan: string | null;
  heldOrders: HeldOrder[];

  addItem: (
    product: { id: string; nama: string; harga_jual: number; stok: number },
    qty?: number,
  ) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  setDiskon: (amount: number) => void;
  setCatatan: (note: string) => void;
  clearCart: () => void;
  holdCart: () => void;
  resumeHeld: (id: string) => void;
  deleteHeld: (id: string) => void;

  // Computed (selectors)
  getSubtotal: () => number;
  getGrandTotal: () => number;
  getItemCount: () => number;
}

function snapshotOrder(state: {
  items: CartItem[];
  diskon: number;
  catatan: string | null;
}): HeldOrder {
  const now = new Date();
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    label:
      state.catatan?.trim() ||
      `Pesanan ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
    held_at: now.toISOString(),
    items: state.items,
    diskon: state.diskon,
    catatan: state.catatan,
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      diskon: 0,
      catatan: null,
      heldOrders: [],

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

      holdCart: () => {
        set((state) => {
          if (state.items.length === 0) return state;
          return {
            heldOrders: [snapshotOrder(state), ...state.heldOrders],
            items: [],
            diskon: 0,
            catatan: null,
          };
        });
      },

      resumeHeld: (id) => {
        set((state) => {
          const target = state.heldOrders.find((h) => h.id === id);
          if (!target) return state;

          const rest = state.heldOrders.filter((h) => h.id !== id);
          // Keranjang aktif yang belum kosong ikut ditahan agar tidak hilang.
          if (state.items.length > 0) {
            rest.unshift(snapshotOrder(state));
          }

          return {
            heldOrders: rest,
            items: target.items,
            diskon: target.diskon,
            catatan: target.catatan,
          };
        });
      },

      deleteHeld: (id) => {
        set((state) => ({
          heldOrders: state.heldOrders.filter((h) => h.id !== id),
        }));
      },

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
