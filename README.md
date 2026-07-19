# 📝 BagusNote

Aplikasi catatan pribadi (PWA) dengan:

- 🔐 **Autentikasi** via Supabase (email + kata sandi)
- 🗄️ **Database** Supabase (Postgres + Row Level Security)
- 🖼️ **Upload gambar** ke **Cloudinary** (unsigned upload)
- 📱 **Installable di HP** (Progressive Web App)
- 🔔 **Push notification** ke HP (Web Push / VAPID)
- ▲ Siap **deploy ke Vercel** → `bagusnote.vercel.app`

Dibuat dengan **Next.js 15 (App Router)** + **React 19** + **Tailwind CSS**.

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
  layout.tsx            # root layout + metadata PWA + daftar service worker
  page.tsx              # halaman utama (server) → NotesApp
  login/page.tsx        # login / daftar
  auth/callback/route.ts# callback konfirmasi email Supabase
  api/push/subscribe    # simpan langganan push
  api/push/send         # kirim push (VAPID) ke perangkat user
components/
  NotesApp.tsx          # CRUD catatan + upload gambar
  NotificationBell.tsx  # aktifkan / tes notifikasi
  ServiceWorkerRegister.tsx
lib/
  supabase/             # client, server, middleware
  cloudinary.ts         # unsigned upload
  push-client.ts        # helper Web Push di browser
public/
  manifest.json         # manifest PWA
  sw.js                 # service worker (offline + push)
  icons/                # ikon aplikasi
supabase-schema.sql     # skema database + RLS
```
