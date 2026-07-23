import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Bersihkan database terlebih dahulu (hati-hati, hanya untuk DEV/SEED)
  await prisma.transactionItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.stockHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.tenant.deleteMany();

  // 2. Buat Tenant & Outlet
  const tenant = await prisma.tenant.create({
    data: {
      nama: 'Warung Nasi Pecel Bu Siti',
      phone: '081234567890',
      plan: 'FREE',
      status: 'ACTIVE',
      settings: {
        receipt_header: 'Warung Nasi Pecel Bu Siti',
        receipt_footer: 'Terima kasih telah berkunjung!\nLayanan Kritik & Saran: 0812-3456-7890',
        currency: 'IDR',
        timezone: 'Asia/Jakarta',
      },
    },
  });

  const outlet = await prisma.outlet.create({
    data: {
      tenant_id: tenant.id,
      nama: 'Cabang Utama (Pasar Legi)',
      alamat: 'Jl. Pasar Legi No. 5',
      kelurahan: 'Sananwetan',
      kecamatan: 'Sananwetan',
    },
  });

  // 3. Buat Users (Owner & Kasir)
  const pinHash = await bcrypt.hash('123456', BCRYPT_COST);

  const owner = await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      outlet_id: outlet.id,
      nama: 'Bu Siti (Owner)',
      phone: '081234567890',
      pin_hash: pinHash,
      role: 'OWNER',
    },
  });

  const kasir = await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      outlet_id: outlet.id,
      nama: 'Andi (Kasir)',
      phone: '089876543210',
      pin_hash: pinHash,
      role: 'KASIR',
    },
  });

  // 4. Buat Kategori
  const katMakanan = await prisma.category.create({
    data: { tenant_id: tenant.id, outlet_id: outlet.id, nama: 'Makanan', sort_order: 1 },
  });

  const katMinuman = await prisma.category.create({
    data: { tenant_id: tenant.id, outlet_id: outlet.id, nama: 'Minuman', sort_order: 2 },
  });

  const katSnack = await prisma.category.create({
    data: { tenant_id: tenant.id, outlet_id: outlet.id, nama: 'Snack', sort_order: 3 },
  });

  const katLainnya = await prisma.category.create({
    data: { tenant_id: tenant.id, outlet_id: outlet.id, nama: 'Lainnya', sort_order: 4 },
  });

  // 5. Buat Produk Dummy (Khas UMKM Blitar)
  const productsData = [
    { nama: 'Nasi Pecel Biasa', harga_jual: 10000, stok: 50, kat: katMakanan.id, satuan: 'Porsi' },
    {
      nama: 'Nasi Pecel Telur Dadar',
      harga_jual: 14000,
      stok: 45,
      kat: katMakanan.id,
      satuan: 'Porsi',
    },
    {
      nama: 'Nasi Pecel Ayam Goreng',
      harga_jual: 18000,
      stok: 30,
      kat: katMakanan.id,
      satuan: 'Porsi',
    },
    { nama: 'Nasi Campur', harga_jual: 12000, stok: 40, kat: katMakanan.id, satuan: 'Porsi' },
    { nama: 'Es Teh Manis', harga_jual: 4000, stok: 100, kat: katMinuman.id, satuan: 'Gelas' },
    { nama: 'Teh Hangat', harga_jual: 3000, stok: 100, kat: katMinuman.id, satuan: 'Gelas' },
    { nama: 'Es Jeruk', harga_jual: 5000, stok: 80, kat: katMinuman.id, satuan: 'Gelas' },
    { nama: 'Jeruk Hangat', harga_jual: 4000, stok: 80, kat: katMinuman.id, satuan: 'Gelas' },
    { nama: 'Es Dawet / Cendol', harga_jual: 7000, stok: 50, kat: katMinuman.id, satuan: 'Gelas' },
    {
      nama: 'Kopi Hitam Khas Blitar',
      harga_jual: 5000,
      stok: 60,
      kat: katMinuman.id,
      satuan: 'Cangkir',
    },
    { nama: 'Rempeyek Kacang', harga_jual: 2000, stok: 200, kat: katSnack.id, satuan: 'Bungkus' },
    { nama: 'Rempeyek Teri', harga_jual: 2500, stok: 150, kat: katSnack.id, satuan: 'Bungkus' },
    { nama: 'Kerupuk Bawang', harga_jual: 1000, stok: 300, kat: katSnack.id, satuan: 'Biji' },
    { nama: 'Telur Asin', harga_jual: 5000, stok: 40, kat: katLainnya.id, satuan: 'Butir' },
    { nama: 'Sate Usus', harga_jual: 2000, stok: 80, kat: katLainnya.id, satuan: 'Tusuk' },
    { nama: 'Sate Telur Puyuh', harga_jual: 3000, stok: 60, kat: katLainnya.id, satuan: 'Tusuk' },
  ];

  for (let i = 0; i < productsData.length; i++) {
    const p = productsData[i];
    await prisma.product.create({
      data: {
        tenant_id: tenant.id,
        outlet_id: outlet.id,
        category_id: p.kat,
        nama: p.nama,
        sku: `PRD-${(i + 1).toString().padStart(3, '0')}`,
        harga_jual: p.harga_jual,
        stok: p.stok,
        satuan: p.satuan,
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log(`
  Login Info:
  - Phone (Owner): 081234567890
  - Phone (Kasir): 089876543210
  - PIN (All): 123456
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
