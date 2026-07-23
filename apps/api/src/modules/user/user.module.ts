import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from '../../database/prisma.module';
import { RedisModule } from '../../database/redis.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, RedisModule, AuditModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
