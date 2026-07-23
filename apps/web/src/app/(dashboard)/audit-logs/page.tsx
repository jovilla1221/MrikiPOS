'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useAuditLogs } from '@/hooks/use-audit';
import { ClipboardList, ShieldAlert, Search, Calendar, User, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  const { user } = useAuthStore();
  const [actionFilter, setActionFilter] = React.useState('');
  const [entityFilter, setEntityFilter] = React.useState('');
  const [selectedLog, setSelectedLog] = React.useState<any>(null);

  const { data: auditResponse, isLoading } = useAuditLogs({
    action: actionFilter || undefined,
    entity_type: entityFilter || undefined,
  });

  const logs = (auditResponse as any)?.data || [];

  if (user?.role !== 'OWNER' && user?.role !== 'MANAGER') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="h-16 w-16 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Akses Dibatasi (403)</h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md">
          Halaman Audit Trail hanya dapat diakses oleh pengguna dengan role OWNER atau MANAGER.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ClipboardList className="h-7 w-7 text-emerald-600" />
          Audit Trail & Log Keamanan
        </h1>
        <p className="text-sm text-slate-500">Catatan aktivitas perubahan data, transaksi sensitif, dan log akses pengguna (read-only).</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filter:</span>
        </div>
        <input
          type="text"
          placeholder="Filter Aksi (contoh: USER_CREATED)"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 w-full sm:w-64"
        />
        <input
          type="text"
          placeholder="Filter Entitas (contoh: User, Transaction)"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 w-full sm:w-64"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Memuat log audit...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Tidak ada log audit ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Aksi</th>
                  <th className="px-4 py-3">Entitas</th>
                  <th className="px-4 py-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                      {log.user?.nama || 'Sistem'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 text-xs">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(0, 8)})` : ''}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 underline"
                      >
                        Lihat Change
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diff Viewer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Log Detail #{selectedLog.id.slice(0, 8)}
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p><span className="font-semibold">Aksi:</span> {selectedLog.action}</p>
              <p><span className="font-semibold">Pengguna:</span> {selectedLog.user?.nama} ({selectedLog.user?.role})</p>

              {selectedLog.old_values && (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Nilai Lama (Old Values):</p>
                  <pre className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Nilai Baru (New Values):</p>
                  <pre className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
