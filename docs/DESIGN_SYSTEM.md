# MrikiPOS — Design System Guide

> Panduan lengkap visual design untuk MrikiPOS.
> Semua komponen UI HARUS mengikuti spesifikasi ini.

---

## 1. Brand Identity

| Item        | Nilai                                           |
| ----------- | ----------------------------------------------- |
| Nama        | **MrikiPOS**                                    |
| Tagline     | _Kasir digitalmu, simpel & andal_               |
| Tone        | Friendly, Simple, Trustworthy, Modern           |
| Target Feel | Seperti ngobrol sama teman yang paham teknologi |

### Logo Concept

- Ikon: Kombinasi huruf **M** dengan simbol kasir/receipt
- Bentuk: Rounded, modern, approachable
- Warna: Primary gradient (Emerald → Teal)

---

## 2. Color Palette

### 2.1 Light Mode

```css
:root {
  /* === Brand Colors === */
  --color-primary: oklch(0.696 0.17 162.48); /* Emerald 500 (Mriki Teal) - #10b981 */
  --color-primary-hover: oklch(0.627 0.163 157.36); /* Emerald 600 - #059669 */
  --color-primary-light: oklch(0.906 0.093 164.15); /* Emerald 100 - #d1fae5 */
  --color-primary-dark: oklch(0.508 0.14 155.6); /* Emerald 700 - #047857 */

  --color-secondary: oklch(0.546 0.245 262.88); /* Blue 600 (POS Blue) - #2563eb */
  --color-secondary-hover: oklch(0.491 0.25 264.4); /* Blue 700 - #1d4ed8 */
  --color-secondary-light: oklch(0.901 0.058 259.07); /* Blue 100 - #dbeafe */
  --color-secondary-dark: oklch(0.424 0.199 265.63); /* Blue 800 - #1e40af */

  /* === Semantic Colors === */
  --color-success: oklch(0.723 0.191 142.18); /* Green 500 */
  --color-warning: oklch(0.768 0.165 74.1); /* Amber 500 */
  --color-danger: oklch(0.637 0.237 25.33); /* Red 500 */
  --color-info: oklch(0.685 0.169 237.32); /* Blue 500 */

  /* === Neutral / Surface === */
  --color-background: oklch(1 0 0); /* White */
  --color-surface: oklch(0.985 0 0); /* Gray 50 - #fafafa */
  --color-surface-raised: oklch(1 0 0); /* White */
  --color-border: oklch(0.923 0 0); /* Gray 200 - #e5e5e5 */
  --color-border-hover: oklch(0.869 0 0); /* Gray 300 */

  /* === Text === */
  --color-text-primary: oklch(0.21 0 0); /* Gray 900 */
  --color-text-secondary: oklch(0.439 0 0); /* Gray 600 */
  --color-text-tertiary: oklch(0.556 0 0); /* Gray 500 */
  --color-text-inverse: oklch(1 0 0); /* White */
  --color-text-link: oklch(0.546 0.245 262.88); /* Secondary Blue */

  /* === Overlay === */
  --color-overlay: oklch(0 0 0 / 0.5);
}
```

### 2.2 Dark Mode

```css
.dark {
  /* === Brand Colors === */
  --color-primary: oklch(0.696 0.17 162.48); /* Same primary */
  --color-primary-hover: oklch(0.765 0.153 166.05); /* Emerald 400 */
  --color-primary-light: oklch(0.302 0.065 152.93); /* Emerald 950 */
  --color-primary-dark: oklch(0.765 0.153 166.05); /* Emerald 400 */

  --color-secondary: oklch(0.64 0.22 258); /* Blue 500 */
  --color-secondary-hover: oklch(0.7 0.18 258); /* Blue 400 */
  --color-secondary-light: oklch(0.25 0.1 258); /* Blue 900 */
  --color-secondary-dark: oklch(0.7 0.18 258); /* Blue 400 */

  /* === Neutral / Surface === */
  --color-background: oklch(0.145 0 0); /* Gray 950 */
  --color-surface: oklch(0.185 0 0); /* Gray 900 */
  --color-surface-raised: oklch(0.215 0 0); /* Gray 850 */
  --color-border: oklch(0.27 0 0); /* Gray 800 */
  --color-border-hover: oklch(0.37 0 0); /* Gray 700 */

  /* === Text === */
  --color-text-primary: oklch(0.985 0 0); /* Gray 50 */
  --color-text-secondary: oklch(0.708 0 0); /* Gray 400 */
  --color-text-tertiary: oklch(0.556 0 0); /* Gray 500 */
  --color-text-inverse: oklch(0.145 0 0); /* Gray 950 */
}
```

