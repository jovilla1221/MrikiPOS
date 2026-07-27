import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding 1000+ transactions for benchmark...');

  // Get Tenant 1
  const tenant = await prisma.tenant.findFirst({
    where: { phone: '081100000001' },
    include: { outlets: true, products: true, users: true },
  });

  if (!tenant || tenant.products.length === 0 || tenant.users.length === 0) {
    console.error('❌ Tenant not found or has no products/users. Run seed-uat.ts first.');
    process.exit(1);
  }

  const outletId = tenant.outlets[0].id;
  const kasirId = tenant.users.find((u) => u.role === 'KASIR')?.id || tenant.users[0].id;
  const products = tenant.products;

  console.log(
    `Found tenant ${tenant.nama} with ${products.length} products. Generating 1000 transactions...`,
  );

  const totalTxs = 1050;
  const now = new Date();

  for (let batch = 0; batch < 10; batch++) {
    const batchSize = 105;
    for (let i = 0; i < batchSize; i++) {
      const txIndex = batch * batchSize + i;
      const randomDate = new Date(
        now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
      );

      const p1 = products[txIndex % products.length];
      const p2 = products[(txIndex + 3) % products.length];

      const p1Harga = Number(p1.harga_jual);
      const p2Harga = Number(p2.harga_jual);

      const qty1 = (txIndex % 3) + 1;
      const qty2 = (txIndex % 2) + 1;

      const subtotal = p1Harga * qty1 + p2Harga * qty2;
      const total = subtotal;

      await prisma.transaction.create({
        data: {
          tenant_id: tenant.id,
          outlet_id: outletId,
          kasir_id: kasirId,
          nomor: `INV-BENCH-${(txIndex + 1).toString().padStart(5, '0')}`,
          subtotal,
          diskon: 0,
          pajak: 0,
          grand_total: total,
          metode_bayar: txIndex % 2 === 0 ? 'CASH' : 'QRIS',
          status: 'COMPLETED',
          created_at: randomDate,
          items: {
            create: [
              {
                product_id: p1.id,
                nama_produk: p1.nama,
                harga: p1Harga,
                qty: qty1,
                subtotal: p1Harga * qty1,
              },
              {
                product_id: p2.id,
                nama_produk: p2.nama,
                harga: p2Harga,
                qty: qty2,
                subtotal: p2Harga * qty2,
              },
            ],
          },
          payments: {
            create: [
              {
                metode: txIndex % 2 === 0 ? 'CASH' : 'QRIS',
                jumlah: total,
                status: 'PAID',
              },
            ],
          },
        },
      });
    }
    console.log(`Progress: ${(batch + 1) * 105} / ${totalTxs} transactions created.`);
  }

  console.log('✅ Benchmark transactions created successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding transaction benchmark:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
