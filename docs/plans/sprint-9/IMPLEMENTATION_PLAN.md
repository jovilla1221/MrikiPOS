# Sprint 9 - Implementation Plan

**Audience:** junior developer atau AI implementer
**Durasi:** 5 hari kerja
**Fokus:** aktivasi integrasi riil, UAT bersama UMKM, perbaikan bug temuan
**Sumber:** `docs/PRD.md` Sprint 9, `docs/audit/SPRINT8-AUDIT.md`, dan kondisi staging saat ini

## 1. Tujuan

Sprint 9 membuktikan MrikiPOS berfungsi di tangan pengguna asli dengan integrasi yang benar-benar
hidup. Sprint dianggap selesai bila UAT dijalankan oleh pemilik UMKM (bukan tim internal), setiap
temuan memiliki severity dan status, serta dua waiver Sprint 8 sudah ditutup dengan angka nyata.

## 2. Kondisi awal (baseline saat plan dibuat)

Baca bagian ini sebelum mulai. Beberapa pekerjaan yang tertulis di PRD Sprint 9 sudah selesai.

**Sudah tersedia:**

- Staging live di `https://baswara.web.id` (VPS `13.212.233.90`), TLS Let's Encrypt dengan
  auto-renew aktif.
- `mrikipos-api` dan `mrikipos-web` berjalan sebagai systemd service dan auto-start setelah reboot.
- Backup PostgreSQL harian pukul 02.00 WIB, retensi 7 hari, di `/var/backups/mrikipos`.
- Baseline migration tersedia; database baru dapat dibangun dari nol dengan `prisma migrate deploy`.
- Seluruh quality gate hijau: format, lint (0 error), typecheck, 148 unit test, 17 E2E test, build.

**Belum tersedia:**

- Midtrans dan Fonnte masih **mock mode**; QRIS dan OTP WhatsApp tidak menghubungi layanan asli.
- Database staging hanya berisi data seed dummy.
- Cetak struk memakai dialog printer sistem ukuran 58mm, **bukan** Web Bluetooth langsung, dan
  belum pernah diuji dengan printer fisik.
- LCP/INP/CLS pada perangkat kasir riil dan p95 export untuk 1.000+ transaksi belum diukur
  (dua waiver terbuka dari Sprint 8).
- 137 lint warning legacy.

## 3. Aturan

- Jangan menambah fitur bisnis baru. Sprint ini menguji dan memperbaiki, bukan membangun.
- Setiap bug UAT dicatat dengan langkah reproduksi sebelum diperbaiki.
- Perbaikan bug wajib disertai test yang gagal sebelum fix dan lulus sesudahnya.
- Jangan menambah package atau membuat migration tanpa persetujuan owner.
- Kredensial produksi tidak boleh masuk repository; gunakan `.env` di server.
- Setelah setiap perubahan pada staging, jalankan ulang quality gate sebelum lanjut.

## 4. Decision Gate

| ID  | Keputusan       | Default yang disarankan                                                                 |
| --- | --------------- | --------------------------------------------------------------------------------------- |
| G1  | Midtrans        | Pakai **sandbox key** selama UAT; production key baru pada Sprint 10                    |
| G2  | WhatsApp OTP    | Aktifkan Fonnte dengan token asli; sediakan kuota untuk minimal 50 OTP                  |
| G3  | Peserta UAT     | Minimal 3 UMKM Blitar berbeda jenis usaha, masing-masing 1 owner + 1 kasir              |
| G4  | Printer thermal | Tentukan 1 model target; uji lewat driver sistem/RawBT sebelum memutuskan Web Bluetooth |
| G5  | Kriteria lolos  | Bug Critical/High harus nol saat penutupan; Medium boleh menjadi waiver tertulis        |

## 5. Task Implementasi

### S9-01 - Aktivasi integrasi riil

**Tujuan:** mematikan mock mode agar UAT menguji jalur yang sebenarnya.

