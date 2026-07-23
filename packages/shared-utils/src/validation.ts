/**
 * Validasi nomor telepon Indonesia (harus diawali 08 dan 10-14 digit)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^08[0-9]{8,12}$/;
  return phoneRegex.test(phone);
}

/**
 * Validasi PIN (tepat 6 digit angka)
 */
export function isValidPin(pin: string): boolean {
  const pinRegex = /^[0-9]{6}$/;
  return pinRegex.test(pin);
}

/**
 * Validasi barcode (8-13 digit angka)
 */
export function isValidBarcode(barcode: string): boolean {
  const barcodeRegex = /^[0-9]{8,13}$/;
  return barcodeRegex.test(barcode);
}
