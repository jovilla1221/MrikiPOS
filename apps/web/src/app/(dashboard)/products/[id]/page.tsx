'use client';

import { ProductForm } from '@/components/products/product-form';
import { useProduct } from '@/hooks/use-products';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: product, isLoading } = useProduct(id);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Memuat data produk...</div>;
  }

  if (!product) {
    return (
      <div className="p-8 text-center text-gray-500">
        Produk tidak ditemukan.
        <div className="mt-4">
          <Link href="/products" className="text-blue-600 hover:underline">
            Kembali ke daftar produk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/products" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Edit Produk: {product.nama}
          </h1>
          <p className="text-gray-500">Perbarui informasi produk ini.</p>
        </div>
      </div>

      <ProductForm initialData={product} isEdit />
    </div>
  );
}
