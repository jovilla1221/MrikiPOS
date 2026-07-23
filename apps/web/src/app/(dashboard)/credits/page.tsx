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
import {
  useCredits,
  useCreditSummary,
  useCreateCredit,
  usePayCredit,
  useRemindCredit,
} from '@/hooks/use-credits';
import { useCustomers } from '@/hooks/use-customers';
import { formatRupiah } from '@mrikipos/shared-utils';
import { CustomerCredit } from '@mrikipos/shared-types';
import {
  CreditCard,
  Plus,
  Send,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  User,
  Calendar,
} from 'lucide-react';

export default function CreditsPage() {
  const [selectedStatus, setSelectedStatus] = React.useState<string>('');
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [payingCredit, setPayingCredit] = React.useState<CustomerCredit | null>(null);
  const [remindMsg, setRemindMsg] = React.useState<{
    id: string;
    text: string;
    success: boolean;
  } | null>(null);

  // Form state - Add Kasbon
  const [customerId, setCustomerId] = React.useState('');
  const [jumlah, setJumlah] = React.useState('');
  const [keterangan, setKeterangan] = React.useState('');
  const [jatuhTempo, setJatuhTempo] = React.useState('');

  // Form state - Pay Kasbon
  const [jumlahBayar, setJumlahBayar] = React.useState('');
  const [catatanBayar, setCatatanBayar] = React.useState('');
  const [formError, setFormError] = React.useState('');

  const {
    data: credits = [],
    isLoading,
    refetch,
  } = useCredits({
    status: selectedStatus || undefined,
  });
  const { data: summary } = useCreditSummary();
  const { data: customers = [] } = useCustomers({ limit: 100 });

  const createMutation = useCreateCredit();
  const payMutation = usePayCredit();
  const remindMutation = useRemindCredit();

  const handleOpenAdd = () => {
    setCustomerId('');
    setJumlah('');
    setKeterangan('');
    setJatuhTempo('');
    setFormError('');
    setIsAddOpen(true);
  };

  const handleOpenPay = (credit: CustomerCredit) => {
    setPayingCredit(credit);
    setJumlahBayar(credit.sisa.toString());
    setCatatanBayar('');
    setFormError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!customerId) {
      setFormError('Pilih pelanggan terlebih dahulu');
      return;
    }
    const amount = parseFloat(jumlah);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Jumlah kasbon harus lebih besar dari 0');
      return;
    }

    try {
      await createMutation.mutateAsync({
        customer_id: customerId,
        jumlah: amount,
        keterangan: keterangan || undefined,
        jatuh_tempo: jatuhTempo || undefined,
      });
      setIsAddOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err.message || 'Gagal mencatat kasbon');
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCredit) return;
    setFormError('');

    const payAmt = parseFloat(jumlahBayar);
    if (isNaN(payAmt) || payAmt <= 0) {
      setFormError('Jumlah bayar harus lebih dari 0');
      return;
    }
    if (payAmt > payingCredit.sisa) {
      setFormError(`Jumlah bayar tidak boleh melebihi sisa (${formatRupiah(payingCredit.sisa)})`);
      return;
    }

    try {
      await payMutation.mutateAsync({
        id: payingCredit.id,
        payload: {
          jumlah_bayar: payAmt,
          catatan: catatanBayar || undefined,
        },
      });
      setPayingCredit(null);
      refetch();
    } catch (err: any) {
      setFormError(err.message || 'Gagal memproses pembayaran kasbon');
    }
  };

  const handleRemind = async (credit: CustomerCredit) => {
    try {
      const res = await remindMutation.mutateAsync(credit.id);
      setRemindMsg({
        id: credit.id,
        text: res.message || 'Pengingat WhatsApp berhasil dikirim',
        success: res.sent !== false,
      });
      setTimeout(() => setRemindMsg(null), 4000);
    } catch (err: any) {
      setRemindMsg({
        id: credit.id,
        text: err.message || 'Gagal mengirim pengingat',
        success: false,
      });
      setTimeout(() => setRemindMsg(null), 4000);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Lunas
          </Badge>
        );
      case 'PARTIAL':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Dibayar Sebagian
          </Badge>
        );
      case 'OVERDUE':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Jatuh Tempo
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Belum Lunas
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-purple-600" />
            Kelola Kasbon (Piutang)
          </h1>
          <p className="text-sm text-slate-500">
            Catat dan pantau piutang pelanggan, pembayaran cicilan, serta pengingat tagihan.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4" />
          <span>Catat Kasbon Baru</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-purple-500 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Sisa Piutang</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatRupiah(summary?.total_sisa || 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg text-purple-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Belum Lunas</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {summary?.count_unpaid || 0} Trx
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Dicicil (Partial)</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {summary?.count_partial || 0} Trx
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-blue-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-red-500 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Lewat Jatuh Tempo</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {summary?.count_overdue || 0} Tagihan
              </p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Semua Status', value: '' },
            { label: 'Belum Lunas', value: 'UNPAID' },
            { label: 'Dicicil', value: 'PARTIAL' },
            { label: 'Jatuh Tempo', value: 'OVERDUE' },
            { label: 'Lunas', value: 'PAID' },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={selectedStatus === tab.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(tab.value)}
              className={selectedStatus === tab.value ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Memuat data kasbon...</span>
          </div>
        ) : credits.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <p className="font-semibold text-lg">Tidak Ada Data Kasbon</p>
            <p className="text-sm text-slate-400 mt-1">
              Tidak ada catatan kasbon untuk filter yang dipilih
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3 text-right">Jumlah Awal</th>
                  <th className="px-4 py-3 text-right">Sisa Kasbon</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Jatuh Tempo</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {credits.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.customer?.nama || 'Pelanggan N/A'}
                      </div>
                      <div className="text-xs text-slate-400">{item.customer?.phone || '-'}</div>
                      {item.keterangan && (
                        <div className="text-xs text-slate-500 italic mt-0.5">
                          {item.keterangan}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                      {formatRupiah(item.jumlah)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-purple-700 dark:text-purple-400">
                      {formatRupiah(item.sisa)}
                    </td>
                    <td className="px-4 py-3 text-center">{renderStatusBadge(item.status)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                      {item.jatuh_tempo ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(item.jatuh_tempo).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.status !== 'PAID' && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPay(item)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8"
                          >
                            Bayar
                          </Button>
                        )}
                        {item.status !== 'PAID' && item.customer?.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemind(item)}
                            disabled={remindMutation.isPending}
                            className="text-xs h-8 gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            title="Kirim WA Pengingat"
                          >
                            <Send className="h-3 w-3" />
                            <span>WA</span>
                          </Button>
                        )}
                      </div>
                      {remindMsg?.id === item.id && (
                        <div
                          className={`text-[10px] mt-1 font-medium ${
                            remindMsg.success ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {remindMsg.text}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dialog Catat Kasbon Baru */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Kasbon Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg dark:bg-red-950/50 dark:text-red-400">
                {formError}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih Pelanggan <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm"
              >
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jumlah Kasbon (Rp) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                required
                placeholder="Contoh: 50000"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Keterangan / Catatan Barang
              </label>
              <Input
                placeholder="Contoh: Kasbon beras 5kg + minyak 1L"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tanggal Jatuh Tempo (Opsional)
              </label>
              <Input
                type="date"
                value={jatuhTempo}
                onChange={(e) => setJatuhTempo(e.target.value)}
                className="mt-1"
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan Kasbon
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Bayar Kasbon */}
      <Dialog open={!!payingCredit} onOpenChange={() => setPayingCredit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran Kasbon</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePay} className="space-y-4">
            {formError && (
              <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg dark:bg-red-950/50 dark:text-red-400">
                {formError}
              </div>
            )}
            <div className="p-3 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-sm">
              <p className="text-xs text-slate-500">Pelanggan</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {payingCredit?.customer?.nama}
              </p>
              <p className="text-xs text-slate-500 mt-2">Sisa Tagihan Saat Ini</p>
              <p className="text-lg font-bold text-purple-600">
                {formatRupiah(payingCredit?.sisa || 0)}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jumlah Bayar (Rp) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                max={payingCredit?.sisa}
                required
                value={jumlahBayar}
                onChange={(e) => setJumlahBayar(e.target.value)}
                className="mt-1"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Masukkan jumlah sama dengan sisa untuk pelunasan penuh, atau lebih kecil untuk
                pembayaran cicilan.
              </span>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Pembayaran
              </label>
              <Input
                placeholder="Contoh: Titip ke kasir Agus"
                value={catatanBayar}
                onChange={(e) => setCatatanBayar(e.target.value)}
                className="mt-1"
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setPayingCredit(null)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={payMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {payMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Proses Pembayaran
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
