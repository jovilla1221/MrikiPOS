'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { verifyOtpApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { maskPhone } from '@mrikipos/shared-utils';

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phone = searchParams.get('phone') || '';
  const type = (searchParams.get('type') || 'register') as any;
  const setAuth = useAuthStore((state) => state.setAuth);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Kode OTP harus 6 digit');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtpApi({ phone, code, type });
      if (res.user && res.tokens) {
        setAuth(res.user, res.tokens.access_token, res.tokens.refresh_token);
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Verifikasi OTP gagal.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verifikasi OTP</CardTitle>
        <CardDescription>
          Masukkan 6 digit kode OTP yang dikirim ke WhatsApp{' '}
          <strong className="text-slate-900 dark:text-slate-100">{maskPhone(phone)}</strong>
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Kode OTP 6 Digit"
          type="text"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-center tracking-widest text-lg font-mono"
          required
        />

        <div className="text-xs text-center text-slate-500">
          {timer > 0 ? (
            <span>Sisa waktu verifikasi: {formatTimer(timer)}</span>
          ) : (
            <span className="text-red-500 font-medium">OTP Kadaluarsa</span>
          )}
        </div>

        <Button type="submit" isLoading={loading} className="w-full mt-2">
          Verifikasi & Lanjutkan
        </Button>
      </form>
    </Card>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="text-center p-4">Memuat...</div>}>
      <OtpForm />
    </Suspense>
  );
}
