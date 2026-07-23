'use client';

import React, { useState } from 'react';
import { useStockHistory, useLowStock } from '@/hooks/use-inventory';
import { ImportExcelForm } from '@/components/inventory/import-excel-form';
import { Button } from '@/components/ui/button';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'low-stock' | 'history' | 'import'>('low-stock');

  const { data: lowStockData, isLoading: loadingLow } = useLowStock();
  const { data: historyData, isLoading: loadingHistory } = useStockHistory();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventory</h1>
        <p className="text-gray-500">Kelola peringatan stok, riwayat mutasi, dan import produk.</p>
      </div>

      <div className="flex space-x-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('low-stock')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'low-stock' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Stok Menipis
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Riwayat Mutasi
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'import' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Import Excel
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'low-stock' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-medium text-gray-900">Produk dengan Stok Menipis</h3>
            </div>
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Stok Saat Ini</th>
                  <th className="px-4 py-3">Batas Minimum</th>
                </tr>
              </thead>
              <tbody>
                {loadingLow ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      Memuat...
                    </td>
                  </tr>
                ) : !lowStockData || lowStockData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      Tidak ada produk dengan stok menipis
                    </td>
                  </tr>
                ) : (
                  lowStockData.map((item: any) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.nama}</td>
                      <td className="px-4 py-3">{item.category?.nama || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="text-red-600 font-bold">{item.stok}</span> {item.satuan}
                      </td>
                      <td className="px-4 py-3">{item.stok_minimum}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Perubahan</th>
                  <th className="px-4 py-3">Stok Akhir</th>
                  <th className="px-4 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      Memuat...
                    </td>
                  </tr>
                ) : !historyData?.data || historyData.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Belum ada riwayat mutasi
                    </td>
                  </tr>
                ) : (
                  historyData.data.map((item: any) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3">
                        {new Date(item.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.product?.nama || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.tipe === 'IN'
                              ? 'bg-green-100 text-green-700'
                              : item.tipe === 'OUT'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {item.tipe}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {item.qty > 0 ? `+${item.qty}` : item.qty}
                      </td>
                      <td className="px-4 py-3">{item.stok_sesudah}</td>
                      <td className="px-4 py-3 text-xs">{item.keterangan || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'import' && <ImportExcelForm />}
      </div>
    </div>
  );
}
