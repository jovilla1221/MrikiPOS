import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { Input } from '@/components/ui/input';
import { useCreateQrisPayment } from '@/hooks/use-payments';
import { QrisPaymentPanel } from './qris-payment-panel';
import { QrisChargeResponse } from '@mrikipos/shared-types';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grandTotal: number;
  onConfirmCash: (jumlah: number) => void;
  onConfirmQris: (onSuccess: (qrisData: QrisChargeResponse) => void) => void;
  isLoading?: boolean;
}

const UANG_PAS = [50000, 100000, 150000, 200000];

export function PaymentDialog({
  open,
  onOpenChange,
  grandTotal,
  onConfirmCash,
  onConfirmQris,
  isLoading,
}: PaymentDialogProps) {
  const [metode, setMetode] = React.useState<'CASH' | 'QRIS'>('CASH');
  const [jumlah, setJumlah] = React.useState(grandTotal);
  const [offlineError, setOfflineError] = React.useState(false);
  const [activeQris, setActiveQris] = React.useState<QrisChargeResponse | null>(null);

  const createQrisMutation = useCreateQrisPayment();

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setJumlah(grandTotal);
      setMetode('CASH');
      setOfflineError(false);
      setActiveQris(null);
    }
  }, [open, grandTotal]);

  const handleJumlahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value.replace(/\D/g, ''));
    setJumlah(val);
  };

  const handleMetodeSelect = (selected: 'CASH' | 'QRIS') => {
    setOfflineError(false);
    if (selected === 'QRIS') {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        setOfflineError(true);
      }
      setMetode('QRIS');
      setJumlah(grandTotal);
    } else {
      setMetode('CASH');
    }
  };

  const handleProcessPayment = () => {
    if (metode === 'CASH') {
      onConfirmCash(jumlah);
    } else if (metode === 'QRIS') {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        setOfflineError(true);
        return;
      }
      onConfirmQris((qrisData) => {
        setActiveQris(qrisData);
      });
    }
  };

  const kembalian = Math.max(0, jumlah - grandTotal);
  const kurang = Math.max(0, grandTotal - jumlah);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{activeQris ? 'Pembayaran QRIS' : 'Pembayaran POS'}</DialogTitle>
        </DialogHeader>

        {activeQris ? (
          <QrisPaymentPanel
            paymentId={activeQris.payment_id}
            qrString={activeQris.qr_string}
            qrUrl={activeQris.qr_url}
            amount={activeQris.amount || grandTotal}
            expiresAt={activeQris.expires_at}
            onSuccess={() => {
              onOpenChange(false);
            }}
            onCancel={() => {
              setActiveQris(null);
              onOpenChange(false);
            }}
          />
        ) : (
          <>
            <div className="grid gap-6 py-2">
              <div className="rounded-lg bg-slate-100 p-4 text-center dark:bg-slate-800">
                <p className="text-xs text-slate-500">Total Tagihan</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Metode Pembayaran</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={metode === 'CASH' ? 'primary' : 'outline'}
                    onClick={() => handleMetodeSelect('CASH')}
                    className="w-full"
                  >
                    💵 Tunai (Cash)
                  </Button>
                  <Button
                    variant={metode === 'QRIS' ? 'primary' : 'outline'}
                    onClick={() => handleMetodeSelect('QRIS')}
                    className="w-full"
                  >
                    📱 QRIS
                  </Button>
                </div>
              </div>

              {offlineError && (
                <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  ⚠️ <strong>QRIS tidak dapat digunakan saat offline.</strong> Silakan hubungkan
                  internet Anda atau gunakan pembayaran Tunai.
                </div>
              )}

              {metode === 'CASH' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Uang Diterima</label>
                  <Input
                    type="text"
                    value={formatCurrency(jumlah).replace('Rp', '').trim()}
                    onChange={handleJumlahChange}
                    className="text-right text-lg font-bold"
                  />

                  {/* Quick Cash Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setJumlah(grandTotal)}>
                      Uang Pas
                    </Button>
                    {UANG_PAS.filter((u) => u > grandTotal)
                      .slice(0, 5)
                      .map((u) => (
                        <Button key={u} variant="outline" size="sm" onClick={() => setJumlah(u)}>
                          {formatCurrency(u).replace('Rp', '').trim()}
                        </Button>
                      ))}
                  </div>

                  {kembalian > 0 && (
                    <div className="mt-4 rounded-md bg-green-50 p-3 text-center dark:bg-green-900/20">
                      <p className="text-xs text-green-700 dark:text-green-400">Kembalian</p>
                      <p className="text-xl font-bold text-green-700 dark:text-green-400">
                        {formatCurrency(kembalian)}
                      </p>
                    </div>
                  )}
                  {kurang > 0 && (
                    <div className="mt-4 rounded-md bg-red-50 p-3 text-center dark:bg-red-900/20">
                      <p className="text-xs text-red-700 dark:text-red-400">Uang Kurang</p>
                      <p className="text-xl font-bold text-red-700 dark:text-red-400">
                        {formatCurrency(kurang)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Batal
              </Button>
              <Button
                onClick={handleProcessPayment}
                disabled={
                  (metode === 'CASH' && jumlah < grandTotal) ||
                  isLoading ||
                  (metode === 'QRIS' && offlineError)
                }
              >
                {isLoading ? 'Memproses...' : metode === 'QRIS' ? 'Buat QRIS' : 'Proses Pembayaran'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