### 2.3 Palette Reasoning

| Warna                      | Alasan                                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary (Teal/Emerald)** | Menyelaraskan dengan warna gradien kiri logo (kata "Mriki"). Asosiasi: pertumbuhan, kesegaran, uang, dan solusi modern. Kontras baik di light & dark mode.                                            |
| **Secondary (Blue)**       | Menyelaraskan dengan warna gradien kanan logo (kata "POS" dan "Solusi POS Cerdas UMKM"). Asosiasi: kepercayaan, teknologi, stabil, profesional. Digunakan untuk links, accents, dan elemen pendukung. |
| **oklch color space**      | TailwindCSS v4 native, konsistensi warna di semua device, P3 gamut support                                                                                                                            |

### 2.4 Status Colors Usage

```
✅ Success (Green)  → Transaksi berhasil, pembayaran diterima, stok cukup
⚠️ Warning (Amber)  → Stok menipis, kasbon jatuh tempo, shift belum ditutup
❌ Danger (Red)     → Error, transaksi gagal, stok habis, akun diblokir
ℹ️ Info (Blue)      → Notifikasi umum, tips, informasi
```

---

## 3. Typography

### 3.1 Font Stack

```css
:root {
  /* Primary font - UI text */
  --font-sans:
    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    sans-serif;

  /* Monospace - kode, angka, receipt */
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}
```

**Alasan pilih Inter:**

- Dirancang untuk UI digital
- Variable font (hemat bandwidth)
- Tabular numbers (angka sejajar — penting untuk POS/laporan)
- Bagus di ukuran kecil (mobile)
- Free, Google Fonts CDN

### 3.2 Type Scale

```css
:root {
  /* Heading */
  --text-h1: 1.875rem; /* 30px - Page title */
  --text-h2: 1.5rem; /* 24px - Section title */
  --text-h3: 1.25rem; /* 20px - Card title */
  --text-h4: 1.125rem; /* 18px - Sub-section */

  /* Body */
  --text-base: 1rem; /* 16px - Default body */
  --text-sm: 0.875rem; /* 14px - Secondary text */
  --text-xs: 0.75rem; /* 12px - Caption, badge */

  /* Special */
  --text-price: 1.5rem; /* 24px - Harga di POS */
  --text-total: 2rem; /* 32px - Grand total */

  /* Line Height */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  /* Font Weight */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### 3.3 Typography Usage

| Element                 | Size                | Weight           | Color            |
| ----------------------- | ------------------- | ---------------- | ---------------- |
| Page Title (h1)         | `text-h1` (30px)    | `semibold` (600) | `text-primary`   |
| Section Title (h2)      | `text-h2` (24px)    | `semibold` (600) | `text-primary`   |
| Card Title (h3)         | `text-h3` (20px)    | `medium` (500)   | `text-primary`   |
| Body Text               | `text-base` (16px)  | `normal` (400)   | `text-primary`   |
| Secondary Text          | `text-sm` (14px)    | `normal` (400)   | `text-secondary` |
| Caption / Label         | `text-xs` (12px)    | `medium` (500)   | `text-tertiary`  |
| Price                   | `text-price` (24px) | `bold` (700)     | `text-primary`   |
| Grand Total             | `text-total` (32px) | `bold` (700)     | `primary`        |
| Monospace (angka, kode) | `text-sm` (14px)    | `normal` (400)   | `text-primary`   |

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
}
```

