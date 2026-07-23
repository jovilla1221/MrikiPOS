'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/hooks/use-customers';
import { formatRupiah } from '@mrikipos/shared-utils';
import { Customer } from '@mrikipos/shared-types';
import { Search, Plus, UserCheck, Edit, Trash2, Loader2, Phone, MapPin } from 'lucide-react';

export default function CustomersPage() {
  const [search, setSearch] = React.useState('');
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = React.useState<Customer | null>(null);

  // Form states
  const [nama, setNama] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [alamat, setAlamat] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');

  const { data: customerResponse, isLoading, refetch } = useCustomers({ search });
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const customers = customerResponse || [];

  const resetForm = () => {
    setNama('');
    setPhone('');
    setAlamat('');
    setErrorMsg('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setNama(customer.nama);
    setPhone(customer.phone || '');
    setAlamat(customer.alamat || '');
    setErrorMsg('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await createMutation.mutateAsync({
        nama,
        phone: phone ? phone : undefined,
        alamat: alamat ? alamat : undefined,
      });
      setIsAddOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan pelanggan');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setErrorMsg('');
    try {
      await updateMutation.mutateAsync({
        id: editingCustomer.id,
        payload: {
          nama,
          phone: phone ? phone : undefined,
          alamat: alamat ? alamat : undefined,
        },
      });
      setEditingCustomer(null);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui pelanggan');
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    setErrorMsg('');
    try {
      await deleteMutation.mutateAsync(deletingCustomer.id);
      setDeletingCustomer(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus pelanggan');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-emerald-600" />
            Daftar Pelanggan
          </h1>
          <p className="text-sm text-slate-500">
            Kelola database pelanggan toko Anda untuk riwayat transaksi dan kasbon.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          <span>Tambah Pelanggan</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari berdasarkan nama atau nomor HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Table / List */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Memuat daftar pelanggan...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center p-12 text-slate-500">
            <p className="font-semibold text-lg">Belum Ada Pelanggan</p>
            <p className="text-sm text-slate-400 mt-1">
              {search
                ? 'Tidak ada pelanggan sesuai pencarian'
                : 'Tambahkan pelanggan baru untuk mulai mencatat'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Nama Pelanggan</th>
                  <th className="px-4 py-3">Nomor HP</th>
                  <th className="px-4 py-3">Alamat</th>
                  <th className="px-4 py-3 text-right">Total Belanja</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {c.nama}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {c.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {c.phone}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {c.alamat ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {c.alamat}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      {formatRupiah(c.total_belanja || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(c)}
                          className="h-8 w-8 p-0"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingCustomer(c)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dialog Tambah Pelanggan */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg dark:bg-red-950/50 dark:text-red-400">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="Contoh: Budi Santoso"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor HP (WhatsApp)
              </label>
              <Input
                placeholder="Contoh: 081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Alamat
              </label>
              <Input
                placeholder="Alamat lengkap..."
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
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
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Pelanggan */}
      <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pelanggan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 text-red-700 rounded-lg dark:bg-red-950/50 dark:text-red-400">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor HP (WhatsApp)
              </label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Alamat
              </label>
              <Input value={alamat} onChange={(e) => setAlamat(e.target.value)} className="mt-1" />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pelanggan</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus pelanggan <strong>{deletingCustomer?.nama}</strong>?
            </p>
            {errorMsg && (
              <div className="mt-3 p-3 text-xs bg-red-50 text-red-700 rounded-lg dark:bg-red-950/50 dark:text-red-400">
                {errorMsg}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCustomer(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
