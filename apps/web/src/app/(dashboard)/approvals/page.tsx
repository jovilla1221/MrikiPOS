'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useApprovals, useMyApprovals, useApproveRequest, useRejectRequest } from '@/hooks/use-approvals';
import { ApprovalType, ApprovalStatus } from '@mrikipos/shared-types';
import { CheckCircle2, XCircle, Clock, Check, X, Eye } from 'lucide-react';

export default function ApprovalsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState<'pending' | 'history' | 'mine'>('pending');

  const isManagerOrOwner = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const pendingQuery = useApprovals({ status: ApprovalStatus.PENDING });
  const historyQuery = useApprovals({ status: undefined });
  const mineQuery = useMyApprovals();

  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const [selectedApproval, setSelectedApproval] = React.useState<any>(null);
  const [decisionCatatan, setDecisionCatatan] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');

  const currentData = React.useMemo(() => {
    if (activeTab === 'pending') return (pendingQuery.data as any)?.data || [];
    if (activeTab === 'history') return ((historyQuery.data as any)?.data || []).filter((a: any) => a.status !== ApprovalStatus.PENDING);
    return (mineQuery.data as any)?.data || [];
  }, [activeTab, pendingQuery.data, historyQuery.data, mineQuery.data]);

  const isLoading = activeTab === 'pending' ? pendingQuery.isLoading : activeTab === 'history' ? historyQuery.isLoading : mineQuery.isLoading;

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setErrorMsg('');
    try {
      await approveMutation.mutateAsync({
        id: selectedApproval.id,
        payload: { catatan: decisionCatatan },
      });
      setSelectedApproval(null);
      setDecisionCatatan('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyetujui permintaan');
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    setErrorMsg('');
    try {
      await rejectMutation.mutateAsync({
        id: selectedApproval.id,
        payload: { catatan: decisionCatatan },
      });
      setSelectedApproval(null);
      setDecisionCatatan('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menolak permintaan');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          Approval Workflow
        </h1>
        <p className="text-sm text-slate-500">Persetujuan untuk void transaksi, penyesuaian harga, dan penutupan shift.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        {isManagerOrOwner && (
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Menunggu Persetujuan
          </button>
        )}
        {isManagerOrOwner && (
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Riwayat Decision
          </button>
        )}
        <button
          onClick={() => setActiveTab('mine')}
          className={`pb-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'mine'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Permintaan Saya
        </button>
      </div>

      {/* Content List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Memuat data approval...</div>
        ) : currentData.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Tidak ada permintaan approval.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {currentData.map((item: any) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {item.type}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}>
                      {item.status === 'PENDING' && <Clock className="h-3 w-3" />}
                      {item.status === 'APPROVED' && <Check className="h-3 w-3" />}
                      {item.status === 'REJECTED' && <X className="h-3 w-3" />}
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Pemohon: {item.requester?.nama || 'Sistem'} ({item.requester?.role})
                  </p>
                  <p className="text-xs text-slate-500">
                    Catatan: {item.catatan || '-'} • {new Date(item.created_at).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedApproval(item);
                      setDecisionCatatan('');
                      setErrorMsg('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    Detail & Aksi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detail & Decision */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Detail Request #{selectedApproval.id.slice(0, 8)}
              </h3>
              <button onClick={() => setSelectedApproval(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <p><span className="font-semibold">Tipe:</span> {selectedApproval.type}</p>
              <p><span className="font-semibold">Pemohon:</span> {selectedApproval.requester?.nama}</p>
              <p><span className="font-semibold">Referensi ID:</span> {selectedApproval.reference_id}</p>
              <p><span className="font-semibold">Catatan:</span> {selectedApproval.catatan || '-'}</p>

              {selectedApproval.metadata && (
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Metadata Payload:</p>
                  <pre className="font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(selectedApproval.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {selectedApproval.status === 'PENDING' && isManagerOrOwner && selectedApproval.requested_by !== user?.id && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Keputusan</label>
                  <input
                    type="text"
                    value={decisionCatatan}
                    onChange={(e) => setDecisionCatatan(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 text-sm"
                    placeholder="Alasan persetujuan / penolakan..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleReject}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                  >
                    <XCircle className="h-4 w-4" />
                    Tolak (Reject)
                  </button>
                  <button
                    onClick={handleApprove}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Setujui (Approve)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
