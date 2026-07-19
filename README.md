# 📝 BagusNote

Ruang kerja catatan ala **Notion / AppFlowy** (PWA) dengan:

- 🗂️ **Workspace**: sidebar daftar halaman + area dokumen besar
- 🧭 **Breadcrumb** navigasi lokasi halaman
- 🎨 **Whiteboard** (papan gambar ala Excalidraw) sebagai tipe halaman —
  bisa **di-embed ke dalam dokumen** (ketik `/papan`) dan **export ke PNG**
- 👤 **Penanggung jawab (assignee)** dengan foto/avatar di database
- 🌐 **Share halaman via link publik** (baca-saja, tanpa perlu login)
- 🔎 **Pencarian full-text** (judul **dan** isi semua halaman) — tekan `⌘K` / `Ctrl+K`
- 🗑️ **Sampah (soft-delete)**: halaman yang dihapus bisa **dipulihkan** atau
  dihapus permanen — tidak langsung hilang
- 🔄 **Sinkron realtime** antar perangkat/tab (Supabase Realtime)
- 📴 **Tetap bisa mengedit saat offline** — perubahan diantre lokal &
  otomatis tersimpan begitu koneksi kembali
- 🌲 **Halaman bertingkat (folder/nested pages)** — sub-halaman tanpa batas
- ↕️ **Drag & drop**: seret halaman untuk mengurutkan, atau jatuhkan ke atas
  halaman lain untuk menjadikannya sub-halaman
- 🗄️ **Database page**: tipe halaman **Tabel (Grid)**, **Board (Kanban)** &
  **Kalender**, dengan tipe kolom (Teks, Angka, Pilihan/Status, Centang,
  Tanggal, **Progres %**, **Sub-task/checklist**), tambah/hapus baris & kolom,
  drag kartu antar kolom, dan panel detail baris
- ✅ **Otomasi**: centang *Selesai* / Status *Done* / Progres 100% saling
  sinkron otomatis; progres terisi otomatis dari checklist sub-task
- 🔎 **Filter & Sort** (sembunyikan yang selesai, urutkan per kolom)
- ⏰ **Pengingat deadline ke HP** via cron harian (lihat setup di bawah)
- 🖼️ **Cover image per halaman** (diunggah ke Cloudinary)
- ✍️ **Editor blok slash `/`** (heading, checklist, bullet, kutipan,
  gambar inline) via **BlockNote**, dengan **autosave**
- 🌗 **Dark mode**
- 🔐 **Autentikasi** via Supabase (email + kata sandi)
- 🗄️ **Database** Supabase (Postgres + Row Level Security)
- 🖼️ **Upload gambar** ke **Cloudinary** (unsigned upload) — langsung dari editor
- 📱 **Installable di HP** (Progressive Web App)
- 🔔 **Push notification** ke HP (Web Push / VAPID)
- ▲ Siap **deploy ke Vercel** → `bagusnote.vercel.app`

Dibuat dengan **Next.js 15 (App Router)** + **React 19** + **Tailwind CSS** +
**BlockNote**.

> Catatan: AppFlowy asli adalah aplikasi Flutter + Rust untuk desktop/HP native
> dan tidak bisa di-deploy sebagai web app ke Vercel. BagusNote membawa
> pengalaman serupa (workspace + editor blok) ke web/PWA dengan stack di atas.

---

## 1. Setup lokal

```bash
npm install
cp .env.example .env.local   # lalu isi nilainya (lihat di bawah)
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Keterangan | Rahasia? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase | tidak |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key Supabase | tidak |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloud name Cloudinary (`spzbee49`) | tidak |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Upload preset **unsigned** (`ml_default`) | tidak |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key untuk Web Push | tidak |
| `VAPID_PRIVATE_KEY` | Private key untuk Web Push | **YA** |
| `VAPID_SUBJECT` | `mailto:` alamat kontak | tidak |

Generate pasangan VAPID baru kapan saja:

```bash
npm run gen:vapid
```

---

## 2. Setup Supabase

1. Buka proyek di [Supabase Dashboard](https://supabase.com/dashboard).
2. **SQL Editor** → tempel isi file [`supabase-schema.sql`](./supabase-schema.sql) → **Run**.
   Ini membuat tabel `notes` dan `push_subscriptions` lengkap dengan RLS.
   Skrip ini **idempoten** — aman dijalankan ulang untuk instalasi lama; ia
   menambah kolom `deleted_at` (Sampah) dan mendaftarkan tabel `notes` ke
   publication realtime supaya sinkron antar perangkat aktif.
3. **Authentication → Providers → Email**: pastikan aktif.
   - Untuk testing cepat, matikan "Confirm email" agar bisa langsung masuk
     setelah daftar. Untuk produksi, biarkan aktif.
4. **Authentication → URL Configuration**: tambahkan
   `https://bagusnote.vercel.app` ke **Site URL** dan **Redirect URLs**
   (juga `http://localhost:3000` untuk dev).

---

## 3. Setup Cloudinary

