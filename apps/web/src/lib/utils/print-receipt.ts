/**
 * Cetak elemen struk lewat iframe tersembunyi dengan ukuran kertas thermal.
 *
 * Bekerja dengan printer thermal yang terpasang sebagai printer sistem
 * (driver Windows/macOS/CUPS, atau RawBT di Android) dan juga dialog
 * "Save as PDF" browser. Tidak menyentuh DOM aplikasi — tanpa reload,
 * state kasir tetap utuh.
 */
export function printReceiptElement(el: HTMLElement, widthMm: 58 | 80 = 58): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  // Bawa stylesheet aplikasi (Tailwind) agar kelas pada markup struk tetap berlaku.
  const appStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
${appStyles}
<style>
  @page { size: ${widthMm}mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .receipt-print-root { width: ${widthMm}mm; }
</style>
</head>
<body><div class="receipt-print-root">${el.innerHTML}</div></body>
</html>`);
  doc.close();

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    return;
  }

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    iframe.remove();
  };
  win.onafterprint = cleanup;
  // Fallback bila onafterprint tidak terpanggil (beberapa browser mobile).
  setTimeout(cleanup, 60_000);

  // Beri waktu stylesheet iframe termuat sebelum memanggil dialog cetak.
  setTimeout(() => {
    win.focus();
    win.print();
  }, 350);
}
