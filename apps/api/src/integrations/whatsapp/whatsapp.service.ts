import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly isMock: boolean;
  private readonly token: string;

  constructor(private readonly configService: ConfigService) {
    // Parse explicitly: ConfigService returns strings from .env,
    // so `WA_MOCK_MODE=false` as a string is truthy if cast to boolean naively.
    const mockModeRaw = this.configService.get<string>('WA_MOCK_MODE', 'true');
    this.isMock = mockModeRaw === 'true' || mockModeRaw === '1';
    this.token = this.configService.get<string>('FONNTE_TOKEN', '');

    // Startup warning: if production and mock mode active, alert operator
    if (process.env.NODE_ENV === 'production' && this.isMock) {
      this.logger.warn(
        '⚠️  [WA_MOCK_MODE] WhatsApp mock mode is ON in production! ' +
          'OTPs will NOT be sent to users. Set WA_MOCK_MODE=false and FONNTE_TOKEN in .env to enable real delivery.',
      );
    }
  }

  /**
   * Kirim OTP via WhatsApp (Fonnte API / Mock Mode)
   */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    const message = `[MrikiPOS] KODE OTP ANDA: ${code}\n\nKode ini berlaku selama 5 menit. JANGAN BERIKAN KODE INI KEPADA SIAPAPUN.`;

    if (this.isMock || !this.token) {
      this.logger.log(`[WA MOCK] Sent OTP to ${phone}: ${code}`);
      return true;
    }

    try {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phone,
          message: message,
        }),
      });

      const data = (await response.json()) as any;
      return data.status === true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message via Fonnte: ${error}`);
      return false;
    }
  }

  /**
   * Kirim notifikasi konfirmasi pembayaran lunas
   */
  async sendPaymentConfirmed(
    phone: string,
    payload: { nomorTransaksi: string; total: number; metode: string },
  ): Promise<boolean> {
    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(payload.total);

    const message = `[MrikiPOS] Pembayaran Berhasil!\n\nNomor Transaksi: ${payload.nomorTransaksi}\nTotal: ${formattedTotal}\nMetode: ${payload.metode}\n\nTerima kasih!`;

    if (this.isMock || !this.token) {
      this.logger.log(
        `[WA MOCK] Payment confirmed to ${phone}: Txn ${payload.nomorTransaksi}, Total ${formattedTotal}`,
      );
      return true;
    }

    try {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phone,
          message,
        }),
      });

      const data = (await response.json()) as any;
      return data.status === true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp payment confirmation: ${error}`);
      return false;
    }
  }

  /**
   * Kirim alert stok menipis ke HP owner/kasir
   */
  async sendLowStockAlert(
    phone: string,
    products: Array<{ nama: string; stok: number; stokMinimum: number }>,
  ): Promise<boolean> {
    if (!products || products.length === 0) return true;

    const itemsText = products
      .slice(0, 10)
      .map((p) => `- ${p.nama}: sisa ${p.stok} (min: ${p.stokMinimum})`)
      .join('\n');

    const message = `[MrikiPOS] Peringatan Stok Menipis!\n\nProduk berikut berada di bawah stok minimum:\n${itemsText}\n\nMohon lakukan restok segera.`;

    if (this.isMock || !this.token) {
      this.logger.log(`[WA MOCK] Low stock alert sent to ${phone}:\n${itemsText}`);
      return true;
    }

    try {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phone,
          message,
        }),
      });

      const data = (await response.json()) as any;
      return data.status === true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp low stock alert: ${error}`);
      return false;
    }
  }

  /**
   * Kirim pengingat kasbon/piutang ke WhatsApp pelanggan
   */
  async sendCreditReminder(
    phone: string,
    payload: {
      customerNama: string;
      sisa: number;
      jatuhTempo?: string | Date | null;
    },
  ): Promise<boolean> {
    const formattedSisa = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(payload.sisa);

    const formattedDate = payload.jatuhTempo
      ? new Date(payload.jatuhTempo).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null;

    const jatuhTempoText = formattedDate ? `\nJatuh Tempo: ${formattedDate}` : '';

    const message = `[MrikiPOS] Pengingat Kasbon\n\nYth. ${payload.customerNama},\nAnda memiliki tagihan kasbon belum lunas sebesar ${formattedSisa}.${jatuhTempoText}\n\nMohon segera melakukan pembayaran. Terima kasih!`;

    if (this.isMock || !this.token) {
      this.logger.log(
        `[WA MOCK] Credit reminder sent to ${phone} (${payload.customerNama}): Sisa ${formattedSisa}`,
      );
      return true;
    }

    try {
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: phone,
          message,
        }),
      });

      const data = (await response.json()) as any;
      return data.status === true;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp credit reminder: ${error}`);
      return false;
    }
  }
}
