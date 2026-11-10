# STYLE.md: Arah Visual Dashboard web1 & web2

Dokumen ini merekam arah visual yang dipilih pemilik proyek. Isinya hanya data desain untuk dijalankan, bukan instruksi proses. Spesifikasi sistem tetap ada di `DESIGN.md` dan `system_design_specification.md`.

## 1. Identitas

Dua dashboard ini adalah buku catatan operasional: satu buku katalog stok, satu buku register anggota. Bahasa visualnya diambil dari buku besar akuntansi cetak, bukan dari dashboard SaaS modern.

- **Nama kerja**: Ledger Terang (dengan varian Night Ledger).
- **Audiens**: mahasiswa dan operator yang memantau kontainer di Portainer serta menjalankan uji beban JMeter.
- **Mood**: tenang, tercetak, institusional, rapat tapi tidak sempit.
- **Alasan tema terang sebagai default**: metafora kertas dan tinta adalah identitas produk, bukan sekadar selera. Varian gelap disediakan karena dashboard ini juga dibaca di ruang monitoring yang redup.

## 2. Dials

```
ENERGY 1 / RHYTHM 2 / MOTION 1
```

- **ENERGY 1**: tidak ada efek dekoratif. Bobot datang dari tipografi, aturan garis, dan kepadatan data.
- **RHYTHM 2**: satu pola dasar dengan satu penyimpangan yang disengaja, yaitu kolom formulir sempit di samping tabel lebar.
- **MOTION 1**: transisi hover dan perubahan status saja. Tidak ada animasi masuk.

## 3. Palet

Maksimal dua warna inti ditambah satu aksen per layanan. Netral kertas dan tinta tidak dihitung sebagai warna inti.

| Peran | web1 (Katalog) | web2 (Register) |
| :--- | :--- | :--- |
| Kertas (permukaan dasar) | `#F5F1E7` | `#F5F1E7` |
| Permukaan naik (panel) | `#FCF9F2` | `#FCF9F2` |
| Tinta utama | `#1B1815` | `#1B1815` |
| Tinta sekunder | `#57504A` | `#57504A` |
| Garis | `#DCD3C0` | `#DCD3C0` |
| Aksen | `#8C2F39` (oxblood) | `#2D4A63` (ledger blue) |

Alasan aksen berbeda: dua layanan harus bisa dibedakan sekilas saat dua tab terbuka bersamaan, tanpa keluar dari keluarga visual yang sama.

Varian gelap memakai kertas `#16140F`, tinta `#F1EADB`, dan aksen yang dicerahkan (`#D98B84` untuk web1, `#8FB4CE` untuk web2) agar rasio kontras tetap lolos WCAG AA.

## 4. Tipografi

| Peran | Keluarga | Alasan |
| :--- | :--- | :--- |
| Judul dan angka besar | Fraunces (serif, optical size) | Huruf serif ber-inktrap membaca seperti angka cetak pada buku besar. Memberi karakter tanpa dekorasi tambahan. |
| Teks antarmuka | IBM Plex Sans | Netral, institusional, angka tabular rapi untuk kolom harga dan stok. |
| ID, timestamp, endpoint | IBM Plex Mono | Hanya dipakai pada data berlebar tetap, agar kolom ID sejajar dan mudah dibandingkan. Bukan untuk kesan terminal. |

## 5. Motif Identitas

Tiga elemen yang diulang di kedua layanan:

1. **Garis margin aksen** di tepi kiri kolom konten, seperti garis merah pada buku besar.
2. **Aturan ganda** di bawah masthead, seperti kepala halaman akuntansi.
3. **Stempel status** berupa label bersudut tegak dengan garis tipis, bukan kapsul, untuk `Available`, `Out of Stock`, `Active`, `Inactive`.

## 6. Batasan yang Dipegang

- Tidak ada gradient, glow, glassmorphism, atau pola grid di latar.
- Tidak ada ikon dekoratif. Yang ada hanya glyph fungsional untuk status dan tombol tema.
- Tidak ada tautan navigasi ke halaman yang belum dibangun. Navigasi hanya anchor ke seksi yang benar-benar ada di halaman.
- Tidak ada angka karangan. Semua angka pada strip statistik dihitung dari array di memori.
- Tidak ada em dash pada teks antarmuka.
