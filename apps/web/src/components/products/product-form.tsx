import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCategories, useCreateProduct, useUpdateProduct } from '@/hooks/use-products';
import { toast } from 'sonner';

interface ProductFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export function ProductForm({ initialData, isEdit }: ProductFormProps) {
  const router = useRouter();
  const { data: categories } = useCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct(initialData?.id || '');

  const [formData, setFormData] = useState({
    nama: '',
    harga_jual: 0,
    harga_beli: 0,
    stok: 0,
    stok_minimum: 5,
    barcode: '',
    sku: '',
    satuan: '',
    category_id: '',
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        nama: initialData.nama || '',
        harga_jual: initialData.harga_jual || 0,
        harga_beli: initialData.harga_beli || 0,
        stok: initialData.stok || 0,
        stok_minimum: initialData.stok_minimum || 5,
        barcode: initialData.barcode || '',
        sku: initialData.sku || '',
        satuan: initialData.satuan || '',
        category_id: initialData.category_id || '',
        is_active: initialData.is_active ?? true,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: any = value;

    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    } else if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    }

    setFormData((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.nama) return toast.error('Nama produk wajib diisi');
    if (formData.harga_jual < 0) return toast.error('Harga jual tidak boleh negatif');

    const payload = {
      ...formData,
      barcode: formData.barcode || undefined,
      sku: formData.sku || undefined,
      category_id: formData.category_id || undefined,
    };

    try {
      if (isEdit) {
        // Exclude stok from update payload as it should be done via adjustment API
        const { stok, ...updatePayload } = payload;
        await updateMutation.mutateAsync(updatePayload);
        toast.success('Produk berhasil diperbarui');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Produk berhasil ditambahkan');
      }
      router.push('/products');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan produk');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-w-2xl bg-white p-6 rounded-xl shadow-sm border border-gray-100"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Nama Produk <span className="text-red-500">*</span>
          </label>
          <Input
            name="nama"
            value={formData.nama}
            onChange={handleChange}
            placeholder="Contoh: Nasi Goreng"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Kategori</label>
          <select
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">-- Pilih Kategori --</option>
            {categories?.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Harga Jual (Rp) <span className="text-red-500">*</span>
          </label>
          <Input
            name="harga_jual"
            type="number"
            min="0"
            value={formData.harga_jual}
            onChange={handleChange}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Harga Modal (Rp)</label>
          <Input
            name="harga_beli"
            type="number"
            min="0"
            value={formData.harga_beli}
            onChange={handleChange}
          />
        </div>

        {!isEdit && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Stok Awal</label>
            <Input
              name="stok"
              type="number"
              min="0"
              value={formData.stok}
              onChange={handleChange}
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Stok Minimum</label>
          <Input
            name="stok_minimum"
            type="number"
            min="0"
            value={formData.stok_minimum}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">SKU</label>
          <Input
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="Contoh: NG-001"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Barcode</label>
          <Input
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            placeholder="Scan barcode di sini"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Satuan</label>
          <Input
            name="satuan"
            value={formData.satuan}
            onChange={handleChange}
            placeholder="Contoh: porsi, pcs"
          />
        </div>

        {isEdit && (
          <div className="space-y-2 flex items-center h-full pt-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">Produk Aktif</span>
            </label>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/products')}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          Batal
        </Button>
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan Produk'}
        </Button>
      </div>
    </form>
  );
}
