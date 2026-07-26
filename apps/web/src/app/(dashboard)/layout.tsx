'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="print:hidden w-full md:w-64 bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-4">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-2 px-2 py-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <Store className="h-6 w-6 text-emerald-600" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Mriki<span className="text-blue-600">POS</span>
            </span>
          </div>

          {/* Nav Links — item aktif mengikuti route saat ini */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role || '')).map(
              (item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              },
            )}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 md:mt-0">
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user?.nama || 'Kasir'}
              </p>
              <p className="text-xs text-slate-500">{user?.outlet_nama || 'Outlet'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Keluar"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <OfflineBanner />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
