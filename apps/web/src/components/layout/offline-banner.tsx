'use client';

import * as React from 'react';
import { useSyncStore } from '@/stores/sync.store';
import { syncPendingTransactions } from '@/lib/db/sync';
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount } = useSyncStore();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs font-medium transition-colors ${
        !isOnline
          ? 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-b border-amber-500/20'
          : 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-b border-blue-500/20'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>Mode Offline</strong> — Koneksi terputus. Transaksi baru akan disimpan di
              lokal.
            </span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4 shrink-0 text-blue-500" />
            <span>
              Ada <strong>{pendingCount}</strong> transaksi offline belum tersimpan di server.
            </span>
          </>
        )}
      </div>

      {pendingCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          disabled={!isOnline || isSyncing}
          onClick={() => syncPendingTransactions()}
          className="h-7 gap-1.5 text-xs font-medium"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Menyingkronkan...' : 'Sync Sekarang'}
        </Button>
      )}
    </div>
  );
}
