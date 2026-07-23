import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MidtransWebhookPayload } from '../../integrations/midtrans/midtrans.types';
import { CreateQrisPaymentDto } from './payment.dto';
import { PaymentService } from './payment.service';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('qris')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async createQris(
    @Body() dto: CreateQrisPaymentDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.paymentService.createQris(dto, tenantId, outletId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: MidtransWebhookPayload) {
    const result = await this.paymentService.handleWebhook(payload);
    return {
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async getStatus(
    @Param('id') paymentId: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.paymentService.getPaymentStatus(paymentId, tenantId, outletId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('by-transaction/:transactionId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR)
  async getPaymentsByTransaction(
    @Param('transactionId') transactionId: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const data = await this.paymentService.getPaymentsByTransaction(
      transactionId,
      tenantId,
      outletId,
    );
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/mock-pay')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async mockPay(
    @Param('id') paymentId: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('outlet_id') outletId: string,
  ) {
    const result = await this.paymentService.mockPay(paymentId, tenantId, outletId);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
