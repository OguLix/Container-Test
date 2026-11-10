# SYSTEM DESIGN SPECIFICATION: CONTAINER & LOAD TESTING SERVICES

## 1. Overview & System Context
Dokumen ini merancang 2 microservices berbasis **Node.js + Express** yang dirancang khusus untuk memenuhi tugas **Manajemen Kontainer & Pengujian Performa (JMeter)** pada mata kuliah Komputasi Awan.

Kedua web service ini di-deploy sebagai kontainer Docker independen pada **Server 1 (`asepbensin` / `192.168.174.144`)** di dalam infrastruktur IaaS Proxmox VE (`iuanserver2026`).

---

## 2. Service Architecture (Option 1: Business Microservices)

### 2.1 Web 1: Product & Inventory Service (`web1`)
- **Port Mapping Host:** `8081:8080`
- **Tujuan Subdomain:** `web1.ogulix.tech`
- **Fungsi Utama:** Mengelola katalog barang dan stok inventaris toko.
- **Teknologi UI:** Embedded Tailwind CSS Single Page Application (SPA).
- **Data Storage:** In-Memory Array (High throughput, zero I/O latency for load testing).
- **REST API Endpoints:**
  - `GET /` : Menampilkan UI Dashboard Katalog & Form CRUD.
  - `GET /api/products` : Mengambil seluruh daftar produk (Target JMeter Benchmark).
  - `POST /api/products` : Menambahkan produk baru.
  - `PUT /api/products/:id` : Memperbarui stok / harga produk.
  - `DELETE /api/products/:id` : Menghapus produk dari katalog.

### 2.2 Web 2: User Account & Auth Service (`web2`)
- **Port Mapping Host:** `8082:8080`
- **Tujuan Subdomain:** `web2.ogulix.tech`
- **Fungsi Utama:** Mengelola data pengguna, role, dan status keanggotaan.
- **Teknologi UI:** Embedded Tailwind CSS Single Page Application (SPA).
- **Data Storage:** In-Memory Array (High throughput, zero I/O latency for load testing).
- **REST API Endpoints:**
  - `GET /` : Menampilkan UI Dashboard User & Form Management.
  - `GET /api/users` : Mengambil daftar pengguna aktif.
  - `POST /api/users` : Mendaftarkan akun pengguna baru (Target JMeter Benchmark).
  - `PUT /api/users/:id` : Memperbarui role / profil pengguna.
  - `DELETE /api/users/:id` : Menghapus akun pengguna.

---

## 3. Container & Deployment Specification

### 3.1 Directory Layout (`~/tugas-container/`)
```
~/tugas-container/
├── docker-compose.yml
├── web1/
│   ├── package.json
│   ├── server.js
│   └── Dockerfile
└── web2/
    ├── package.json
    ├── server.js
    └── Dockerfile
```

### 3.2 Docker Strategy
- **Base Image:** `node:20-alpine` (Ukuran super kecil, cepat di-build).
- **Network Mode:** Isolated Bridge Network (`tugas-net`).
- **Resource Limits:** Tidak dibatasi secara keras agar perubahan konsumsi CPU (%) dan RAM (MiB) dapat diamati dengan kontras pada Grafana/Prometheus saat pengujian JMeter.

---

## 4. Cloudflare Tunnel Integration (`iaas-ogulix`)

| Incoming Domain | Internal Target URL | Purpose |
| :--- | :--- | :--- |
| `web1.ogulix.tech` | `http://192.168.174.144:8081` | Product & Inventory Service UI/API |
| `web2.ogulix.tech` | `http://192.168.174.144:8082` | User Account Service UI/API |
| `portainer.ogulix.tech` | `http://192.168.174.144:9000` | Portainer GUI Management |
| `grafana.ogulix.tech` | `http://192.168.174.144:3000` | Prometheus & Grafana Monitoring |

---

## 5. JMeter Load Testing Benchmark Strategy

1. **Target Web 1 (Read-heavy Load):**
   - Sampler: `GET http://192.168.174.144:8081/api/products`
   - Scenarios: 200, 400, 600, 800, 1000 Users.
2. **Target Web 2 (Write-heavy Load):**
   - Sampler: `POST http://192.168.174.144:8082/api/users`
   - Payload: `{"name": "User Test", "email": "test@mail.com", "role": "Member"}`
   - Scenarios: 200, 400, 600, 800, 1000 Users.