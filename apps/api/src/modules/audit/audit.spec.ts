import { redactSensitiveData } from './audit.service';

describe('Audit Module & Redaction Tests (S7-E3)', () => {
  describe('redactSensitiveData', () => {
    it('should recursively redact sensitive fields', () => {
      const input = {
        name: 'John Doe',
        pin: '123456',
        pin_hash: '$2b$12$somehash',
        otp: '654321',
        token: 'eyJhbGciOi...',
        secret: 'mysecret',
        authorization: 'Bearer token',
        meta: {
          new_pin: '111222',
          safe_field: 'ok',
          nested: {
            password: 'pass',
            deep: 'value',
          },
        },
      };

      const result = redactSensitiveData(input);

      expect(result.name).toBe('John Doe');
      expect(result.pin).toBe('[REDACTED]');
      expect(result.pin_hash).toBe('[REDACTED]');
      expect(result.otp).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.secret).toBe('[REDACTED]');
      expect(result.authorization).toBe('[REDACTED]');
      expect(result.meta.new_pin).toBe('[REDACTED]');
      expect(result.meta.safe_field).toBe('ok');
      expect(result.meta.nested.password).toBe('[REDACTED]');
      expect(result.meta.nested.deep).toBe('value');
    });

    it('should handle null, undefined, arrays, and primitive inputs gracefully', () => {
      expect(redactSensitiveData(null)).toBeNull();
      expect(redactSensitiveData(undefined)).toBeUndefined();
      expect(redactSensitiveData('test')).toBe('test');
      expect(redactSensitiveData([{ pin: '123456' }, { name: 'test' }])).toEqual([
        { pin: '[REDACTED]' },
        { name: 'test' },
      ]);
    });
  });
});
