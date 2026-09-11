# 📘 TRACKER APP — TUTORIAL LENGKAP

## 🎯 Deskripsi

Aplikasi edukasi: form login bertema Discord dengan deteksi perangkat, GPS, webcam capture, dan dashboard admin.

## 🚀 Cara Nyalakan (Local)

### Cara 1 — Manual

\\\\powershell
cd C:\\Users\\udins\\Documents\\tracker-app
npm run dev
\\\\

Buka browser: http://localhost:3000/admin

### Cara 2 — Shortcut Klik-2x

Buat shortcut sekali:
\\\\powershell
$s=(New-Object -ComObject WScript.Shell).CreateShortcut("$env:USERPROFILE\\Desktop\\Start Tracker App.lnk")
$s.TargetPath="powershell.exe"
$s.Arguments="-NoExit -Command cd C:\\Users\\udins\\Documents\\tracker-app; npm run dev"
$s.Save()
\\\\

Klik 2x icon "Start Tracker App" di Desktop.

## 🛑 Cara Matikan

Klik PowerShell → tekan Ctrl + C

## 🔐 Login Info

* User Login  : http://localhost:3000
* Admin Login : http://localhost:3000/admin/login
* Dashboard   : http://localhost:3000/admin
* Username    : admin
* Password    : admin123

## 📋 Fitur Lengkap (67+)

### Halaman Login User

* Form login Discord (dark #313338)
* Consent checkbox
* Loading spinner
* Deteksi perangkat (OS, browser, resolusi, CPU, RAM)
* GPS detection
* Webcam snapshot

### Dashboard Admin

* Login admin + session
* Statistik (total capture, terakhir, total login)
* 4 chart: per hari, per OS, per browser, peak hours
* Filter date range + OS + browser
* Grid foto + hover X untuk hapus
* Detail modal (klik foto)
* Mini map (Leaflet) di modal
* Dark/Light mode toggle
* Sound toggle
* Multi-bahasa (ID/EN)
* Export CSV
* Export PDF
* Backup ZIP
* Auto-backup harian
* Search filter
* Notifikasi real-time (toast + sound)
* Responsive mobile
* PWA (install di HP)

## 🛠️ API Endpoints

|Endpoint|Method|Fungsi|
|-|-|-|
|/api/collect|POST|Terima data login|
|/api/login|POST|Login admin|
|/api/logout|POST|Logout|
|/api/session|GET|Cek session|
|/api/captures|GET|Daftar capture|
|/api/logs|GET|Daftar log|
|/api/stats|GET|Statistik chart|
|/api/capture/:filename|DELETE|Hapus capture|
|/api/export.csv|GET|Export CSV|
|/api/backup.zip|GET|Backup ZIP|
|/api/backups|GET|Daftar auto-backup|
|/api/backups/:file|GET|Download auto-backup|
|/api/backups/create|POST|Buat backup manual|

## 🐳 Docker (untuk deploy)

\\\\ash
docker build -t tracker-app .
docker run -d -p 3000:3000 --name tracker-app tracker-app
\\\\

Atau pakai docker-compose:
\\\\ash
docker-compose up -d
\\\\

## 🌐 Deploy ke Render.com (Gratis)

1. Buat akun di https://render.com
2. Hubungkan GitHub repo
3. Pilih "New Web Service"
4. Setting:

   * Build Command: npm install
   * Start Command: npm start
   * Environment: Node
5. Tambahkan Environment Variables:

   * ADMIN\_USER: admin
   * ADMIN\_PASSWORD: (password kuat)
   * SESSION\_SECRET: (random string panjang)
6. Deploy!

## ⚠️ Peringatan

* HANYA untuk EDUKASI
* Test dengan data PALSU
* JANGAN deploy publik tanpa consent form
* Patuhi UU ITE \& UU PDP

## 📅 Changelog

* v1.0 — 11 Sep 2026 — Initial release (67+ fitur)

