# PhysLab 2.0 — Panduan Rilis Web dan Desktop

## Struktur rilis

- `app.py`: satu backend Flask untuk versi web dan desktop.
- `desktop_launcher.py`: membuka backend lokal di jendela aplikasi Windows.
- `requirements.txt`: dependensi deployment web.
- `requirements-desktop.txt`: dependensi untuk membangun aplikasi desktop.
- `render.yaml`: konfigurasi deployment Render.
- `build_windows.bat`: skrip build Windows menggunakan PyInstaller.

## A. Menjalankan versi lokal

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Buka `http://127.0.0.1:5000`.

## B. Membuat aplikasi Windows

Build harus dijalankan di Windows (bukan di server Linux):

1. Pasang Python 3.13 64-bit (sesuai lingkungan pengembangan saat ini).
2. Pastikan Microsoft Edge WebView2 Runtime dan .NET Desktop Runtime tersedia. Dependensi WinForms dipasang melalui `pywebview[winforms]`.
3. Klik dua kali `build_windows.bat`.
4. Hasil awal ada di `dist/PhysLab/PhysLab.exe`.

Build pertama sengaja menggunakan mode folder (`onedir`) agar lebih mudah diuji dan lebih stabil untuk dependensi GUI. Distribusikan seluruh folder `dist/PhysLab`, bukan hanya file EXE. Installer setup dapat dibuat setelah build Windows berhasil diuji.

Versi desktop menjalankan server hanya pada `127.0.0.1` dan memilih port lokal secara otomatis. Server dimatikan saat jendela aplikasi ditutup.

## C. Publikasi web untuk umum melalui Render

1. Buat repository GitHub baru dan unggah seluruh isi folder proyek ini ke root repository.
2. Di Render pilih **New > Blueprint** dan hubungkan repository tersebut.
3. Render membaca `render.yaml`, memasang dependensi, lalu menjalankan Gunicorn.
4. Setelah deploy berhasil, uji halaman utama, `/health`, semua 20 modul, seluruh API, dan ekspor CSV dari perangkat lain.
5. Setiap perubahan yang di-push ke branch terhubung akan memicu deployment otomatis.

Alternatif jika membuat Web Service secara manual:

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app --workers 2 --threads 4 --timeout 120`
- Health check path: `/health`

Catatan: layanan gratis Render dapat mengalami spin-down setelah tidak aktif; kunjungan pertama setelah idle bisa lebih lambat. Untuk penggunaan publik yang selalu responsif, tinjau paket hosting berbayar atau penyedia lain.

## D. Sebelum dibuka untuk publik

- Uji di Chrome, Edge, Firefox, dan layar ponsel.
- Periksa seluruh 20 modul dan nilai ekstrem yang diizinkan.
- Pastikan grafik, tabel, visualisasi, dan CSV bekerja.
- Tambahkan halaman kebijakan privasi dan informasi kontak jika situs dibuka untuk publik.
- Jangan menyimpan data pribadi pengguna tanpa kebutuhan dan kebijakan yang jelas.
- Tambahkan domain sendiri setelah deployment stabil.

## Perlindungan Gerak Parabola

File `templates/gerak_parabola.html` dan `static/script.js` dipertahankan dari paket audit sebelumnya. Jangan mengedit keduanya saat mengerjakan integrasi desktop/web kecuali ada persetujuan khusus. Endpoint Gerak Parabola tetap tersedia pada `/gerak-parabola`, `/api/gerak-parabola`, dan `/api/ukur-gerak-parabola`.

## Batas pengujian paket ini

Konfigurasi dan launcher sudah disiapkan serta pemeriksaan sintaks dilakukan. EXE Windows dan deployment publik belum dapat dibangun/dipublikasikan dari lingkungan ini; build EXE harus dijalankan di Windows dan deployment web memerlukan akses repository serta akun hosting milik pemilik proyek.
