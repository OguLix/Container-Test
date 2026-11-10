# Tugas Container: web1 Product Service dan web2 User Service

Dua layanan Express yang berdiri sendiri untuk demonstrasi manajemen kontainer lewat Portainer dan pengujian beban Apache JMeter sampai 1000 pengguna bersamaan. Data disimpan di memori proses, tanpa basis data dan tanpa I/O disk.

## Struktur

```text
.
├── docker-compose.yml
├── STYLE.md
├── web1-product-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   ├── src/
│   │   ├── app.js
│   │   ├── data/products.store.js
│   │   └── routes/products.routes.js
│   └── public/
│       ├── index.html
│       ├── styles.css
│       └── app.js
└── web2-user-service/
    ├── Dockerfile
    ├── package.json
    ├── server.js
    ├── src/
    │   ├── app.js
    │   ├── data/users.store.js
    │   └── routes/users.routes.js
    └── public/
        ├── index.html
        ├── styles.css
        └── app.js
```

## Pemetaan port

| Layanan | Kontainer | Host | Isi |
| :--- | :--- | :--- | :--- |
| web1 | `web1` | `8081` | Katalog produk dan stok |
| web2 | `web2` | `8082` | Register akun pengguna |

Keduanya berjalan di network bridge `tugas-net` dan mendengarkan port `8080` di dalam kontainer.

## Menjalankan

```bash
docker compose up -d --build
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Verifikasi:

```bash
curl -s http://localhost:8081/health
curl -s http://localhost:8081/api/products
curl -s http://localhost:8082/health
curl -s http://localhost:8082/api/users
```

Hentikan tanpa menghapus data build:

```bash
docker compose stop
```

## Endpoint

### web1

| Method | Path | Keterangan |
| :--- | :--- | :--- |
| GET | `/` | Dashboard katalog |
| GET | `/health` | Status kontainer |
| GET | `/api/products` | Daftar produk, respons berupa array JSON |
| POST | `/api/products` | Tambah produk, ID otomatis |
| PUT | `/api/products/:id` | Ubah sebagian atau seluruh field |
| DELETE | `/api/products/:id` | Hapus produk |

### web2

| Method | Path | Keterangan |
| :--- | :--- | :--- |
| GET | `/` | Dashboard register |
| GET | `/health` | Status kontainer |
| GET | `/api/users` | Daftar pengguna, respons berupa array JSON |
| POST | `/api/users` | Daftar akun baru, ID dari stempel waktu |
| PUT | `/api/users/:id` | Ubah profil, peran, atau status |
| DELETE | `/api/users/:id` | Hapus akun |

Respons daftar (`GET`) sengaja mengembalikan array mentah agar sampler JMeter dan asersi tidak perlu membuka envelope. Respons mutasi memakai bentuk `{ success, message, data }` dengan kode `201` untuk pembuatan data.

## Catatan desain

- `docker-compose.yml` tidak memakai key `version` karena sudah obsolete pada Compose V2.
- Email pengguna tidak divalidasi unik. Skenario tulis JMeter mengirim alamat yang sama 1000 kali, dan respons `409` akan menggagalkan benchmark.
- Peran dibatasi ke `Administrator`, `Manager`, `Member`, dan `Auditor`. Status dibatasi ke `Active`, `Inactive`, dan `Suspended`.
- ID pengguna memakai `Date.now()` yang dijaga tetap naik secara monoton, sehingga ratusan penulisan dalam milidetik yang sama tidak menghasilkan ID kembar.
- Arah visual kedua dashboard dicatat di `STYLE.md`: tema ledger terang dengan varian gelap, aksen oxblood untuk web1 dan ledger blue untuk web2.

## Verifikasi lokal tanpa Docker

```bash
cd web1-product-service && npm install && PORT=8081 npm start
cd web2-user-service && npm install && PORT=8082 npm start
```

Halaman UI memuat Tailwind dan Google Fonts dari CDN, jadi butuh koneksi internet saat dibuka di browser. Endpoint API tetap berjalan tanpa akses internet.
