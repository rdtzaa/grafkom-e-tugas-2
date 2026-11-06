# Tugas 2 Grafika Komputer — Jalan Kampus ITS

Scene menggunakan **WebGL 1 dan JavaScript ES modules**, tanpa library 3D dan tanpa proses build.

## Menjalankan

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

## Pembagian pekerjaan

| Anggota | Bagian |
| --- | --- |
| Riyan Fadli — 5025241068 | Trotoar dan pohon tabebuya |
| Raditya Zhafran — 5025241120 | Jalan, perumahan dosen di kiri jalan, perlengkapan jalan, pencahayaan, animasi gerbang dan mobil |
| Bersama | Fondasi helper, matematika, geometri, dan tekstur |

## Implementasi bagian Raditya

- `js/objects/road.js`: dua jalur paving herringbone dari helper bersama, median, tepi jalan, dan kanstin kuning-hitam. Skala tekstur mengikuti ukuran dunia.
- `js/objects/campus.js`: tujuh rumah dengan pondasi, dinding bertekstur, atap pelana, teras, jendela, pintu, dan jalur pendek ke jalan lingkungan internal. Kompleks memakai **one gate system**, satu jembatan di atas saluran air, pagar keliling dengan satu bukaan, dan pos satpam. Sepuluh lampu jalan, papan gerbang, rambu 30 km/jam, serta mobil bergerak.
- `js/layout.js`: koordinat bersama saluran air, gerbang, jembatan, bukaan trotoar/kanstin, jalan lingkungan, dan area bebas pepohonan. Saluran beton memiliki dasar di bawah tanah dan permukaan air; terrain dipisah agar tidak menutupi saluran. Jalur akses tunggal: **jalan kampus → jembatan saluran air → gerbang utama → jalan lingkungan → rumah dosen**.
- Memakai `SceneNode`, `createBox`, `createCylinder`, `createPavingTexture`, dan fungsi tekstur dari `js/helper/helper_function.js`. Adapter mengubah nama atribut `uvs` menjadi `texCoords` untuk renderer yang sudah ada.
- `js/shaders.js`: ambient + diffuse matahari, sepuluh sumber cahaya lampu dengan sorot ke bawah, tepi sorot lembut, pelemahan terhadap jarak, dan highlight Blinn–Phong. Material LED/jendela memakai emisi. Fog jarak jauh mengikuti warna langit.
- `js/utils/math.js`: normal matrix menggunakan inverse transpose supaya lighting tetap benar saat objek diberi skala tidak seragam.
- `js/main.js`: integrasi scene, interpolasi siang–senja, loop animasi berbasis waktu, dan kontrol.
- `js/camera.js`: preset kamera dan batas orbit di atas tanah. Posisi pohon/semak diselaraskan dengan tinggi terrain; bidang perumahan ditambahkan di kiri.
- `index.html`: halaman sederhana berisi foto referensi dan canvas berdampingan, petunjuk singkat, serta kontrol yang dapat dibuka. Pembagian tugas dan hierarki didokumentasikan di README.

Contoh hierarki (`campus.root.toTreeString()` dapat dipanggil pada instance untuk melihat tree lengkap):

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

Transformasi anak mewarisi transformasi induknya. Gerbang memakai node engsel sebagai pivot rotasi Y; mobil bergerak sepanjang −Z dan rodanya berputar pada sumbu X. Geometri/tekstur dipakai ulang, dan matriks objek statis dihitung sekali.

## Referensi dan pengumpulan

Foto asli ada di `gambar_referensi.jpeg`. Rumah merupakan interpretasi karena detail rumah tidak tampak pada foto tersebut. Untuk kemiripan dengan lokasi sebenarnya, sesuaikan model dengan foto rumah yang diambil di lokasi. **Video objek asli masih perlu ditambahkan** untuk melengkapi ketentuan tugas.
