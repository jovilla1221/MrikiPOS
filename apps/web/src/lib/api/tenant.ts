import { Tenant, TenantSettings } from '@mrikipos/shared-types';
import { apiClient } from './client';

export const getTenant = async () =>
  apiClient<Tenant>('/v1/tenant', { method: 'GET' });

export const updateTenantSettings = async (settings: TenantSettings) =>
  apiClient<Tenant>('/v1/tenant/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
