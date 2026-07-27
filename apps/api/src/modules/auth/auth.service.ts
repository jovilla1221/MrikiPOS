import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, randomInt } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { WhatsAppService } from '../../integrations/whatsapp/whatsapp.service';
import {
  RegisterDto,
  LoginDto,
  GoogleAuthDto,
  OtpSendDto,
  OtpVerifyDto,
  ForgotPinDto,
  OtpType,
} from './auth.dto';
import {
  GoogleAuthService,
  VerifiedGoogleProfile,
} from '../../integrations/google/google-auth.service';
import { UserRole, TenantPlan, TenantStatus } from '@mrikipos/shared-types';

const BCRYPT_COST = 12;

// SEC-001: Brute-force protection constants
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_TTL_SECONDS = 15 * 60; // 15 menit
const LOGIN_FAILED_KEY = (phone: string) => `login_failed:${phone}`;
const LOGIN_LOCKED_KEY = (phone: string) => `login_locked:${phone}`;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly whatsappService: WhatsAppService,
    @Optional() private readonly googleAuthService?: GoogleAuthService,
  ) {}

  /**
   * Registrasi tenant baru + owner user + default outlet
   */
  async register(dto: RegisterDto) {
    const googleProfile = dto.google_credential
      ? await this.verifyGoogleCredential(dto.google_credential)
      : undefined;

    // Check if phone already registered
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          ...(googleProfile
            ? [{ email: googleProfile.email }, { google_sub: googleProfile.sub }]
            : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'CONFLICT',
          message:
            existingUser.phone === dto.phone
              ? 'Nomor HP sudah terdaftar. Silakan login.'
              : 'Akun Google sudah terdaftar. Silakan masuk dengan Google.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const pinHash = await bcrypt.hash(dto.pin, BCRYPT_COST);

    // Transaction: create Tenant -> Outlet -> User
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nama: dto.nama_usaha,
          phone: dto.phone,
          email: googleProfile?.email,
          plan: TenantPlan.FREE,
          status: TenantStatus.ACTIVE,
          settings: {
            receipt_header: dto.nama_usaha,
            receipt_footer: 'Terima kasih!',
            currency: 'IDR',
            timezone: 'Asia/Jakarta',
          },
        },
      });

      const outlet = await tx.outlet.create({
        data: {
          tenant_id: tenant.id,
          nama: 'Outlet Utama',
        },
      });

      const user = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          outlet_id: outlet.id,
          nama: dto.nama,
          phone: dto.phone,
          email: googleProfile?.email,
          google_sub: googleProfile?.sub,
          pin_hash: pinHash,
          role: UserRole.OWNER,
        },
      });

      return { tenant, outlet, user };
    });

    if (googleProfile) {
      const tokens = await this.generateTokens(result.user);

      return {
        user: this.toUserSession(result.user, result.outlet),
        tokens,
        user_id: result.user.id,
        tenant_id: result.tenant.id,
        otp_sent: false,
        verified: true,
        message: 'Registrasi dengan Google berhasil.',
      };
    }

    // Generate and send OTP (temporarily disabled)
    // await this.sendOtp({ phone: dto.phone, type: OtpType.REGISTER });
    const tokens = await this.generateTokens(result.user);

    return {
      user: this.toUserSession(result.user, result.outlet),
      tokens,
      user_id: result.user.id,
      tenant_id: result.tenant.id,
      otp_sent: false,
      verified: true,
      message: 'Registrasi berhasil. (OTP Bypassed)',
    };
  }

  /**
   * Login dengan nomor HP & PIN
   * SEC-001: Brute-force protection — lockout after 5 failed attempts (15 menit)
   */
  async login(dto: LoginDto) {
    // SEC-001: Check lockout sebelum query DB apapun
    const lockedKey = LOGIN_LOCKED_KEY(dto.phone);
    const isLocked = await this.redis.get(lockedKey);
    if (isLocked) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message:
              'Akun dikunci sementara karena terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { phone: dto.phone, is_active: true },
      include: { tenant: true, outlet: true },
    });

    if (!user) {
      // SEC-001: Increment failed counter even for unknown phone to avoid user enumeration timing
      await this.recordFailedLogin(dto.phone);
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Nomor HP atau PIN salah.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const isPinValid = await bcrypt.compare(dto.pin, user.pin_hash);
    if (!isPinValid) {
      // SEC-001: Increment failed counter and potentially lock account
      await this.recordFailedLogin(dto.phone);
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Nomor HP atau PIN salah.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // SEC-001: Login berhasil — reset counter
    await this.redis.del(LOGIN_FAILED_KEY(dto.phone));
    await this.redis.del(lockedKey);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Generate tokens (AUTH-003: includes DB persistence)
    const tokens = await this.generateTokens(user);

    return {
      user: this.toUserSession(user, user.outlet),
      tokens,
    };
  }

  /**
   * Login Google. Akun lama dapat ditautkan satu kali memakai nomor HP + PIN.
   * Setelah google_sub tersimpan, login berikutnya hanya memerlukan kredensial Google.
   */
  async googleAuth(dto: GoogleAuthDto) {
    const profile = await this.verifyGoogleCredential(dto.credential);
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ google_sub: profile.sub }, { email: profile.email }],
        is_active: true,
      },
      include: { tenant: true, outlet: true },
    });

    if (user) {
      if (user.google_sub && user.google_sub !== profile.sub) {
        throw new UnauthorizedException({
          success: false,
          error: {
            code: 'GOOGLE_ACCOUNT_MISMATCH',
            message: 'Email tersebut sudah terhubung ke akun Google lain.',
          },
          timestamp: new Date().toISOString(),
        });
      }

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: profile.email,
          google_sub: profile.sub,
          last_login: new Date(),
        },
        include: { tenant: true, outlet: true },
      });

      const tokens = await this.generateTokens(user);
      return {
        link_required: false,
        pin_required: false,
        user: this.toUserSession(user, user.outlet),
        tokens,
      };
    }

    if (!dto.phone || !dto.pin) {
      return {
        link_required: true,
        profile: {
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        },
      };
    }

    const lockedKey = LOGIN_LOCKED_KEY(dto.phone);
    if (await this.redis.get(lockedKey)) {
      throw new HttpException(
        {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message:
              'Akun dikunci sementara karena terlalu banyak percobaan. Coba lagi dalam 15 menit.',
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    user = await this.prisma.user.findFirst({
      where: { phone: dto.phone, is_active: true },
      include: { tenant: true, outlet: true },
    });

    if (!user || !(await bcrypt.compare(dto.pin, user.pin_hash))) {
      await this.recordFailedLogin(dto.phone);
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Nomor HP atau PIN salah.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    await this.redis.del(LOGIN_FAILED_KEY(dto.phone));
    await this.redis.del(lockedKey);

    try {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: profile.email,
          google_sub: profile.sub,
          last_login: new Date(),
        },
        include: { tenant: true, outlet: true },
      });
    } catch {
      throw new ConflictException({
        success: false,
        error: {
          code: 'GOOGLE_ACCOUNT_ALREADY_LINKED',
          message: 'Akun Google tersebut sudah terhubung ke pengguna lain.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const tokens = await this.generateTokens(user);
    return {
      link_required: false,
      user: this.toUserSession(user, user.outlet),
      tokens,
    };
  }

  /**
   * Kirim kode OTP
   */
  async sendOtp(dto: OtpSendDto) {
    // SEC-OTP-001: Cryptographically secure 6-digit OTP generator
    const code = randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.prisma.otpCode.create({
      data: {
        phone: dto.phone,
        code_hash: codeHash,
        type: dto.type,
        expires_at: expiresAt,
      },
    });

    await this.whatsappService.sendOtp(dto.phone, code);

    return {
      otp_sent: true,
      expires_in: 300,
      message: `Kode OTP dikirim ke WhatsApp ${dto.phone}`,
    };
  }

  /**
   * Verifikasi kode OTP
   */
  async verifyOtp(dto: OtpVerifyDto) {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        type: dto.type,
        verified: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OTP_EXPIRED',
          message: 'Kode OTP telah kadaluarsa atau tidak valid.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (otp.attempts >= 3) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OTP_MAX_ATTEMPTS',
          message: 'Terlalu banyak percobaan salah. Minta OTP baru.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const isValid = await bcrypt.compare(dto.code, otp.code_hash);
    if (!isValid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });

      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'Kode OTP salah.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Mark OTP as verified (atomic conditional update to prevent race conditions)
    const updateResult = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, verified: false },
      data: { verified: true },
    });

    if (updateResult.count === 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OTP_ALREADY_USED',
          message: 'Kode OTP sudah digunakan.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
      include: { outlet: true },
    });

    if (!user) {
      return { verified: true, message: 'OTP terverifikasi' };
    }

    const tokens = await this.generateTokens(user);

    return {
      verified: true,
      user: this.toUserSession(user, user.outlet),
      tokens,
    };
  }

  /**
   * Refresh JWT Token
   * AUTH-003: Validasi terhadap DB RefreshToken, revoke token lama, issue token baru (rotation)
   */
  async refreshToken(refreshTokenString: string) {
    try {
      const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

      const payload = this.jwtService.verify(refreshTokenString, {
        secret: refreshSecret,
        algorithms: ['HS256'],
      });

      // AUTH-003: Lookup token hash di DB (bukan hanya verify signature)
      const tokenHash = this.hashToken(refreshTokenString);
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          user_id: payload.sub,
          token_hash: tokenHash,
          revoked: false,
          expires_at: { gt: new Date() },
        },
      });

      if (!storedToken) {
        // Token sudah direvoke atau tidak ditemukan di DB — possible token reuse attack
        this.logger.warn(`[AUTH-003] Refresh token not found or revoked for user ${payload.sub}`);
        throw new UnauthorizedException('Refresh token tidak valid');
      }

      const user = await this.prisma.user.findFirst({
        where: { id: payload.sub, is_active: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // AUTH-003: Revoke token lama sebelum issue yang baru (rotation)
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true, revoked_at: new Date() },
      });

      return await this.generateTokens(user);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Refresh token tidak valid atau telah kadaluarsa',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Logout user — revoke semua refresh token di DB + blacklist user di Redis
   * AUTH-003: Revoke di DB agar semua session di perangkat lain ikut invalid
   */
  async logout(userId: string, jti?: string) {
    // Revoke semua refresh token user di DB
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked: false },
      data: { revoked: true, revoked_at: new Date() },
    });
    // SEC-AUTH-001: Revoke access token per-jti in Redis (TTL 15m) instead of user-level lockout
    if (jti) {
      await this.redis.set(`revoked_jti:${jti}`, 'true', 15 * 60);
    }
    return { message: 'Berhasil logout' };
  }

  /**
   * Forgot PIN reset
   * AUTH-002 FIX: Verifikasi OTP dengan type `forgot_pin` sebelum reset PIN
   */
  async forgotPin(dto: ForgotPinDto) {
    // AUTH-002: Gate — verifikasi OTP dengan type forgot_pin terlebih dahulu
    // OTP yang dikirim dengan type lain (misal: 'register') tidak bisa dipakai di sini
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        type: 'forgot_pin',
        verified: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OTP_REQUIRED',
          message: 'Kode OTP tidak valid atau telah kadaluarsa. Minta OTP baru.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (otp.attempts >= 3) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OTP_MAX_ATTEMPTS',
          message: 'Terlalu banyak percobaan salah. Minta OTP baru.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const isOtpValid = await bcrypt.compare(dto.code, otp.code_hash);
    if (!isOtpValid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_OTP',
          message: 'Kode OTP salah.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // OTP valid — tandai sebagai verified (atomic conditional update to prevent race conditions)
    const updateResult = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, verified: false },
      data: { verified: true },
    });

    if (updateResult.count === 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'OTP_ALREADY_USED',
          message: 'Kode OTP sudah digunakan.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Cek user berdasarkan phone yang sudah terverifikasi OTP-nya
    const user = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Pengguna tidak ditemukan.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const pinHash = await bcrypt.hash(dto.new_pin, BCRYPT_COST);

    // AUTH-003 bonus: Revoke semua refresh token lama setelah PIN reset
    await this.prisma.refreshToken.updateMany({
      where: { user_id: user.id, revoked: false },
      data: { revoked: true, revoked_at: new Date() },
    });
    await this.redis.set(
      `revoked_after:${user.id}`,
      String(Math.floor(Date.now() / 1000)),
      15 * 60,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { pin_hash: pinHash },
    });

    return { message: 'PIN berhasil diperbarui. Silakan login.' };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async verifyGoogleCredential(credential: string): Promise<VerifiedGoogleProfile> {
    if (!this.googleAuthService) {
      throw new ServiceUnavailableException('Login Google belum tersedia.');
    }

    return this.googleAuthService.verifyCredential(credential);
  }

  private toUserSession(user: any, outlet?: { nama?: string } | null) {
    return {
      id: user.id,
      nama: user.nama,
      phone: user.phone,
      email: user.email ?? undefined,
      role: user.role,
      tenant_id: user.tenant_id,
      outlet_id: user.outlet_id,
      outlet_nama: outlet?.nama,
    };
  }

  /**
   * Helper to generate Access and Refresh JWT tokens
   * AUTH-003: Simpan hash refresh token ke tabel RefreshToken di DB
   */
  private async generateTokens(user: any) {
    const accessSecret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const payload = {
      sub: user.id,
      tenant_id: user.tenant_id,
      outlet_id: user.outlet_id,
      role: user.role,
      phone: user.phone,
      jti: randomUUID(),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: '15m',
      algorithm: 'HS256',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
      algorithm: 'HS256',
    });

    // AUTH-003: Simpan hash refresh token ke DB (bukan plain token)
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes
    };
  }

  /**
   * SEC-001: Record failed login attempt. Locks account after MAX_ATTEMPTS.
   */
  private async recordFailedLogin(phone: string): Promise<void> {
    const failedKey = LOGIN_FAILED_KEY(phone);
    const count = await this.redis.incr(failedKey);
    // Set TTL on first increment (before expiry is set)
    await this.redis.expireIfNotSet(failedKey, LOGIN_LOCKOUT_TTL_SECONDS);

    if (count >= LOGIN_MAX_ATTEMPTS) {
      // Set lockout key
      await this.redis.set(LOGIN_LOCKED_KEY(phone), 'true', LOGIN_LOCKOUT_TTL_SECONDS);
      // Delete the counter — the lock key is the authoritative signal
      await this.redis.del(failedKey);
      this.logger.warn(
        `[SEC-001] Account locked for phone ${phone} after ${count} failed attempts`,
      );
    }
  }

  /**
   * AUTH-003: Hash token before storing in DB — never store raw tokens
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
