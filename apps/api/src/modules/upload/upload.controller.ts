import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('products/import')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // xlsx
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/csv' ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Format file tidak didukung. Gunakan .xlsx atau .csv'), false);
        }
      },
    }),
  )
  async importProducts(
    @UploadedFile() file: Express.Multer.File,
    @Body('mode') mode: 'create' | 'upsert' = 'create',
    @CurrentUser() user: any,
  ) {
    if (!['create', 'upsert'].includes(mode)) {
      throw new BadRequestException('Mode tidak valid');
    }
    return this.uploadService.importProducts(file, mode, user.tenant_id, user.outlet_id);
  }
}
