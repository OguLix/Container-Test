# AI AGENT EXECUTION RULES & INSTRUCTIONS

## 1. Project Context & Purpose
You are an expert DevOps and Software Engineer Agent. Your task is to build and containerize two Node.js Express Web Applications (`web1` and `web2`) on Server 1 (`192.168.174.144`).

These applications will be used for Docker Container Management demonstrations (via Portainer) and Performance Load Testing (200 - 1000 concurrent user requests using Apache JMeter).

---

## 2. Critical Execution Rules & Constraints

1. **DO NOT MODIFY EXISTING PAAS PROJECT:**
   - The root or home directory contains an existing PaaS project. DO NOT edit, delete, or touch any files outside `~/tugas-container/`.
2. **PORT RESERVATIONS:**
   - Use host port **`8081`** for `web1`.
   - Use host port **`8082`** for `web2`.
   - DO NOT use port `80`, `443`, `3000`, `6379`, `9000`, or `3306` as they are reserved by other system components.
3. **ZERO EXTERNAL DATABASE DEPENDENCY:**
   - Store all data **In-Memory** inside JavaScript arrays. DO NOT use MySQL, PostgreSQL, or MongoDB. This is mandatory to ensure maximum execution speed during JMeter load testing without database I/O bottlenecks.
4. **SELF-CONTAINED UI:**
   - Both services must serve an HTML UI directly from Express GET `/` route using Tailwind CSS via CDN. Do not create separate React/Next.js frontend build steps.
5. **CLEAN & ROBUST CODE:**
   - Ensure proper error handling, JSON body parsing (`express.json()`), CORS support, and robust standard response formats.

---

## 3. Step-by-Step Task Instructions for AI Agent

### Step 1: Create Working Directory
Create directory structure at `~/tugas-container/` containing `web1` and `web2`.

### Step 2: Implement Web 1 (`web1/server.js` - Product & Inventory Service)
- Set up Express server listening on internal container port `8080`.
- In-memory array of products: `[{ id: 1, name: "Laptop Gaming", price: 15000000, stock: 10, category: "Electronics" }, ...]`.
- Implement CRUD endpoints:
  - `GET /` -> HTML Dashboard with UI form to create, view, and delete products.
  - `GET /api/products` -> Return JSON array of products.
  - `POST /api/products` -> Add new product with auto-generated ID.
  - `PUT /api/products/:id` -> Update product fields.
  - `DELETE /api/products/:id` -> Remove product.

### Step 3: Implement Web 2 (`web2/server.js` - User Account & Auth Service)
- Set up Express server listening on internal container port `8080`.
- In-memory array of users: `[{ id: 1, name: "Admin Utama", email: "admin@ogulix.tech", role: "Administrator", status: "Active" }, ...]`.
- Implement CRUD endpoints:
  - `GET /` -> HTML Dashboard with UI form to register user, list users, and delete user.
  - `GET /api/users` -> Return JSON array of users.
  - `POST /api/users` -> Add new user with timestamp ID.
  - `PUT /api/users/:id` -> Update user status/role.
  - `DELETE /api/users/:id` -> Remove user.

### Step 4: Create Dockerfiles & Docker Compose
- Create `web1/Dockerfile` and `web2/Dockerfile` using `node:20-alpine`.
- Create `docker-compose.yml` mapping `8081:8080` for `web1` and `8082:8080` for `web2`.
- Set container names as `web1` and `web2` explicitly.

---

## 4. Verification & Validation Commands

Run the following commands after creation to verify setup:

```bash
cd ~/tugas-container

# 1. Build and start containers
docker compose up -d --build

# 2. Check container status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 3. Test Web 1 API
curl -s http://localhost:8081/api/products

# 4. Test Web 2 API
curl -s http://localhost:8082/api/users
```

Expectations: Both `web1` and `web2` must output HTTP status 200 and valid JSON data.