### 4.2 Layout Dimensions

```css
:root {
  /* Sidebar */
  --sidebar-width: 260px;
  --sidebar-collapsed-width: 72px;

  /* Topbar */
  --topbar-height: 64px;

  /* Content */
  --content-max-width: 1280px;
  --content-padding: var(--space-4); /* 16px on mobile */
  --content-padding-md: var(--space-6); /* 24px on tablet+ */

  /* Card */
  --card-padding: var(--space-4);
  --card-radius: 0.75rem; /* 12px */

  /* Input */
  --input-height: 2.5rem; /* 40px */
  --input-height-lg: 3rem; /* 48px - untuk POS */
  --input-radius: 0.5rem; /* 8px */

  /* Button */
  --btn-height: 2.5rem; /* 40px */
  --btn-height-lg: 3rem; /* 48px */
  --btn-radius: 0.5rem; /* 8px */
}
```

### 4.3 Responsive Breakpoints

```css
/* Mobile First */
/* Default: < 640px (mobile) */
@media (min-width: 640px) {
  /* sm: tablet portrait */
}
@media (min-width: 768px) {
  /* md: tablet landscape */
}
@media (min-width: 1024px) {
  /* lg: desktop */
}
@media (min-width: 1280px) {
  /* xl: large desktop */
}
```

### 4.4 Layout Patterns

**Dashboard Layout (Desktop):**

```
┌─────────────────────────────────────────────────────┐
│                     Topbar (64px)                    │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │            Main Content                  │
│ (260px)  │         (padding: 24px)                  │
│          │                                          │
│  Logo    │  ┌──────────────────────────────────┐    │
│  Nav     │  │         Page Content              │    │
│  Items   │  │                                    │    │
│          │  └──────────────────────────────────┘    │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Dashboard Layout (Mobile):**

```
┌─────────────────────┐
│  ☰  Topbar  [user]  │ ← hamburger menu
├─────────────────────┤
│                     │
│   Main Content      │
│  (padding: 16px)    │
│                     │
│  ┌───────────────┐  │
│  │  Page Content  │  │
│  └───────────────┘  │
│                     │
├─────────────────────┤
│ 🏠  📦  💰  📊  ⚙️  │ ← bottom nav (mobile only)
└─────────────────────┘
```

**POS Layout (Tablet):**

```
┌──────────────────────────────────────────────────┐
│                   Topbar                          │
├──────────────────────────┬───────────────────────┤
│                          │                       │
│    Product Grid          │     Cart / Keranjang  │
│    (scrollable)          │     (fixed sidebar)   │
│                          │                       │
│  ┌────┐ ┌────┐ ┌────┐  │  Item 1    Rp 25.000  │
│  │prod│ │prod│ │prod│  │  Item 2    Rp 15.000  │
│  └────┘ └────┘ └────┘  │  ──────────────────── │
│  ┌────┐ ┌────┐ ┌────┐  │  Subtotal  Rp 40.000  │
│  │prod│ │prod│ │prod│  │  Diskon    Rp  5.000  │
│  └────┘ └────┘ └────┘  │  ──────────────────── │
│                          │  TOTAL    Rp 35.000   │
│  [search] [category ▼]  │                       │
│                          │  [ BAYAR ]            │
└──────────────────────────┴───────────────────────┘
```

---

## 5. Components

### 5.1 Buttons

| Variant       | Penggunaan      | Contoh                             |
| ------------- | --------------- | ---------------------------------- |
| **Primary**   | Aksi utama      | "Bayar", "Simpan", "Tambah Produk" |
| **Secondary** | Aksi sekunder   | "Batal", "Kembali", "Reset"        |
| **Outline**   | Aksi tersier    | "Filter", "Export", "Lihat Detail" |
| **Ghost**     | Aksi subtle     | Ikon navigation, close dialog      |
| **Danger**    | Aksi destruktif | "Hapus", "Void", "Refund"          |

**Spesifikasi Button:**

```css
.btn {
  height: var(--btn-height); /* 40px default */
  padding: 0 var(--space-4); /* 0 16px */
  border-radius: var(--btn-radius); /* 8px */
  font-weight: var(--font-medium); /* 500 */
  font-size: var(--text-sm); /* 14px */
  transition: all 150ms ease-in-out;
  cursor: pointer;
}

