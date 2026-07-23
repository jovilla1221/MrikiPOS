import { validate } from 'class-validator';
import { OtpSendDto, OtpVerifyDto, OtpType } from './auth.dto';

describe('Auth DTO Validation - SEC-OTP-003', () => {
  it('should pass validation for valid OtpSendDto type values', async () => {
    for (const validValue of ['register', 'login', 'forgot_pin']) {
      const dto = new OtpSendDto();
      dto.phone = '081234567890';
      dto.type = validValue as OtpType;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should fail validation for invalid OtpSendDto type values', async () => {
    const invalidValues = ['admin_bypass', 'invalid_type', '123', 'REGISTER'];

    for (const invalidValue of invalidValues) {
      const dto = new OtpSendDto();
      dto.phone = '081234567890';
      dto.type = invalidValue as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('type');
    }
  });

  it('should pass validation for valid OtpVerifyDto type values', async () => {
    const dto = new OtpVerifyDto();
    dto.phone = '081234567890';
    dto.code = '123456';
    dto.type = OtpType.LOGIN;

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation for invalid OtpVerifyDto type values', async () => {
    const dto = new OtpVerifyDto();
    dto.phone = '081234567890';
    dto.code = '123456';
    dto.type = 'unsupported_flow' as any;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('type');
  });
});
