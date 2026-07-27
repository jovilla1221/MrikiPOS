import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

async function seedTenant(
  namaTenant: string,
  phoneOwner: string,
  phoneKasir: string,
  alamatOutlet: string,
  categories: string[],
  productsBase: { nama: string; harga: number; satuan: string }[],
  sharedPinHash: string,
) {
  console.log(`🌱 Seeding tenant: ${namaTenant}...`);

  const tenant = await prisma.tenant.create({
    data: {
      nama: namaTenant,
      phone: phoneOwner,
      plan: 'FREE',
      status: 'ACTIVE',
      settings: {
        receipt_header: namaTenant,
        receipt_footer: `Terima kasih!\nCS: ${phoneOwner}`,
        currency: 'IDR',
        timezone: 'Asia/Jakarta',
      },
    },
  });

  const outlet = await prisma.outlet.create({
    data: {
      tenant_id: tenant.id,
      nama: 'Cabang Utama',
      alamat: alamatOutlet,
      kelurahan: 'Kepanjenkidul',
      kecamatan: 'Kepanjenkidul',
    },
  });

  await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      outlet_id: outlet.id,
      nama: 'Owner ' + namaTenant,
      phone: phoneOwner,
      pin_hash: sharedPinHash,
      role: 'OWNER',
    },
  });

  await prisma.user.create({
    data: {
      tenant_id: tenant.id,
      outlet_id: outlet.id,
      nama: 'Kasir ' + namaTenant,
      phone: phoneKasir,
      pin_hash: sharedPinHash,
      role: 'KASIR',
    },
  });

  const createdCategories: Record<string, string> = {};
  for (let i = 0; i < categories.length; i++) {
    const cat = await prisma.category.create({
      data: { tenant_id: tenant.id, outlet_id: outlet.id, nama: categories[i], sort_order: i + 1 },
    });
    createdCategories[categories[i]] = cat.id;
  }

  // Create 55 products in batch
  const productsData: Prisma.ProductCreateManyInput[] = [];
  for (let i = 0; i < 55; i++) {
    const base = productsBase[i % productsBase.length];
    const catId = createdCategories[categories[i % categories.length]];

    const variantSuffix =
      i >= productsBase.length ? ` (Var ${Math.floor(i / productsBase.length)})` : '';
    const harga_jual = base.harga + (i % 5) * 1000;

    let stok = 100 - i;
    if (i % 10 === 0) stok = 3;
    if (i % 15 === 0) stok = 0;

    const is_active = i % 20 !== 0;

    productsData.push({
      tenant_id: tenant.id,
      outlet_id: outlet.id,
      category_id: catId,
      nama: base.nama + variantSuffix,
      sku: `PRD-${(i + 1).toString().padStart(3, '0')}`,
      harga_jual,
      stok,
      satuan: base.satuan,
      is_active,
    });
  }

  await prisma.product.createMany({
    data: productsData,
  });

  console.log(`✅ Tenant ${namaTenant} seeded with 55 products.`);
}

async function main() {
  console.log('🚀 Starting UAT seed...');

  // Optional: clear specific UAT tenants if needed or clear all (for a fresh UAT env)
  await prisma.transactionItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.stockHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.tenant.deleteMany();

  const sharedPinHash = await bcrypt.hash('123456', BCRYPT_COST);

  // Tenant 1: Toko Kelontong
  await seedTenant(
    'Toko Kelontong Sido Makmur',
    '081100000001',
    '081100000002',
    'Jl. Kelud No. 10, Blitar',
    ['Sembako', 'Minuman Ringan', 'Snack', 'Keperluan Mandi', 'Lain-lain'],
    [
      { nama: 'Beras Mentik 5kg', harga: 65000, satuan: 'Sak' },
      { nama: 'Gula Pasir 1kg', harga: 16000, satuan: 'Kg' },
      { nama: 'Minyak Goreng 2L', harga: 32000, satuan: 'Pouch' },
      { nama: 'Indomie Goreng', harga: 3000, satuan: 'Bungkus' },
      { nama: 'Kopi Kapal Api', harga: 15000, satuan: 'Renceng' },
      { nama: 'Teh Pucuk 350ml', harga: 3500, satuan: 'Botol' },
      { nama: 'Aqua 600ml', harga: 3000, satuan: 'Botol' },
      { nama: 'Taro Snack', harga: 5000, satuan: 'Bungkus' },
      { nama: 'Sabun Lifebuoy', harga: 4000, satuan: 'Batang' },
      { nama: 'Shampoo Clear', harga: 20000, satuan: 'Botol' },
    ],
    sharedPinHash,
  );

  // Tenant 2: Warkop Kopi Pagi
  await seedTenant(
    'Warkop Kopi Pagi',
    '082200000001',
    '082200000002',
    'Jl. Merdeka No. 55, Blitar',
    ['Kopi', 'Minuman Es', 'Makan Berat', 'Gorengan'],
    [
      { nama: 'Kopi Hitam', harga: 4000, satuan: 'Gelas' },
      { nama: 'Kopi Susu', harga: 5000, satuan: 'Gelas' },
      { nama: 'Es Jeruk', harga: 5000, satuan: 'Gelas' },
      { nama: 'Es Teh Manis', harga: 4000, satuan: 'Gelas' },
      { nama: 'Indomie Telur', harga: 10000, satuan: 'Porsi' },
      { nama: 'Nasi Bungkus', harga: 8000, satuan: 'Bungkus' },
      { nama: 'Tempe Mendoan', harga: 1000, satuan: 'Biji' },
      { nama: 'Tahu Isi', harga: 1000, satuan: 'Biji' },
      { nama: 'Pisang Goreng', harga: 1500, satuan: 'Biji' },
      { nama: 'Kopi Jahe', harga: 6000, satuan: 'Gelas' },
    ],
    sharedPinHash,
  );

  // Tenant 3: Toko Bangunan Baja Perkasa
  await seedTenant(
    'Toko Bangunan Baja Perkasa',
    '083300000001',
    '083300000002',
    'Jl. Cemara No. 99, Blitar',
    ['Semen', 'Besi', 'Cat', 'Alat Tukang', 'Material Dasar'],
    [
      { nama: 'Semen Gresik 40kg', harga: 50000, satuan: 'Sak' },
      { nama: 'Semen Tiga Roda 40kg', harga: 49000, satuan: 'Sak' },
      { nama: 'Besi Beton 8mm', harga: 45000, satuan: 'Lonjor' },
      { nama: 'Besi Beton 10mm', harga: 65000, satuan: 'Lonjor' },
      { nama: 'Cat Avian 1kg', harga: 55000, satuan: 'Kaleng' },
      { nama: 'Cat Dulux 5kg', harga: 150000, satuan: 'Galon' },
      { nama: 'Paku 5cm', harga: 15000, satuan: 'Kg' },
      { nama: 'Palu Tekiro', harga: 60000, satuan: 'Pcs' },
      { nama: 'Pasir Lumajang', harga: 250000, satuan: 'Pick Up' },
      { nama: 'Bata Merah', harga: 700, satuan: 'Biji' },
    ],
    sharedPinHash,
  );

  console.log('✅ UAT Seed completed successfully!');
  console.log(`
  Login Info:
  Toko Kelontong Sido Makmur: Owner (081100000001), Kasir (081100000002)
  Warkop Kopi Pagi: Owner (082200000001), Kasir (082200000002)
  Toko Bangunan Baja Perkasa: Owner (083300000001), Kasir (083300000002)
  Semua PIN: 123456
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding UAT data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
