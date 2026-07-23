import { Module } from '@nestjs/common';
import { ShiftController } from './shift.controller';
import { ShiftService } from './shift.service';
import { PrismaModule } from '../../database/prisma.module';
import { ApprovalModule } from '../approval/approval.module';

@Module({
  imports: [PrismaModule, ApprovalModule],
  controllers: [ShiftController],
  providers: [ShiftService],
  exports: [ShiftService],
})
export class ShiftModule {}
