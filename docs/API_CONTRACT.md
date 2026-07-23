# MrikiPOS — API Contract / Specification

> Detail lengkap setiap endpoint API termasuk request/response schema.
> Semua developer (frontend & backend) HARUS mengacu ke dokumen ini.

---

## Conventions

### Base URL

```
Development:  http://localhost:4000/v1
Staging:      https://api-staging.mrikipos.com/v1
Production:   https://api.mrikipos.com/v1
```

### Authentication

```
Header: Authorization: Bearer <access_token>
```

Semua endpoint memerlukan auth kecuali ditandai `🔓 Public`.

### Tenant Context

Tenant ID otomatis di-extract dari JWT payload. Tidak perlu kirim header `X-Tenant-ID` secara manual.

### Standard Response Envelope

```typescript
// Success
{
  "success": true,
  "data": T,
  "meta"?: {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  },
  "timestamp": string // ISO 8601
}

// Error
{
  "success": false,
  "error": {
    "code": string,     // Machine-readable error code
    "message": string   // Human-readable message (Bahasa Indonesia)
  },
  "timestamp": string
}
```

### Standard Query Parameters (untuk list endpoints)

| Param    | Type            | Default      | Deskripsi                       |
| -------- | --------------- | ------------ | ------------------------------- |
| `page`   | number          | 1            | Halaman                         |
| `limit`  | number          | 20           | Items per halaman (max 100)     |
| `sort`   | string          | `created_at` | Field untuk sorting             |
| `order`  | `asc` \| `desc` | `desc`       | Urutan sorting                  |
| `search` | string          | -            | Pencarian teks (nama, SKU, dll) |

---

## 1. Auth Module 🔐

### POST `/auth/register` 🔓 Public

Registrasi tenant baru (owner).

**Request:**

```json
{
  "nama": "Bu Siti",
  "phone": "081234567890",
  "pin": "123456",
  "nama_usaha": "Warung Nasi Pecel Bu Siti"
}
```

**Validation Rules:**

| Field        | Rules                              |
| ------------ | ---------------------------------- |
| `nama`       | required, string, 2-100 chars      |
| `phone`      | required, regex: `^08[0-9]{8,12}$` |
| `pin`        | required, exactly 6 digits         |
| `nama_usaha` | required, string, 2-100 chars      |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "tenant_id": "uuid",
    "otp_sent": true,
    "message": "OTP telah dikirim ke WhatsApp 0812****7890"
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

**Errors:**

| Code               | Status | Kondisi                   |
| ------------------ | ------ | ------------------------- |
| `VALIDATION_ERROR` | 400    | Input tidak valid         |
| `CONFLICT`         | 409    | Nomor HP sudah terdaftar  |
| `RATE_LIMITED`     | 429    | Terlalu banyak registrasi |

---

### POST `/auth/otp/send` 🔓 Public

Kirim ulang OTP via WhatsApp.

**Request:**

```json
{
  "phone": "081234567890",
  "type": "register" | "login" | "forgot_pin"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "otp_sent": true,
    "expires_in": 300,
    "message": "OTP telah dikirim ke WhatsApp 0812****7890"
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

**Rate Limit:** 3 request per menit per nomor HP.

---

### POST `/auth/otp/verify` 🔓 Public

Verifikasi kode OTP.

**Request:**

```json
{
  "phone": "081234567890",
  "code": "123456",
  "type": "register" | "login" | "forgot_pin"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "verified": true,
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "nama": "Bu Siti",
      "phone": "081234567890",
      "role": "OWNER",
      "tenant_id": "uuid",
      "outlet_id": "uuid"
    }
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

**Errors:**

| Code               | Status | Kondisi                           |
| ------------------ | ------ | --------------------------------- |
| `INVALID_OTP`      | 400    | Kode OTP salah                    |
| `OTP_EXPIRED`      | 400    | OTP sudah expired (> 5 menit)     |
| `OTP_MAX_ATTEMPTS` | 429    | Sudah 3x salah, minta kirim ulang |

---

### POST `/auth/login` 🔓 Public

Login dengan nomor HP + PIN.

**Request:**