.btn-lg {
  height: var(--btn-height-lg); /* 48px */
  padding: 0 var(--space-6); /* 0 24px */
  font-size: var(--text-base); /* 16px */
}

/* States */
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.btn:active {
  transform: translateY(0);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### 5.2 Input Fields

```css
.input {
  height: var(--input-height); /* 40px */
  padding: 0 var(--space-3); /* 0 12px */
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius); /* 8px */
  font-size: var(--text-sm); /* 14px */
  background: var(--color-surface);
  color: var(--color-text-primary);
  transition: border-color 150ms ease;
}

.input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.input-error {
  border-color: var(--color-danger);
}
```

### 5.3 Cards

```css
.card {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--card-radius); /* 12px */
  padding: var(--card-padding); /* 16px */
  transition: box-shadow 200ms ease;
}

.card-interactive:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--color-border-hover);
}

.card-selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}
```

### 5.4 Badge / Status

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2); /* 4px 8px */
  border-radius: 9999px; /* pill shape */
  font-size: var(--text-xs); /* 12px */
  font-weight: var(--font-medium);
}

/* Variants */
.badge-success {
  background: oklch(0.906 0.093 164.15);
  color: oklch(0.508 0.14 155.6);
}
.badge-warning {
  background: oklch(0.928 0.079 95.97);
  color: oklch(0.554 0.135 66.44);
}
.badge-danger {
  background: oklch(0.936 0.032 17.72);
  color: oklch(0.577 0.245 27.33);
}
.badge-info {
  background: oklch(0.932 0.032 255.59);
  color: oklch(0.546 0.245 262.88);
}
```

### 5.5 Table

```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
}

.table td {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-border);
}

.table tr:hover {
  background: var(--color-surface);
}
```

### 5.6 Dialog / Modal

```css
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  animation: fadeIn 150ms ease;
}

.dialog {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-surface-raised);
  border-radius: var(--card-radius);
  padding: var(--space-6);
  max-width: 480px;
  width: calc(100% - 2rem);
  animation: scaleIn 200ms ease;
}

/* Mobile: dialog dari bawah (sheet) */
@media (max-width: 640px) {
  .dialog {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    width: 100%;
    max-width: 100%;
    border-radius: var(--card-radius) var(--card-radius) 0 0;
    animation: slideUp 200ms ease;
  }
}
```

### 5.7 Toast / Notification

```css
.toast {
  position: fixed;
  top: var(--space-4);
  right: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--input-radius);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideInRight 300ms ease;
  z-index: 50;
}

/* Mobile: toast dari atas, full width */
@media (max-width: 640px) {
  .toast {
    left: var(--space-4);
    right: var(--space-4);
  }
}
```

---

## 6. Icons

### 6.1 Icon Library

Gunakan **Lucide React** (fork dari Feather Icons):

- 1000+ ikon, konsisten 24x24
- Tree-shakeable (hanya import yang dipakai)
- Stroke-based, cocok dengan design modern

```typescript
import { ShoppingCart, Package, BarChart3, Users, Settings } from 'lucide-react';
```

### 6.2 Icon Sizes

| Context          | Size | Contoh                         |
| ---------------- | ---- | ------------------------------ |
| Navigation       | 20px | Sidebar menu items             |
| Button icon      | 16px | Button with icon + text        |
| Card icon        | 24px | Feature cards                  |
| Empty state      | 48px | "Belum ada produk"             |
| Status indicator | 12px | Dot indicator (online/offline) |

---

## 7. Animations & Transitions

### 7.1 Timing

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
  --easing-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### 7.2 Standard Animations

```css
/* Fade In */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Scale In (dialog, dropdown) */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* Slide Up (mobile sheet) */
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Slide In Right (toast) */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Pulse (loading, attention) */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Skeleton loading */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

