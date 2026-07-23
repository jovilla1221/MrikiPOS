import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController - WEB-AUTH-001 HttpOnly Cookie Management', () => {
  let authController: AuthController;

  const mockAuthService = {
    login: jest.fn().mockResolvedValue({
      user: { id: 'usr-1' },
      tokens: { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token' },
    }),
    register: jest.fn().mockResolvedValue({
      user: { id: 'usr-1' },
      tokens: { access_token: 'register-access-token', refresh_token: 'register-refresh-token' },
    }),
    googleAuth: jest.fn().mockResolvedValue({
      user: { id: 'usr-1' },
      tokens: { access_token: 'google-access-token', refresh_token: 'google-refresh-token' },
    }),
    verifyOtp: jest.fn().mockResolvedValue({
      verified: true,
      tokens: { access_token: 'otp-access-token', refresh_token: 'otp-refresh-token' },
    }),
    logout: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  it('should set HttpOnly mrikipos_auth cookie on login', async () => {
    const mockRes: any = { cookie: jest.fn() };
    const dto = { phone: '081234567890', pin: '123456' };

    await authController.login(dto, mockRes);

    expect(mockRes.cookie).toHaveBeenCalledWith(
      'mrikipos_auth',
      'mock-access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('should set HttpOnly mrikipos_auth cookie on Google login', async () => {
    const mockRes: any = { cookie: jest.fn() };

    await authController.googleAuth({ credential: 'google-id-token' }, mockRes);

    expect(mockRes.cookie).toHaveBeenCalledWith(
      'mrikipos_auth',
      'google-access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('should set HttpOnly mrikipos_auth cookie on Google registration', async () => {
    const mockRes: any = { cookie: jest.fn() };
    const dto = {
      nama: 'Owner',
      phone: '081234567890',
      pin: '123456',
      nama_usaha: 'Toko Owner',
      google_credential: 'google-id-token',
    };

    await authController.register(dto, mockRes);

    expect(mockRes.cookie).toHaveBeenCalledWith(
      'mrikipos_auth',
      'register-access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('should set HttpOnly mrikipos_auth cookie on OTP verification', async () => {
    const mockRes: any = { cookie: jest.fn() };
    const dto: any = { phone: '081234567890', code: '123456', type: 'login' };

    await authController.verifyOtp(dto, mockRes);

    expect(mockRes.cookie).toHaveBeenCalledWith(
      'mrikipos_auth',
      'otp-access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('should clear mrikipos_auth cookie on logout', async () => {
    const mockRes: any = { clearCookie: jest.fn() };

    await authController.logout('usr-1', 'jti-1', mockRes);

    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'mrikipos_auth',
      expect.objectContaining({ path: '/' }),
    );
  });
});
