# SYSTEM DESIGN SPECIFICATION: CONTAINER & LOAD TESTING SERVICES

## 1. Executive Summary & Context

Dokumen ini menjelaskan rancangan teknis dan arsitektur untuk sistem **Dual Microservices** yang dibangun untuk memenuhi tugas **Manajemen Kontainer & Pengujian Performa (JMeter)** pada mata kuliah Komputasi Awan. 

Sistem ini terdiri dari dua layanan web independen (`web1-product-service` dan `web2-user-service`) yang di-deploy dalam kontainer Docker di atas **Server 1 (`asepbensin` / `192.168.174.144`)**, yang berjalan di lingkungan hypervisor Proxmox VE (`iuanserver2026`).

Sistem ini dirancang untuk mencapai *high throughput*, kemudahan pemantauan metrik kontainer (*observability*), serta ketahanan beban puncak saat diuji menggunakan Apache JMeter hingga 1.000 *concurrent user requests*.

---

## 2. Tech Stack Specification

| Kategori | Teknologi / Tool | Versi / Spec | Alasan Pemilihan & Fungsi |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | 20 (Alpine Linux) | Lightweight, pemrosesan I/O asinkronus super cepat. |
| **Web Framework** | Express.js | ^4.19.2 | Minimalis, *low overhead*, ideal untuk REST API & penanganan beban tinggi. |
| **Styling (UI)** | Tailwind CSS | v3 (via CDN) | Bebas langkah *build* frontend, responsif, dan ringan. |
| **Containerization** | Docker & Docker Compose | Specification 3.8 | Isolasi runtime, pembatasan jaringan bridge, orkestrasi mudah. |
| **Container Management** | Portainer CE | Latest | Monitoring GUI status kontainer, log, dan siklus hidup (Start/Stop/Delete). |
| **Monitoring** | Prometheus & Grafana | Latest | Koleksi metrik konsumsi CPU (%) dan RAM (MiB) secara *real-time*. |
| **Ingress Tunnel** | Cloudflare Tunnel | `iaas-ogulix` | Mempublikasikan layanan lokal ke internet publik tanpa muka port router. |
| **Load Testing** | Apache JMeter | v5.6+ | Pengujian performa beban bertahap (200 - 1000 *user requests*). |

---

## 3. Monorepo Directory Architecture

```text
tugas-container-lab/
├── .gitignore
├── README.md
├── DESIGN.md
├── AGENTS.md
├── docker-compose.yml
├── web1-product-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── app.js
│   │   └── data/
│   │       └── products.store.js
│   └── public/
│       └── index.html
└── web2-user-service/
    ├── Dockerfile
    ├── package.json
    ├── src/
    │   ├── app.js
    │   └── data/
    │       └── users.store.js
    └── public/
        └── index.html
```

---

## 4. Service Detailed Specifications

### 4.1 Service 1: Product & Inventory Service (`web1`)
- **Nama Kontainer:** `web1`
- **Host Port Mapping:** `8081:8080` (Akses Lokal: `http://192.168.174.144:8081`)
- **Public Domain:** `web1.ogulix.tech`
- **Tipe Beban Testing:** *Read-Heavy Operations*
- **Data Model (In-Memory Array):**
  ```json
  {
    "id": 101,
    "name": "Laptop Gaming ROG",
    "category": "Electronics",
    "price": 18500000,
    "stock": 15,
    "status": "Available"
  }
  ```
- **REST API Endpoints:**
  - `GET /` : Menyajikan antarmuka UI Dashboard Katalog Produk.
  - `GET /health` : Monitoring kondisi kontainer (`{"status": "UP", "service": "web1"}`).
  - `GET /api/products` : Mengambil daftar seluruh produk (Target Utama JMeter Read Benchmark).
  - `POST /api/products` : Menambahkan item produk baru.
  - `PUT /api/products/:id` : Memperbarui informasi stok dan harga produk.
  - `DELETE /api/products/:id` : Menghapus produk dari katalog.

### 4.2 Service 2: User Account & Auth Service (`web2`)
- **Nama Kontainer:** `web2`
- **Host Port Mapping:** `8082:8080` (Akses Lokal: `http://192.168.174.144:8082`)
- **Public Domain:** `web2.ogulix.tech`
- **Tipe Beban Testing:** *Write-Heavy Operations*
- **Data Model (In-Memory Array):**
  ```json
  {
    "id": 201,
    "name": "Fadhlan Aminullah",
    "email": "fadhlan@ogulix.tech",
    "role": "Administrator",
    "status": "Active"
  }
  ```
- **REST API Endpoints:**
  - `GET /` : Menyajikan antarmuka UI Dashboard User & Auth Management.
  - `GET /health` : Monitoring kondisi kontainer (`{"status": "UP", "service": "web2"}`).
  - `GET /api/users` : Mengambil daftar seluruh pengguna.
  - `POST /api/users` : Mendaftarkan akun pengguna baru (Target Utama JMeter Write Benchmark).
  - `PUT /api/users/:id` : Memperbarui role dan status keanggotaan pengguna.
  - `DELETE /api/users/:id` : Menghapus akun pengguna.

---

## 5. Network Topology & Routing Plan

```
[ Internet / External Clients / JMeter ]
                 │
                 ▼
     [ Cloudflare Edge Network ]
                 │ (Cloudflare Tunnel: iaas-ogulix)
                 ▼
[ Host Server 1: 192.168.174.144 (asepbensin) ]
 ├── Port 8081 ──► [ Docker Container: web1 (Product Service) ]
 ├── Port 8082 ──► [ Docker Container: web2 (User Service) ]
 ├── Port 9000 ──► [ Docker Container: Portainer CE ]
 └── Port 3000 ──► [ Docker Container: Grafana Dashboard ]
```

### Published Application Routes (Cloudflare Tunnel)
| Subdomain | Target Internal URL | Fungsi UI / Service |
| :--- | :--- | :--- |
| `web1.ogulix.tech` | `http://192.168.174.144:8081` | Web 1 Product & Inventory Dashboard |
| `web2.ogulix.tech` | `http://192.168.174.144:8082` | Web 2 User Account Management Dashboard |
| `portainer.ogulix.tech` | `http://192.168.174.144:9000` | Portainer Container Management GUI |
| `grafana.ogulix.tech` | `http://192.168.174.144:3000` | Grafana Performa Monitoring |

---

## 6. JMeter Load Testing Benchmark Strategy

Pengujian performa dilakukan bertahap menggunakan Apache JMeter dengan mengukur dua metrik utama: **Peak CPU Usage (%)** dan **Peak Memory Usage (MiB)**.

1. **Skenario 1 (Read-Heavy - Web 1):**
   - **Target Endpoint:** `GET http://192.168.174.144:8081/api/products`
   - **Variasi Concurrent User:** 200, 400, 600, 800, 1000 users.
   - **Ramp-up Period:** 10 detik.

2. **Skenario 2 (Write-Heavy - Web 2):**
   - **Target Endpoint:** `POST http://192.168.174.144:8082/api/users`
   - **HTTP Header:** `Content-Type: application/json`
   - **Body JSON Payload:**
     ```json
     {
       "name": "JMeter Test User",
       "email": "jmeter_test@ogulix.tech",
       "role": "Member"
     }
     ```
   - **Variasi Concurrent User:** 200, 400, 600, 800, 1000 users.