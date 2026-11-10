'use strict';

// In-memory register. No database by design: the JMeter write benchmark
// measures Express throughput, so there must be no disk or network I/O here.
const SEED = [
  {
    id: 1,
    name: 'Admin Utama',
    email: 'admin@ogulix.tech',
    role: 'Administrator',
    status: 'Active',
    createdAt: '2026-01-06T08:15:00.000Z',
  },
  {
    id: 2,
    name: 'Fadhlan Aminullah',
    email: 'fadhlan@ogulix.tech',
    role: 'Administrator',
    status: 'Active',
    createdAt: '2026-01-08T03:40:00.000Z',
  },
  {
    id: 3,
    name: 'Rina Kusuma',
    email: 'rina@ogulix.tech',
    role: 'Manager',
    status: 'Active',
    createdAt: '2026-02-02T09:05:00.000Z',
  },
  {
    id: 4,
    name: 'Bagas Prakoso',
    email: 'bagas@ogulix.tech',
    role: 'Member',
    status: 'Inactive',
    createdAt: '2026-02-17T13:20:00.000Z',
  },
  {
    id: 5,
    name: 'Sari Wulandari',
    email: 'sari@ogulix.tech',
    role: 'Auditor',
    status: 'Active',
    createdAt: '2026-03-01T06:55:00.000Z',
  },
];

const ROLES = ['Administrator', 'Manager', 'Member', 'Auditor'];
const STATUSES = ['Active', 'Inactive', 'Suspended'];

let users = SEED.map((user) => ({ ...user }));
let lastId = Date.now();

// The spec asks for a timestamp ID. Date.now() alone can repeat when hundreds
// of writes land inside the same millisecond, so keep the value monotonic.
function nextTimestampId() {
  const now = Date.now();
  lastId = now > lastId ? now : lastId + 1;
  return lastId;
}

const normalize = (value) => (typeof value === 'string' ? value.trim() : value);

function list(query = {}) {
  const search = normalize(query.search);
  const status = normalize(query.status);
  const role = normalize(query.role);
  const needle = typeof search === 'string' && search ? search.toLowerCase() : '';

  return users.filter((user) => {
    const matchesStatus = !status || status.toLowerCase() === 'all' || user.status.toLowerCase() === status.toLowerCase();
    const matchesRole = !role || role.toLowerCase() === 'all' || user.role.toLowerCase() === role.toLowerCase();
    const matchesSearch =
      !needle || user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
    return matchesStatus && matchesRole && matchesSearch;
  });
}

function findById(id) {
  return users.find((user) => user.id === id) || null;
}

function create(payload) {
  const user = {
    id: nextTimestampId(),
    name: payload.name,
    email: payload.email,
    role: payload.role || 'Member',
    status: payload.status || 'Active',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

function update(id, patch) {
  const current = findById(id);
  if (!current) return null;

  ['name', 'email', 'role', 'status'].forEach((field) => {
    if (patch[field] !== undefined) current[field] = patch[field];
  });

  return current;
}

function remove(id) {
  const index = users.findIndex((user) => user.id === id);
  if (index === -1) return null;
  const [deleted] = users.splice(index, 1);
  return deleted;
}

module.exports = { ROLES, STATUSES, list, findById, create, update, remove };
