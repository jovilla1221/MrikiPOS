'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useUsers, useCreateUser, useUpdateUser, useResetUserPin, useSetUserStatus } from '@/hooks/use-users';
import { UserRole } from '@mrikipos/shared-types';
import { Users, Plus, ShieldAlert, KeyRound, UserCheck, UserX, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const { data: usersResponse, isLoading } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const resetPinMutation = useResetUserPin();
  const setStatusMutation = useSetUserStatus();

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<any>(null);
  const [isResetPinOpen, setIsResetPinOpen] = React.useState(false);

  // Form states
  const [formNama, setFormNama] = React.useState('');
  const [formPhone, setFormPhone] = React.useState('');
  const [formPin, setFormPin] = React.useState('');
  const [formRole, setFormRole] = React.useState<UserRole>(UserRole.KASIR);
  const [formOutletId, setFormOutletId] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [newPin, setNewPin] = React.useState('');

  const users = (usersResponse as any)?.data || [];

  if (currentUser?.role !== 'OWNER') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="h-16 w-16 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Akses Dibatasi (403)</h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md">
          Halaman Kelola User hanya dapat diakses oleh pengguna dengan role OWNER.
        </p>
      </div>
    );
  }

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 8) return phone;
    return `${phone.slice(0, 4)}****${phone.slice(-4)}`;
  };

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setFormNama('');
    setFormPhone('');
    setFormPin('');
    setFormRole(UserRole.KASIR);
    setFormOutletId(currentUser?.outlet_id || '');
    setErrorMsg('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setFormNama(user.nama);
    setFormPhone(user.phone);
    setFormRole(user.role);
    setFormOutletId(user.outlet_id);
    setErrorMsg('');
    setIsAddOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (selectedUser) {
        await updateUserMutation.mutateAsync({
          id: selectedUser.id,
          payload: {
            nama: formNama,
            phone: formPhone,
            role: formRole,
            outlet_id: formOutletId,
          },
        });
      } else {
        await createUserMutation.mutateAsync({
          nama: formNama,
          phone: formPhone,
          pin: formPin,
          role: formRole,
          outlet_id: formOutletId || currentUser?.outlet_id || '',
        });
      }
      setIsAddOpen(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan data user');
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg('');

    try {
      await resetPinMutation.mutateAsync({
        id: selectedUser.id,
        payload: { new_pin: newPin },
      });
      setIsResetPinOpen(false);
      setNewPin('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mereset PIN user');
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      await setStatusMutation.mutateAsync({
        id: user.id,
        is_active: !user.is_active,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengubah status user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-7 w-7 text-emerald-600" />
            Kelola User
          </h1>
          <p className="text-sm text-slate-500">Kelola daftar akun pengguna, hak akses role, dan status aktif.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Tambah User
        </button>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Memuat data user...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Belum ada user terdaftar.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">No. Telepon</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Outlet</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">{u.nama}</td>
                    <td className="px-4 py-3.5 font-mono">{maskPhone(u.phone)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === 'OWNER' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                        u.role === 'MANAGER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        u.role === 'KASIR' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{u.outlet?.nama || '-'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {u.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setNewPin('');
                          setErrorMsg('');
                          setIsResetPinOpen(true);
                        }}
                        className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg transition-colors"
                        title="Reset PIN"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={u.is_active ? 'Nonaktifkan User' : 'Aktifkan User'}
                      >
                        {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {selectedUser ? 'Edit User' : 'Tambah User Baru'}
            </h3>

            {errorMsg && (
              <div className="p-3 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">No. Telepon (WA)</label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="Contoh: 081234567890"
                />
              </div>

              {!selectedUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">PIN (6 Digit)</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono tracking-widest"
                    placeholder="123456"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                >
                  <option value={UserRole.KASIR}>KASIR</option>
                  <option value={UserRole.MANAGER}>MANAGER</option>
                  <option value={UserRole.STAFF}>STAFF</option>
                  <option value={UserRole.OWNER}>OWNER</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {isResetPinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Reset PIN: {selectedUser?.nama}
            </h3>

            {errorMsg && (
              <div className="p-3 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleResetPin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">PIN Baru (6 Digit)</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 font-mono tracking-widest"
                  placeholder="6 digit angka"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPinOpen(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
                >
                  Reset PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
