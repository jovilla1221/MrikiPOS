'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCurrentShift, useShifts, useOpenShift, useCloseShift } from '@/hooks/use-shifts';
import { formatRupiah } from '@mrikipos/shared-utils';
import { Shift } from '@mrikipos/shared-types';
import {
  Clock,
  PlayCircle,
  StopCircle,
  Wallet,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  User,
} from 'lucide-react';

export default function ShiftsPage() {
  const [isOpenModalOpen, setIsOpenModalOpen] = React.useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = React.useState(false);

  // Open shift form
  const [modalAwal, setModalAwal] = React.useState('');
  const [openCatatan, setOpenCatatan] = React.useState('');

  // Close shift form
  const [kasAktual, setKasAktual] = React.useState('');
  const [closeCatatan, setCloseCatatan] = React.useState('');
  const [formError, setFormError] = React.useState('');

  const {
    data: currentShift,
    isLoading: isLoadingCurrent,
    refetch: refetchCurrent,
  } = useCurrentShift();
  const {
    data: shiftsResponse,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useShifts();

  const openMutation = useOpenShift();
  const closeMutation = useCloseShift();

  const historyShifts = shiftsResponse || [];

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const floatModal = parseFloat(modalAwal);
    if (isNaN(floatModal) || floatModal < 0) {
      setFormError('Modal awal harus berupa angka 0 atau lebih');
      return;
    }

    try {
      await openMutation.mutateAsync({
        modal_awal: floatModal,
        catatan: openCatatan || undefined,
      });
      setIsOpenModalOpen(false);
      setModalAwal('');
      setOpenCatatan('');
      refetchCurrent();
      refetchHistory();
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuka shift');
    }
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const floatKas = parseFloat(kasAktual);
    if (isNaN(floatKas) || floatKas < 0) {
      setFormError('Kas aktual harus berupa angka 0 atau lebih');
      return;
    }

    try {
      await closeMutation.mutateAsync({
        shift_id: currentShift?.id,
        kas_aktual: floatKas,
        catatan: closeCatatan || undefined,
      });
      setIsCloseModalOpen(false);
      setKasAktual('');
      setCloseCatatan('');
      refetchCurrent();
      refetchHistory();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menutup shift');
    }
  };

  // Selisih kas preview calculation
  const perkiraanKas = currentShift?.perkiraan_kas_laci || 0;
  const parsedKasAktual = parseFloat(kasAktual);
  const calculatedSelisih = !isNaN(parsedKasAktual) ? parsedKasAktual - perkiraanKas : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            Shift & Kasir
          </h1>
          <p className="text-sm text-slate-500">
            Kelola sesi kerja kasir, modal awal laci, rekonsiliasi kas aktual, dan riwayat shift.
          </p>
        </div>
      </div>

      {/* Current Shift Banner / Card */}
      <Card className="p-6 border-l-4 border-l-blue-600 bg-gradient-to-r from-blue-50/50 to-white dark:from-slate-900 dark:to-slate-900">
        {isLoadingCurrent ? (
          <div className="flex items-center gap-2 text-slate-400 py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Memuat status shift saat ini...</span>
          </div>
        ) : currentShift ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full">
                  <PlayCircle className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-300"
                    >
                      SHIFT OPEN (AKTIF)
                    </Badge>
                    <span className="text-xs text-slate-400">
                      Dibuka:{' '}
                      {new Date(currentShift.opened_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                    Kasir: {currentShift.user?.nama || 'Anda'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setKasAktual(currentShift.perkiraan_kas_laci.toString());
                  setIsCloseModalOpen(true);
                }}
                variant="danger"
                className="gap-2"
              >
                <StopCircle className="h-4 w-4" />
                <span>Tutup Shift Sekarang</span>
              </Button>
            </div>

            {/* Shift Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 uppercase">Modal Awal</span>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {formatRupiah(currentShift.modal_awal)}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 uppercase">
                  Total Penjualan
                </span>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatRupiah(currentShift.total_penjualan)}
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 uppercase">
                  Total Transaksi
                </span>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {currentShift.total_transaksi} Trx
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500 uppercase">
                  Perkiraan Kas Laci
                </span>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {formatRupiah(currentShift.perkiraan_kas_laci)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-full">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Anda Belum Membuka Shift
                </p>
                <p className="text-xs text-slate-500">
                  Buka shift kasir terlebih dahulu untuk mencatat modal awal laci dan melacak
                  rekonsiliasi kas.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsOpenModalOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <PlayCircle className="h-4 w-4" />
              <span>Buka Shift Baru</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Shift History Header */}
      <div className="flex items-center justify-between mt-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Riwayat Shift Kasir
        </h2>
      </div>

      {/* History Table */}
      <Card>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Memuat riwayat shift...</span>
          </div>
        ) : historyShifts.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <p className="font-semibold text-lg">Belum Ada Riwayat Shift</p>
            <p className="text-sm text-slate-400 mt-1">
              Buka shift pertama Anda untuk mulai mencatat riwayat
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Kasir</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Waktu Buka</th>
                  <th className="px-4 py-3">Waktu Tutup</th>
                  <th className="px-4 py-3 text-right">Modal Awal</th>
                  <th className="px-4 py-3 text-right">Total Penjualan</th>
                  <th className="px-4 py-3 text-right">Kas Aktual</th>
                  <th className="px-4 py-3 text-right">Selisih Kas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {historyShifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {s.user?.nama || 'Kasir'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.status === 'OPEN' ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          OPEN
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-700 border-slate-300"
                        >
                          CLOSED
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {new Date(s.opened_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {s.closed_at
                        ? new Date(s.closed_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                      {formatRupiah(s.modal_awal)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(s.total_penjualan)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">
                      {s.kas_aktual !== null && s.kas_aktual !== undefined
                        ? formatRupiah(s.kas_aktual)
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {s.selisih_kas !== null && s.selisih_kas !== undefined ? (
                        <span
                          className={
                            s.selisih_kas === 0
                              ? 'text-slate-600'
                              : s.selisih_kas > 0
                                ? 'text-emerald-600'
                                : 'text-red-600'
                          }
                        >
                          {s.selisih_kas > 0
                            ? `+${formatRupiah(s.selisih_kas)}`
                            : formatRupiah(s.selisih_kas)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dialog Buka Shift */}
      <Dialog open={isOpenModalOpen} onOpenChange={setIsOpenModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buka Shift Kasir Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOpenShiftSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg dark:bg-red-950/50 dark:text-red-400">
                {formError}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modal Awal di Laci (Rp) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                required
                placeholder="Contoh: 100000"
                value={modalAwal}
                onChange={(e) => setModalAwal(e.target.value)}
                className="mt-1"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Uang kembalian yang disiapkan di dalam laci uang sebelum jualan.
              </span>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Shift (Opsional)
              </label>
              <Input
                placeholder="Catatan kondisi awal laci/kasir..."
                value={openCatatan}
                onChange={(e) => setOpenCatatan(e.target.value)}
                className="mt-1"
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsOpenModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={openMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {openMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Buka Shift
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Tutup Shift */}
      <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup Shift & Rekonsiliasi Kas</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg dark:bg-red-950/50 dark:text-red-400">
                {formError}
              </div>
            )}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Modal Awal:</span>
                <span className="font-semibold">{formatRupiah(currentShift?.modal_awal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Penjualan Tunai (Cash):</span>
                <span className="font-semibold text-emerald-600">
                  {formatRupiah(currentShift?.total_cash || 0)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Perkiraan Kas Laci:
                </span>
                <span className="font-bold text-purple-600">{formatRupiah(perkiraanKas)}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kas Aktual di Laci (Rp) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                required
                value={kasAktual}
                onChange={(e) => setKasAktual(e.target.value)}
                className="mt-1 font-bold text-slate-900 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Hitung fisik total uang tunai yang ada di dalam laci kasir saat ini.
              </span>
            </div>

            {/* Calculated Selisih */}
            {!isNaN(parsedKasAktual) && (
              <div className="p-3 border rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-600">Selisih Kas:</span>
                <span
                  className={`font-bold ${
                    calculatedSelisih === 0
                      ? 'text-slate-700'
                      : calculatedSelisih > 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                  }`}
                >
                  {calculatedSelisih === 0
                    ? 'Pas (Rp 0)'
                    : calculatedSelisih > 0
                      ? `Surplus +${formatRupiah(calculatedSelisih)}`
                      : `Minus ${formatRupiah(calculatedSelisih)}`}
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Penutupan
              </label>
              <Input
                placeholder="Catatan jika ada selisih kas..."
                value={closeCatatan}
                onChange={(e) => setCloseCatatan(e.target.value)}
                className="mt-1"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCloseModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={closeMutation.isPending} variant="danger">
                {closeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Tutup Shift
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
