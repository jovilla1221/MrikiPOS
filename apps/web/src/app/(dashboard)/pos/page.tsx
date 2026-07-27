'use client';

import * as React from 'react';
import { ProductGrid } from '@/components/pos/product-grid';
import { Cart } from '@/components/pos/cart';
import { PaymentDialog } from '@/components/pos/payment-dialog';
import { Receipt } from '@/components/pos/receipt';
import { useCartStore } from '@/stores/cart.store';
import { useCreateTransaction } from '@/hooks/use-transactions';
import { createQrisPayment } from '@/lib/api/payments';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrisChargeResponse } from '@mrikipos/shared-types';
import { toast } from 'sonner';
import { printReceiptElement } from '@/lib/utils/print-receipt';

export default function POSPage() {
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [lastTransaction, setLastTransaction] = React.useState<any>(null);
  const [isProcessingQris, setIsProcessingQris] = React.useState(false);

  const { items, getGrandTotal, clearCart, diskon, catatan } = useCartStore();
  const createMutation = useCreateTransaction();
  const receiptRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        if (items.length > 0 && !isPaymentOpen && !isReceiptOpen) {
          setIsPaymentOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, isPaymentOpen, isReceiptOpen]);

  const handlePayClick = () => {
    setIsPaymentOpen(true);
  };

  const handleConfirmCash = (jumlah: number) => {
    createMutation.mutate(
      {
        items: items.map((i) => ({
          product_id: i.product_id,
          qty: i.qty,
          harga: i.harga,
          diskon_item: i.diskon_item,
          catatan: i.catatan,
        })),
        diskon,
        catatan,
        payments: [{ metode: 'CASH', jumlah }],
      },
      {
        onSuccess: (res) => {
          setLastTransaction(res);
          setIsPaymentOpen(false);
          setIsReceiptOpen(true);
          clearCart();
        },
      },
    );
  };

  const handleConfirmQris = (onQrisCreated: (qrisData: QrisChargeResponse) => void) => {
    setIsProcessingQris(true);
    createMutation.mutate(
      {
        items: items.map((i) => ({
          product_id: i.product_id,
          qty: i.qty,
          harga: i.harga,
          diskon_item: i.diskon_item,
          catatan: i.catatan,
        })),
        diskon,
        catatan,
        payments: [{ metode: 'QRIS', jumlah: getGrandTotal() }],
      },
      {
        onSuccess: async (createdTxn) => {
          try {
            const qrisRes = await createQrisPayment(createdTxn.id);
            if (qrisRes) {
              setLastTransaction(createdTxn);
              onQrisCreated(qrisRes);
            } else {
              toast.error('Kode QRIS gagal dibuat. Transaksi tersimpan, ulangi pembayaran.');
            }
          } catch (err: any) {
            toast.error(
              err?.message || 'Kode QRIS gagal dibuat. Transaksi tersimpan, ulangi pembayaran.',
            );
          } finally {
            setIsProcessingQris(false);
          }
        },
        onError: () => {
          setIsProcessingQris(false);
        },
      },
    );
  };

  const handlePrint = () => {
    if (receiptRef.current) {
      printReceiptElement(receiptRef.current, 58);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 overflow-hidden p-4">
      {/* Kiri: Grid Produk */}
      <div className="flex-1 overflow-hidden">
        <ProductGrid />
      </div>

      {/* Kanan: Keranjang */}
      <div className="w-[400px] shrink-0">
        <Cart onPay={handlePayClick} />
      </div>

      <PaymentDialog
        open={isPaymentOpen}
        onOpenChange={(open) => {
          setIsPaymentOpen(open);
          if (!open && lastTransaction?.status === 'COMPLETED') {
            clearCart();
          }
        }}
        grandTotal={getGrandTotal()}
        onConfirmCash={handleConfirmCash}
        onConfirmQris={handleConfirmQris}
        isLoading={createMutation.isPending || isProcessingQris}
      />

      {/* Print Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Transaksi Berhasil</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4">
            <div className="hidden">
              <Receipt ref={receiptRef} transaction={lastTransaction} />
            </div>
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg font-bold">
                {lastTransaction?.metode_bayar === 'QRIS'
                  ? 'Pembayaran QRIS Lunas'
                  : `Kembalian: ${
                      lastTransaction?.kembalian
                        ? new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                          }).format(lastTransaction.kembalian)
                        : 'Rp 0'
                    }`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>
              Tutup
            </Button>
            <Button onClick={handlePrint}>Cetak Struk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
