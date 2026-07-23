import { useAuthStore } from '@/stores/auth.store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    const errorMessage = data.error?.message || 'Terjadi kesalahan pada server';
    throw new Error(errorMessage);
  }

  return data.data;
}
