# designs.md — Design System & UX Guidelines

Panduan visual dan UX untuk TARA. LLM yang mengubah UI **wajib** mengikuti konvensi ini agar tampilan konsisten antara web HR dan mobile PWA.

**Stack:** React 18 + Tailwind CSS 3 + Radix primitives + Lucide icons  
**Tema:** Luxury warm (ivory/gold) light default; dark "Obsidian Navy" opsional

---

## 1. Filosofi Desain

1. **Profesional tapi hangat** — HR enterprise, bukan startup flashy.
2. **Mobile-first untuk karyawan** — thumb-friendly, native patterns di mana perlu.
3. **Data-dense di web** — HR butuh tabel, filter, audit trail.
4. **Aksesibilitas praktis** — kontras cukup, touch target ≥44px di mobile.
5. **Bahasa Indonesia** — copy UI utama ID; gunakan `t()` untuk string baru.

---

## 2. Layout & Routing

### 2.1 Dual Interface

| | Web | Mobile |
|---|-----|--------|
| **Path** | `/web/*` | `/m/*` |
| **Layout** | `WebLayout` — sidebar + header | `MobileLayout` — scroll + bottom nav |
| **Max width** | Full desktop | `max-w-md mx-auto` |
| **Navigasi** | Sidebar kiri | Bottom tab bar (4–6 item) |
| **Breakpoint** | ≥768px | `<768px` (`useIsMobile`) |

Setelah login, `RootRedirect` mengarahkan ke `/m` atau `/web` berdasarkan lebar layar.

### 2.2 Struktur Halaman Web (HR)

```
┌─────────────────────────────────────────────┐
│ Sidebar │  Header / breadcrumb              │
│         ├─────────────────────────────────┤
│         │  Page title (text-luxury-heading)│
│         │  Description (text-muted-fg)      │
│         ├─────────────────────────────────┤
│         │  surface-elevated cards           │
│         │  tables / forms / charts          │
└─────────────────────────────────────────────┘
```

### 2.3 Struktur Halaman Mobile

```
┌──────────────────┐
│  px-5 py-6       │
│  animate-fade-in │
│  surface cards   │
│                  │
├──────────────────┤
│  AppFooter       │
├──────────────────┤
│  Bottom nav      │
│  safe-area       │
└──────────────────┘
```

Mobile shell: `h-[100dvh]`, `main` = `flex-1 overflow-y-auto`.

---

## 3. Design Tokens (CSS Variables)

Definisi di `src/index.css`. Gunakan **semantic tokens**, bukan hex hardcode.

### 3.1 Warna Semantik

| Token | Penggunaan |
|-------|------------|
| `background` / `foreground` | Base page |
| `primary` | CTA utama (navy) |
| `gold` | Aksen brand, active nav, highlight |
| `muted` / `muted-foreground` | Secondary text, placeholders |
| `destructive` | Hapus, error, tolak |
| `success` | Disetujui, aktif, berhasil |
| `warning` | Pending, draft, peringatan |
| `accent` | Hover subtle, inset surfaces |
| `border` / `input` | Border form & card |
| `card` | Surface elevated |

### 3.2 Tipografi

| Class / var | Font | Penggunaan |
|-------------|------|------------|
| `font-sans` / Inter | Body, form, table |
| `font-display` / Plus Jakarta Sans | `text-luxury-heading`, angka besar saldo |
| `text-luxury-heading` | Page & section titles |
| `text-luxury-label` | Form labels, column headers |
| `text-2xs` | Meta, timestamp, badge (10px) |
| `text-xs` | Secondary buttons, hints |

### 3.3 Radius & Shadow

- Cards/buttons: `rounded-md` atau `rounded-lg`
- Avatar: `rounded-full`
- Shadow cards: `shadow-luxury`, `shadow-luxury-lg` (modals)

---

## 4. Komponen Surface (Pola Utama)

### 4.1 Cards

```tsx
// Standard elevated card
<div className="surface-elevated p-5 space-y-4">...</div>

// Inset / secondary
<div className="surface-inset p-6 text-center">...</div>
```

### 4.2 Buttons

| Variant | Class pattern |
|---------|---------------|
| Primary CTA | `bg-primary text-primary-foreground hover:bg-primary/90` |
| Gold accent | `bg-gold text-gold-foreground hover:bg-gold/90` |
| Secondary | `border border-input hover:bg-accent` |
| Destructive | `border-destructive/30 text-destructive hover:bg-destructive/10` |
| Icon toolbar | `px-2.5 py-1.5 rounded-md border text-xs` |

### 4.3 Form Fields

```tsx
<label className="text-luxury-label">Label</label>
<input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
<select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" />
<textarea className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" />
```

**Mobile touch:** `min-h-[44px]` pada control interaktif penting.

### 4.4 Status Badges

```tsx
// Success
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-success/10 text-success">

// Warning / pending
bg-warning/10 text-warning

// Destructive
bg-destructive/10 text-destructive

// Neutral
bg-muted text-muted-foreground
```

### 4.5 Empty States

- Icon besar `text-muted-foreground/30`
- `surface-inset p-6 text-center`
- Satu kalimat `text-sm text-muted-foreground`

---

## 5. Pola UX per Modul

### 5.1 Daftar + Detail (Karyawan, Cuti)

- List page: filter + table/cards
- Detail: `EmployeeDetailPage` — header avatar inisial, grid info, section saldo cuti
- Back: `ArrowLeft` + "Kembali ke Daftar"

### 5.2 Form Cuti Mobile

- `MobileLeavePage`: balance card → CTA → collapsible form
- Tanggal: **grid 1 kolom** di mobile (`grid-cols-1`)
- `DatePickerInput` — **wajib** native overlay pattern (lihat §6)