```json
{
  "phone": "081234567890",
  "pin": "123456"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "nama": "Bu Siti",
      "phone": "081234567890",
      "role": "OWNER",
      "tenant_id": "uuid",
      "outlet_id": "uuid",
      "outlet_nama": "Warung Nasi Pecel Bu Siti"
    }
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

**Errors:**

| Code                  | Status | Kondisi                                        |
| --------------------- | ------ | ---------------------------------------------- |
| `INVALID_CREDENTIALS` | 401    | Phone atau PIN salah                           |
| `ACCOUNT_INACTIVE`    | 403    | Akun dinonaktifkan                             |
| `ACCOUNT_LOCKED`      | 423    | Terlalu banyak gagal login (5x dalam 15 menit) |

---

### POST `/auth/refresh` 🔓 Public

Refresh access token.

**Request:**

```json
{
  "refresh_token": "eyJhbG..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbG...(new)",
    "refresh_token": "eyJhbG...(new, rotated)",
    "expires_in": 900
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

**Note:** Refresh token rotation — old refresh token langsung di-revoke setelah digunakan.

---

### POST `/auth/logout`

Logout dan revoke semua token.

**Request:**

```json
{
  "refresh_token": "eyJhbG..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Berhasil logout"
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

---

### POST `/auth/forgot-pin` 🔓 Public

Reset PIN via OTP.

**Request (Step 1 — kirim OTP):**

```json
{
  "phone": "081234567890"
}
```

**Request (Step 2 — verify + set new PIN):**

```json
{
  "phone": "081234567890",
  "code": "123456",
  "new_pin": "654321"
}
```

---

## 2. Tenant & Outlet Module 🏪

### GET `/tenant`

Get info tenant saat ini.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nama": "Warung Nasi Pecel Bu Siti",
    "phone": "081234567890",
    "email": null,
    "plan": "FREE",
    "status": "ACTIVE",
    "settings": {
      "currency": "IDR",
      "timezone": "Asia/Jakarta",
      "receipt_header": "Warung Nasi Pecel Bu Siti",
      "receipt_footer": "Terima kasih!",
      "tax_enabled": false,
      "tax_rate": 0
    },
    "created_at": "2026-07-21T10:00:00Z"
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

**Authorization:** `OWNER`, `MANAGER`

---

### PUT `/tenant`

Update tenant settings.

**Request:**

```json
{
  "nama": "Warung Pecel Bu Siti (Updated)",
  "email": "busiti@email.com",
  "settings": {
    "receipt_header": "WARUNG PECEL BU SITI",
    "receipt_footer": "Terima kasih! Sampai jumpa lagi!",
    "tax_enabled": true,
    "tax_rate": 0.5
  }
}
```

**Authorization:** `OWNER` only

---

### GET `/outlets`

List semua outlet milik tenant.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nama": "Outlet Pusat",
      "alamat": "Jl. Merdeka No. 1",
      "kelurahan": "Kepanjenkidul",
      "kecamatan": "Kepanjenkidul",
      "latitude": -8.098,
      "longitude": 112.168,
      "is_active": true,
      "created_at": "2026-07-21T10:00:00Z"
    }
  ],
  "timestamp": "2026-07-21T10:00:00Z"
}
```

---

### POST `/outlets`

Buat outlet baru.

**Request:**

```json
{
  "nama": "Cabang Pasar Legi",
  "alamat": "Jl. Pasar Legi No. 5",
  "kelurahan": "Sananwetan",
  "kecamatan": "Sananwetan",
  "latitude": -8.097,
  "longitude": 112.175
}
```

**Authorization:** `OWNER` only  
**Limit:** Max 1 outlet (FREE), 3 outlet (BISNIS)

---

### GET `/outlets/:id`

Get detail outlet.

---

### PUT `/outlets/:id`

Update outlet.

**Authorization:** `OWNER` only

---

### DELETE `/outlets/:id`

Soft-delete outlet (set `is_active = false`).

**Authorization:** `OWNER` only  
**Note:** Tidak bisa delete outlet terakhir.

---

## 3. Users Module 👥

### GET `/users`

List user di tenant saat ini.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nama": "Bu Siti",
      "phone": "081234567890",
      "role": "OWNER",
      "outlet_id": "uuid",
      "outlet_nama": "Outlet Pusat",
      "is_active": true,
      "last_login": "2026-07-21T10:00:00Z",
      "created_at": "2026-07-21T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

**Authorization:** `OWNER`, `MANAGER`

---

### POST `/users`

Buat user baru (kasir, staff, manager).

**Request:**

```json
{
  "nama": "Andi",
  "phone": "081298765432",
  "pin": "654321",
  "role": "KASIR",
  "outlet_id": "uuid"
}
```

**Authorization:** `OWNER` only  
**Limit:** Max 1 user (FREE), 3 user (UMKM), 10 user (BISNIS)

---

### PUT `/users/:id/pin`

Ganti PIN user.

**Request (Owner ganti PIN kasir):**

```json
{
  "new_pin": "111222"
}
```

**Request (User ganti PIN sendiri):**

```json
{
  "old_pin": "654321",
  "new_pin": "111222"
}
```

---

## 4. Products & Inventory Module 📦

### GET `/products`

List produk.

**Query params tambahan:**

| Param         | Type    | Deskripsi                   |
| ------------- | ------- | --------------------------- |
| `category_id` | uuid    | Filter by kategori          |
| `is_active`   | boolean | Filter aktif/nonaktif       |
| `low_stock`   | boolean | Hanya stok di bawah minimum |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nama": "Nasi Pecel",
      "sku": "NP-001",
      "barcode": "8991234567890",
      "harga_jual": 15000,
      "harga_beli": 8000,
      "stok": 50,
      "stok_minimum": 10,
      "satuan": "porsi",
      "foto_url": "https://cdn.mrikipos.com/products/abc123.jpg",
      "category": {
        "id": "uuid",
        "nama": "Makanan"
      },
      "variants": [
        {
          "id": "uuid",
          "nama": "Extra Sambal",
          "harga_jual": 17000,
          "stok": 50
        }
      ],
      "is_active": true,
      "created_at": "2026-07-21T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

---

### POST `/products`

Tambah produk baru.

**Request:**

```json
{
  "nama": "Nasi Pecel",
  "sku": "NP-001",
  "barcode": "8991234567890",
  "harga_jual": 15000,
  "harga_beli": 8000,
  "stok": 50,
  "stok_minimum": 10,
  "satuan": "porsi",
  "category_id": "uuid",
  "foto_url": "https://cdn.mrikipos.com/products/abc123.jpg",
  "variants": [
    {
      "nama": "Extra Sambal",
      "sku": "NP-001-ES",
      "harga_jual": 17000,
      "stok": 50
    }
  ]
}
```

**Validation:**

| Field          | Rules                                    |
| -------------- | ---------------------------------------- |
| `nama`         | required, 1-100 chars                    |
| `harga_jual`   | required, number, min 0                  |
| `harga_beli`   | optional, number, min 0                  |
| `stok`         | optional, integer, min 0, default 0      |
| `stok_minimum` | optional, integer, min 0, default 5      |
| `barcode`      | optional, 8-13 digits, unique per tenant |
| `sku`          | optional, unique per tenant              |

**Authorization:** `OWNER`, `MANAGER`

---

### POST `/products/import`

Import produk dari file Excel.

**Request:** `multipart/form-data`

| Field  | Type   | Deskripsi                                             |
| ------ | ------ | ----------------------------------------------------- |
| `file` | File   | .xlsx atau .csv, max 5MB                              |
| `mode` | string | `create` (hanya baru) atau `upsert` (update jika ada) |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total_rows": 150,
    "created": 120,
    "updated": 25,
    "skipped": 3,
    "errors": [
      { "row": 45, "field": "barcode", "message": "Barcode sudah ada" },
      { "row": 67, "field": "harga_jual", "message": "Harga tidak boleh kosong" }
    ]
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

**Authorization:** `OWNER`, `MANAGER`

---

### POST `/products/:id/stock`

Adjustment stok manual (stock opname).

**Request:**

```json
{
  "type": "adjustment",
  "qty": -5,
  "keterangan": "Barang rusak/expired"
}
```

**type values:** `in` (barang masuk), `out` (barang keluar), `adjustment` (koreksi)

---

### GET `/stock/history`

Riwayat mutasi stok.

**Query params:**

| Param        | Type   | Deskripsi                 |
| ------------ | ------ | ------------------------- |
| `product_id` | uuid   | Filter by produk          |
| `type`       | string | `in`, `out`, `adjustment` |
| `date_from`  | date   | Dari tanggal              |
| `date_to`    | date   | Sampai tanggal            |

---

### GET `/stock/low`

Produk dengan stok di bawah minimum.

---

## 5. Transactions (POS) Module 💰

### POST `/transactions`

Buat transaksi baru.

**Request:**

```json
{
  "items": [
    {
      "product_id": "uuid",
      "variant_id": null,
      "qty": 2,
      "harga": 15000,
      "diskon_item": 0,
      "catatan": "Extra sambal"
    },
    {
      "product_id": "uuid",
      "variant_id": "uuid",
      "qty": 1,
      "harga": 5000,
      "diskon_item": 0,
      "catatan": null
    }
  ],
  "customer_id": null,
  "diskon": 2000,
  "catatan": "Meja 3",
  "payments": [
    {
      "metode": "CASH",
      "jumlah": 35000
    }
  ]
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nomor": "TXN-20260721-001",
    "items": [...],
    "subtotal": 35000,
    "diskon": 2000,
    "pajak": 0,
    "grand_total": 33000,
    "payments": [
      {
        "metode": "CASH",
        "jumlah": 35000,
        "status": "PAID"
      }
    ],
    "kembalian": 2000,
    "status": "COMPLETED",
    "kasir": {
      "id": "uuid",
      "nama": "Bu Siti"
    },
    "created_at": "2026-07-21T10:30:00Z"
  },
  "timestamp": "2026-07-21T10:30:00Z"
}
```

**Side Effects:**

- Kurangi stok produk
- Update `stock_history`
- Update `shifts.total_penjualan` & `total_transaksi`
- Emit WebSocket event `transaction:completed`
- Jika stok < minimum → emit `stock:low_alert` + trigger WA notification

---

### POST `/transactions/:id/void`

Void (batalkan) transaksi.

**Request:**

```json
{
  "pin": "123456",
  "alasan": "Pelanggan batal"
}
```

**Authorization:** `OWNER`, `MANAGER` (PIN required)

---

### POST `/transactions/:id/refund`

Refund (sebagian atau penuh).

**Request:**

```json
{
  "pin": "123456",
  "items": [
    {
      "transaction_item_id": "uuid",
      "qty": 1,
      "alasan": "Makanan tidak sesuai"
    }
  ]
}
```

**Authorization:** `OWNER`, `MANAGER` (PIN required)

---

### POST `/transactions/sync`

Batch sync transaksi offline.

**Request:**

```json
{
  "transactions": [
    {
      "local_id": "local-uuid-1",
      "items": [...],
      "payments": [...],
      "created_at": "2026-07-21T09:00:00Z"
    },
    {
      "local_id": "local-uuid-2",
      "items": [...],
      "payments": [...],
      "created_at": "2026-07-21T09:05:00Z"
    }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "synced": 2,
    "failed": 0,
    "results": [
      { "local_id": "local-uuid-1", "server_id": "uuid", "status": "synced" },
      { "local_id": "local-uuid-2", "server_id": "uuid", "status": "synced" }
    ]
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

---

## 6. Payments Module 💳

### POST `/payments`

Buat pembayaran (biasanya QRIS).

**Request:**

```json
{
  "transaction_id": "uuid",
  "metode": "QRIS",
  "jumlah": 33000
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "metode": "QRIS",
    "jumlah": 33000,
    "status": "PENDING",
    "qris_url": "https://api.midtrans.com/v2/qris/...",
    "qris_string": "00020101021...",
    "expires_at": "2026-07-21T10:45:00Z"
  },
  "timestamp": "2026-07-21T10:30:00Z"
}
```

---

### POST `/payments/webhook` 🔓 Public

Webhook dari payment gateway (Midtrans).

**Request (dari Midtrans):**

```json
{
  "transaction_id": "uuid",
  "transaction_status": "settlement",
  "gross_amount": "33000.00",
  "signature_key": "abc123..."
}
```

**Validation:** Verify signature menggunakan Midtrans server key.  
**Side Effect:** Update payment status, emit WebSocket `payment:confirmed`.

---

## 7. Customers & Kasbon Module 👤

### GET `/customers`

List pelanggan.

### POST `/customers`

Tambah pelanggan baru.

**Request:**

```json
{
  "nama": "Pak Ahmad",
  "phone": "081345678901",
  "alamat": "Jl. Kenanga No. 5, Kepanjenkidul"
}
```

---

### GET `/credits`

List semua kasbon.

**Query params:**

| Param         | Type   | Deskripsi                   |
| ------------- | ------ | --------------------------- |
| `status`      | string | `unpaid`, `paid`, `overdue` |
| `customer_id` | uuid   | Filter by pelanggan         |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "customer": {
        "id": "uuid",
        "nama": "Pak Ahmad",
        "phone": "081345678901"
      },
      "jumlah": 75000,
      "keterangan": "Belanja sembako 20 Juli",
      "jatuh_tempo": "2026-08-20",
      "status": "UNPAID",
      "created_at": "2026-07-20T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

---

### POST `/credits`

Tambah kasbon baru.

**Request:**

```json
{
  "customer_id": "uuid",
  "jumlah": 75000,
  "keterangan": "Belanja sembako 20 Juli",
  "jatuh_tempo": "2026-08-20"
}
```

---

### PUT `/credits/:id/pay`

Bayar kasbon (lunas).

**Request:**

```json
{
  "metode": "CASH",
  "jumlah": 75000,
  "catatan": "Lunas dibayar tunai"
}
```

---

## 8. Reports Module 📊

### GET `/reports/sales`

Laporan penjualan.

**Query params:**

| Param       | Type   | Default | Deskripsi                              |
| ----------- | ------ | ------- | -------------------------------------- |
| `period`    | string | `daily` | `daily`, `weekly`, `monthly`, `yearly` |
| `date_from` | date   | today   | Dari tanggal                           |
| `date_to`   | date   | today   | Sampai tanggal                         |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "period": "daily",
    "date_from": "2026-07-21",
    "date_to": "2026-07-21",
    "summary": {
      "total_penjualan": 1250000,
      "total_transaksi": 45,
      "rata_rata_transaksi": 27778,
      "total_diskon": 50000,
      "total_pajak": 0,
      "net_sales": 1200000
    },
    "by_payment_method": [
      { "metode": "CASH", "jumlah": 850000, "count": 30 },
      { "metode": "QRIS", "jumlah": 400000, "count": 15 }
    ],
    "by_hour": [
      { "hour": 7, "jumlah": 150000, "count": 8 },
      { "hour": 8, "jumlah": 200000, "count": 12 }
    ]
  },
  "timestamp": "2026-07-21T23:59:00Z"
}
```

