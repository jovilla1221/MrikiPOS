import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { PrismaModule } from '../../database/prisma.module';
import { ApprovalModule } from '../approval/approval.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, ApprovalModule, AuditModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
