'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { registerApi } from '@/lib/api/auth';
import { isValidPhone, isValidPin } from '@mrikipos/shared-utils';

export default function RegisterPage() {
  const router = useRouter();

  const [nama, setNama] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [namaUsaha, setNamaUsaha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nama.trim()) {
      setError('Nama pemilik harus diisi');
      return;
    }

    if (!isValidPhone(phone)) {
      setError('Nomor HP tidak valid (harus diawali 08 dan 10-14 digit)');
      return;
    }

    if (!isValidPin(pin)) {
      setError('PIN harus 6 digit angka');
      return;
    }

    if (!namaUsaha.trim()) {
      setError('Nama usaha harus diisi');
      return;
    }

    setLoading(true);
    try {
      await registerApi({
        nama,
        phone,
        pin,
        nama_usaha: namaUsaha,
      });

      router.push(`/otp?phone=${encodeURIComponent(phone)}&type=register`);
    } catch (err: any) {
      setError(err.message || 'Registrasi gagal. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar MrikiPOS</CardTitle>
        <CardDescription>Gratis untuk UMKM Kota Blitar. Tanpa biaya tersembunyi.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Nama Usaha / Toko"
          placeholder="Warung Nasi Pecel Bu Siti"
          value={namaUsaha}
          onChange={(e) => setNamaUsaha(e.target.value)}
          required
        />

        <Input
          label="Nama Pemilik"
          placeholder="Bu Siti"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
        />

        <Input
          label="Nomor HP WhatsApp"
          type="tel"
          placeholder="081234567890"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <Input
          label="Buat PIN 6 Digit"
          type="password"
          maxLength={6}
          placeholder="••••••"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
        />

        <Button type="submit" isLoading={loading} className="w-full mt-2">
          Daftar Sekarang
        </Button>

        <p className="text-xs text-center text-slate-600 dark:text-slate-400 mt-2">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-medium text-emerald-600 hover:underline">
            Masuk di Sini
          </Link>
        </p>
      </form>
    </Card>
  );
}
