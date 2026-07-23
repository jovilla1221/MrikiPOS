import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './database/redis.module';
import { WhatsAppModule } from './integrations/whatsapp/whatsapp.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { HealthModule } from './modules/health/health.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { UploadModule } from './modules/upload/upload.module';
import { MidtransModule } from './integrations/midtrans/midtrans.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ReportModule } from './modules/report/report.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CustomerModule } from './modules/customer/customer.module';
import { CreditModule } from './modules/credit/credit.module';
import { ShiftModule } from './modules/shift/shift.module';
import { AuditModule } from './modules/audit/audit.module';
import { UserModule } from './modules/user/user.module';
import { ApprovalModule } from './modules/approval/approval.module';

import { validateJwtSecrets } from './common/config/jwt-config.validator';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateJwtSecrets,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    RedisModule,
    WhatsAppModule,
    MidtransModule,
    AuthModule,
    TenantModule,
    HealthModule,
    TransactionModule,
    CategoryModule,
    ProductModule,
    InventoryModule,
    UploadModule,
    PaymentModule,
    ReportModule,
    CustomerModule,
    CreditModule,
    ShiftModule,
    AuditModule,
    UserModule,
    ApprovalModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
