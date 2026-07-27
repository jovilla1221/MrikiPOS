import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  ProductQueryParams,
} from '@/lib/api/products';
import {
  cacheProducts,
  getCachedProducts,
  cacheCategories,
  getCachedCategories,
} from '@/lib/db/dexie';
import { useAuthStore } from '@/stores/auth.store';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: string) => [...productKeys.lists(), { filters }] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  categories: ['categories'] as const,
};

export const useProducts = (params?: ProductQueryParams) => {
  return useQuery({
    queryKey: productKeys.list(JSON.stringify(params)),
    queryFn: async () => {
      const { user } = useAuthStore.getState();
      const tenantId = user?.tenant_id;
      const outletId = user?.outlet_id;

      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await getCachedProducts(tenantId, outletId);
        return { success: true, data: cached as any[], timestamp: new Date().toISOString() };
      }
      try {
        const res = await getProducts(params);
        if (res?.data && Array.isArray(res.data)) {
          await cacheProducts(res.data);
        }
        return res;
      } catch (error) {
        const cached = await getCachedProducts(tenantId, outletId);
        if (cached && cached.length > 0) {
          return { success: true, data: cached as any[], timestamp: new Date().toISOString() };
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => getProduct(id),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

export const useUpdateProduct = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

export const useAdjustStock = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adjustStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: async () => {
      const { user } = useAuthStore.getState();
      const tenantId = user?.tenant_id;
      const outletId = user?.outlet_id;

      if (typeof window !== 'undefined' && !navigator.onLine) {
        const cached = await getCachedCategories(tenantId, outletId);
        return cached as any[];
      }
      try {
        const res = await getCategories();
        if (Array.isArray(res)) {
          await cacheCategories(res);
        }
        return res;
      } catch (error) {
        const cached = await getCachedCategories(tenantId, outletId);
        if (cached && cached.length > 0) {
          return cached as any[];
        }
        throw error;
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.categories });
    },
  });
};

export const useUpdateCategory = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { nama: string; deskripsi?: string }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.categories });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.categories });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};
