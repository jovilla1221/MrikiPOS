import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStockHistory,
  getLowStockProducts,
  importProducts,
  StockHistoryQueryParams,
} from '@/lib/api/inventory';

export const inventoryKeys = {
  all: ['inventory'] as const,
  historyLists: () => [...inventoryKeys.all, 'history'] as const,
  history: (filters: string) => [...inventoryKeys.historyLists(), { filters }] as const,
  lowStock: ['lowStock'] as const,
};

export const useStockHistory = (params?: StockHistoryQueryParams) => {
  return useQuery({
    queryKey: inventoryKeys.history(JSON.stringify(params)),
    queryFn: () => getStockHistory(params),
  });
};

export const useLowStock = () => {
  return useQuery({
    queryKey: inventoryKeys.lowStock,
    queryFn: () => getLowStockProducts(),
  });
};

export const useImportProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: 'create' | 'upsert' }) =>
      importProducts(file, mode),
    onSuccess: () => {
      // Invalidate both inventory and products
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
