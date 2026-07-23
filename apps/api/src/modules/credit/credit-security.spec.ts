import { Test, TestingModule } from '@nestjs/testing';
import { CreditService } from './credit.service';
import { PrismaService } from '../../database/prisma.service';
import { WhatsAppService } from '../../integrations/whatsapp/whatsapp.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreditStatus } from '@prisma/client';

describe('CreditService - SEC-CREDIT-001 Concurrency & Isolation', () => {
  let creditService: CreditService;

  let currentSisa = 50000;
  let updateCount = 1;

  const mockPrisma = {
    $transaction: jest.fn((cb) => cb(mockPrisma)),
    customerCredit: {
      findFirst: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          id: 'cred-1',
          tenant_id: 't-1',
          outlet_id: 'o-1',
          customer_id: 'cust-1',
          jumlah: 50000,
          sisa: currentSisa,
          status: currentSisa === 0 ? CreditStatus.PAID : CreditStatus.UNPAID,
          keterangan: null,
          created_at: new Date(),
        });
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        if (currentSisa >= where.sisa.gte) {
          currentSisa -= data.sisa.decrement;
          updateCount++;
          return Promise.resolve({ count: 1 });
        }
        return Promise.resolve({ count: 0 });
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        return Promise.resolve({
          id: 'cred-1',
          tenant_id: 't-1',
          outlet_id: 'o-1',
          customer_id: 'cust-1',
          jumlah: 50000,
          sisa: currentSisa,
          status: data.status,
          customer: { id: 'cust-1', nama: 'Test Customer', phone: '081234567890' },
        });
      }),
    },
    customer: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'cust-1' && where.tenant_id === 't-1' && where.outlet_id === 'o-1') {
          return Promise.resolve({
            id: 'cust-1',
            tenant_id: 't-1',
            outlet_id: 'o-1',
            nama: 'Test Customer',
            phone: '081234567890',
          });
        }
        return Promise.resolve(null);
      }),
    },
  };

  const mockWhatsAppService = {
    sendCreditReminder: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    currentSisa = 50000;
    updateCount = 1;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WhatsAppService, useValue: mockWhatsAppService },
      ],
    }).compile();

    creditService = module.get<CreditService>(CreditService);
  });

  it('should allow exactly 1 payment and reject concurrent overpayment attempt', async () => {
    const payDto = { jumlah_bayar: 50000, catatan: 'Full payment' };

    const results = await Promise.allSettled([
      creditService.pay('cred-1', payDto, 't-1', 'o-1'),
      creditService.pay('cred-1', payDto, 't-1', 'o-1'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);
    expect(currentSisa).toBe(0);
  });

  it('should throw NotFoundException if sending reminder for cross-outlet customer', async () => {
    // Outlet 'o-2' doesn't match customer's outlet 'o-1'
    await expect(
      creditService.sendReminder('cred-1', 't-1', 'o-2'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should successfully send reminder for matching outlet customer', async () => {
    const res = await creditService.sendReminder('cred-1', 't-1', 'o-1');
    expect(res.sent).toBe(true);
    expect(mockWhatsAppService.sendCreditReminder).toHaveBeenCalledWith('081234567890', expect.anything());
  });
});
