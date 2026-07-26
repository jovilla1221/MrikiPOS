'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { verifyOtpApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth.store';
import { maskPhone } from '@mrikipos/shared-utils';

const OTP_LENGTH = 6;

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phone = searchParams.get('phone') || '';
  const type = (searchParams.get('type') || 'register') as any;
  const setAuth = useAuthStore((state) => state.setAuth);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300); // 5 menit
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join('');

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const setDigitAt = (index: number, value: string) => {
    // Terima paste beberapa digit sekaligus di kotak mana pun.
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setDigits((d) => d.map((v, i) => (i === index ? '' : v)));
      return;
    }
    setDigits((d) => {
      const next = [...d];
      for (let i = 0; i < clean.length && index + i < OTP_LENGTH; i++) {
        next[index + i] = clean[i];
      }
      return next;
    });
    const target = Math.min(index + clean.length, OTP_LENGTH - 1);
    inputsRef.current[target]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length !== OTP_LENGTH) {
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
    <div className="flex flex-col gap-[26px]">
      <div className="flex flex-col gap-2">
        <h2 className="text-[30px] font-extrabold tracking-tight text-slate-900">
          Verifikasi Nomor HP
        </h2>
        <p className="text-[15px] leading-relaxed text-slate-500">
          Masukkan 6 digit kode yang kami kirim melalui WhatsApp ke{' '}
          <strong className="text-slate-900">{maskPhone(phone)}</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[26px]">
        {error && (
          <div
            role="alert"
            className="rounded-[14px] border-[1.5px] border-red-200 bg-red-50 p-3 text-xs text-red-600"
          >
            {error}
          </div>
        )}

        <div className="flex justify-between gap-2.5">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={OTP_LENGTH}
              aria-label={`Digit OTP ke-${i + 1}`}
              value={digit}
              onChange={(e) => setDigitAt(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              className="h-16 w-14 rounded-[14px] border-[1.5px] border-slate-200 bg-slate-50 text-center text-[26px] font-bold text-slate-900 outline-none transition-all focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
            />
          ))}
        </div>

        <p className="text-center text-sm text-slate-500">
          {timer > 0 ? (
            <>
              Sisa waktu verifikasi{' '}
              <strong className="text-emerald-600">{formatTimer(timer)}</strong>
            </>
          ) : (
            <span className="font-semibold text-red-500">OTP Kadaluarsa</span>
          )}
        </p>

        <Button
          type="submit"
          isLoading={loading}
          className="h-14 w-full rounded-[14px] bg-[#059669] text-base font-bold shadow-[0_6px_16px_-6px_rgba(5,150,105,0.5)] hover:bg-[#047857]"
        >
          Verifikasi & Lanjutkan
        </Button>
      </form>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Memuat...</div>}>
      <OtpForm />
    </Suspense>
  );
}
