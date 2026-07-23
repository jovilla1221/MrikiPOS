'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useTenant, useUpdateTenantSettings } from '@/hooks/use-tenant';
import { Store, ShieldAlert, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { data: tenant, isLoading, error } = useTenant(user?.role === 'OWNER');
  const updateSettings = useUpdateTenantSettings();
  const [storeName, setStoreName] = React.useState('');
  const [storePhone, setStorePhone] = React.useState('');
  const [storeAddress, setStoreAddress] = React.useState('');
  const [savedMsg, setSavedMsg] = React.useState('');

  React.useEffect(() => {
    if (!tenant) return;
    setStoreName(tenant.settings?.store_name || tenant.nama);
    setStorePhone(tenant.settings?.store_phone || tenant.phone);
    setStoreAddress(tenant.settings?.store_address || '');
  }, [tenant]);

  if (user?.role !== 'OWNER') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="h-16 w-16 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Akses Dibatasi (403)</h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md">
          Halaman Pengaturan Tenant hanya dapat diakses oleh pengguna dengan role OWNER.
        </p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({
        store_name: storeName,
        store_phone: storePhone,
        store_address: storeAddress,
      });
      setSavedMsg('Pengaturan berhasil diperbarui.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch {
      setSavedMsg('Pengaturan gagal diperbarui.');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Store className="h-7 w-7 text-emerald-600" />
          Pengaturan Tenant & Toko
        </h1>
        <p className="text-sm text-slate-500">Kelola identitas usaha, alamat toko, dan profil outlet utama.</p>
      </div>

      {savedMsg && (
        <div className={`p-3 text-sm rounded-lg border ${savedMsg.includes('gagal') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {savedMsg}
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500">Memuat pengaturan...</p>}
      {error && <p className="text-sm text-red-600">Gagal memuat pengaturan tenant.</p>}

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Toko / Usaha</label>
          <input
            type="text"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nomor Telepon Toko (WA)</label>
          <input
            type="text"
            required
            value={storePhone}
            onChange={(e) => setStorePhone(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Alamat Lengkap</label>
          <textarea
            rows={3}
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-sm"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={updateSettings.isPending || isLoading || !!error}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
          >
            <Save className="h-4 w-4" />
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}
