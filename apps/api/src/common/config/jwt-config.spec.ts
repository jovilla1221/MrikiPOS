import { validateJwtSecrets } from './jwt-config.validator';

describe('validateJwtSecrets - SEC-JWT-001', () => {
  const validAccessSecret = 'a4f78d91c2b53e8e19a4057f92163b8d81029c74f51e3c28b64a091e7503d21b';
  const validRefreshSecret = 'b82194c501e7a3d9284f1057e93a216c840192e35f8b4c719a05e21d643801f9';

  it('should pass when both secrets are strong, unique, and valid', () => {
    const config = {
      JWT_ACCESS_SECRET: validAccessSecret,
      JWT_REFRESH_SECRET: validRefreshSecret,
    };
    expect(() => validateJwtSecrets(config)).not.toThrow();
  });

  it('should throw error when JWT_ACCESS_SECRET is missing or empty', () => {
    expect(() => validateJwtSecrets({ JWT_REFRESH_SECRET: validRefreshSecret })).toThrow(
      '[SEC-JWT-001] JWT_ACCESS_SECRET is required',
    );
    expect(() => validateJwtSecrets({ JWT_ACCESS_SECRET: '', JWT_REFRESH_SECRET: validRefreshSecret })).toThrow(
      '[SEC-JWT-001] JWT_ACCESS_SECRET is required',
    );
  });

  it('should throw error when JWT_REFRESH_SECRET is missing or empty', () => {
    expect(() => validateJwtSecrets({ JWT_ACCESS_SECRET: validAccessSecret })).toThrow(
      '[SEC-JWT-001] JWT_REFRESH_SECRET is required',
    );
  });

  it('should throw error when secret length is less than 32 characters', () => {
    expect(() =>
      validateJwtSecrets({
        JWT_ACCESS_SECRET: 'short_key_123',
        JWT_REFRESH_SECRET: validRefreshSecret,
      }),
    ).toThrow('[SEC-JWT-001] JWT_ACCESS_SECRET must be at least 32 characters long.');
  });

  it('should throw error when access and refresh secrets are identical', () => {
    expect(() =>
      validateJwtSecrets({
        JWT_ACCESS_SECRET: validAccessSecret,
        JWT_REFRESH_SECRET: validAccessSecret,
      }),
    ).toThrow('[SEC-JWT-001] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.');
  });

  it('should throw error when secrets contain placeholder or dev patterns', () => {
    const invalidSecrets = [
      'dev_access_secret_change_me_in_production_1234567890',
      'my_super_secret_key_that_is_long_enough_123456',
      'placeholder_key_for_testing_purposes_1234567890',
    ];

    for (const secret of invalidSecrets) {
      expect(() =>
        validateJwtSecrets({
          JWT_ACCESS_SECRET: secret,
          JWT_REFRESH_SECRET: validRefreshSecret,
        }),
      ).toThrow('[SEC-JWT-001]');
    }
  });
});
