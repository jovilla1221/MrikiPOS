import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { MidtransModule } from '../../integrations/midtrans/midtrans.module';
import { WhatsAppModule } from '../../integrations/whatsapp/whatsapp.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [PrismaModule, MidtransModule, WhatsAppModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
