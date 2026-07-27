import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCategories, useCreateProduct, useUpdateProduct } from '@/hooks/use-products';
import { CategoryDialog } from './category-dialog';
import { Plus, Info } from 'lucide-react';
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
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

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
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Kategori <span className="text-xs text-gray-400 font-normal">(Opsional)</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCategoryDialogOpen(true)}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Tambah Baru
            </button>
          </div>
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
          <label className="text-sm font-medium">
            Harga Modal (Rp) <span className="text-xs text-gray-400 font-normal">(Opsional)</span>
          </label>
          <Input
            name="harga_beli"
            type="number"
            min="0"
            value={formData.harga_beli}
            onChange={handleChange}
          />
        </div>

        {!isEdit ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Stok Awal <span className="text-xs text-gray-400 font-normal">(Opsional)</span>
            </label>
            <Input
              name="stok"
              type="number"
              min="0"
              value={formData.stok}
              onChange={handleChange}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              Sisa Stok
              <span className="text-xs text-gray-400 font-normal">(Tidak bisa diedit langsung)</span>
            </label>
            <div className="flex items-center h-10 px-3 bg-gray-50 border rounded-md text-sm font-bold text-gray-700">
              {formData.stok} {formData.satuan || ''}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Stok Minimum <span className="text-xs text-gray-400 font-normal">(Opsional)</span>
          </label>
          <Input
            name="stok_minimum"
            type="number"
            min="0"
            value={formData.stok_minimum}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            SKU <span className="text-xs text-gray-400 font-normal">(Opsional)</span>
          </label>
          <Input
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="Contoh: NG-001"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Barcode <span className="text-xs text-gray-400 font-normal">(Opsional)</span>
          </label>
          <Input
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submit from barcode scanner enter key
              }
            }}
            placeholder="Scan barcode di sini"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Satuan <span className="text-xs text-gray-400 font-normal">(Opsional)</span>
          </label>
          <select
            name="satuan"
            value={formData.satuan}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">-- Pilih Satuan --</option>
            <option value="pcs">Pcs (Pieces)</option>
            <option value="porsi">Porsi</option>
            <option value="piring">Piring</option>
            <option value="gelas">Gelas</option>
            <option value="botol">Botol</option>
            <option value="kaleng">Kaleng</option>
            <option value="bungkus">Bungkus</option>
            <option value="paket">Paket</option>
            <option value="box">Box / Dus</option>
            <option value="kg">Kg (Kilogram)</option>
            <option value="gram">Gram</option>
            <option value="liter">Liter</option>
            <option value="ml">Ml (Milliliter)</option>
            <option value="meter">Meter</option>
            {formData.satuan &&
              ![
                'pcs',
                'porsi',
                'piring',
                'gelas',
                'botol',
                'kaleng',
                'bungkus',
                'paket',
                'box',
                'kg',
                'gram',
                'liter',
                'ml',
                'meter',
              ].includes(formData.satuan.toLowerCase()) && (
                <option value={formData.satuan}>{formData.satuan}</option>
              )}
          </select>
        </div>


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

      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onCategoryCreated={(newCatId) => {
          setFormData((prev) => ({ ...prev, category_id: newCatId }));
        }}
      />
    </form>
  );
}
