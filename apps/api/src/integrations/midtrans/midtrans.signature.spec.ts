import { computeMidtransSignature, verifyMidtransSignature } from './midtrans.signature';

describe('Midtrans signature', () => {
  const orderId = 'MRIKI-txn123-1234567890';
  const statusCode = '200';
  const grossAmount = '10000.00';
  const serverKey = 'midtrans-test-server-key';

  it('accepts a valid signature', () => {
    const signature = computeMidtransSignature(orderId, statusCode, grossAmount, serverKey);

    expect(verifyMidtransSignature(orderId, statusCode, grossAmount, signature, serverKey)).toBe(
      true,
    );
  });

  it('returns false for a malformed signature instead of throwing', () => {
    expect(
      verifyMidtransSignature(orderId, statusCode, grossAmount, 'invalid_signature_xyz', serverKey),
    ).toBe(false);
  });
});
