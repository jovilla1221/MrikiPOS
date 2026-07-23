'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useImportProducts } from '@/hooks/use-inventory';
import { toast } from 'sonner';

export function ImportExcelForm() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'create' | 'upsert'>('create');
  const [result, setResult] = useState<any>(null);
  const importMutation = useImportProducts();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Pilih file terlebih dahulu');

    try {
      const res = await importMutation.mutateAsync({ file, mode });
      setResult(res);
      toast.success('Import selesai diproses');
      setFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Gagal melakukan import');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white p-6 rounded-xl border border-gray-100"
      >
        <div>
          <h3 className="text-lg font-medium">Import dari Excel / CSV</h3>
          <p className="text-sm text-gray-500">Pilih file .xlsx atau .csv maksimal 5MB</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Pilih File</label>
          <Input
            type="file"
            accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
            onChange={handleFileChange}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Mode Import</label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="create"
                checked={mode === 'create'}
                onChange={() => setMode('create')}
              />
              <span className="text-sm">Hanya Buat Baru (Abaikan duplikat)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="upsert"
                checked={mode === 'upsert'}
                onChange={() => setMode('upsert')}
              />
              <span className="text-sm">Update jika ada, Buat jika baru</span>
            </label>
          </div>
        </div>

        <Button type="submit" disabled={!file || importMutation.isPending}>
          {importMutation.isPending ? 'Memproses...' : 'Upload & Import'}
        </Button>
      </form>

      {result && (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">Hasil Import</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-3 rounded shadow-sm">
              <p className="text-xs text-gray-500">Total Baris</p>
              <p className="text-xl font-bold">{result.total_rows}</p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <p className="text-xs text-green-500">Dibuat</p>
              <p className="text-xl font-bold">{result.created}</p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <p className="text-xs text-blue-500">Diupdate</p>
              <p className="text-xl font-bold">{result.updated}</p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <p className="text-xs text-red-500">Gagal/Dilewati</p>
              <p className="text-xl font-bold">{result.skipped}</p>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-600 mb-2">Detail Error:</p>
              <ul className="text-xs space-y-1 text-gray-600 max-h-40 overflow-y-auto bg-white p-3 rounded border">
                {result.errors.map((err: any, idx: number) => (
                  <li key={idx}>
                    Baris {err.row} ({err.field}): {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
