# Sprint 9 - Plans

Sprint 9 berfokus pada aktivasi integrasi riil, UAT bersama UMKM Kota Blitar, dan perbaikan bug
temuan sebelum production launch pada Sprint 10.

**Status:** BELUM DIMULAI. Menunggu kredensial Midtrans/Fonnte dan jadwal peserta UAT.

| File                                               | Isi                                                            |
| -------------------------------------------------- | -------------------------------------------------------------- |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Kondisi awal, decision gate, task S9-01 s.d. S9-07, dan risiko |
| [TODO.md](./TODO.md)                               | Checklist singkat untuk eksekusi harian                        |
| SPRINT9-UAT.md                                     | Dibuat saat sprint berjalan di `docs/audit/`                   |

## Urutan kerja

1. Baca `IMPLEMENTATION_PLAN.md`, terutama bagian **Kondisi awal** — sebagian pekerjaan Sprint 9
   di PRD sudah selesai lebih awal.
2. Sepakati decision gate G1-G5 dengan owner sebelum menulis kode.
3. Kerjakan task S9-01 sampai S9-07 secara berurutan.
4. Jalankan checkpoint setelah S9-02 dan setelah S9-04.
5. Jangan menambah package atau migration tanpa persetujuan.
6. Simpan hasil akhir di `docs/audit/SPRINT9-UAT.md`.

## Batas sprint

**In:** aktivasi Midtrans sandbox dan Fonnte, dataset serta akun UAT, pengukuran Web Vitals dan p95
pada perangkat/dataset nyata, uji cetak struk pada printer fisik, eksekusi UAT, triage dan perbaikan
bug, audit penutupan.

**Out:** fitur bisnis baru, Web Bluetooth printing, cutover domain ke produksi, kredensial Midtrans
production, redesign UI halaman selain yang rusak karena bug, pembersihan 137 lint warning legacy,
dan seluruh fitur P2 pada PRD.

## Prasyarat sebelum mulai

- Kredensial Midtrans sandbox (server key dan client key).
- Token Fonnte aktif dengan kuota minimal 50 OTP.
- Minimal 3 UMKM Blitar bersedia menjadi peserta UAT beserta jadwalnya.
- Satu unit printer thermal target dan satu perangkat Android kelas menengah-bawah untuk pengukuran.
