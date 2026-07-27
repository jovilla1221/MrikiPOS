'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { googleAuthApi, loginApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { isValidPhone, isValidPin } from '@mrikipos/shared-utils';
import {
  GOOGLE_SIGN_IN_CONFIGURED,
  GoogleSignInButton,
} from '@/components/auth/google-sign-in-button';

// Halaman auth selalu bertema terang (sesuai desain) — override varian dark:
// bawaan komponen Input agar kolom tidak berubah gelap di perangkat dark mode.
const FIELD_CLASS =
  'h-[52px] rounded-[14px] border-[1.5px] border-slate-200 bg-slate-50 px-[18px] text-base font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-200 dark:bg-slate-50 dark:text-slate-900 dark:placeholder:text-slate-400';

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
  const [pinRequiredOnly, setPinRequiredOnly] = useState(false);

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
          setPinRequiredOnly(false);
        }

        if (res.pin_required && res.profile) {
          setGoogleCredential(credential);
          setGoogleEmail(res.profile.email);
          setPinRequiredOnly(true);
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

    if (!pinRequiredOnly && !isValidPhone(phone)) {
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
        const res = await googleAuthApi({
          credential: googleCredential,
          phone: pinRequiredOnly ? undefined : phone,
          pin,
        });
        if (!res.user || !res.tokens) {
          throw new Error('Gagal login/menautkan Google.');
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
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h2 className="text-[30px] font-extrabold tracking-tight text-slate-900">
          Masuk ke Akun Anda
        </h2>
        <p className="text-[15px] leading-relaxed text-slate-500">
          {GOOGLE_SIGN_IN_CONFIGURED
            ? 'Gunakan akun Google, atau nomor HP dan PIN kasir Anda.'
            : 'Masukkan nomor HP dan PIN kasir Anda untuk memulai.'}
        </p>
      </div>

      {GOOGLE_SIGN_IN_CONFIGURED && (
        <div className="flex flex-col gap-5">
          <GoogleSignInButton onCredential={handleGoogleCredential} />
          {googleLoading && (
            <p className="text-center text-xs text-slate-500" role="status">
              Memverifikasi akun Google…
            </p>
          )}
          <div className="flex items-center gap-3.5" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold tracking-[0.08em] text-slate-400">ATAU</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        {error && (
          <div
            role="alert"
            className="rounded-[14px] border-[1.5px] border-red-200 bg-red-50 p-3 text-xs text-red-600"
          >
            {error}
          </div>
        )}

        {googleCredential && !pinRequiredOnly && (
          <div className="rounded-[14px] border-[1.5px] border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
            <p className="font-bold">Tautkan {googleEmail}</p>
            <p className="mt-1">
              Masukkan nomor HP dan PIN akun MrikiPOS Anda sekali ini. Login berikutnya cukup dengan
              Google.
            </p>
            <p className="mt-1">
              Belum punya akun?{' '}
              <Link href="/register" className="font-bold underline underline-offset-2">
                Daftar Usaha Baru dengan Google
              </Link>{' '}
              — tanpa OTP WhatsApp.
            </p>
            <button
              type="button"
              className="mt-2 font-bold underline underline-offset-2"
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

        {googleCredential && pinRequiredOnly && (
          <div className="rounded-[14px] border-[1.5px] border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
            <p className="font-bold">Google Terverifikasi</p>
            <p className="mt-1">
              Masukkan PIN Anda untuk mengonfirmasi login sebagai {googleEmail}.
            </p>
            <button
              type="button"
              className="mt-2 font-bold underline underline-offset-2"
              onClick={() => {
                setGoogleCredential('');
                setGoogleEmail('');
                setPinRequiredOnly(false);
                setError('');
              }}
            >
              Batal
            </button>
          </div>
        )}

        {!pinRequiredOnly && (
          <div className="flex flex-col gap-2">
            <label htmlFor="login-phone" className="text-sm font-bold text-slate-900">
              Nomor HP
            </label>
            <Input
              id="login-phone"
              type="tel"
              placeholder="Masukkan no HP di sini"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={FIELD_CLASS}
              required={!pinRequiredOnly}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="login-pin" className="text-sm font-bold text-slate-900">
            PIN (6 digit)
          </label>
          <Input
            id="login-pin"
            type="password"
            maxLength={6}
            placeholder="••••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>

        <Button
          type="submit"
          isLoading={loading}
          className="mt-1.5 h-14 w-full rounded-[14px] bg-[#059669] text-base font-bold shadow-[0_6px_16px_-6px_rgba(5,150,105,0.5)] hover:bg-[#047857]"
        >
          {googleCredential ? (pinRequiredOnly ? 'Masuk dengan PIN' : 'Tautkan Google & Masuk') : 'Masuk'}
        </Button>

        <p className="text-center text-sm text-slate-500">
          Belum memiliki akun?{' '}
          <Link href="/register" className="font-bold text-emerald-600 hover:underline">
            Daftar Usaha Baru
          </Link>
        </p>
      </form>
    </div>
  );
}