**Authorization:** `OWNER`, `MANAGER`

---

### GET `/reports/profit-loss`

Laporan laba rugi sederhana.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "date_from": "2026-07-01",
    "date_to": "2026-07-31",
    "pendapatan": {
      "penjualan_kotor": 15000000,
      "diskon": 500000,
      "penjualan_bersih": 14500000
    },
    "harga_pokok": {
      "total_hpp": 8000000
    },
    "laba_kotor": 6500000,
    "margin_persen": 44.83
  },
  "timestamp": "2026-07-31T23:59:00Z"
}
```

---

### GET `/reports/products/top`

Produk terlaris.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "product_id": "uuid",
      "nama": "Nasi Pecel",
      "total_qty": 250,
      "total_revenue": 3750000,
      "percentage": 25.0
    }
  ],
  "timestamp": "2026-07-21T10:00:00Z"
}
```

---

### GET `/reports/export`

Export laporan ke PDF atau Excel.

**Query params:**

| Param       | Type   | Deskripsi                                  |
| ----------- | ------ | ------------------------------------------ |
| `format`    | string | `pdf` atau `excel`                         |
| `type`      | string | `sales`, `profit-loss`, `stock`, `cashier` |
| `date_from` | date   | Dari tanggal                               |
| `date_to`   | date   | Sampai tanggal                             |

