'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { googleAuthApi, registerApi } from '@/lib/api/auth';
import { isValidPhone, isValidPin } from '@mrikipos/shared-utils';
import { useAuthStore } from '@/stores/auth.store';
import {
  GOOGLE_SIGN_IN_CONFIGURED,
  GoogleSignInButton,
} from '@/components/auth/google-sign-in-button';

// Halaman auth selalu bertema terang (sesuai desain) — override varian dark:
// bawaan komponen Input agar kolom tidak berubah gelap di perangkat dark mode.
const FIELD_CLASS =
  'h-[52px] rounded-[14px] border-[1.5px] border-slate-200 bg-slate-50 px-[18px] text-base font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 dark:border-slate-200 dark:bg-slate-50 dark:text-slate-900 dark:placeholder:text-slate-400';

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
    <div className="flex flex-col gap-[26px]">
      <div className="flex flex-col gap-2">
        <h2 className="text-[30px] font-extrabold tracking-tight text-slate-900">
          Daftar Usaha Baru
        </h2>
        <p className="text-[15px] leading-relaxed text-slate-500">
          Gratis untuk UMKM Kota Blitar, tanpa biaya tersembunyi.
        </p>
      </div>

      {GOOGLE_SIGN_IN_CONFIGURED && !googleCredential && (
        <div className="flex flex-col gap-5">
          <GoogleSignInButton mode="signup" onCredential={handleGoogleCredential} />
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

        {googleCredential && (
          <div className="rounded-[14px] border-[1.5px] border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
            <p className="font-bold">Google terverifikasi</p>
            <p className="mt-1">{googleEmail}</p>
            <p className="mt-1 text-emerald-700">
              Selesaikan data usaha. OTP WhatsApp tidak diperlukan.
            </p>
            <button
              type="button"
              className="mt-2 font-bold underline underline-offset-2"
              onClick={() => {
                setGoogleCredential('');
                setGoogleEmail('');
              }}
            >
              Gunakan pendaftaran biasa
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="reg-usaha" className="text-sm font-bold text-slate-900">
            Nama Usaha / Toko
          </label>
          <Input
            id="reg-usaha"
            placeholder="Warung Nasi Pecel Bu Siti"
            value={namaUsaha}
            onChange={(e) => setNamaUsaha(e.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="reg-nama" className="text-sm font-bold text-slate-900">
            Nama Pemilik
          </label>
          <Input
            id="reg-nama"
            placeholder="Bu Siti"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className={FIELD_CLASS}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="reg-phone" className="text-sm font-bold text-slate-900">
              Nomor HP
            </label>
            <Input
              id="reg-phone"
              type="tel"
              placeholder="Masukkan no HP di sini"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={FIELD_CLASS}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="reg-pin" className="text-sm font-bold text-slate-900">
              Buat PIN 6 Digit
            </label>
            <Input
              id="reg-pin"
              type="password"
              maxLength={6}
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={FIELD_CLASS}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          isLoading={loading}
          className="mt-1.5 h-14 w-full rounded-[14px] bg-[#059669] text-base font-bold shadow-[0_6px_16px_-6px_rgba(5,150,105,0.5)] hover:bg-[#047857]"
        >
          {googleCredential ? 'Daftar & Masuk dengan Google' : 'Daftar Sekarang'}
        </Button>

        <p className="text-center text-sm text-slate-500">
          Sudah memiliki akun?{' '}
          <Link href="/login" className="font-bold text-emerald-600 hover:underline">
            Masuk di Sini
          </Link>
        </p>
      </form>
    </div>
  );
}
