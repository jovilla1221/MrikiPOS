import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyMidtransSignature } from './midtrans.signature';
import {
  CreateQrisChargeInput,
  MidtransStatusResponse,
  MidtransWebhookPayload,
  QrisChargeResponse,
} from './midtrans.types';

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);
  private readonly serverKey: string;
  private readonly isProduction: boolean;
  private readonly mockMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY', '');
    const isProdStr = this.configService.get<string>('MIDTRANS_IS_PRODUCTION', 'false');
    this.isProduction = isProdStr === 'true' || isProdStr === '1';

    const hasPlaceholderKey =
      !this.serverKey ||
      this.serverKey === 'your_midtrans_server_key' ||
      this.serverKey.trim() === '';
    const isAppProduction =
      this.configService.get<string>('NODE_ENV', 'development') === 'production';

    // Never bypass payment verification in an application production runtime.
    // A missing sandbox key may enable mock mode only during local development.
    this.mockMode = hasPlaceholderKey && !isAppProduction;

    if (hasPlaceholderKey) {
      this.logger.warn(
        this.mockMode
          ? 'Midtrans server key not set or placeholder detected. Operating in MOCK mode.'
          : 'Midtrans server key not set or placeholder detected. Payment integration is disabled in production.',
      );
    }
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  private getBaseUrl(): string {
    return this.isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';
  }

  private getAuthHeader(): string {
    const authString = `${this.serverKey}:`;
    return `Basic ${Buffer.from(authString).toString('base64')}`;
  }

  async createQrisCharge(input: CreateQrisChargeInput): Promise<QrisChargeResponse> {
    if (this.mockMode) {
      this.logger.log(
        `[MOCK] Creating QRIS charge for order_id: ${input.orderId}, amount: ${input.grossAmount}`,
      );
      const mockTxId = `MOCK-TXN-${Date.now()}`;
      const dummyQrString = `00020101021226680016ID.CO.QRIS.WWW01189360001100000000005204581253033605405${input.grossAmount}5802ID5908MrikiPOS6006Blitar6304A1B2`;

      return {
        statusCode: '201',
        statusMessage: 'Success, QRIS charge generated (MOCK)',
        transactionId: mockTxId,
        orderId: input.orderId,
        grossAmount: Math.round(input.grossAmount).toString(),
        paymentType: 'qris',
        transactionTime: new Date().toISOString(),
        transactionStatus: 'pending',
        qrString: dummyQrString,
        qrUrl: `https://api.sandbox.midtrans.com/v2/qris/${mockTxId}/qr-code`,
        rawResponse: { mock: true },
      };
    }

    const payload = {
      payment_type: 'qris',
      transaction_details: {
        order_id: input.orderId,
        gross_amount: Math.round(input.grossAmount),
      },
      qris: {
        acquirer: 'gopay',
      },
      customer_details: input.customerDetails,
      item_details: input.itemDetails,
    };

    try {
      const response = await fetch(`${this.getBaseUrl()}/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      const resData = (await response.json()) as any;

      if (!response.ok) {
        this.logger.error(`Midtrans charge error (${response.status}): ${JSON.stringify(resData)}`);
        throw new Error(resData.status_message || 'Gagal membuat QRIS charge ke Midtrans');
      }

      const qrString =
        resData.qr_string || resData.actions?.find((a: any) => a.name === 'generate-qr-code')?.url;
      const qrUrl = resData.actions?.find((a: any) => a.name === 'generate-qr-code')?.url;

      return {
        statusCode: resData.status_code,
        statusMessage: resData.status_message,
        transactionId: resData.transaction_id,
        orderId: resData.order_id,
        grossAmount: resData.gross_amount,
        paymentType: resData.payment_type,
        transactionTime: resData.transaction_time,
        transactionStatus: resData.transaction_status,
        qrString,
        qrUrl,
        actions: resData.actions,
        rawResponse: resData,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create QRIS charge: ${error.message}`);
      throw error;
    }
  }

  async getTransactionStatus(orderId: string): Promise<MidtransStatusResponse> {
    if (this.mockMode) {
      this.logger.log(`[MOCK] Fetching status for order_id: ${orderId}`);
      return {
        statusCode: '200',
        statusMessage: 'Success (MOCK)',
        transactionId: `MOCK-TXN-${orderId}`,
        orderId,
        grossAmount: '0',
        paymentType: 'qris',
        transactionTime: new Date().toISOString(),
        transactionStatus: 'pending',
      };
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/${orderId}/status`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: this.getAuthHeader(),
        },
      });

      const resData = (await response.json()) as any;

      if (!response.ok) {
        this.logger.error(`Midtrans status error (${response.status}): ${JSON.stringify(resData)}`);
        throw new Error(resData.status_message || 'Gagal mengambil status dari Midtrans');
      }

      return {
        statusCode: resData.status_code,
        statusMessage: resData.status_message,
        transactionId: resData.transaction_id,
        orderId: resData.order_id,
        grossAmount: resData.gross_amount,
        paymentType: resData.payment_type,
        transactionTime: resData.transaction_time,
        transactionStatus: resData.transaction_status,
        fraudStatus: resData.fraud_status,
        signatureKey: resData.signature_key,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch Midtrans status for order ${orderId}: ${error.message}`);
      throw error;
    }
  }

  verifyWebhookSignature(payload: MidtransWebhookPayload): boolean {
    if (this.mockMode) {
      this.logger.log('[MOCK] Bypassing webhook signature check in MOCK mode');
      return true;
    }

    return verifyMidtransSignature(
      payload.order_id,
      payload.status_code,
      payload.gross_amount,
      payload.signature_key,
      this.serverKey,
    );
  }
}
