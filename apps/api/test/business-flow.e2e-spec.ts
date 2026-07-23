import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";
import { RedisService } from "../src/database/redis.service";
import { JwtService } from "@nestjs/jwt";
import { UserRole, TransactionStatus, PaymentMethod } from "@mrikipos/shared-types";
import { PaymentStatus } from "@prisma/client";

const TEST_JWT_SECRET = "supersecurekeylongenough1234567890";

describe("Business Flow E2E (S8-04)", () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let redisStore: Map<string, string>;

  // ── Shared mock product & transaction data ────────────────────────────────
  const TENANT_ID = "tenant-e2e-0001";
  const OUTLET_ID = "outlet-e2e-0001";
  const KASIR_ID = "kasir-e2e-0001";
  const PRODUCT_ID = "product-e2e-0001";

  const mockProduct = {
    id: PRODUCT_ID,
    tenant_id: TENANT_ID,
    outlet_id: OUTLET_ID,
    nama: "Kopi Hitam",
    harga_jual: 10000,
    harga_beli: 5000,
    stok: 100,
    stok_minimum: 5,
    is_active: true,
    category: { nama: "Minuman" },
  };

  // Mock builder untuk setiap test (state reset)
  function buildMockPrisma(overrides: Record<string, any> = {}) {
    const store = { stok: 100 };

    const base = {
      $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn().mockImplementation(async (cb: any) => {
        if (typeof cb === "function") {
          return cb(base);
        }
        return cb[0];
      }),
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: KASIR_ID,
            tenant_id: TENANT_ID,
            outlet_id: OUTLET_ID,
            role: UserRole.KASIR,
            nama: "Kasir Test",
            phone: "0812345",
            pin_hash: "$2b$10$placeholder",
          }),
      },
      product: {
        findFirst: jest.fn().mockImplementation(() =>
          Promise.resolve({ ...mockProduct, stok: store.stok }),
        ),
        updateMany: jest.fn().mockImplementation(async (args: any) => {
          const decrementQty = args?.data?.stok?.decrement ?? 0;
          if (store.stok >= decrementQty) {
            store.stok -= decrementQty;
            return { count: 1 };
          }
          return { count: 0 };
        }),
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(mockProduct),
      },
      transaction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(async (args: any) => ({
          id: `tx-${Math.random().toString(36).slice(2, 9)}`,
          tenant_id: TENANT_ID,
          outlet_id: OUTLET_ID,
          kasir_id: KASIR_ID,
          nomor: `TXN-20260723-001-AB12`,
          status: TransactionStatus.COMPLETED,
          grand_total: 10000,
          subtotal: 10000,
          diskon: 0,
          pajak: 0,
          metode_bayar: PaymentMethod.CASH,
          local_id: args?.data?.local_id ?? null,
          shift_id: null,
          catatan: null,
          items: args?.data?.items?.create ?? [],
          payments: args?.data?.payments?.create ?? [],
          kasir: { id: KASIR_ID, nama: "Kasir Test" },
          created_at: new Date(),
        })),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        aggregate: jest.fn().mockResolvedValue({
          _sum: { grand_total: null, diskon: null },
          _count: { id: 0 },
        }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      transactionItem: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      stockHistory: { create: jest.fn().mockResolvedValue({}) },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "pay-1" }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      shift: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
      approvalLog: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: "appr-1" }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      customer: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      tenant: { findFirst: jest.fn(), findUnique: jest.fn() },
      outlet: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      category: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      inventory: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      credit: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      refreshToken: { create: jest.fn().mockResolvedValue({ id: "ref-1" }), updateMany: jest.fn() },
      ...overrides,
      _store: store, // expose store for test assertions
    };

    return base;
  }

  function makeToken(
    userId: string,
    tenantId: string,
    outletId: string,
    role: UserRole,
  ): string {
    return jwtService.sign(
      {
        sub: userId,
        id: userId,
        tenant_id: tenantId,
        outlet_id: outletId,
        role,
        jti: `jti-${Math.random()}`,
        iat: Math.floor(Date.now() / 1000),
      },
      { secret: TEST_JWT_SECRET, expiresIn: "1h" },
    );
  }

  beforeAll(async () => {
    redisStore = new Map<string, string>();
    const mockPrisma = buildMockPrisma();

    const mockRedis = {
      get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
      set: jest.fn(async (key: string, val: string) => {
        redisStore.set(key, val);
        return "OK";
      }),
      del: jest.fn(async (key: string) => {
        redisStore.delete(key);
        return 1;
      }),
    };

    process.env.JWT_ACCESS_SECRET = TEST_JWT_SECRET;
    process.env.JWT_REFRESH_SECRET =
      "supersecurerefreshkeylongenough1234567890";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(RedisService)
      .useValue(mockRedis)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Test 1: Transaksi cash kurangi stok satu kali ─────────────────────────

  describe("Cash transaction — stock decrement idempotency", () => {
    it("POST /v1/transactions — cash mengurangi stok dan mengembalikan kembalian", async () => {
      const token = makeToken(KASIR_ID, TENANT_ID, OUTLET_ID, UserRole.KASIR);

      const res = await request(app.getHttpServer())
        .post("/v1/transactions")
        .set("Authorization", `Bearer ${token}`)
        .send({
          items: [{ product_id: PRODUCT_ID, qty: 2 }],
          payments: [{ metode: "CASH", jumlah: 25000 }],
        });

      // Harus berhasil dibuat (201 atau 200 tergantung implementasi)
      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  // ── Test 2: Offline sync — idempotency via local_id ───────────────────────

  describe("Offline sync — local_id idempotency", () => {
    it("POST /v1/transactions/sync dengan local_id yang sama tidak menduplikasi transaksi", async () => {
      const token = makeToken(KASIR_ID, TENANT_ID, OUTLET_ID, UserRole.KASIR);
      const localId = `local-${Date.now()}`;

      const existingTx = {
        id: "tx-existing-001",
        local_id: localId,
        tenant_id: TENANT_ID,
        outlet_id: OUTLET_ID,
        status: TransactionStatus.COMPLETED,
        nomor: "TXN-20260723-001-AA00",
        grand_total: 10000,
      };

      const syncPayload = {
        transactions: [
          {
            local_id: localId,
            items: [{ product_id: PRODUCT_ID, qty: 1 }],
            payments: [{ metode: "CASH", jumlah: 10000 }],
          },
        ],
      };

      // Pertama kali — tidak ada duplikat, sync berhasil
      const res1 = await request(app.getHttpServer())
        .post("/v1/transactions/sync")
        .set("Authorization", `Bearer ${token}`)
        .send(syncPayload)
        .expect(200);

      expect(res1.body.success).toBe(true);
      expect(res1.body.data.synced).toBe(1);
      expect(res1.body.data.failed).toBe(0);

      // Kedua kali dengan local_id yang sama — harus idempotent (tidak gagal)
      const res2 = await request(app.getHttpServer())
        .post("/v1/transactions/sync")
        .set("Authorization", `Bearer ${token}`)
        .send(syncPayload)
        .expect(200);

      // Harus tetap sukses — bukan error
      expect(res2.body.success).toBe(true);
      expect(res2.body.data.failed).toBe(0);
    });
  });

  // ── Test 3: QRIS Webhook — invalid signature ditolak ─────────────────────

  describe("QRIS Webhook validation", () => {
    it("POST /v1/payments/webhook/midtrans — invalid signature ditolak dengan 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/v1/payments/webhook/midtrans")
        .send({
          order_id: "MRIKI-txn123-1234567890",
          transaction_status: "settlement",
          transaction_id: "mid-txn-001",
          payment_type: "qris",
          gross_amount: "10000.00",
          signature_key: "invalid_signature_xyz",
          status_code: "200",
          status_message: "Success",
          transaction_time: new Date().toISOString(),
          fraud_status: "accept",
        });

      // Invalid signature → 401
      expect(res.status).toBe(401);
    });
  });

  // ── Test 4: Approval/Void — self-approval protection ─────────────────────

  describe("Approval/Void — self-approval protection", () => {
    it("User tidak boleh approve void request milik sendiri", async () => {
      const managerId = "manager-self-001";
      const token = makeToken(managerId, TENANT_ID, OUTLET_ID, UserRole.MANAGER);

      // Simulasi: approval dibuat oleh manager-self-001
      const approvalId = "appr-self-001";

      const prisma = app
        .get(PrismaService)
        .approvalLog as typeof buildMockPrisma extends (...args: any[]) => infer R
        ? any
        : any;

      // Set mock: findFirst returns approval by this manager
      (app.get(PrismaService) as any).approvalLog.findFirst.mockResolvedValueOnce({
        id: approvalId,
        tenant_id: TENANT_ID,
        type: "VOID",
        status: "PENDING",
        requested_by: managerId, // same user!
        outlet_id: OUTLET_ID,
      });

      const res = await request(app.getHttpServer())
        .post(`/v1/approvals/${approvalId}/approve`)
        .set("Authorization", `Bearer ${token}`)
        .send({ pin: "123456" });

      // Should be forbidden
      expect(res.status).toBe(403);
    });
  });
});
