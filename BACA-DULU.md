# SIM BPD — Panduan Pasang (± 15 menit)

## Isi paket
- `Code.gs` — backend (Google Apps Script), jadi API + penyimpan data di Google Sheet
- `index.html` — dashboard PWA (bisa di-hosting di GitHub Pages / Blogger / hosting apa saja)
- `manifest.json`, `sw.js` — supaya bisa "Install ke Layar Utama" dan jalan offline (khusus untuk shell aplikasinya)

## 1) Siapkan backend (Google Sheet + Apps Script)
1. Buka https://sheets.new → beri nama misalnya **"Database BPD Pegandekan"**.
2. **Extensions → Apps Script**. Hapus isi default, tempel seluruh isi `Code.gs`.
3. Di dropdown fungsi (atas), pilih **initSheets**, klik **Run** sekali. Ini otomatis membuat sheet `Input` + `Buku1`..`Buku15` dengan header yang benar. Izinkan akses saat diminta.
4. **Deploy → New deployment → pilih tipe "Web app"**.
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Klik Deploy, salin **URL** yang berakhiran `/exec`.

## 2) Sambungkan front-end
1. Buka `index.html`, cari baris:
   ```js
   const API_URL = 'PASTE_URL_WEBAPP_APPS_SCRIPT_DI_SINI';
   ```
   Ganti dengan URL `/exec` dari langkah 1.5.
2. (Opsional, keamanan tambahan) Isi `APP_TOKEN` yang sama di `Code.gs` (var di paling atas) dan di `index.html` (`const APP_TOKEN`).

## 3) Logo
1. Buka file logo di Drive → **Bagikan** → ubah jadi **"Siapa saja yang memiliki link"** (wajib, kalau tidak logo tidak akan tampil sama sekali, di manapun).
2. Buka **Pengaturan → Tampilan & Penomoran Surat → URL Logo**, tempel link share biasa dari Drive (bentuk `.../file/d/ID/view?usp=sharing`) apa adanya — aplikasi otomatis mengubahnya jadi link gambar langsung. Simpan.
3. Logo otomatis dipakai di: ikon app/splash screen, sidebar, layar login, dan **kop surat kiri-kanan** saat cetak.

## 4) Login (PIN)
- `initSheets()` otomatis membuat sheet **Users** dengan 1 akun awal: **Admin, PIN `123456`**. **Segera login lalu ganti PIN ini.**
- Setelah login, buka **Pengaturan → Manajemen Pengguna** (khusus role Admin) untuk menambah petugas lain: Nama, PIN (4–8 digit angka), Role (Admin/Petugas), status Aktif.
- Role **Petugas** bisa mengisi & mencetak semua buku, tapi tidak melihat menu Manajemen Pengguna. Role **Admin** bisa semuanya.
- Sesi login tersimpan di perangkat (localStorage) — tombol **Keluar** ada di bawah sidebar.
- Catatan keamanan: ini proteksi PIN sederhana untuk internal kantor desa, bukan enkripsi tingkat perbankan. Jangan pakai PIN yang sama dengan akun penting lain.

## 5) Hosting front-end
**GitHub Pages** (disarankan, PWA & offline berfungsi penuh):
1. Buat repo baru → upload `index.html`, `manifest.json`, `sw.js` di root.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Buka `https://username.github.io/nama-repo/` — tombol "Install App" akan muncul di browser (Chrome/Edge/Android).

**Blogger**:
- Manifest + Service Worker (mode PWA offline) **tidak berjalan** di dalam gadget/iframe Blogger — batasan platform, bukan bug aplikasi ini.
- Cara pakai: buat halaman statis baru di Blogger, tempel isi `index.html` lewat mode **HTML** pada editor postingan (bagian `<body>` saja, atau seluruh dokumen bila Blogger mengizinkan halaman kosong). Alternatif paling stabil: hosting di GitHub Pages seperti di atas, lalu di Blogger cukup buat tombol/link "Buka Aplikasi BPD" ke URL GitHub Pages tersebut, atau `<iframe>` penuh-layar ke URL itu.

## 6) Pengaturan awal di dalam aplikasi
Buka aplikasi → menu **Pengaturan** → isi: Desa, Kecamatan, Kabupaten, Provinsi, alamat kantor, Ketua/Waket/Sekretaris/Anggota BPD, URL logo, dan **Kode Surat** (default "BPD"). Data ini otomatis dipakai di kop surat dan tanda tangan semua cetakan.

## Nomor surat otomatis
Format: `001/BPD/PEGANDEKAN/III/2026`
`urutan/KODE/DESA/bulan-romawi/tahun` — urutan **reset tiap bulan**, mengikuti tanggal surat yang diisi. Klik tombol **"Buat Otomatis"** di form Buku Agenda Surat Keluar setelah mengisi tanggal surat.
> Catatan: contoh yang Anda beri ("...IIIX...") bukan angka Romawi baku, jadi sistem memakai angka Romawi standar I–XII sesuai bulan (Maret = III, September = IX, dst).

## Fitur yang tersedia
- 15 Buku Agenda BPD sesuai isi file asal (Surat Keluar/Masuk, Ekspedisi, Inventaris, Keuangan, Tamu, Anggota, Kegiatan, Aspirasi, Daftar Hadir, Notulen, Peraturan/Keputusan BPD, Peraturan Desa, Musyawarah Desa, Rencana Pembangunan Desa)
- Login PIN + manajemen pengguna (Admin/Petugas) dari menu Pengaturan
- Input cepat: modal per-baris, tombol Enter langsung pindah ke kolom berikutnya
- Cari/filter tiap buku, ubah & hapus catatan
- Nomor surat otomatis (reset bulanan)
- Cetak seluruh buku (kop surat dengan logo kiri-kanan + tabel + tanda tangan Ketua/Sekretaris, sesuai tata letak file asal) via **Cetak Buku**
- Cetak surat resmi per-baris (kop surat, nomor, perihal, tujuan, isi surat bisa diedit dulu) via tombol **Cetak** di Buku Agenda Surat Keluar → **Simpan sebagai PDF** dari dialog print browser
- Dashboard ringkasan: jumlah anggota, surat masuk/keluar bulan ini, kegiatan bulan ini, saldo keuangan
- Tema warna hijau emerald + aksen emas
- PWA: layar login & splash screen bermerek, tombol **Install** muncul otomatis (Chrome/Edge/Android) agar bisa dipasang ke layar utama seperti aplikasi, ikon mengikuti logo & nama desa yang diatur di Pengaturan, shell aplikasi tetap terbuka saat offline (data tetap perlu koneksi internet ke Google Sheet)

## Menambah/ubah kolom
Semua definisi kolom ke-15 buku ada di satu tempat: `BUKU_DEFS` pada `Code.gs`. Tambah/ubah field di sana, jalankan ulang `initSheets()` (hati-hati: ini akan mengosongkan ulang header, data lama di kolom yang sudah ada tetap aman selama urutan kolom tidak diubah drastis — sebaiknya backup sheet dulu).