### 5.3 Workflow Builder

- Layout: sidebar list | canvas (React Flow) | properties panel
- Toolbar: `+ If`, `+ Aksi`, `Test`, `Simpan`, `Publish`, `Aktifkan`
- Status badges: Draft, Published, Aktif, Belum disimpan
- Log eksekusi: collapsible list di bawah canvas
- Library: `@xyflow/react` — node types di `WorkflowNodes.tsx`

### 5.4 Modals & Dialogs

- Fixed overlay: `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm`
- Mobile sheets: `items-end` (slide from bottom)
- Desktop: `items-center`
- Animation: `animate-fade-in`

### 5.5 Toasts

- Sonner via `toast` from `sonner`
- Success/error singkat; hindari toast panjang

---

## 6. Komponen Kritis — Jangan Rusak

### 6.1 DatePickerInput (Mobile PWA)

**File:** `src/components/DatePickerInput.tsx`

**Pola benar:**
- Input `type="date"` di **lapisan atas** (`z-10`, `opacity-0`, **tanpa** `pointer-events-none`)
- Visual display di belakang dengan `pointer-events-none`
- Tap harus langsung ke input native — `showPicker()` dari button **gagal** di iOS/Android

### 6.2 FeatureGate

Wrap route/page dengan `FeatureGate` / `MobileFeatureGate` sesuai `src/lib/feature-flags.ts`.

### 6.3 Auth Modals (Global)

- `ForcePasswordChangeModal` — blocking setelah login
- `PinRotationPrompt` — absensi PIN
- `SitePermissionsGate` — GPS kamera

---

## 7. Ikonografi

- **Library:** Lucide React (`lucide-react`)
- **Stroke:** default 2; active nav `2.25`
- **Ukuran:** `h-4 w-4` inline; `h-5 w-5` nav; `h-6 w-6` page title
- **Brand accent:** `text-gold` pada ikon aktif / heading

---

## 8. Animasi

| Class | Penggunaan |
|-------|------------|
| `animate-fade-in` | Page enter, modal, form expand |
| `transition-colors` | Hover button/nav |
| `transition-all` | Progress bar saldo cuti |

Hindari animasi berlebihan pada tabel data HR.

---

## 9. Charts & Data Viz

- **Library:** Recharts (`DashboardPage`)
- Warna: gunakan `chart-1` … `chart-5` atau `gold` untuk series utama
- Responsif: `ResponsiveContainer`

---

## 10. Workflow Canvas (React Flow)

| Element | Style |
|---------|-------|
| Trigger node | Label + event type subtitle |
| Condition node | `ALL/ANY · field operator value` |
| Action node | Action type label |
| Edge handles | `true` / `false` / `default` |
| Background | `surface-elevated` container, `min-h-[400px]` |

Edit properties di panel kanan `WorkflowNodeProperties` — jangan inline edit di node kecuali label.

---

## 11. Copy & Tone (Bahasa Indonesia)

| Konteks | Gaya |
|---------|------|
| Button | Imperatif singkat: "Simpan", "Kirim Pengajuan", "Aktifkan" |
| Error | Jelas + solusi: "Gagal menyimpan — coba lagi" |
| Empty state | Netral: "Belum ada pengajuan cuti" |
| HR formal | "Penyesuaian saldo", "Eskalasi ke HR" |
| Konfirmasi destruktif | Sebutkan konsekuensi |

Hindari English di UI kecuali istilah teknis (WhatsApp, PIN) atau key i18n.

---

## 12. File & Naming Conventions

| Tipe | Pola | Contoh |
|------|------|--------|
| Web page | `*Page.tsx` di `pages/web/` | `WorkflowsPage.tsx` |
| Mobile page | `Mobile*Page.tsx` | `MobileLeavePage.tsx` |
| Feature component | `components/<domain>/` | `components/workflows/` |
| Hooks | `use*.ts` di `lib/` | `useIsMobile.ts` |
| API | `lib/api.ts` | — |
| Utils | `lib/utils.ts` → `cn()` | clsx + tailwind-merge |

**Import alias:** `@/` → `src/`

---

## 13. Responsive Rules

```tsx
// Mobile-first grids
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

// Hide sidebar back on desktop
<button className="lg:hidden">

// Workflow page height
<div className="h-[calc(100vh-7rem)]">
```

---

## 14. Dark Mode

- `ThemeContext` + `BrandingContext` — `forced_theme` dari API bisa lock light/dark
- Test kedua mode untuk border (`border-border/60`) dan `muted` text
- Gold accent tetap di kedua mode

---

## 15. Anti-patterns UI

| Jangan | Lakukan |
|--------|---------|
| Hex colors inline | Semantic tokens |
| `pointer-events-none` pada input form mobile | Native overlay DatePickerInput |
| English copy di UI ID | `t('key')` atau Indonesian |
| Full page reload | React Query + invalidation |
| Modal tanpa z-index | `z-50` minimum |
| Tiny tap targets di mobile | `min-h-[44px]` |

---

## 16. Referensi File

| File | Isi |
|------|-----|
| `src/index.css` | CSS variables, surfaces |
| `tailwind.config.ts` | Extended theme, animations |
| `components.json` | shadcn config (minimal adoption) |
| `docs/frontend/FRONTEND.md` | Frontend guide engineer |
| `src/layouts/WebLayout.tsx` | Sidebar nav pattern |
| `src/layouts/MobileLayout.tsx` | Bottom nav pattern |

---

*Selaraskan dengan v2.1.0. Update saat menambah design token atau pola layout baru.*