**Response (200):** File download (Content-Disposition: attachment)

---

### GET `/reports/bank-format`

Laporan format bank (untuk pengajuan KUR).

**Response (200):**

```json
{
  "success": true,
  "data": {
    "format": "kur_bri",
    "periode": "Juli 2026",
    "nama_usaha": "Warung Nasi Pecel Bu Siti",
    "omset_bulanan": 15000000,
    "laba_bersih_bulanan": 6500000,
    "jumlah_transaksi": 450,
    "rata_rata_transaksi_harian": 500000,
    "download_url": "https://cdn.mrikipos.com/reports/..."
  },
  "timestamp": "2026-07-31T23:59:00Z"
}
```

---

## 9. Shifts Module ⏰

### POST `/shifts/open`

Buka shift baru.

**Request:**

```json
{
  "modal_awal": 200000
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user": { "id": "uuid", "nama": "Bu Siti" },
    "modal_awal": 200000,
    "status": "OPEN",
    "opened_at": "2026-07-21T07:00:00Z"
  },
  "timestamp": "2026-07-21T07:00:00Z"
}
```

**Errors:**

| Code                 | Status | Kondisi                                   |
| -------------------- | ------ | ----------------------------------------- |
| `SHIFT_ALREADY_OPEN` | 409    | User sudah punya shift yang belum ditutup |

