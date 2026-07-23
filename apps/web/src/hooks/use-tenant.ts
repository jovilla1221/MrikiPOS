import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTenant, updateTenantSettings } from '@/lib/api/tenant';
import { TenantSettings } from '@mrikipos/shared-types';

export const tenantKeys = {
  all: ['tenant'] as const,
};

export const useTenant = (enabled = true) =>
  useQuery({
    queryKey: tenantKeys.all,
    queryFn: getTenant,
    enabled,
  });

export const useUpdateTenantSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: TenantSettings) => updateTenantSettings(settings),
    onSuccess: (tenant) => {
      queryClient.setQueryData(tenantKeys.all, tenant);
    },
  });
};
