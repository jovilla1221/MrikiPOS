import Image from 'next/image';
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const CHIPS = ['Offline-first', 'Tunai & QRIS', 'Gratis untuk UMKM'];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={`${jakarta.className} flex min-h-screen flex-wrap bg-white [--background:#ffffff] [--foreground:#0f172a] [color-scheme:light]`}
    >
      {/* Brand panel */}
      <aside className="relative flex flex-[1_1_380px] flex-col justify-center overflow-hidden bg-[#047857] px-8 py-14 text-white lg:px-[52px]">
        <div className="absolute -right-[120px] -top-[120px] h-[340px] w-[340px] rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-[140px] -left-[100px] h-[380px] w-[380px] rounded-full bg-black/[0.08]" />

        <div className="relative flex max-w-[460px] flex-col gap-7">
          <div className="self-start rounded-2xl bg-white px-[18px] py-2.5 shadow-[0_4px_14px_-6px_rgba(0,0,0,0.25)]">
            <Image
              src="/brand/logo-mrikipos.png"
              alt="MrikiPOS — Solusi POS Cerdas UMKM"
              width={180}
              height={58}
              className="h-[58px] w-auto"
              priority
            />
          </div>

          <h1 className="text-balance text-[clamp(30px,3.2vw,42px)] font-extrabold leading-[1.15] tracking-tight">
            Satu aplikasi untuk kasir, stok, dan laporan usaha Anda.
          </h1>

          <p className="max-w-[400px] text-base leading-relaxed text-emerald-100">
            Solusi Point of Sale untuk UMKM Kota Blitar. Berfungsi penuh saat offline, mendukung
            pembayaran tunai dan QRIS.
          </p>

          <Image
            src="/brand/ilustrasi-kasir.webp"
            alt="Ilustrasi kasir MrikiPOS"
            width={440}
            height={240}
            className="h-[240px] w-full max-w-[440px] rounded-[20px] object-cover"
          />

          <div className="flex flex-wrap gap-2.5">
            {CHIPS.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-white/[0.12] px-4 py-2 text-[13px] font-semibold"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex flex-[1_1_460px] items-center justify-center bg-white px-8 py-14">
        <div className="w-full max-w-[420px] [animation:fadeUp_.45s_ease_both]">{children}</div>
      </div>
    </main>
  );
}
