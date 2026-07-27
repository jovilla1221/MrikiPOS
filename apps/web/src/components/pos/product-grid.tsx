import * as React from 'react';
import { useProducts, useCategories } from '@/hooks/use-products';
import { useCartStore } from '@/stores/cart.store';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function ProductGrid() {
  const [search, setSearch] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: categoriesData } = useCategories();
  const { data: productsData, isLoading } = useProducts({
    search,
    category_id: activeCategory || undefined,
    limit: 100,
  });

  const addItem = useCartStore((state) => state.addItem);

  const categories = categoriesData || [];
  const products = productsData || [];

  return (
    <div className="flex h-full flex-col">
      {/* Search & Filter */}
      <div className="mb-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            ref={searchInputRef}
            placeholder="Cari produk (F2)..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Semua
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {cat.nama}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="text-slate-500">Memuat produk...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <div className="text-slate-500">Produk tidak ditemukan</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product: any) => (
              <Card
                key={product.id}
                className="cursor-pointer overflow-hidden transition-all hover:border-primary hover:shadow-md"
                onClick={() => {
                  if (product.stok > 0) {
                    addItem({
                      id: product.id,
                      nama: product.nama,
                      harga_jual: Number(product.harga_jual),
                      stok: product.stok,
                    });
                  }
                }}
              >
                <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative">
                  {/* Dummy placeholder foto jika tidak ada */}
                  {product.foto_url ? (
                    <img
                      src={product.foto_url}
                      alt={product.nama}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-300">
                      {product.nama.charAt(0)}
                    </div>
                  )}
                  {product.stok <= 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                        Habis
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div
                    className="mb-1 truncate font-medium text-slate-900 dark:text-white"
                    title={product.nama}
                  >
                    {product.nama}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">
                      {formatCurrency(Number(product.harga_jual))}
                    </span>
                    <span className="text-xs text-slate-500">Stok: {product.stok}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
