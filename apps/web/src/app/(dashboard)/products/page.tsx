'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useProducts, useDeleteProduct, useCategories } from '@/hooks/use-products';
import { CategoryDialog } from '@/components/products/category-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const { data, isLoading } = useProducts({
    page,
    limit: 10,
    search,
    category_id: categoryId || undefined,
  });

  const { data: categories } = useCategories();
  const deleteMutation = useDeleteProduct();

  const products = data?.data || [];
  const meta = data?.meta || { page: 1, totalPages: 1 };

  const handleDelete = async (id: string, nama: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${nama}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Produk berhasil dihapus');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menghapus produk');
      }
    }
  };

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Katalog Produk</h1>
          <p className="text-gray-500">Kelola daftar produk, harga, dan kategori.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCategoryDialogOpen(true)}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            Kelola Kategori
          </Button>
          <Link href="/products/new">
            <Button className="w-full sm:w-auto flex items-center gap-2">
              <Plus className="w-4 h-4" /> Tambah Produk
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari nama, SKU, atau barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="flex h-10 w-full sm:w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            {categories?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 rounded-t-lg">
              <tr>
                <th className="px-4 py-3">Nama Produk</th>
                <th className="px-4 py-3">SKU / Barcode</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Harga Jual</th>
                <th className="px-4 py-3">Stok</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    Memuat data...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Tidak ada produk ditemukan
                  </td>
                </tr>
              ) : (
                products.map((product: any) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{product.nama}</td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{product.sku || '-'}</div>
                      <div className="text-xs text-gray-400">{product.barcode}</div>
                    </td>
                    <td className="px-4 py-3">{product.category?.nama || '-'}</td>
                    <td className="px-4 py-3">Rp {product.harga_jual.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${product.stok <= product.stok_minimum ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                      >
                        {product.stok} {product.satuan || ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/products/${product.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-2">
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleDelete(product.id, product.nama)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-gray-500">
            Halaman {meta.page} dari {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      </div>

      <CategoryDialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen} />
    </div>
  );
}
