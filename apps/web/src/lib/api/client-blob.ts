import { useAuthStore } from '@/stores/auth.store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * apiClientBlob — untuk download file (CSV/XLSX).
 * Mengembalikan Blob mentah tanpa parsing JSON.
 * S3: Content-Disposition: attachment diset oleh server.
 */
export async function apiClientBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Coba parse error JSON jika ada
    try {
      const errData = await response.json();
      throw new Error(errData?.error?.message || 'Gagal mengunduh laporan');
    } catch {
      throw new Error('Gagal mengunduh laporan');
    }
  }

  return response.blob();
}
