# MrikiPOS — Sprint 0 Security Audit Findings

# Audited by: PentesterFlow Agent (webvuln + jwt + recon playbooks)

# Date: 21 July 2026

## Purpose

This document is an **instruction for the MrikiPOS development agent**. Each
finding below describes a security gap in the current Sprint 0 code. The
agent should **read each finding, verify it against the source code, form an
opinion, and report back** on which fixes should be implemented and in what
order. **Do not implement fixes yet — discuss first.**

---

## Finding AUTH-002: forgotPin OTP Verification Gap

**Severity:** Medium  
**File:** `apps/api/src/modules/auth/auth.service.ts:315-330`

### Problem

The `forgotPin()` method accepts `phone`, `code` (OTP), and `new_pin` but
does NOT verify that the submitted OTP code was **sent to that specific
phone with type `forgot_pin`**. The flow is:

1. `sendOtp({ phone: A, type: 'forgot_pin' })` — user receives OTP on phone A
2. `forgotPin({ phone: B, code: "that-otp", new_pin: "666666" })` — attacker
   could reset PIN for phone B using OTP that was sent to phone A

The method currently only checks if the user with `phone` exists, then
hashes the new PIN and saves it — there is **zero OTP validation** inside
`forgotPin()`.

```typescript
async forgotPin(dto: ForgotPinDto) {
  const user = await this.prisma.user.findFirst({
    where: { phone: dto.phone },        // ← user exists check only
  });
  if (!user) throw new BadRequestException('...');

  const pinHash = await bcrypt.hash(dto.new_pin, BCRYPT_COST);
  await this.prisma.user.update({       // ← PIN reset without OTP check!
    where: { id: user.id },
    data: { pin_hash: pinHash },
  });
  return { message: 'PIN berhasil diperbarui. Silakan login.' };
}
```

### Agent Question

1. Setujukah ini perlu difix sekarang?
2. Apakah sebaiknya `forgotPin()` memanggil `verifyOtp()` dulu sebagai
   gate, atau tambah validasi OTP inline?
3. Perhatikan `OtpVerifyDto.type === 'forgot_pin'` — jika OTP di-send
   dengan type `register`, apakah tetap bisa dipakai untuk `forgot_pin`?

---

## Finding AUTH-003: Refresh Token Without DB Validation

**Severity:** Medium  
**File:** `apps/api/src/modules/auth/auth.service.ts:271-301`

### Problem

`refreshToken()` hanya melakukan `jwtService.verify()` dan cek apakah user
ada di database (`is_active`). Refresh token **tidak divalidasi terhadap
`RefreshToken` table di schema** — artinya:

- Tidak bisa revoke refresh token spesifik (hanya bisa block user via Redis)
- Attacker yang men-generate token valid bisa refresh tanpa batas
- Tidak ada rotate (token lama masih valid setelah refresh)

```typescript
async refreshToken(refreshTokenString: string) {
  const payload = this.jwtService.verify(refreshTokenString, {
    secret: refreshSecret,
    algorithms: ['HS256'],
  });   // ← verify signature only, no DB lookup

  const user = await this.prisma.user.findFirst({
    where: { id: payload.sub, is_active: true },  // ← user exists check
  });
  // ... generate new pair
}
```

### Agent Question

1. Apakah perlu implementasi refresh token rotation? (setiap refresh →
   invalidate old, issue new, simpan hash di database)
2. Atau cukup current approach (Redis blacklist per user)?
3. Perhatikan tabel `RefreshToken` sudah ada di schema — mau dipakai atau
   dihapus?

---

## Finding RBAC-002: Roles Guard Default Allow All

**Severity:** Medium  
**File:** `apps/api/src/common/guards/roles.guard.ts:10-18`

### Problem

Jika endpoint **tidak punya `@Roles()` decorator**, `RolesGuard` return
`true` — artinya **semua role (OWNER, MANAGER, KASIR, STAFF)** bisa akses
endpoint tersebut.

```typescript
canActivate(context: ExecutionContext): boolean {
  const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [...]);

  if (!requiredRoles) {
    return true;  // ← DEFAULT ALLOW = SEMUA ROLE BISA AKSES
  }
  ...
}
```

Ini berbahaya karena:

- Developer lupa kasih `@Roles()` → semua user bisa akses endpoint
  sensitif (misal: future `/v1/users` CRUD)
- Tidak ada "fail closed" principle

### Agent Question

1. Setujukah default harus diubah ke `return false` (fail closed)?
2. Atau lebih baik document dengan jelas + tambah ESLint rule yang enforce
   setiap controller method harus punya `@Roles()` kecuali `@Public()`?
3. Pilih pendekatan mana?

---

## Finding SEC-001: No Login Brute-Force Protection

