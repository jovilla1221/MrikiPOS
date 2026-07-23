'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { loginApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { isValidPhone, isValidPin } from '@mrikipos/shared-utils';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidPhone(phone)) {
      setError('Nomor HP tidak valid (harus diawali 08 dan 10-14 digit)');
      return;
    }

    if (!isValidPin(pin)) {
      setError('PIN harus 6 digit angka');
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi({ phone, pin });
      setAuth(res.user, res.tokens.access_token, res.tokens.refresh_token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa nomor HP dan PIN Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Masuk ke Akun</CardTitle>
        <CardDescription>Masukkan nomor HP dan PIN kasir Anda untuk memulai.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Nomor HP WhatsApp"
          type="tel"
          placeholder="081234567890"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <Input
          label="PIN (6 Digit)"
          type="password"
          maxLength={6}
          placeholder="••••••"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          required
        />

        <Button type="submit" isLoading={loading} className="w-full mt-2">
          Masuk
        </Button>

        <p className="text-xs text-center text-slate-600 dark:text-slate-400 mt-2">
          Belum punya akun?{' '}
          <Link href="/register" className="font-medium text-emerald-600 hover:underline">
            Daftar Usaha Baru
          </Link>
        </p>
      </form>
    </Card>
  );
}