---

### POST `/shifts/close`

Tutup shift dan hitung selisih kas.

**Request:**

```json
{
  "kas_aktual": 1450000,
  "catatan": "Selisih Rp 5.000, kemungkinan kembalian kurang"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "modal_awal": 200000,
    "total_penjualan": 1250000,
    "total_transaksi": 45,
    "kas_seharusnya": 1450000,
    "kas_aktual": 1445000,
    "selisih_kas": -5000,
    "status": "CLOSED",
    "opened_at": "2026-07-21T07:00:00Z",
    "closed_at": "2026-07-21T21:00:00Z"
  },
  "timestamp": "2026-07-21T21:00:00Z"
}
```

---

## 10. Notifications Module 🔔

### GET `/notifications`

List notifikasi user.

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "STOCK_LOW",
      "title": "Stok Menipis",
      "message": "Stok Nasi Pecel tersisa 5 porsi (minimum: 10)",
      "is_read": false,
      "data": { "product_id": "uuid" },
      "created_at": "2026-07-21T15:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 8, "totalPages": 1 },
  "timestamp": "2026-07-21T15:00:00Z"
}
```

---

## 11. Upload Module 📁

### POST `/upload/image`

Upload gambar produk.

**Request:** `multipart/form-data`

| Field  | Type | Deskripsi                |
| ------ | ---- | ------------------------ |
| `file` | File | .jpg/.png/.webp, max 2MB |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "url": "https://cdn.mrikipos.com/products/abc123.webp",
    "size": 145000,
    "mime_type": "image/webp",
    "width": 800,
    "height": 800
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

**Processing:** Auto-resize 800x800, convert to WebP, strip EXIF.

---

## 12. Health Check Module ❤️ 🔓 Public

### GET `/health`

Basic health check.

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2026-07-21T10:00:00Z"
}
```

