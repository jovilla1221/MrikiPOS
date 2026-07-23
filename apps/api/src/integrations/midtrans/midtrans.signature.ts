import * as crypto from 'crypto';

export function computeMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
): string {
  const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  return crypto.createHash('sha512').update(rawString).digest('hex');
}

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  receivedSignature: string,
  serverKey: string,
): boolean {
  if (!orderId || !statusCode || !grossAmount || !receivedSignature || !serverKey) {
    return false;
  }

  const expectedSignature = computeMidtransSignature(orderId, statusCode, grossAmount, serverKey);
  const normalizedReceivedSignature = receivedSignature.toLowerCase();

  // timingSafeEqual throws when buffers have different lengths. Treat malformed
  // signatures as invalid input instead of allowing a public webhook to cause 500.
  if (!/^[0-9a-f]{128}$/.test(normalizedReceivedSignature)) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(normalizedReceivedSignature, 'utf8'),
  );
}
