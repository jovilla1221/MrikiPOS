import * as React from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface ReceiptProps {
  transaction: any; // The created transaction object from API
}

export const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ transaction }, ref) => {
  if (!transaction) return null;

  return (
    <div
      ref={ref}
      className="w-[80mm] bg-white p-4 text-black text-sm print:m-0 print:p-0 print:shadow-none"
      style={{ fontFamily: 'monospace' }}
    >
      {/* Header */}
      <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-2">
        {/* We can use tenant settings here if available, hardcode for now based on seed */}
        <h2 className="font-bold text-lg">MrikiPOS</h2>
        <p className="text-xs">Kasir Digital UMKM</p>
      </div>

      {/* Info */}
      <div className="mb-4 text-xs border-b border-dashed border-gray-400 pb-2">
        <div className="flex justify-between">
          <span>No:</span>
          <span>{transaction.nomor}</span>
        </div>
        <div className="flex justify-between">
          <span>Tgl:</span>
          <span>{formatDate(transaction.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span>Kasir:</span>
          <span>{transaction.kasir?.nama || 'Kasir'}</span>
        </div>
      </div>

      {/* Items */}
      <div className="mb-4 border-b border-dashed border-gray-400 pb-2">
        <table className="w-full text-xs">
          <tbody>
            {transaction.items?.map((item: any) => (
              <React.Fragment key={item.id}>
                <tr>
                  <td colSpan={3} className="font-semibold">
                    {item.nama_produk}
                  </td>
                </tr>
                <tr>
                  <td className="w-1/2">
                    {item.qty} x {formatCurrency(item.harga).replace('Rp', '').trim()}
                  </td>
                  <td className="w-1/4 text-right">
                    {item.diskon_item > 0 && `(-${item.diskon_item})`}
                  </td>
                  <td className="w-1/4 text-right">
                    {formatCurrency(item.subtotal).replace('Rp', '').trim()}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="mb-4 text-xs border-b border-dashed border-gray-400 pb-2 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(transaction.subtotal)}</span>
        </div>
        {transaction.diskon > 0 && (
          <div className="flex justify-between">
            <span>Diskon:</span>
            <span>-{formatCurrency(transaction.diskon)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base mt-2">
          <span>Total:</span>
          <span>{formatCurrency(transaction.grand_total)}</span>
        </div>

        {/* Payments */}
        {transaction.payments?.map((p: any, i: number) => (
          <div key={i} className="flex justify-between mt-2">
            <span>Bayar ({p.metode}):</span>
            <span>{formatCurrency(p.jumlah)}</span>
          </div>
        ))}

        {transaction.kembalian > 0 && (
          <div className="flex justify-between font-bold">
            <span>Kembali:</span>
            <span>{formatCurrency(transaction.kembalian)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs mt-4">
        <p>Terima Kasih Atas Kunjungan Anda!</p>
        <p className="mt-2 text-[10px] text-gray-500">Powered by MrikiPOS</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';
