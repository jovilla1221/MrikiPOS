import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { PrismaModule } from '../../database/prisma.module';
import { ApprovalModule } from '../approval/approval.module';

@Module({
  imports: [PrismaModule, ApprovalModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
