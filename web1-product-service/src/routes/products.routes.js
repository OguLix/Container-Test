'use strict';

const express = require('express');
const store = require('../data/products.store');

const router = express.Router();

const MAX_NAME = 120;
const MAX_CATEGORY = 40;
const MAX_PRICE = 1_000_000_000_000;
const MAX_STOCK = 1_000_000_000;

const parseId = (raw) => {
  if (!/^\d+$/.test(String(raw))) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

// `status` is never taken from the client: it is derived from `stock`
// so the catalog cannot hold a row that says Available with zero units.
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
    if (!name) errors.push({ field: 'name', message: 'Nama produk wajib diisi.' });
    else if (name.length > MAX_NAME) errors.push({ field: 'name', message: `Nama produk maksimal ${MAX_NAME} karakter.` });
    else value.name = name;
  }

  if (needed('category')) {
    const raw = given('category') ? body.category : 'General';
    const category = typeof raw === 'string' ? raw.trim() : '';
    if (!category) errors.push({ field: 'category', message: 'Kategori wajib diisi.' });
    else if (category.length > MAX_CATEGORY) errors.push({ field: 'category', message: `Kategori maksimal ${MAX_CATEGORY} karakter.` });
    else value.category = category;
  }

  if (needed('price')) {
    const raw = body.price;
    const price = typeof raw === 'string' && raw.trim() === '' ? NaN : Number(raw);
    if (!Number.isFinite(price) || price < 0) errors.push({ field: 'price', message: 'Harga harus angka 0 atau lebih.' });
    else if (price > MAX_PRICE) errors.push({ field: 'price', message: 'Harga melebihi batas wajar.' });
    else value.price = price;
  }

  if (needed('stock')) {
    const raw = body.stock;
    const stock = typeof raw === 'string' && raw.trim() === '' ? NaN : Number(raw);
    if (!Number.isFinite(stock) || !Number.isInteger(stock) || stock < 0) errors.push({ field: 'stock', message: 'Stok harus bilangan bulat 0 atau lebih.' });
    else if (stock > MAX_STOCK) errors.push({ field: 'stock', message: 'Stok melebihi batas wajar.' });
    else value.stock = stock;
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
    return res.status(400).json({ success: false, message: 'Data produk tidak valid.', errors });
  }

  const product = store.create(value);
  noStore(res);
  res
    .status(201)
    .location(`/api/products/${product.id}`)
    .json({ success: true, message: 'Produk ditambahkan ke katalog.', data: product });
});

router.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ success: false, message: 'ID produk harus bilangan bulat positif.' });
  }

  const { errors, value } = validate(req.body, { partial: true });
  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Data produk tidak valid.', errors });
  }
  if (Object.keys(value).length === 0) {
    return res.status(400).json({ success: false, message: 'Tidak ada field yang bisa diperbarui.' });
  }

  const product = store.update(id, value);
  if (!product) {
    return res.status(404).json({ success: false, message: `Produk dengan ID ${id} tidak ditemukan.` });
  }

  noStore(res);
  res.json({ success: true, message: 'Data produk diperbarui.', data: product });
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ success: false, message: 'ID produk harus bilangan bulat positif.' });
  }

  const product = store.remove(id);
  if (!product) {
    return res.status(404).json({ success: false, message: `Produk dengan ID ${id} tidak ditemukan.` });
  }

  noStore(res);
  res.json({ success: true, message: 'Produk dihapus dari katalog.', data: product });
});

module.exports = router;
