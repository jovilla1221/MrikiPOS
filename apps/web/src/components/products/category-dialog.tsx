import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/use-products';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated?: (newCategoryId: string) => void;
}

export function CategoryDialog({ open, onOpenChange, onCategoryCreated }: CategoryDialogProps) {
  const { data: categories, isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const deleteMutation = useDeleteCategory();

  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState('');

  const updateMutation = useUpdateCategory(editingId || '');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      return toast.error('Nama kategori wajib diisi');
    }

    try {
      const res = await createMutation.mutateAsync({ nama: nama.trim(), deskripsi: deskripsi.trim() || undefined });
      toast.success('Kategori berhasil ditambahkan');
      setNama('');
      setDeskripsi('');
      if (res?.id && onCategoryCreated) {
        onCategoryCreated(res.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan kategori');
    }
  };

  const handleStartEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditNama(cat.nama);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editNama.trim()) return toast.error('Nama kategori tidak boleh kosong');
    try {
      await updateMutation.mutateAsync({ nama: editNama.trim() });
      toast.success('Kategori berhasil diperbarui');
      setEditingId(null);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui kategori');
    }
  };

  const handleDelete = async (id: string, catNama: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kategori "${catNama}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Kategori berhasil dihapus');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menghapus kategori');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kelola Kategori Produk</DialogTitle>
          <DialogDescription>
            Tambah, edit, atau hapus kategori untuk mengelompokkan produk Anda.
          </DialogDescription>
        </DialogHeader>

        {/* Form Tambah Kategori Baru */}
        <form onSubmit={handleCreate} className="space-y-3 pb-4 border-b">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Tambah Kategori Baru
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Nama Kategori (misal: Makanan Utama)"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="flex-1 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              {createMutation.isPending ? 'Simpan...' : 'Tambah'}
            </Button>
          </div>
        </form>

        {/* Daftar Kategori Yang Ada */}
        <div className="space-y-2 pt-2 max-h-60 overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Daftar Kategori ({categories?.length || 0})
          </div>

          {isLoading ? (
            <div className="text-center py-4 text-xs text-gray-500">Memuat kategori...</div>
          ) : !categories || categories.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-400">Belum ada kategori yang dibuat</div>
          ) : (
            categories.map((cat: any) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/50 text-sm"
              >
                {editingId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <Input
                      value={editNama}
                      onChange={(e) => setEditNama(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={updateMutation.isPending}
                      className="text-green-600 hover:text-green-700 p-1"
                      title="Simpan"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                      title="Batal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{cat.nama}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 p-1.5 rounded"
                        title="Edit Nama"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.nama)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 p-1.5 rounded"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
