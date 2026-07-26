'use client';

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProducts } from '@/hooks/use-products';
import { adjustStock } from '@/lib/api/products';
import { inventoryKeys } from '@/hooks/use-inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Stock Opname — pencocokan stok fisik vs stok sistem.
 * Setiap baris dengan selisih ≠ 0 dikirim sebagai penyesuaian
 * (POST /v1/products/:id/stock, type "adjustment", qty = selisih).
 */
export function StockOpnameForm() {
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // limit 100 = batas maksimum PaginationDto backend. Untuk katalog yang lebih
  // besar, gunakan kolom pencarian untuk menemukan produk yang dihitung.
  const { data, isLoading } = useProducts({ limit: 100, is_active: true });
  // Hook mengembalikan array langsung saat online, envelope {data} dari cache offline.
  const products: any[] = Array.isArray(data) ? data : data?.data || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.nama?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q),
    );
  }, [products, search]);

  const adjustments = useMemo(
    () =>
      products
        .map((p) => {
          const raw = counts[p.id];
          if (raw === undefined || raw === '') return null;
          const fisik = Number(raw);
          if (!Number.isInteger(fisik) || fisik < 0) return null;
          const selisih = fisik - p.stok;
          return selisih === 0 ? null : { product: p, fisik, selisih };
        })
        .filter(Boolean) as { product: any; fisik: number; selisih: number }[],
    [products, counts],
  );

  const handleSubmit = async () => {
    if (adjustments.length === 0) return;
    setSubmitting(true);
    const tanggal = new Date().toLocaleDateString('id-ID');
    let ok = 0;
    const gagal: string[] = [];

    for (const adj of adjustments) {
      try {
        await adjustStock(adj.product.id, {
          type: 'adjustment',
          qty: adj.selisih,
          keterangan: `Stock opname ${tanggal}`,
        });
        ok++;
      } catch (err: any) {
        gagal.push(`${adj.product.nama}: ${err?.message || 'gagal'}`);
      }
    }

    setSubmitting(false);
    setCounts({});
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock });

    if (gagal.length === 0) {
      toast.success(`Opname selesai: ${ok} produk disesuaikan`);
    } else {
      toast.error(`${ok} berhasil, ${gagal.length} gagal — ${gagal[0]}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <h3 className="text-lg font-medium">Stock Opname</h3>
          <p className="text-sm text-gray-500">
            Isi kolom <span className="font-medium">Stok Fisik</span> hasil hitung di lapangan.
            Hanya baris dengan selisih yang akan disesuaikan; baris kosong diabaikan.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari nama, SKU, atau barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Stok Sistem</th>
                <th className="px-4 py-3 w-32">Stok Fisik</th>
                <th className="px-4 py-3 text-right">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    Memuat produk...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Tidak ada produk
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const raw = counts[p.id] ?? '';
                  const fisik = raw === '' ? null : Number(raw);
                  const selisih =
                    fisik === null || !Number.isInteger(fisik) ? null : fisik - p.stok;
                  return (
                    <tr key={p.id} className="border-b">
                      <td className="px-4 py-2 font-medium text-gray-900">{p.nama}</td>
                      <td className="px-4 py-2 text-xs">{p.sku || '-'}</td>
                      <td className="px-4 py-2 text-right">
                        {p.stok} {p.satuan || ''}
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          className="h-8 w-24 text-right"
                          placeholder={String(p.stok)}
                          value={raw}
                          onChange={(e) => setCounts((c) => ({ ...c, [p.id]: e.target.value }))}
                        />
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${
                          selisih === null || selisih === 0
                            ? 'text-gray-400'
                            : selisih > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                        }`}
                      >
                        {selisih === null ? '—' : selisih > 0 ? `+${selisih}` : selisih}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-gray-500">
            {adjustments.length > 0
              ? `${adjustments.length} produk akan disesuaikan`
              : 'Belum ada selisih untuk disesuaikan'}
          </p>
          <Button onClick={handleSubmit} disabled={adjustments.length === 0 || submitting}>
            {submitting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
          </Button>
        </div>
      </div>
    </div>
  );
}
