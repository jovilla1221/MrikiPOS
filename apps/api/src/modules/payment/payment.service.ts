import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MidtransService } from '../../integrations/midtrans/midtrans.service';
import { MidtransWebhookPayload } from '../../integrations/midtrans/midtrans.types';
import { WhatsAppService } from '../../integrations/whatsapp/whatsapp.service';
import { CreateQrisPaymentDto } from './payment.dto';
import { PaymentMethod, PaymentStatus, TransactionStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly midtransService: MidtransService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  /**
   * Create QRIS payment charge for a pending transaction
   */
  async createQris(dto: CreateQrisPaymentDto, tenantId: string, outletId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: dto.transaction_id,
        tenant_id: tenantId,
        outlet_id: outletId,
      },
      include: {
        items: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new BadRequestException('Transaksi sudah selesai');
    }

    if (transaction.status === TransactionStatus.VOIDED) {
      throw new BadRequestException('Transaksi sudah dibatalkan');
    }

    // Check if there is already a PAID payment for this transaction
    const paidPayment = await this.prisma.payment.findFirst({
      where: {
        transaction_id: transaction.id,
        status: PaymentStatus.PAID,
      },
    });

    if (paidPayment) {
      throw new ConflictException('Transaksi sudah lunas');
    }

    // Check if there is a pending payment with a valid QR code
    const existingPending = await this.prisma.payment.findFirst({
      where: {
        transaction_id: transaction.id,
        metode: PaymentMethod.QRIS,
        status: PaymentStatus.PENDING,
      },
      orderBy: { created_at: 'desc' },
    });

    const now = new Date();
    if (existingPending && existingPending.expires_at && existingPending.expires_at > now) {
      const respJson = existingPending.gateway_response as Record<string, any> | null;
      return {
        payment_id: existingPending.id,
        order_id: existingPending.referensi,
        qr_string: respJson?.qr_string,
        qr_url: respJson?.qr_url,
        expires_at: existingPending.expires_at,
        status: existingPending.status,
        amount: Number(existingPending.jumlah),
      };
    }

    // Amount MUST be taken from server-calculated grand_total
    const grossAmount = Number(transaction.grand_total);
    const orderId = `MRIKI-${transaction.id.substring(0, 8)}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    const chargeResult = await this.midtransService.createQrisCharge({
      orderId,
      grossAmount,
      itemDetails: transaction.items.map((item) => ({
        id: item.product_id,
        price: Number(item.harga),
        quantity: item.qty,
        name: item.nama_produk.substring(0, 50),
      })),
    });

    const payment = await this.prisma.payment.create({
      data: {
        transaction_id: transaction.id,
        metode: PaymentMethod.QRIS,
        jumlah: transaction.grand_total,
        status: PaymentStatus.PENDING,
        referensi: orderId,
        expires_at: expiresAt,
        gateway_response: {
          ...chargeResult.rawResponse,
          qr_string: chargeResult.qrString,
          qr_url: chargeResult.qrUrl,
        },
      },
    });

    return {
      payment_id: payment.id,
      order_id: orderId,
      qr_string: chargeResult.qrString,
      qr_url: chargeResult.qrUrl,
      expires_at: payment.expires_at,
      status: payment.status,
      amount: grossAmount,
    };
  }

  /**
   * Get payment details and polling status
   */
  async getPaymentStatus(paymentId: string, tenantId: string, outletId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        transaction: {
          tenant_id: tenantId,
          outlet_id: outletId,
        },
      },
      include: {
        transaction: {
          select: {
            id: true,
            nomor: true,
            grand_total: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pembayaran tidak ditemukan');
    }

    // Check if expired locally
    if (
      payment.status === PaymentStatus.PENDING &&
      payment.expires_at &&
      payment.expires_at < new Date()
    ) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.EXPIRED },
      });
      payment.status = PaymentStatus.EXPIRED;
    }

    return {
      id: payment.id,
      transaction_id: payment.transaction_id,
      transaction_nomor: payment.transaction.nomor,
      transaction_status: payment.transaction.status,
      status: payment.status,
      metode: payment.metode,
      jumlah: Number(payment.jumlah),
      referensi: payment.referensi,
      expires_at: payment.expires_at,
      paid_at: payment.paid_at,
    };
  }

  /**
   * Get payments for a transaction
   */
  async getPaymentsByTransaction(transactionId: string, tenantId: string, outletId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        tenant_id: tenantId,
        outlet_id: outletId,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaksi tidak ditemukan');
    }

    return this.prisma.payment.findMany({
      where: {
        transaction_id: transactionId,
        transaction: {
          tenant_id: tenantId,
          outlet_id: outletId,
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Handle Midtrans Webhook Callback (Public, Signature Verified, Idempotent)
   */
  async handleWebhook(payload: MidtransWebhookPayload) {
    this.logger.log(
      `Received Midtrans Webhook: order_id=${payload.order_id}, status=${payload.transaction_status}`,
    );

    const isValidSignature = this.midtransService.verifyWebhookSignature(payload);
    if (!isValidSignature) {
      this.logger.warn(`Invalid signature for webhook order_id=${payload.order_id}`);
      throw new UnauthorizedException('Signature webhook Midtrans tidak valid');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { referensi: payload.order_id },
      include: {
        transaction: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            kasir: true,
            tenant: true,
          },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for order_id: ${payload.order_id}`);
      return { success: false, message: 'Payment record not found' };
    }

    // IDEMPOTENCY: If already PAID, return success immediately without duplicating stock decrement
    if (payment.status === PaymentStatus.PAID) {
      this.logger.log(`Payment order_id=${payload.order_id} is already PAID. Skipping.`);
      return { success: true, message: 'Payment already processed (idempotent)' };
    }

    const txnStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;

    let targetPaymentStatus: PaymentStatus = payment.status;

    if (txnStatus === 'settlement' || (txnStatus === 'capture' && fraudStatus === 'accept')) {
      targetPaymentStatus = PaymentStatus.PAID;
    } else if (txnStatus === 'expire') {
      targetPaymentStatus = PaymentStatus.EXPIRED;
    } else if (txnStatus === 'deny' || txnStatus === 'cancel' || txnStatus === 'failure') {
      targetPaymentStatus = PaymentStatus.FAILED;
    }

    if (targetPaymentStatus === PaymentStatus.PAID) {
      let lowStockProducts: Array<{ nama: string; stok: number; stokMinimum: number }> = [];
      let updatedTransaction: any = null;

      // DB Transaction for Atomic State Update & Stock Decrement
      await this.prisma.$transaction(async (tx) => {
        // Re-check payment status inside transaction for double-check lock
        const freshPayment = await tx.payment.findUnique({
          where: { id: payment.id },
        });

        if (freshPayment?.status === PaymentStatus.PAID) {
          return;
        }

        // 1. Update Payment status
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            paid_at: new Date(),
            gateway_response: payload as any,
          },
        });

        // 2. Update Transaction status to COMPLETED
        updatedTransaction = await tx.transaction.update({
          where: { id: payment.transaction_id },
          data: {
            status: TransactionStatus.COMPLETED,
            synced_at: new Date(),
          },
        });

        // 3. Decrement stock & record StockHistory for each item
        for (const item of payment.transaction.items) {
          const product = await tx.product.findUnique({
            where: { id: item.product_id },
          });

          if (product) {
            const stokSebelum = product.stok;
            const stokSesudah = Math.max(0, stokSebelum - item.qty);

            await tx.product.update({
              where: { id: item.product_id },
              data: { stok: stokSesudah },
            });

            await tx.stockHistory.create({
              data: {
                tenant_id: payment.transaction.tenant_id,
                outlet_id: payment.transaction.outlet_id,
                product_id: item.product_id,
                tipe: 'OUT',
                qty: item.qty,
                stok_sebelum: stokSebelum,
                stok_sesudah: stokSesudah,
                keterangan: `Penjualan QRIS #${payment.transaction.nomor}`,
                reference_id: payment.transaction.id,
              },
            });

            if (stokSesudah <= product.stok_minimum) {
              lowStockProducts.push({
                nama: product.nama,
                stok: stokSesudah,
                stokMinimum: product.stok_minimum,
              });
            }
          }
        }
        // 4. Attach shift & update shift total_transaksi (D4b)
        let targetShiftId = payment.transaction.shift_id;

        if (!targetShiftId) {
          const openShift = await tx.shift.findFirst({
            where: {
              tenant_id: payment.transaction.tenant_id,
              outlet_id: payment.transaction.outlet_id,
              user_id: payment.transaction.kasir_id,
              status: 'OPEN',
            },
          });
          if (openShift) {
            targetShiftId = openShift.id;
            await tx.transaction.update({
              where: { id: payment.transaction_id },
              data: { shift_id: openShift.id },
            });
          }
        }

        if (targetShiftId) {
          await tx.shift.update({
            where: { id: targetShiftId },
            data: { total_transaksi: { increment: 1 } },
          });
        }
      });

      this.logger.log(
        `Payment order_id=${payload.order_id} marked as PAID. Transaction ${payment.transaction.nomor} completed.`,
      );

      // Fire-and-forget WhatsApp notifications (won't throw error to webhook response)
      const recipientPhone = payment.transaction.kasir.phone || payment.transaction.tenant.phone;
      if (recipientPhone) {
        this.whatsAppService
          .sendPaymentConfirmed(recipientPhone, {
            nomorTransaksi: payment.transaction.nomor,
            total: Number(payment.transaction.grand_total),
            metode: 'QRIS',
          })
          .catch((err) => this.logger.error(`WA notification error: ${err.message}`));

        if (lowStockProducts.length > 0) {
          this.whatsAppService
            .sendLowStockAlert(recipientPhone, lowStockProducts)
            .catch((err) => this.logger.error(`WA low stock alert error: ${err.message}`));
        }
      }

      return { success: true, message: 'Payment settlement processed successfully' };
    } else {
      // Payment failed or expired
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: targetPaymentStatus,
          gateway_response: payload as any,
        },
      });

      return { success: true, message: `Payment status updated to ${targetPaymentStatus}` };
    }
  }

  /**
   * Development Mock Pay simulation helper
   */
  async mockPay(paymentId: string, tenantId: string, outletId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Mock pay endpoint tidak tersedia di lingkungan production');
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        transaction: {
          tenant_id: tenantId,
          outlet_id: outletId,
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pembayaran tidak ditemukan');
    }

    const payload: MidtransWebhookPayload = {
      transaction_time: new Date().toISOString(),
      transaction_status: 'settlement',
      transaction_id: `MOCK-TXN-${Date.now()}`,
      status_message: 'Success (MOCK PAY)',
      status_code: '200',
      signature_key: 'mock_signature',
      payment_type: 'qris',
      order_id: payment.referensi || `MOCK-${payment.id}`,
      gross_amount: Number(payment.jumlah).toString(),
      fraud_status: 'accept',
    };

    return this.handleWebhook(payload);
  }
}