**Severity:** Medium  
**File:** `apps/api/src/modules/auth/auth.service.ts:105-154`

### Problem

Login endpoint `/v1/auth/login` hanya dilindungi oleh rate limiting global
(100 req/min). Tidak ada:

- Account lockout setelah N percobaan gagal
- Delay progression (exponential backoff)
- Tracking failed attempts per phone

PIN hanya 6 digit angka (1 juta kemungkinan). Dengan 100 req/min, attacker
bisa bruteforce 100 attempt per menit selama tidak ada lockout.

### Agent Question

1. Apakah perlu lockout sekarang (Sprint 0) atau cukup untuk Sprint 8
   (Testing/Security)?
2. Jika sekarang, pattern apa: Redis counter `login_failed:{phone}` dengan
   TTL 15 menit setelah 5 gagal attempt? Atau pendekatan lain?
3. Apakah rate limiting global (100/min) cukup untuk development phase?

---

## Finding SEC-003: No Input Sanitization for `nama` & `nama_usaha`

**Severity:** Medium  
**File:** `apps/api/src/modules/auth/auth.dto.ts:4-5, 16-18`

### Problem

Fields `nama` dan `nama_usaha` di `RegisterDto` hanya divalidasi panjang
(2-100 karakter via `@Length()`). Tidak ada:

- Character whitelist (alphanumeric + space only?)
- No HTML/script tag detection
- No emoji/special char restriction

Jika `nama_usaha` digunakan sebagai receipt header (sekarang: disimpan ke
`tenant.settings.receipt_header`), dan receipt di-render sebagai HTML di
thermal printer atau WhatsApp message, bisa terjadi HTML injection.

### Agent Question

1. Apakah perlu validasi karakter sekarang? Kalau iya, pakai regex apa?
2. Atau cukup sanitasi di output (saat render receipt)?
3. Perhatikan: nama bisa mengandung karakter khusus yang valid (misal
   "Warung Nasi 'Bu Siti'" dengan apostrophe) — bagaimana best approach?

---

## Finding INFO-001: WA Mock Mode Default True — Production Risk

**Severity:** Medium  
**File:** `apps/api/src/integrations/whatsapp/whatsapp.service.ts:18-23`

### Problem

Jika `.env` tidak memiliki `WA_MOCK_MODE`, default value yang dibaca
ConfigService adalah `true` — artinya **semua OTP akan di-log ke console
dan tidak benar-benar dikirim ke WhatsApp**.

```typescript
this.isMock = this.configService.get<boolean>('WA_MOCK_MODE', true);
```

Di production, ini berarti:

- OTP tidak pernah dikirim (user tidak bisa register/login)
- OTP code di-log ke file log server (security risk jika log accessible)

### Agent Question

1. Apakah perlu startup check: jika `NODE_ENV === 'production'` dan
   `WA_MOCK_MODE === true`, throw error saat bootstrap?
2. Atau cukup ganti default ke `false` + document?
3. Perhatikan: environment variable type conversion — `WA_MOCK_MODE=true`
   di `.env` dibaca sebagai string, bukan boolean. Apakah ConfigService
   handle ini?

---

## Finding SEC-002: CORS Default to Localhost Only

**Severity:** Low  
**File:** `apps/api/src/main.ts:26-32`

### Problem

CORS origin default ke `['http://localhost:3000', 'http://127.0.0.1:3000']`
jika env `ALLOWED_ORIGINS` tidak di-set. Di production, ini akan menolak
request dari domain production.

```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  ...
});
```

### Agent Question

1. Apakah perlu tambah startup assertion: `NODE_ENV === 'production'` dan
   `!ALLOWED_ORIGINS` → throw error saat bootstrap?
2. Atau biarkan saja (operator harus manual set env var)?

---

## Agent Instructions

**Task:** Review the 6 findings above. For each finding:

1. Verifikasi bahwa masalah masih ada di codebase saat ini (baca ulang file
   terkait).
2. Tentukan apakah fix perlu dilakukan **sekarang** (Sprint 0) atau bisa
   **ditunda** ke sprint testing (Sprint 8).
3. Jika fix sekarang, sampaikan **pendekatan yang Anda usulkan**.
4. Jika ditunda, sampaikan **justifikasi** dan mitigasi sementara.

**Output:** Balas langsung dengan format:

```
FINDING_ID: [Setuju/Tidak] — [Fix Now/Fix Later]
Pendekatan: [solusi spesifik]
Alasan: [kenapa memilih ini]
```

**PENTING:** Jangan langsung implementasi kode. Diskusi dulu — saya yang
akan menulis kodenya setelah kita sepakat pendekatannya.

---

_Audited with PentesterFlow playbooks: webvuln + jwt + recon._  
_See ADR.md and SYSTEM_PROMPT.md for project architecture reference._
