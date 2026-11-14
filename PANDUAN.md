# ADM Guru Pembelajaran

Buka `login.html` (lewat Live Server / hosting). Tanpa Firebase, aplikasi berjalan dalam **mode percobaan** (akun & data di peramban).

## Struktur folder
```
login.html            → halaman masuk / daftar
dashboard.html        → dasbor
segera.html           → halaman sementara untuk menu yang belum dibuat
pages/…               → satu file HTML per menu (hanya memanggil ADM.page('kunci'))
assets/
  app.js              → inti: tema, fungsi bantu           (dimuat 1)
  firebase-config.js  → akun & penyimpanan data            (dimuat 2)
  sidebar.js          → menu, header, navigasi tanpa reload (dimuat 3)
  pages.js            → pemuat modul di assets/bagian/      (dimuat 4)
  bagian/A…N-*.js     → modul halaman, dimuat otomatis berurutan A→N
  style.css, template/
firestore.rules       → aturan keamanan Firestore
```
Urutan `<script>` di setiap halaman: `app.js` → `firebase-config.js` → `sidebar.js` → `pages.js`, lalu `ADM.page('kunci')`.

## Menghubungkan Firebase (agar tiap akun punya data sendiri)
1. Firebase Console → buka proyek → **Authentication** → Sign-in method → aktifkan **Email/Password** dan **Google**.
2. **Firestore Database** → Create database → tab **Rules** → tempel isi `firestore.rules` → Publish.
3. Konfigurasi proyek `apk-pembelajaran-3a72e` sudah terisi di `assets/firebase-config.js` (login.html memakai konfigurasi yang sama).
4. Authentication → Settings → Authorized domains: tambahkan domain hosting Anda.

Data tiap guru tersimpan di `users/{uid}/…` dan hanya bisa dibaca akun itu sendiri.
Koleksi yang dipakai: siswa, kelas, mapel, pengaturan, presensi, nilai, jurnal, tujuan, materi, evaluasi, pelanggaran, sikap, remedial, pengayaan, pesan, jadwal, kalender, wkprofil, wkrchk, dan `kolomnilai` (susunan kolom LM/TG per mapel+tingkat). Semuanya sudah tercakup aturan `firestore.rules` dan tombol *Unduh cadangan*.

## Foto profil
Pengaturan › Profil Guru → tempel tautan Google Drive (akses "Siapa saja yang memiliki link").

## Keterkaitan data (ringkas)
- Alur Pembelajaran: **Materi Ajar → Tujuan Pembelajaran → Jurnal → Evaluasi TP** (terhubung lewat id subbab/TP, bukan nama).
- **KKTP dan bobot** diambil dari Data Mapel per *mapel + tingkat*. Fungsi `U.finals()` memberi `kktp` per siswa; halaman lain wajib memakai `baris.kktp`, bukan KKTP global. Untuk halaman tanpa baris siswa pakai `U.kktpFor(mapel, kelas)`.
- **Susunan kolom nilai** (LM/TG/UH) disimpan di `localStorage` (cepat) dan disalin ke koleksi `kolomnilai` (lintas perangkat & cadangan) oleh `U.simpanKolom()`; `U.hidrasiKolom()` memulihkannya sekali tiap sesi.
- **Remedial/Pengayaan** dihitung per kelas dari nilai TG/UH tiap BAB.
- **Hanya kelas yang diampu:** `U.diampu(daftarSiswa)` menyaring siswa menurut kelas di Profil Guru (untuk mapel aktif). Dipakai `U.finals()` (Dasbor, Nilai, Leger, Remedial, dll.), pilihan siswa di Pembinaan, Laporan Siswa, dan Surat. Data Siswa dan Wali Murid tetap menampilkan semua siswa karena wali kelas bisa memegang kelas lain.
- Kode status presensi: H, I, S, A.

## Menambah halaman baru
1. Tulis fungsinya di modul `assets/bagian/` yang sesuai, daftarkan di `Object.assign(U.PG,{...})` modul itu.
2. Tambahkan menunya di `assets/sidebar.js` (array `MENU`).
3. Buat file HTML di `pages/…` (salin dari halaman lain, ganti kunci dan `<title>`) dengan `<script>ADM.page('kunci');</script>`.
4. Teks bantuannya di `bagian/M-TEKS-BANTUAN.js`; bila datanya per mapel, tambahkan kuncinya ke `PMK` di `N-PETA-HALAMAN.js`.
5. Koleksi data baru: tambahkan ke `KOLEKSI` di `firebase-config.js` (agar ikut cadangan) dan ke `MS` bila datanya terpisah per mapel.
