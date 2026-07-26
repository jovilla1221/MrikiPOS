'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { useAuthStore } from '@/stores/auth.store';
import { logoutApi } from '@/lib/api/auth';
import { initSyncEngine } from '@/lib/db/sync';
import { OfflineBanner } from '@/components/layout/offline-banner';
import {
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  LogOut,
  Store,
  LayoutDashboard,
  Receipt,
  ClipboardList,
  UserCheck,
  CreditCard,
  Clock,
} from 'lucide-react';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Hanya tampil untuk role tertentu; kosong = semua role. */
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/pos', label: 'Kasir (POS)', icon: ShoppingCart },
  { href: '/products', label: 'Katalog Produk', icon: Package },
  { href: '/inventory', label: 'Inventory', icon: ClipboardList },
  { href: '/transactions', label: 'Riwayat Transaksi', icon: Receipt },
  { href: '/customers', label: 'Pelanggan', icon: UserCheck },
  { href: '/credits', label: 'Kasbon', icon: CreditCard },
  { href: '/shifts', label: 'Shift Kasir', icon: Clock },
  { href: '/reports', label: 'Laporan', icon: BarChart3, roles: ['OWNER', 'MANAGER'] },
  { href: '/approvals', label: 'Approval', icon: UserCheck },
  { href: '/users', label: 'Kelola User', icon: Users, roles: ['OWNER'] },
  { href: '/audit-logs', label: 'Audit Trail', icon: ClipboardList, roles: ['OWNER', 'MANAGER'] },
  { href: '/settings', label: 'Pengaturan', icon: Store, roles: ['OWNER'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();

  React.useEffect(() => {
    const cleanup = initSyncEngine();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {}
    clearAuth();
    router.push('/login');
  };

  const initial = (user?.nama || 'K').trim().charAt(0).toUpperCase();

  return (
    <div
      className={`${jakarta.className} flex min-h-screen flex-col bg-[#f6f8f7] text-slate-900 md:flex-row [--background:#f6f8f7] [--foreground:#0f172a] [color-scheme:light]`}
    >
      {/* Sidebar */}
      <aside className="flex w-full flex-col justify-between border-b border-[#e8ede9] bg-white p-5 print:hidden md:w-64 md:border-b-0 md:border-r">
        <div>
          {/* Logo */}
          <div className="mb-3.5 border-b border-[#f0f4f1] px-1.5 pb-5 pt-2">
            <Image
              src="/brand/logo-mrikipos-trimmed.png"
              alt="MrikiPOS"
              width={137}
              height={44}
              className="h-11 w-auto"
              priority
            />
          </div>

          {/* Nav Links — item aktif mengikuti route saat ini */}
          <nav className="flex flex-col gap-[5px]">
            {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role || '')).map(
              (item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-[11px] text-sm font-semibold transition-all ${
                      active
                        ? 'bg-[#047857] text-white shadow-[0_6px_14px_-6px_rgba(4,120,87,0.5)]'
                        : 'text-[#475569] hover:bg-[#f0fdf4]'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              },
            )}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="mt-4 border-t border-[#f0f4f1] pt-4">
          <div className="flex items-center gap-3 rounded-[14px] bg-[#f6f8f7] px-3 py-2.5">
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#047857] text-[15px] font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{user?.nama || 'Kasir'}</p>
              <p className="truncate text-xs text-slate-500">{user?.outlet_nama || 'Outlet'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex rounded-[10px] p-2 text-slate-400 transition-all hover:bg-red-100 hover:text-red-600"
              title="Keluar"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
