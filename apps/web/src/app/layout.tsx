import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/lib/providers/query-provider';
import { SWRegister } from '@/components/providers/sw-register';

export const metadata: Metadata = {
  title: 'MrikiPOS — Solusi POS Cerdas UMKM Kota Blitar',
  description: 'Kasir digital berbasis web (PWA) offline-first untuk UMKM Kota Blitar.',
  manifest: '/manifest.json',
  themeColor: '#10b981',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        <QueryProvider>
          <SWRegister />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
