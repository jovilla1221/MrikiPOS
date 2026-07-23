'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { googleAuthApi, registerApi } from '@/lib/api/auth';
import { isValidPhone, isValidPin } from '@mrikipos/shared-utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  GOOGLE_SIGN_IN_CONFIGURED,
  GoogleSignInButton,
} from '@/components/auth/google-sign-in-button';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [nama, setNama] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [namaUsaha, setNamaUsaha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleCredential, setGoogleCredential] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError('');
      setGoogleLoading(true);
      try {
        const res = await googleAuthApi({ credential });
        if (res.user && res.tokens) {
          setAuth(res.user, res.tokens.access_token, res.tokens.refresh_token);
          router.push('/dashboard');
          return;
        }

        if (res.link_required && res.profile) {
          setGoogleCredential(credential);
          setGoogleEmail(res.profile.email);
          setNama((current) => current || res.profile?.name || '');
        }
      } catch (err: any) {
        setError(err.message || 'Verifikasi Google gagal. Silakan coba lagi.');
      } finally {
        setGoogleLoading(false);
      }
    },
    [router, setAuth],
  );

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
      const res = await registerApi({
        nama,
        phone,
        pin,
        nama_usaha: namaUsaha,
        google_credential: googleCredential || undefined,
      });

      if (res.user && res.tokens) {
        setAuth(res.user, res.tokens.access_token, res.tokens.refresh_token);
        router.push('/dashboard');
        return;
      }

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
        <CardDescription>
          {GOOGLE_SIGN_IN_CONFIGURED
            ? 'Daftar dengan Google tanpa OTP WhatsApp, atau gunakan formulir biasa.'
            : 'Gratis untuk UMKM Kota Blitar. Tanpa biaya tersembunyi.'}
        </CardDescription>
      </CardHeader>

      {GOOGLE_SIGN_IN_CONFIGURED && !googleCredential && (
        <div className="mb-5 space-y-4">
          <GoogleSignInButton mode="signup" onCredential={handleGoogleCredential} />
          {googleLoading && (
            <p className="text-center text-xs text-slate-500" role="status">
              Memverifikasi akun Google…
            </p>
          )}
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              atau
            </span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg"
          >
            {error}
          </div>
        )}

        {googleCredential && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            <p className="font-semibold">Google terverifikasi</p>
            <p className="mt-1">{googleEmail}</p>
            <p className="mt-1 text-emerald-700 dark:text-emerald-300">
              Selesaikan data usaha. OTP WhatsApp tidak diperlukan.
            </p>
            <button
              type="button"
              className="mt-2 font-semibold underline underline-offset-2"
              onClick={() => {
                setGoogleCredential('');
                setGoogleEmail('');
              }}
            >
              Gunakan pendaftaran biasa
            </button>
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
          label="Nomor HP"
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
          {googleCredential ? 'Daftar & Masuk dengan Google' : 'Daftar Sekarang'}
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
