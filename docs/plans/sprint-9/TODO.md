# Sprint 9 - Execution Checklist

**Status:** BELUM DIMULAI

## Sebelum hari 1

- [ ] Kredensial Midtrans sandbox diterima
- [ ] Token Fonnte diterima dan kuota dicek
- [ ] Peserta UAT dan jadwalnya dikunci
- [ ] Printer thermal dan perangkat Android uji tersedia
- [ ] Decision gate G1-G5 disepakati owner

## Hari 1

- [ ] S9-01 Aktivasi Midtrans sandbox dan Fonnte
- [ ] S9-02 Dataset dan akun UAT
- [ ] Checkpoint A

## Hari 2

- [ ] S9-03 Ukur Web Vitals di perangkat riil
- [ ] S9-03 Uji cetak struk di printer thermal
- [ ] S9-04 Benchmark p95 laporan dataset 1.000+ transaksi
- [ ] Checkpoint B

## Hari 3-4

- [ ] S9-05 Susun skenario UAT
- [ ] S9-05 Eksekusi UAT bersama peserta
- [ ] S9-06 Triage temuan dan beri severity

## Hari 5

- [ ] S9-06 Perbaiki seluruh Critical dan High beserta regression test
- [ ] S9-06 Tulis waiver untuk Medium/Low yang ditunda
- [ ] S9-07 Audit dan handoff Sprint 10

## Final gate

- [ ] Format, lint (0 error), typecheck lulus
- [ ] Unit test dan E2E test lulus
- [ ] API dan web build lulus
- [ ] Route guard dan entrypoint lulus
- [ ] `prisma migrate deploy` pada database kosong berhasil tanpa drift
- [ ] QRIS sandbox terbukti end-to-end sampai webhook
- [ ] OTP WhatsApp terbukti diterima dan terverifikasi
- [ ] Web Vitals dan p95 export terukur pada perangkat/dataset nyata
- [ ] Tidak ada temuan UAT Critical/High yang terbuka
- [ ] `docs/audit/SPRINT9-UAT.md` selesai
- [ ] Prasyarat Sprint 10 tertulis

## Handoff

- [ ] Sprint 9 ditutup
- [ ] Sprint 10 dimulai hanya setelah konfirmasi eksplisit owner
