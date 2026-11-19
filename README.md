# Tugas 2 Grafika Komputer — Jalan Kampus ITS

Dari folder proyek:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Buka **http://127.0.0.1:8000** di Chrome atau Edge. Bisa juga menggunakan Live Server di VS Code. ES modules harus dilayani melalui HTTP.

## Kontrol

- **Geser mouse / satu jari:** orbit kamera. **Scroll / cubit:** zoom.
- Buka **Kontrol scene** di bawah canvas untuk mengakses pengaturan.
- **Sudut pandang:** kawasan kampus, dari jalan, perumahan dosen, atau gerbang dan saluran air. Reset kamera mengembalikan preset yang dipilih.
- **Waktu:** geser dari siang ke senja; perubahan cahaya berlangsung secara bertahap.
- **Lampu jalan:** menyalakan/mematikan lampu jalan. Sorot paling jelas di mode senja.
- **Animasi:** menjeda/melanjutkan mobil, rotasi roda, dan gerbang.
- **Buka/tutup gerbang utama:** menggerakkan satu gerbang bersama pada poros engsel ke arah dalam kompleks. Aktifkan Animasi untuk melihat geraknya.

| Anggota | Bagian |
| --- | --- |
| Riyan Fadli — 5025241068 | 
| Raditya Zhafran — 5025241120 | 

```text
Area jalan & perumahan dosen
├── Rumah dosen 1 … 7
│   ├── Pondasi, dinding, atap, teras
│   └── Pintu, jendela, jalur ke jalan lingkungan
├── Akses tunggal perumahan
│   ├── Saluran air sisi kiri (dasar, dinding, air)
│   ├── Jalan lingkungan perumahan
│   ├── Jembatan akses tunggal (deck, paving, ramp, railing)
│   ├── Pagar keliling perumahan
│   ├── Gerbang utama perumahan
│   │   ├── Pilar dan papan gerbang
│   │   └── Engsel gerbang utama
│   │       └── Bingkai dan jeruji gerbang
│   └── Pos satpam
├── Lampu jalan × 10
│   └── Pondasi, tiang, lengan, rumah lampu, LED
├── Rambu batas kecepatan
└── Mobil kampus
    ├── Bodi, kabin, kaca, lampu
    └── Poros roda × 4
        └── Ban dan velg
```

## Referensi dan pengumpulan

Foto asli ada di `gambar_referensi.jpeg` dan video referensi ada di `video_referensi.mp4`; keduanya ditampilkan di halaman. 