### 7.3 Micro-Interactions

| Element         | Interaction   | Animation                           |
| --------------- | ------------- | ----------------------------------- |
| Button          | Hover         | `translateY(-1px)` + subtle shadow  |
| Button          | Active/Press  | `translateY(0)` + scale(0.98)       |
| Card (Product)  | Hover         | Subtle shadow + border color change |
| Card (Product)  | Select        | Border primary + scale pulse        |
| Cart Item       | Add           | Slide in from right                 |
| Cart Item       | Remove        | Slide out to left + fade            |
| Cart Counter    | Increment     | Number scale bounce                 |
| Toast           | Appear        | Slide in from right                 |
| Toast           | Dismiss       | Fade out                            |
| Sidebar         | Open (mobile) | Slide from left + overlay fade      |
| Dialog          | Open          | Scale + fade                        |
| Dialog (mobile) | Open          | Slide up from bottom                |
| Tab             | Switch        | Underline slide                     |
| Toggle          | Switch        | Translate dot + color transition    |
| Input           | Focus         | Border color + ring glow            |
| Loading         | Content       | Skeleton shimmer                    |

---

## 8. Shadows & Elevation

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

/* Dark mode shadows - lebih subtle */
.dark {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
}
```

**Usage:**

| Elevation | Shadow      | Contoh                        |
| --------- | ----------- | ----------------------------- |
| Level 0   | none        | Background, flat surfaces     |
| Level 1   | `shadow-sm` | Cards, list items             |
| Level 2   | `shadow-md` | Dropdown, popover, topbar     |
| Level 3   | `shadow-lg` | Dialog, modal                 |
| Level 4   | `shadow-xl` | Toast, floating action button |

---

## 9. Z-Index Scale

```css
:root {
  --z-base: 0;
  --z-dropdown: 10;
  --z-sticky: 20; /* sticky header, sidebar */
  --z-overlay: 30; /* dialog backdrop */
  --z-modal: 40; /* dialog content */
  --z-toast: 50; /* toast notifications */
}
```

---

## 10. POS-Specific Design

### 10.1 Product Grid

```
/* Product card in POS grid */
- Card size: minimum 120px x 140px
- Image: square, object-fit cover, border-radius 8px
- Nama: max 2 lines, ellipsis
- Harga: bold, primary color
- Stok: badge di pojok kanan atas (merah jika < minimum)
- Touch target: minimum 44px x 44px (accessibility)

Grid:
  Mobile (360px):  2 columns
  Tablet (768px):  3-4 columns
  Desktop (1280px): 4-5 columns
```

### 10.2 Cart / Keranjang

```
- Fixed sidebar (desktop) atau bottom sheet (mobile)
- Width: 360px (desktop), full width (mobile)
- Item: nama + qty stepper + harga + delete
- Qty stepper: [-] [qty] [+] — touch-friendly (44px buttons)
- Subtotal, diskon, pajak — right-aligned, monospace font
- Grand total: large, bold, primary color
- Button "BAYAR": full width, large (48px), primary color, sticky bottom
```

### 10.3 Payment Dialog

```
- Pilihan metode: Tunai, QRIS (grid icons)
- Tunai: input nominal dibayar → kalkulasi kembalian
- QRIS: tampilkan QR code → countdown → status polling
- Quick amount buttons: Rp 50.000, Rp 100.000, Rp 200.000, "Uang Pas"
- Kembalian: large text, success color
- Button konfirmasi: "Selesai & Cetak Struk"
```

### 10.4 Receipt / Struk

```
Format struk thermal (58mm atau 80mm):
═══════════════════════════
       WARUNG NASI PECEL
        Jl. Merdeka No.1
         Kota Blitar
         08123456789
