import { Controller, Post, Body, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  OtpSendDto,
  OtpVerifyDto,
  RefreshDto,
  ForgotPinDto,
} from './auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@mrikipos/shared-types';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookie(res: Response, token: string) {
    if (res && typeof res.cookie === 'function') {
      res.cookie('mrikipos_auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }
  }

  private clearAuthCookie(res: Response) {
    if (res && typeof res.clearCookie === 'function') {
      res.clearCookie('mrikipos_auth', { path: '/' });
    }
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.authService.register(dto);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(dto);
    if (data?.tokens?.access_token) {
      this.setAuthCookie(res, data.tokens.access_token);
    }
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() dto: OtpSendDto) {
    const data = await this.authService.sendOtp(dto);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: OtpVerifyDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.verifyOtp(dto);
    if (data?.tokens?.access_token) {
      this.setAuthCookie(res, data.tokens.access_token);
    }
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.refreshToken(dto.refresh_token);
    if (data?.access_token) {
      this.setAuthCookie(res, data.access_token);
    }
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('logout')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.KASIR, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @CurrentUser('jti') jti?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.authService.logout(userId, jti);
    if (res) {
      this.clearAuthCookie(res);
    }
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Post('forgot-pin')
  @HttpCode(HttpStatus.OK)
  async forgotPin(@Body() dto: ForgotPinDto) {
    const data = await this.authService.forgotPin(dto);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
