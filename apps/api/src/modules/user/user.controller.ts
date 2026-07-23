import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, ResetUserPinDto, UserQueryDto } from './user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles(UserRole.OWNER)
  async findAll(@Query() query: UserQueryDto, @CurrentUser('tenant_id') tenantId: string) {
    const { data, meta } = await this.userService.findAll(tenantId, query);
    return {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  @Roles(UserRole.OWNER)
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.userService.create(dto, tenantId, actorId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @Roles(UserRole.OWNER)
  async findOne(@Param('id') id: string, @CurrentUser('tenant_id') tenantId: string) {
    const data = await this.userService.findOne(id, tenantId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id')
  @Roles(UserRole.OWNER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.userService.update(id, dto, tenantId, actorId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id/pin')
  @Roles(UserRole.OWNER)
  async resetPin(
    @Param('id') id: string,
    @Body() dto: ResetUserPinDto,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.userService.resetPin(id, dto, tenantId, actorId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id/status')
  @Roles(UserRole.OWNER)
  async setStatus(
    @Param('id') id: string,
    @Body('is_active') isActive: boolean,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.userService.setStatus(id, isActive, tenantId, actorId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  async remove(
    @Param('id') id: string,
    @CurrentUser('tenant_id') tenantId: string,
    @CurrentUser('id') actorId: string,
  ) {
    const data = await this.userService.remove(id, tenantId, actorId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
