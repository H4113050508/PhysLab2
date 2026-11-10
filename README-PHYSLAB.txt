# PhysLab 2.0 — paket sprint deadline

## Menjalankan aplikasi (Windows)
1. Ekstrak ZIP ke folder yang mudah ditemukan, misalnya Desktop.
2. Buka folder `Physlab 2.0` di VS Code.
3. Pastikan Python dan Flask tersedia. Jika Flask belum terpasang, buka Terminal VS Code dan jalankan:
   `python -m pip install flask`
4. Jalankan:
   `python app.py`
5. Buka `http://127.0.0.1:5000/` di browser.
6. Biarkan terminal tetap terbuka selama aplikasi digunakan.

## Isi paket
- Dashboard dengan 20 topik sesuai daftar kelas X, XI, dan XII.
- Halaman modul umum interaktif yang mengirim parameter ke backend Python, menghasilkan tabel dan grafik, serta mengekspor data CSV.
- Modul Gerak Parabola lama tetap dipertahankan di `/gerak-parabola`.

## Catatan penting
- Modul umum adalah prototipe model interaktif pembelajaran dengan asumsi ideal. Beberapa topik masih menggunakan model sederhana dan belum menggantikan praktikum lengkap dengan alat virtual 3D.
- Untuk laporan/demo, jelaskan asumsi setiap model dan jangan menyebut keluaran model sebagai hasil eksperimen nyata.
- Uji beberapa modul dan tombol ekspor CSV di laptop sebelum presentasi.


MODUL BARU KELAS X
- Notasi Ilmiah dan Angka Penting: konversi desimal/notasi ilmiah, identifikasi jumlah angka penting, pembulatan, operasi penjumlahan/pengurangan/perkalian/pembagian dengan aturan angka penting, serta latihan singkat.
- Jalankan dari folder proyek: python app.py, lalu buka http://127.0.0.1:5000.
- Perhitungan modul ini diproses melalui endpoint Flask /api/notasi-angka-penting.


REVISI MEJA PRAKTIKUM DAN PANDUAN (NOVEMBER 2026)
=================================================
- Kolom inventaris alat dihapus dari panel simulator.
- Setiap modul generik membuka meja dengan peralatan awal yang sesuai topik.
- Peralatan dapat dipilih, dipindahkan, diputar, dan bagian kontrol tertentu dapat dioperasikan.
- Tombol Reset Meja mengembalikan peralatan default modul, bukan mengosongkan meja.
- Model alat baru ditambahkan untuk panel surya, lampu, pemanas, layar, sensor tekanan,
  garpu tala, speaker, mikrofon, laser, kumparan, elektroskop, sakelar, LED, sumber,
  detektor, osiloskop, wadah isolasi, dan kompas.
- Tiap modul memiliki Petunjuk Praktikum: tujuan, alat/bahan, langkah kerja, variabel,
  serta keselamatan kerja. Modul Notasi Ilmiah dan Angka Penting memiliki meja ukur
  khusus beserta prosedur pengukuran.
- Ruang simulator diperbarui dengan meja kerja, kisi permukaan, kabinet, jendela,
  dan panel laboratorium.

CATATAN AKURASI VISUAL
----------------------
Ruang dan alat pada simulator menggunakan proyeksi perspektif Canvas 2D yang
mensimulasikan sudut pandang 3D, bukan mesh WebGL/CAD. Dimensi nominal beberapa alat
ditampilkan sebagai acuan dan ukuran model dibuat proporsional untuk pembelajaran,
tetapi belum merupakan replika metrologis berskala 1:1 atau model pabrikan. Hasil
perhitungan tetap merupakan model ideal sesuai keterangan tiap modul.

PENGUJIAN
---------
Pemeriksaan statis yang dilakukan pada paket ini:
- app.py berhasil dikompilasi dengan py_compile.
- static/module.js lolos node --check.
- static/notasi_angka_penting.js lolos node --check.
- templates/module.html dan templates/notasi_angka_penting.html lolos parsing Jinja.
Pengujian interaksi browser dan ketepatan visual tiap alat tetap perlu dilakukan
di komputer pengguna setelah menjalankan Flask.


REVISI PERHITUNGAN MODEL (NOVEMBER 2026)
========================================
- Parameter sekunder pada panel alat kini dipakai oleh backend, bukan hanya mengubah tampilan.
- Pengukuran: ketidakpastian setengah resolusi alat; konversi mm ke cm diperbaiki untuk
  jangka sorong dan mikrometer, sedangkan neraca menggunakan satuan gram.
- Energi alternatif: P = G × A × η, dengan asumsi irradiansi maksimum 1000 W/m²
  dan luas panel 0,02 m².
- Pemanasan global: model pedagogis suhu awal 25 °C dengan pengaruh konsentrasi dan
  pengurang radiasi; bukan model iklim atmosfer lengkap.
- Kinematika: x = vt menggunakan waktu yang dapat diatur.
- Optik: persamaan lensa tipis dengan jarak bayangan bertanda; di fokus bayangan
  berada di tak hingga, sedangkan benda di dalam fokus menghasilkan bayangan maya.
- Fluida: P = ρgh; termodinamika: ΔT = Q/C; bunyi: c ≈ 331,3 + 0,606T;
  cahaya: λ_medium = λ_vakum/n.
- Dinamika: a = F/m; Coulomb: F = kq²/r²; Ohm: I = V/R; medan kawat lurus
  B = μ₀I/(2πr); induksi: |ε| = N|ΔΦ/Δt|.
- AC: arus efektif pada beban resistif; digital: jumlah keadaan biner dikalikan
  ukuran data per keadaan; de Broglie: λ = h/p; relativitas: Δt = γΔτ;
  inti: E = (fraksi massa)mc²; radioaktivitas: N = N₀(1/2)^n.
- Operasi angka penting pada notasi ilmiah kini membulatkan berdasarkan posisi digit
  paling tidak teliti. Pembulatan yang melewati orde (contoh 0,009995 menjadi 0,0100
  pada 3 AP) ditangani. Bilangan bulat berakhiran nol tanpa koma diberi peringatan
  karena jumlah AP-nya ambigu.
- Validasi parameter dan pembagian dengan nol ditangani di backend.

PENGUJIAN TAMBAHAN
------------------
- 20 modul diuji pada parameter default melalui pemanggilan langsung fungsi backend
  dengan Flask disimulasikan (Flask tidak terpasang pada lingkungan audit).
- Tiga instrumen pengukuran, kasus fokus lensa, pembulatan angka penting, operasi
  aritmetika, dan pembagian nol lulus uji fungsi.
- Pemeriksaan sintaks Python dan JavaScript lulus. Pengujian tampilan/browser nyata
  tetap harus dilakukan pada laptop pengguna dengan Flask terpasang.
