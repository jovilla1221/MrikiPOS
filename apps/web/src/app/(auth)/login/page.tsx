'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { googleAuthApi, loginApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { isValidPhone, isValidPin } from '@mrikipos/shared-utils';
import {
  GOOGLE_SIGN_IN_CONFIGURED,
  GoogleSignInButton,
} from '@/components/auth/google-sign-in-button';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleCredential, setGoogleCredential] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');

  const finishLogin = useCallback(
    (user: any, accessToken: string, refreshToken: string) => {
      setAuth(user, accessToken, refreshToken);
      router.push('/dashboard');
    },
    [router, setAuth],
  );

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setError('');
      setGoogleLoading(true);
      try {
        const res = await googleAuthApi({ credential });
        if (res.user && res.tokens) {
          finishLogin(res.user, res.tokens.access_token, res.tokens.refresh_token);
          return;
        }

        if (res.link_required && res.profile) {
          setGoogleCredential(credential);
          setGoogleEmail(res.profile.email);
        }
      } catch (err: any) {
        setError(err.message || 'Login Google gagal. Silakan coba lagi.');
      } finally {
        setGoogleLoading(false);
      }
    },
    [finishLogin],
  );

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
      if (googleCredential) {
        const res = await googleAuthApi({ credential: googleCredential, phone, pin });
        if (!res.user || !res.tokens) {
          throw new Error('Akun Google belum berhasil ditautkan.');
        }
        finishLogin(res.user, res.tokens.access_token, res.tokens.refresh_token);
        return;
      }

      const res = await loginApi({ phone, pin });
      finishLogin(res.user, res.tokens.access_token, res.tokens.refresh_token);
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
        <CardDescription>
          {GOOGLE_SIGN_IN_CONFIGURED
            ? 'Gunakan Google, atau masuk dengan nomor HP dan PIN kasir Anda.'
            : 'Masukkan nomor HP dan PIN kasir Anda untuk memulai.'}
        </CardDescription>
      </CardHeader>

      {GOOGLE_SIGN_IN_CONFIGURED && (
        <div className="mb-5 space-y-4">
          <GoogleSignInButton onCredential={handleGoogleCredential} />
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
            <p className="font-semibold">Tautkan {googleEmail}</p>
            <p className="mt-1">
              Masukkan nomor HP dan PIN akun MrikiPOS Anda sekali ini. Login berikutnya cukup dengan
              Google.
            </p>
            <p className="mt-1">
              Belum punya akun?{' '}
              <Link href="/register" className="font-semibold underline underline-offset-2">
                Daftar Usaha Baru dengan Google
              </Link>{' '}
              — tanpa OTP WhatsApp.
            </p>
            <button
              type="button"
              className="mt-2 font-semibold underline underline-offset-2"
              onClick={() => {
                setGoogleCredential('');
                setGoogleEmail('');
                setError('');
              }}
            >
              Batal menautkan
            </button>
          </div>
        )}

        <Input
          label="Nomor HP"
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
          {googleCredential ? 'Tautkan Google & Masuk' : 'Masuk'}
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
