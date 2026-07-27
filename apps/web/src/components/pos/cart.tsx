import * as React from 'react';
import { useCartStore, HeldOrder } from '@/stores/cart.store';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { Trash2, Plus, Minus, Pause } from 'lucide-react';
import { Input } from '@/components/ui/input';

function heldOrderTotal(order: HeldOrder): number {
  const subtotal = order.items.reduce(
    (total, item) => total + (item.harga - item.diskon_item) * item.qty,
    0,
  );
  return Math.max(0, subtotal - order.diskon);
}

interface CartProps {
  onPay: () => void;
}

export function Cart({ onPay }: CartProps) {
  const {
    items,
    removeItem,
    updateQty,
    getSubtotal,
    getGrandTotal,
    clearCart,
    diskon,
    setDiskon,
    catatan,
    setCatatan,
    heldOrders,
    holdCart,
    resumeHeld,
    deleteHeld,
  } = useCartStore();

  const handleDiskonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value.replace(/\D/g, ''));
    setDiskon(val);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4 dark:border-slate-800">
        <h2 className="text-lg font-bold">Pesanan</h2>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Kosongkan
          </Button>
        )}
      </div>

      {/* Held Orders */}
      {heldOrders.length > 0 && (
        <div className="border-b bg-amber-50/60 p-3 dark:border-slate-800 dark:bg-amber-950/20">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Pesanan Ditahan ({heldOrders.length})
          </p>
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {heldOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-900 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {order.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {order.items.length} item · {formatCurrency(heldOrderTotal(order))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => resumeHeld(order.id)}>
                    Lanjutkan
                  </Button>
                  <button
                    onClick={() => deleteHeld(order.id)}
                    className="px-2 text-xs text-red-500 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center text-slate-500">
            <div className="rounded-full bg-slate-100 p-6 dark:bg-slate-800">
              <svg
                className="h-10 w-10 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Keranjang Kosong</p>
              <p className="text-sm">Pilih produk di menu untuk ditambahkan</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="flex gap-3 border-b pb-4 last:border-0 dark:border-slate-800"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100">{item.nama}</h4>
                  <div className="text-sm font-semibold text-primary">
                    {formatCurrency(item.harga)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center rounded-md border dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    <button
                      onClick={() => updateQty(item.product_id, item.qty - 1)}
                      className="flex h-11 w-11 items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <input
                      type="number"
                      className="w-14 text-center text-sm font-medium border-x h-11 outline-none focus:ring-2 focus:ring-primary focus:z-10 bg-transparent"
                      value={item.qty === 0 ? '' : item.qty}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        if (!isNaN(val)) {
                          updateQty(item.product_id, val);
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '' || parseInt(e.target.value) < 1) {
                          updateQty(item.product_id, 1);
                        }
                      }}
                    />
                    <button
                      onClick={() => updateQty(item.product_id, item.qty + 1)}
                      className="flex h-11 w-11 items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex w-full items-center justify-between pl-1">
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Hapus Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.harga * item.qty)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Summary */}
      <div className="border-t bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {formatCurrency(getSubtotal())}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Diskon (Rp)</span>
            <Input
              type="text"
              className="h-8 w-24 text-right"
              value={diskon > 0 ? formatCurrency(diskon).replace('Rp', '').trim() : ''}
              onChange={handleDiskonChange}
              placeholder="0"
            />
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span className="text-slate-900 dark:text-slate-100">Total</span>
            <span className="text-primary">{formatCurrency(getGrandTotal())}</span>
          </div>
          <Input
            placeholder="Catatan pesanan..."
            value={catatan || ''}
            onChange={(e) => setCatatan(e.target.value)}
            className="mt-2"
          />
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="h-12 shrink-0"
              disabled={items.length === 0}
              onClick={holdCart}
              title="Tahan pesanan ini, lanjutkan nanti"
            >
              <Pause className="mr-1 h-4 w-4" />
              Tahan
            </Button>
            <Button
              className="h-12 flex-1 text-lg font-bold"
              disabled={items.length === 0}
              onClick={onPay}
            >
              Bayar Pesanan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
