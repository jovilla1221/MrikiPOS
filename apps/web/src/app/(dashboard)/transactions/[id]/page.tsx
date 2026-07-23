'use client';

import * as React from 'react';
import { useTransaction, useVoidTransaction } from '@/hooks/use-transactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { ArrowLeft, Ban, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TransactionStatus } from '@mrikipos/shared-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const { data: transactionData, isLoading } = useTransaction(id);
  const voidMutation = useVoidTransaction();

  const [isVoidOpen, setIsVoidOpen] = React.useState(false);
  const [pin, setPin] = React.useState('');
  const [alasan, setAlasan] = React.useState('');

  const transaction = transactionData as any;

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Memuat detail transaksi...</div>;
  }

  if (!transaction) {
    return <div className="p-8 text-center text-red-500">Transaksi tidak ditemukan</div>;
  }

  const handleVoid = () => {
    if (!pin || !alasan) return;
    voidMutation.mutate(
      { id, pin, alasan },
      {
        onSuccess: () => {
          setIsVoidOpen(false);
          setPin('');
          setAlasan('');
        },
      },
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return <Badge variant="success">Selesai</Badge>;
      case TransactionStatus.VOIDED:
        return <Badge variant="error">Void</Badge>;
      case TransactionStatus.REFUNDED:
        return <Badge variant="warning">Refund</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Detail Transaksi</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
          {transaction.status === TransactionStatus.COMPLETED && (
            <Button variant="danger" onClick={() => setIsVoidOpen(true)}>
              <Ban className="mr-2 h-4 w-4" /> Void Transaksi
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Info Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-slate-500">No. Transaksi</dt>
                <dd className="mt-1 text-lg font-bold">{transaction.nomor}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Status</dt>
                <dd className="mt-1">{getStatusBadge(transaction.status)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Tanggal</dt>
                <dd className="mt-1">{formatDate(transaction.created_at)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Kasir</dt>
                <dd className="mt-1">{transaction?.kasir?.nama || '-'}</dd>
              </div>
              {transaction.catatan && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-slate-500">Catatan</dt>
                  <dd className="mt-1 text-sm">{transaction.catatan}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(transaction.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Diskon</span>
                <span className="font-medium text-red-500">
                  -{formatCurrency(transaction.diskon)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3 font-bold">
                <span>Total</span>
                <span className="text-lg text-primary">
                  {formatCurrency(transaction.grand_total)}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-dashed">
                <h4 className="text-sm font-bold mb-2">Metode ({transaction.metode_bayar})</h4>
                {transaction.payments?.map((p: any) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-slate-500">{p.metode}</span>
                    <span className="font-medium">{formatCurrency(p.jumlah)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Daftar Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Produk</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Diskon</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items?.map((item: any) => (
                    <tr key={item.id} className="border-b dark:border-slate-700">
                      <td className="px-4 py-3 font-medium">{item.nama_produk}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.harga)}</td>
                      <td className="px-4 py-3 text-center">{item.qty}</td>
                      <td className="px-4 py-3 text-right text-red-500">
                        {item.diskon_item > 0 ? `-${formatCurrency(item.diskon_item)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isVoidOpen} onOpenChange={setIsVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-500">
              Perhatian: Aksi ini akan membatalkan transaksi dan mengembalikan stok. Membutuhkan
              otorisasi (PIN) Owner/Manager.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Alasan Void</label>
              <Input
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Misal: Salah input menu"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PIN Otorisasi</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN Anda"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVoidOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleVoid}
              disabled={!pin || !alasan || voidMutation.isPending}
            >
              {voidMutation.isPending ? 'Memproses...' : 'Konfirmasi Void'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
