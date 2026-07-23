import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as xlsx from 'xlsx';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importProducts(
    file: Express.Multer.File,
    mode: 'create' | 'upsert',
    tenantId: string,
    outletId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File tidak ditemukan');
    }

    // Parse the file
    let workbook;
    try {
      workbook = xlsx.read(file.buffer, { type: 'buffer' });
    } catch (e) {
      this.logger.error('Failed to parse excel file', e);
      throw new BadRequestException(
        'Gagal membaca file excel. Pastikan formatnya benar (.xlsx atau .csv)',
      );
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('File excel kosong');

    const worksheet = workbook.Sheets[sheetName];
    // Use header: 1 to get an array of arrays to find column indexes manually or header: 'A' or use natural headers
    const rawData = xlsx.utils.sheet_to_json<any>(worksheet, { defval: '' });

    if (rawData.length === 0) {
      throw new BadRequestException('Tidak ada data yang ditemukan di dalam sheet');
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { row: number; field: string; message: string }[] = [];

    // Process rows sequentially to avoid flooding the DB
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNumber = i + 2; // Assuming row 1 is header

      const getVal = (keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
            return row[k];
          }
        }
        return undefined;
      };

      const nama = getVal(['nama', 'Nama', 'NAMA', 'nama_produk', 'Nama Produk']);
      const sku = getVal(['sku', 'SKU']);
      const barcode = getVal(['barcode', 'Barcode', 'BARCODE'])?.toString();
      const harga_jualStr = getVal(['harga_jual', 'Harga Jual', 'harga', 'Harga']);
      const stokStr = getVal(['stok', 'Stok', 'qty', 'Qty']);
      const satuan = getVal(['satuan', 'Satuan']);

      if (!nama) {
        errors.push({ row: rowNumber, field: 'nama', message: 'Nama produk wajib diisi' });
        skipped++;
        continue;
      }

      const harga_jual = Number(harga_jualStr);
      if (isNaN(harga_jual) || harga_jual < 0) {
        errors.push({ row: rowNumber, field: 'harga_jual', message: 'Harga jual tidak valid' });
        skipped++;
        continue;
      }

      const stok = stokStr ? Number(stokStr) : 0;
      if (isNaN(stok) || stok < 0) {
        errors.push({ row: rowNumber, field: 'stok', message: 'Stok tidak valid' });
        skipped++;
        continue;
      }

      // Check existence if barcode or sku provided
      let existingProduct: any = null;

      try {
        if (mode === 'upsert' && (barcode || sku)) {
          existingProduct = await this.prisma.product.findFirst({
            where: {
              tenant_id: tenantId,
              OR: [...(barcode ? [{ barcode }] : []), ...(sku ? [{ sku }] : [])],
            },
          });
        } else if (mode === 'create' && (barcode || sku)) {
          // still need to check uniqueness to prevent error
          const dup = await this.prisma.product.findFirst({
            where: {
              tenant_id: tenantId,
              OR: [...(barcode ? [{ barcode }] : []), ...(sku ? [{ sku }] : [])],
            },
          });
          if (dup) {
            errors.push({
              row: rowNumber,
              field: 'barcode/sku',
              message: 'Barcode atau SKU sudah digunakan produk lain',
            });
            skipped++;
            continue;
          }
        }

        if (existingProduct && mode === 'upsert') {
          // Update
          await this.prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              nama,
              harga_jual,
              // don't update stock on upsert generally, or maybe we do? Let's just update fields
              satuan: satuan || existingProduct.satuan,
            },
          });
          updated++;
        } else {
          // Create
          await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
              data: {
                tenant_id: tenantId,
                outlet_id: outletId,
                nama,
                harga_jual,
                stok,
                stok_minimum: 5,
                barcode: barcode || null,
                sku: sku || null,
                satuan: satuan || null,
              },
            });

            if (stok > 0) {
              await tx.stockHistory.create({
                data: {
                  tenant_id: tenantId,
                  outlet_id: outletId,
                  product_id: product.id,
                  tipe: 'IN',
                  qty: stok,
                  stok_sebelum: 0,
                  stok_sesudah: stok,
                  keterangan: 'Import excel',
                },
              });
            }
          });
          created++;
        }
      } catch (err: any) {
        this.logger.error(`Error importing row ${rowNumber}:`, err);
        errors.push({ row: rowNumber, field: 'db', message: 'Gagal menyimpan data ke database' });
        skipped++;
      }
    }

    return {
      total_rows: rawData.length,
      created,
      updated,
      skipped,
      errors,
    };
  }
}
