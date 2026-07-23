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

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature.toLowerCase()),
    Buffer.from(receivedSignature.toLowerCase()),
  );
}