**Acceptance criteria:**

- [ ] Isi `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY` sandbox dan `FONNTE_TOKEN`; set `WA_MOCK_MODE=false`.
- [ ] Satu transaksi QRIS sandbox berhasil dari pembuatan QR sampai webhook mengubah status ke `PAID`.
- [ ] Satu OTP benar-benar diterima di WhatsApp dan berhasil diverifikasi.

**Verifikasi:** log `mrikipos-api`, status pembayaran di UI, dan pesan WhatsApp yang diterima.
**Dependensi:** G1, G2.
**Files:** `apps/api/.env` (di server, tidak di-commit).
**Scope:** S.

### S9-02 - Dataset dan akun UAT

**Tujuan:** menyiapkan data yang menyerupai toko sungguhan, bukan seed dummy.

**Acceptance criteria:**

- [ ] Buat tenant terpisah untuk tiap peserta UAT beserta akun Owner dan Kasir.
- [ ] Isi minimal 50 produk realistis per tenant, termasuk beberapa stok menipis dan produk nonaktif.
- [ ] Siapkan skrip seed UAT yang dapat diulang dan tidak menyentuh data tenant lain.

**Verifikasi:** login tiap akun, cek isolasi antar tenant, dan pastikan dashboard menampilkan angka.
**Dependensi:** G3.
**Files:** `apps/api/src/database/prisma/` (skrip seed UAT terpisah dari `seed.ts`).
**Scope:** M.

### Checkpoint A

- [ ] QRIS dan OTP berjalan pada layanan asli.
- [ ] Setiap peserta UAT punya tenant dan akun sendiri.
- [ ] Backup terbaru diverifikasi dapat direstore sebelum UAT dimulai.

### S9-03 - Pengujian perangkat riil

**Tujuan:** menutup waiver Web Vitals dan membuktikan cetak struk pada printer sungguhan.

**Acceptance criteria:**

- [ ] Ukur LCP, INP, dan CLS pada `/login`, `/pos`, `/dashboard`, `/reports` memakai perangkat kasir
      riil (Android kelas menengah-bawah), bukan emulator.
- [ ] Cetak minimal 5 struk pada printer thermal target dan catat hasilnya (terpotong, ukuran font,
      karakter rusak).
- [ ] Bandingkan hasil dengan budget Sprint 8 (LCP <= 2,5s, INP <= 200ms, CLS <= 0,1) dan catat
      selisihnya.

**Verifikasi:** hasil pengukuran tersimpan di `docs/audit/SPRINT9-UAT.md` beserta spesifikasi perangkat.
**Dependensi:** G4, S9-02.
**Scope:** M.

### S9-04 - Benchmark API laporan dataset besar

**Tujuan:** menutup waiver p95 export dari Sprint 8.

**Acceptance criteria:**

- [ ] Siapkan dataset uji minimal 1.000 transaksi pada satu tenant UAT.
- [ ] Ukur p95 response time untuk `/v1/reports/sales`, `/v1/reports/export`, dan
      `/v1/transactions/summary`.
- [ ] Bila p95 export melebihi 3 detik, catat penyebabnya lewat profiling sebelum mengusulkan optimasi.

**Verifikasi:** angka p95 dan metode pengukuran tercatat di `docs/audit/SPRINT9-UAT.md`.
**Dependensi:** S9-02.
**Scope:** M.

### Checkpoint B

- [ ] Angka Web Vitals dan p95 tersedia sebagai angka nyata, bukan estimasi.
- [ ] Hasil cetak struk terdokumentasi dengan foto atau catatan konkret.
- [ ] Tidak ada optimasi yang dikerjakan tanpa bukti pengukuran.

### S9-05 - Eksekusi UAT

**Tujuan:** menjalankan skenario nyata bersama pengguna akhir.

**Acceptance criteria:**

- [ ] Susun skenario UAT yang mencakup: buka shift, transaksi tunai, transaksi QRIS, hold transaction,
      void dengan PIN, kasbon, stock opname, cetak struk, mode offline lalu sync, dan tutup shift.
