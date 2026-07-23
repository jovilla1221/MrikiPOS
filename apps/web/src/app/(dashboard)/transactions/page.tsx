'use client';

import * as React from 'react';
import { useTransactions } from '@/hooks/use-transactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { Search, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TransactionStatus } from '@mrikipos/shared-types';

export default function TransactionsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState('');

  const { data: transactionsData, isLoading } = useTransactions({
    search,
    limit: 50,
  });

  const transactions = transactionsData || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return <Badge variant="success">Selesai</Badge>;
      case TransactionStatus.VOIDED:
        return <Badge variant="error">Void</Badge>;
      case TransactionStatus.REFUNDED:
        return <Badge variant="warning">Refund</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Riwayat Transaksi</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <div className="flex w-full max-w-sm items-center space-x-2 pt-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder="Cari nomor transaksi..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-slate-500">Memuat data...</div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500">Tidak ada transaksi ditemukan.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kasir</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn: any) => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-medium">{txn.nomor}</TableCell>
                    <TableCell>{formatDate(txn.created_at)}</TableCell>
                    <TableCell>{txn.kasir?.nama || '-'}</TableCell>
                    <TableCell>{txn.metode_bayar}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(txn.grand_total)}</TableCell>
                    <TableCell>{getStatusBadge(txn.status)}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => router.push(`/transactions/${txn.id}`)}
                        className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-slate-800 dark:hover:text-slate-50"
                      >
                        <Eye className="h-4 w-4 mr-1" /> Detail
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
