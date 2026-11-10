'use strict';

// In-memory catalog. No database by design: the JMeter read benchmark
// measures Express throughput, so there must be no disk or network I/O here.
const SEED = [
  { id: 1, name: 'Laptop Gaming ROG', category: 'Electronics', price: 18500000, stock: 15 },
  { id: 2, name: 'Monitor Ultrawide 34 inci', category: 'Electronics', price: 7200000, stock: 8 },
  { id: 3, name: 'Keyboard Mekanik 87 Tombol', category: 'Electronics', price: 890000, stock: 24 },
  { id: 4, name: 'Kursi Ergonomis Mesh', category: 'Furniture', price: 2450000, stock: 5 },
  { id: 5, name: 'Meja Kerja Lipat', category: 'Furniture', price: 1350000, stock: 0 },
  { id: 6, name: 'Printer Thermal 80mm', category: 'Office', price: 1650000, stock: 12 },
];

const toProduct = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  price: row.price,
  stock: row.stock,
  status: row.stock > 0 ? 'Available' : 'Out of Stock',
});

let products = SEED.map(toProduct);
let nextId = products.reduce((max, product) => Math.max(max, product.id), 0) + 1;

const normalize = (value) => (typeof value === 'string' ? value.trim() : value);

function list(query = {}) {
  const category = normalize(query.category);
  const search = normalize(query.search);
  const needle = typeof search === 'string' && search ? search.toLowerCase() : '';

  return products.filter((product) => {
    const matchesCategory = !category || category.toLowerCase() === 'all' || product.category.toLowerCase() === category.toLowerCase();
    const matchesSearch = !needle || product.name.toLowerCase().includes(needle) || product.category.toLowerCase().includes(needle);
    return matchesCategory && matchesSearch;
  });
}

function findById(id) {
  return products.find((product) => product.id === id) || null;
}

function create(payload) {
  const product = toProduct({
    id: nextId,
    name: payload.name,
    category: payload.category,
    price: payload.price,
    stock: payload.stock,
  });
  nextId += 1;
  products.push(product);
  return product;
}

function update(id, patch) {
  const current = findById(id);
  if (!current) return null;

  const next = {
    ...current,
    name: patch.name !== undefined ? patch.name : current.name,
    category: patch.category !== undefined ? patch.category : current.category,
    price: patch.price !== undefined ? patch.price : current.price,
    stock: patch.stock !== undefined ? patch.stock : current.stock,
  };

  Object.assign(current, toProduct(next));
  return current;
}

function remove(id) {
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return null;
  const [deleted] = products.splice(index, 1);
  return deleted;
}

module.exports = { list, findById, create, update, remove };
