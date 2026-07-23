'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { usePaymentStatus, useMockPay } from '@/hooks/use-payments';
import { useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/hooks/use-products';

interface QrisPaymentPanelProps {
  paymentId: string;
  qrString?: string | null;
  qrUrl?: string | null;
  amount: number;
  expiresAt?: string | null;
  onSuccess: (paymentStatus: any) => void;
  onCancel: () => void;
}

export function QrisPaymentPanel({
  paymentId,
  qrString,
  qrUrl,
  amount,
  expiresAt,
  onSuccess,
  onCancel,
}: QrisPaymentPanelProps) {
  const queryClient = useQueryClient();
  const { data: statusRes, isLoading, error } = usePaymentStatus(paymentId);
  const mockPayMutation = useMockPay();

  const paymentStatus = statusRes?.status || 'PENDING';
  const isPaid = paymentStatus === 'PAID';
  const isExpired = paymentStatus === 'EXPIRED';
  const isFailed = paymentStatus === 'FAILED';

  // State timer countdown
  const [timeLeft, setTimeLeft] = React.useState<number>(15 * 60);

  React.useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Handle PAID transition
  React.useEffect(() => {
    if (isPaid && statusRes) {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      onSuccess(statusRes);
    }
  }, [isPaid, statusRes, queryClient, onSuccess]);

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const imageSrc =
    qrUrl ||
    (qrString
      ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrString)}`
      : null);

  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center py-2">
      <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 w-full">
        <p className="text-xs text-slate-500">Total Nominal Pembayaran</p>
        <p className="text-2xl font-bold text-primary">{formatCurrency(amount)}</p>
      </div>

      {isPaid ? (
        <div className="flex flex-col items-center justify-center space-y-2 py-6 text-green-600">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-lg font-bold">Pembayaran QRIS Berhasil!</p>
          <p className="text-xs text-slate-500">Transaksi telah dikonfirmasi oleh sistem.</p>
        </div>
      ) : isExpired || isFailed ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-6 text-red-600">
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-7 h-7 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <p className="text-md font-bold">
            {isExpired ? 'QRIS Telah Kedaluwarsa' : 'Pembayaran Gagal'}
          </p>
          <p className="text-xs text-slate-500">
            {isExpired
              ? 'Waktu pembayaran telah habis. Silakan buat QRIS baru.'
              : 'Pembayaran ditolak atau mengalami kesalahan.'}
          </p>
        </div>
      ) : (
        <>
          <div className="relative flex items-center justify-center p-3 bg-white border-2 border-slate-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-slate-700">
            {imageSrc ? (
              <img src={imageSrc} alt="QRIS Code" className="w-56 h-56 object-contain rounded-lg" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                <span className="text-xs">Memuat kode QRIS...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between w-full text-xs text-slate-500 px-1">
            <div className="flex items-center space-x-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>Menunggu pembayaran...</span>
            </div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Kedaluwarsa dalam:{' '}
              <span className="font-mono text-amber-600 dark:text-amber-400">{timeFormatted}</span>
            </span>
          </div>

          {/* Dev/Testing Helper: Mock Pay button */}
          <div className="pt-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs border-dashed text-slate-500 hover:text-slate-800"
              onClick={() => mockPayMutation.mutate(paymentId)}
              disabled={mockPayMutation.isPending}
            >
              {mockPayMutation.isPending ? 'Simulasi...' : '⚡ Simulasi Bayar Lunas (Dev Mock)'}
            </Button>
          </div>
        </>
      )}

      <div className="pt-3 w-full flex gap-2">
        <Button variant="outline" onClick={onCancel} className="w-full">
          {isPaid ? 'Selesai' : 'Batal'}
        </Button>
      </div>
    </div>
  );
}
