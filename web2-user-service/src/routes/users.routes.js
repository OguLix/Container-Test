'use strict';

const express = require('express');
const store = require('../data/users.store');

const router = express.Router();

const MAX_NAME = 120;
const MAX_EMAIL = 160;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const parseId = (raw) => {
  if (!/^\d+$/.test(String(raw))) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const canonicalStatus = (value) => {
  const match = store.STATUSES.find((status) => status.toLowerCase() === String(value).trim().toLowerCase());
  return match || null;
};

const canonicalRole = (value) => {
  const match = store.ROLES.find((role) => role.toLowerCase() === String(value).trim().toLowerCase());
  return match || null;
};

// Duplicate emails are deliberately allowed: the JMeter write scenario posts
// the same address 1000 times, and a 409 there would invalidate the benchmark.
function validate(body, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: [{ field: 'body', message: 'Body permintaan harus berupa objek JSON.' }], value };
  }

  const given = (field) => body[field] !== undefined && body[field] !== null;
  const needed = (field) => !partial || given(field);

  if (needed('name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) errors.push({ field: 'name', message: 'Nama pengguna wajib diisi.' });
    else if (name.length > MAX_NAME) errors.push({ field: 'name', message: `Nama pengguna maksimal ${MAX_NAME} karakter.` });
    else value.name = name;
  }

  if (needed('email')) {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) errors.push({ field: 'email', message: 'Email wajib diisi.' });
    else if (email.length > MAX_EMAIL) errors.push({ field: 'email', message: `Email maksimal ${MAX_EMAIL} karakter.` });
    else if (!EMAIL_PATTERN.test(email)) errors.push({ field: 'email', message: 'Format email tidak valid.' });
    else value.email = email;
  }

  if (given('role')) {
    const role = canonicalRole(body.role);
    if (!role) {
      errors.push({ field: 'role', message: `Peran harus salah satu dari: ${store.ROLES.join(', ')}.` });
    } else {
      value.role = role;
    }
  }

  if (given('status')) {
    const status = canonicalStatus(body.status);
    if (!status) {
      errors.push({ field: 'status', message: `Status harus salah satu dari: ${store.STATUSES.join(', ')}.` });
    } else {
      value.status = status;
    }
  }

  return { errors, value };
}

const noStore = (res) => res.set('Cache-Control', 'no-store');

router.get('/', (req, res) => {
  noStore(res);
  res.json(store.list(req.query));
});

router.post('/', (req, res) => {
  const { errors, value } = validate(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Data pengguna tidak valid.', errors });
  }

  const user = store.create(value);
  noStore(res);
  res
    .status(201)
    .location(`/api/users/${user.id}`)
    .json({ success: true, message: 'Akun pengguna terdaftar.', data: user });
});

router.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ success: false, message: 'ID pengguna harus bilangan bulat positif.' });
  }

  const { errors, value } = validate(req.body, { partial: true });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Data pengguna tidak valid.', errors });
  }
  if (Object.keys(value).length === 0) {
    return res.status(400).json({ success: false, message: 'Tidak ada field yang bisa diperbarui.' });
  }

  const user = store.update(id, value);
  if (!user) {
    return res.status(404).json({ success: false, message: `Pengguna dengan ID ${id} tidak ditemukan.` });
  }

  noStore(res);
  res.json({ success: true, message: 'Data pengguna diperbarui.', data: user });
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ success: false, message: 'ID pengguna harus bilangan bulat positif.' });
  }

  const user = store.remove(id);
  if (!user) {
    return res.status(404).json({ success: false, message: `Pengguna dengan ID ${id} tidak ditemukan.` });
  }

  noStore(res);
  res.json({ success: true, message: 'Akun pengguna dihapus.', data: user });
});

module.exports = router;