Cloud name & upload preset sudah dikonfigurasi (`spzbee49` / `ml_default`).
Upload dilakukan langsung dari browser memakai **unsigned upload preset**,
jadi tidak ada API secret di dalam kode.

Kalau ingin preset sendiri: Cloudinary Console → **Settings → Upload →
Add upload preset** → set **Signing Mode = Unsigned**, lalu ganti
`NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

---

## 3b. Pengingat deadline ke HP (opsional)

Cron harian memindai task yang jatuh tempo (kolom **Tanggal**) dan belum
selesai, lalu mengirim notifikasi push ke HP pemiliknya.

1. Tambahkan env var di Vercel:
   - `SUPABASE_SERVICE_ROLE_KEY` — dari Supabase → Settings → API → **service_role**
     (RAHASIA, server-only).
   - `CRON_SECRET` — string acak panjang bebas.
2. `vercel.json` sudah berisi jadwal cron `0 1 * * *` (08:00 WIB). Vercel akan
   memanggil `/api/cron/reminders` otomatis dan mengirim header
   `Authorization: Bearer <CRON_SECRET>`.
3. Uji manual:
   `curl -H "Authorization: Bearer <CRON_SECRET>" https://bagusnote.vercel.app/api/cron/reminders`

> Tanpa `SUPABASE_SERVICE_ROLE_KEY`, fitur pengingat tidak aktif (fitur lain
> tetap jalan).

## 4. Deploy ke Vercel

1. Push repo ini ke GitHub (sudah otomatis di branch kerja).
2. [vercel.com/new](https://vercel.com/new) → **Import** repo ini.
3. Framework otomatis terdeteksi **Next.js**. Klik **Deploy**.
4. **Project → Settings → Environment Variables**: tambahkan semua variable
   dari tabel di atas (termasuk `VAPID_PRIVATE_KEY`).
5. **Project → Settings → Domains**: tambahkan `bagusnote.vercel.app`.
6. **Redeploy** setelah env variables diisi.

---

## 5. Install di HP & aktifkan notifikasi

1. Buka `https://bagusnote.vercel.app` di **Chrome (Android)** atau
   **Safari (iOS 16.4+)**.
2. **Android:** menu ⋮ → *Add to Home screen* / *Install app*.
   **iOS:** tombol Share → *Add to Home Screen*.
3. Buka app, login, lalu tekan ikon 🔔 → **Aktifkan notifikasi** →
   izinkan. Tekan **Kirim notifikasi percobaan** untuk mengetes.

> Catatan iOS: push notification hanya berfungsi setelah app
> **di-install ke Home Screen** (bukan di tab Safari biasa).

---

## Struktur proyek

```
app/
  layout.tsx             # root layout + metadata PWA + no-flash theme + SW
  page.tsx               # halaman utama (server) → Workspace
  login/page.tsx         # login / daftar
  auth/callback/route.ts # callback konfirmasi email Supabase
  api/push/subscribe     # simpan langganan push
  api/push/send          # kirim push (VAPID) ke perangkat user
components/
  Workspace.tsx          # shell: sidebar + konten + realtime + offline sync
  Sidebar.tsx            # daftar halaman (tree), cari, baru, tema, sampah, keluar
  SearchModal.tsx        # pencarian full-text (judul + isi) via ⌘K
  TrashModal.tsx         # Sampah: pulihkan / hapus permanen
  PageTree.tsx           # tree halaman + drag & drop (urut / nest)
  NewPageButton.tsx      # menu buat halaman: Dokumen / Grid / Board
  Breadcrumb.tsx         # jejak lokasi halaman
  Editor.tsx             # dokumen: cover + judul + ikon + editor blok
  BlockNoteEditor.tsx    # BlockNote (slash menu) + upload Cloudinary
  DatabaseView.tsx       # halaman database: tab Grid / Board / Kalender
  WhiteboardView.tsx     # halaman whiteboard (Excalidraw) + autosave
  Splash.tsx             # layar loading singkat saat buka aplikasi
  db/CalendarView.tsx    # tampilan kalender
  db/GridView.tsx        # tampilan tabel
  db/BoardView.tsx       # tampilan kanban (drag antar kolom)
  db/CellEditor.tsx      # editor sel per tipe kolom
  db/SelectCell.tsx      # sel Pilihan + chip berwarna
  db/RowDetail.tsx       # panel detail baris
  EmojiPicker.tsx        # pemilih ikon halaman
  NotificationBell.tsx   # aktifkan / tes notifikasi
  ServiceWorkerRegister.tsx
lib/
  supabase/              # client, server, middleware
  cloudinary.ts          # unsigned upload
  push-client.ts         # helper Web Push di browser
  offline-queue.ts       # antrean tulis offline (localStorage) + auto-flush
  blocks-text.ts         # ekstrak teks BlockNote → indeks pencarian
  use-theme.ts           # hook dark mode
  types.ts               # tipe Note
public/
  manifest.json          # manifest PWA
  sw.js                  # service worker (offline + push)
  icons/                 # ikon aplikasi
supabase-schema.sql      # skema database + RLS
```
