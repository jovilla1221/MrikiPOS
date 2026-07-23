export function validateJwtSecrets(config: Record<string, any>) {
  const accessSecret = config.JWT_ACCESS_SECRET;
  const refreshSecret = config.JWT_REFRESH_SECRET;

  if (!accessSecret || typeof accessSecret !== 'string' || accessSecret.trim() === '') {
    throw new Error('[SEC-JWT-001] JWT_ACCESS_SECRET is required and must not be empty.');
  }

  if (!refreshSecret || typeof refreshSecret !== 'string' || refreshSecret.trim() === '') {
    throw new Error('[SEC-JWT-001] JWT_REFRESH_SECRET is required and must not be empty.');
  }

  if (accessSecret.length < 32) {
    throw new Error('[SEC-JWT-001] JWT_ACCESS_SECRET must be at least 32 characters long.');
  }

  if (refreshSecret.length < 32) {
    throw new Error('[SEC-JWT-001] JWT_REFRESH_SECRET must be at least 32 characters long.');
  }

  if (accessSecret === refreshSecret) {
    throw new Error('[SEC-JWT-001] JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.');
  }

  const forbiddenPatterns = [/change_me/i, /secret/i, /placeholder/i, /dev_access/i, /dev_refresh/i];
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(accessSecret)) {
      throw new Error(`[SEC-JWT-001] JWT_ACCESS_SECRET contains insecure pattern matching ${pattern}`);
    }
    if (pattern.test(refreshSecret)) {
      throw new Error(`[SEC-JWT-001] JWT_REFRESH_SECRET contains insecure pattern matching ${pattern}`);
    }
  }

  return config;
}