- [ ] Setiap peserta menjalankan skenario tanpa dipandu langkah demi langkah; pendamping hanya mencatat.
- [ ] Catat setiap kebingungan pengguna, bukan hanya error teknis.

**Verifikasi:** lembar hasil UAT terisi untuk setiap peserta.
**Dependensi:** S9-01 sampai S9-04.
**Scope:** L.

### S9-06 - Triage dan perbaikan bug

**Tujuan:** menutup temuan yang menghalangi launch.

**Acceptance criteria:**

- [ ] Setiap temuan diberi severity (Critical/High/Medium/Low), langkah reproduksi, dan owner.
- [ ] Seluruh Critical dan High diperbaiki beserta regression test yang membuktikan perbaikannya.
- [ ] Medium dan Low yang tidak dikerjakan memiliki waiver tertulis dengan alasan dan target sprint.

**Verifikasi:** quality gate lengkap hijau setelah seluruh perbaikan digabungkan.
**Dependensi:** G5, S9-05.
**Scope:** L.

### S9-07 - Audit dan handoff Sprint 10

**Tujuan:** menghasilkan bukti bahwa staging layak naik ke produksi.

**Acceptance criteria:**

- [ ] Buat `docs/audit/SPRINT9-UAT.md` berisi peserta, skenario, temuan, status perbaikan, dan waiver.
- [ ] Jalankan seluruh quality gate dari kondisi bersih dan catat hasilnya.
- [ ] Tulis daftar prasyarat Sprint 10: kredensial Midtrans production, rencana cutover domain, dan
      langkah rollback.

**Verifikasi:** seluruh command Definition of Done exit code 0.
**Dependensi:** S9-01 sampai S9-06.
**Scope:** S.

## 6. Definition of Done

- [ ] `pnpm format:check`, `pnpm lint` (0 error), dan `pnpm typecheck` lulus.
- [ ] Unit test dan E2E test lulus tanpa flaky test.
- [ ] API dan web production build lulus; route guard dan entrypoint test lulus.
- [ ] `prisma migrate deploy` pada database kosong berhasil dan tidak ada drift terhadap schema.
- [ ] QRIS sandbox dan OTP WhatsApp terbukti berjalan end-to-end.
- [ ] Web Vitals dan p95 export terukur pada perangkat/dataset nyata.
- [ ] Tidak ada temuan UAT Critical/High yang terbuka.
- [ ] `SPRINT9-UAT.md` selesai dan prasyarat Sprint 10 tertulis.

## 7. Risiko

| Risiko                                | Mitigasi                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| Kredensial Midtrans/Fonnte belum siap | Blokir S9-01 sejak hari pertama dan eskalasi ke owner, jangan lanjut dengan mock |
| Peserta UAT sulit dijadwalkan         | Kunci jadwal sebelum sprint dimulai; siapkan peserta cadangan                    |
| Printer thermal tidak kompatibel      | Catat sebagai temuan, jangan memaksa implementasi Web Bluetooth di tengah sprint |
| Bug UAT membengkak melebihi kapasitas | Terapkan G5: hanya Critical/High yang wajib, sisanya menjadi waiver              |
| Perbaikan bug merusak fitur lain      | Jalankan quality gate lengkap setiap kali sebelum menutup temuan                 |
| Data UAT tercampur data uji internal  | Gunakan tenant terpisah dan jangan pakai akun seed default                       |

## 8. Pesan untuk implementer

> Kerjakan hanya Sprint 9. Staging sudah berjalan, jadi jangan mengulang deployment. Prioritasnya
> adalah membuat integrasi menjadi nyata, menguji bersama pengguna asli, dan menutup temuan.
> Jangan menambah fitur, package, atau migration tanpa persetujuan. Setiap perbaikan bug harus
> disertai test dan hasil verifikasinya.