═══════════════════════════
No: TXN-20260721-001
Tgl: 21/07/2026 10:30
Kasir: Bu Siti
───────────────────────────
Nasi Pecel       1  15.000
Es Teh           2   6.000
Kerupuk          3   3.000
───────────────────────────
Subtotal           24.000
Diskon              2.000
───────────────────────────
TOTAL             22.000
Bayar (Tunai)     25.000
Kembalian          3.000
═══════════════════════════
    Terima kasih!
   Semoga hari Anda
      menyenangkan
═══════════════════════════
```

---

## 11. Empty States & Loading

### 11.1 Empty States

Setiap halaman list harus punya empty state:

```
┌───────────────────────────────────┐
│                                   │
│           📦 (icon 48px)          │
│                                   │
│     Belum ada produk              │
│  Tambahkan produk pertama Anda    │
│                                   │
│     [ + Tambah Produk ]           │
│                                   │
└───────────────────────────────────┘
```

| Halaman      | Icon | Judul               | Deskripsi                                |
| ------------ | ---- | ------------------- | ---------------------------------------- |
| Products     | 📦   | Belum ada produk    | Tambahkan produk pertama Anda            |
| Transactions | 🧾   | Belum ada transaksi | Mulai transaksi pertama di halaman kasir |
| Customers    | 👥   | Belum ada pelanggan | Pelanggan akan muncul setelah transaksi  |
| Reports      | 📊   | Belum ada data      | Lakukan transaksi terlebih dahulu        |

### 11.2 Loading States

- **Skeleton loading** untuk initial page load (bukan spinner)
- **Inline spinner** (16px) untuk button loading states
- **Progress bar** (topbar) untuk page navigation
- **Pulse animation** untuk content refreshing

```
Skeleton pattern:
┌───────────────────────────────────┐
│ ████████████░░░░░░░░░░░░░░░░░░░  │ ← title
│ ████████░░░░░░░░░░░░░░░░░░░░░░░  │ ← subtitle
│                                   │
│ ┌─────────┐ ┌─────────┐ ┌──────┐ │
│ │░░░░░░░░░│ │░░░░░░░░░│ │░░░░░░│ │ ← cards skeleton
│ │░░░░░░░░░│ │░░░░░░░░░│ │░░░░░░│ │
│ └─────────┘ └─────────┘ └──────┘ │
└───────────────────────────────────┘
```

---

## 12. Accessibility (a11y)

### 12.1 Minimum Requirements

- **Color contrast**: minimum 4.5:1 (text), 3:1 (large text, icons)
- **Touch target**: minimum 44px x 44px
- **Focus indicator**: visible focus ring (2px primary outline)
- **Keyboard navigation**: semua interactive element bisa di-tab
- **Screen reader**: semantic HTML, ARIA labels jika perlu
- **Font size**: minimum 14px body text (target user UMKM, mungkin mata kurang)

### 12.2 ARIA Guidelines

```html
<!-- Navigation -->
<nav aria-label="Menu utama">
  <!-- Loading state -->
  <div aria-live="polite" aria-busy="true">Memuat data...</div>

  <!-- Dialog -->
  <dialog aria-labelledby="dialog-title" aria-describedby="dialog-desc">
    <!-- Status badge -->
    <span role="status" aria-label="Stok menipis">⚠️ Sisa 5</span>

    <!-- Form error -->
    <input aria-invalid="true" aria-describedby="error-phone" />
    <p id="error-phone" role="alert">Nomor HP tidak valid</p>
  </dialog>
</nav>
```

---

## 13. Print Styles

Untuk struk thermal dan laporan PDF:

```css
@media print {
  /* Hide non-print elements */
  .sidebar,
  .topbar,
  .toast,
  .dialog-overlay {
    display: none;
  }

  /* Struk thermal: 58mm width */
  .receipt {
    width: 58mm;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.4;
    color: #000;
    background: #fff;
  }

  /* Laporan: A4 */
  .report {
    width: 210mm;
    margin: 10mm;
    font-family: var(--font-sans);
    font-size: 10pt;
  }

  /* Page break */
  .page-break {
    page-break-before: always;
  }
}
```

---

_Design system ini harus di-maintain seiring development. Setiap perubahan visual harus di-update di dokumen ini terlebih dahulu._