### GET `/health/ready`

Readiness check (DB + Redis connected).

**Response (200):**

```json
{
  "status": "ready",
  "checks": {
    "database": "connected",
    "redis": "connected"
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

### GET `/health/live`

Liveness check.

**Response (200):**

```json
{
  "status": "alive",
  "uptime": 86400,
  "memory": {
    "used_mb": 128,
    "total_mb": 512
  },
  "timestamp": "2026-07-21T10:00:00Z"
}
```

---

## WebSocket Events Reference

### Connection

```typescript
const socket = io('wss://api.mrikipos.com', {
  auth: { token: 'Bearer <access_token>' },
  transports: ['websocket'],
});
```

### Events

| Direction       | Event                   | Payload                                  | Deskripsi                    |
| --------------- | ----------------------- | ---------------------------------------- | ---------------------------- |
| Client → Server | `join:outlet`           | `{ outlet_id }`                          | Join room outlet             |
| Client → Server | `leave:outlet`          | `{ outlet_id }`                          | Leave room outlet            |
| Server → Client | `transaction:completed` | `{ transaction }`                        | Transaksi baru selesai       |
| Server → Client | `stock:updated`         | `{ product_id, old_stok, new_stok }`     | Stok berubah                 |
| Server → Client | `stock:low_alert`       | `{ product_id, nama, stok, minimum }`    | Stok di bawah minimum        |
| Server → Client | `payment:confirmed`     | `{ payment_id, transaction_id, status }` | Pembayaran QRIS dikonfirmasi |
| Server → Client | `sync:required`         | `{ reason }`                             | Client perlu re-sync data    |
| Server → Client | `notification:new`      | `{ notification }`                       | Notifikasi baru              |
| Server → Client | `shift:opened`          | `{ shift }`                              | Shift dibuka oleh kasir      |
| Server → Client | `shift:closed`          | `{ shift }`                              | Shift ditutup                |

---

_Dokumen ini harus di-update setiap kali ada endpoint baru atau perubahan contract. Frontend dan backend HARUS sinkron dengan dokumen ini._
