'use strict';

const money = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const quantity = new Intl.NumberFormat('id-ID');

const state = {
  products: [],
  loading: true,
  error: null,
  search: '',
  category: '',
  pendingDeleteId: null,
};

const $ = (id) => document.getElementById(id);

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

const describeError = (error) =>
  [error.message, ...(error.details || []).map((item) => item.message)].filter(Boolean).join(' ');

async function request(path, options = {}) {
  const { trackLatency = true, ...init } = options;
  if (init.body) init.headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };

  const startedAt = performance.now();
  let response;
  try {
    response = await fetch(path, init);
  } catch (cause) {
    throw new Error('Layanan web1 tidak bisa dihubungi. Pastikan kontainer masih berjalan.');
  }

  const raw = await response.text();
  if (trackLatency) {
    $('latencyValue').textContent = `${Math.round(performance.now() - startedAt)} ms`;
  }

  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch (cause) {
      payload = null;
    }
  }

  if (!response.ok) {
    const error = new Error(
      (payload && payload.message) || `Permintaan gagal dengan status ${response.status}.`,
    );
    error.details = payload && Array.isArray(payload.errors) ? payload.errors : [];
    throw error;
  }

  return payload;
}

function toast(message, tone = 'ok') {
  const region = $('toastRegion');
  region.textContent = message;
  region.dataset.tone = tone;
  region.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => region.classList.remove('is-visible'), 4200);
}

function showFormError(id, message) {
  const box = $(id);
  box.textContent = message;
  box.hidden = !message;
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = label;
}

function formatUptime(seconds) {
  if (!Number.isFinite(seconds)) return '-';
  if (seconds < 60) return `${Math.round(seconds)} detik`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit`;
  return `${Math.floor(seconds / 3600)} jam ${Math.floor((seconds % 3600) / 60)} menit`;
}

function visibleProducts() {
  const needle = state.search.trim().toLowerCase();
  return state.products.filter((product) => {
    const matchCategory = !state.category || product.category === state.category;
    const matchSearch =
      !needle ||
      product.name.toLowerCase().includes(needle) ||
      product.category.toLowerCase().includes(needle);
    return matchCategory && matchSearch;
  });
}

function renderStats() {
  const units = state.products.reduce((total, product) => total + product.stock, 0);
  const value = state.products.reduce((total, product) => total + product.price * product.stock, 0);

  $('statCount').textContent = quantity.format(state.products.length);
  $('statUnits').textContent = quantity.format(units);
  $('statValue').textContent = money.format(value);
}

function renderCategories() {
  const categories = [...new Set(state.products.map((product) => product.category))].sort((a, b) =>
    a.localeCompare(b, 'id'),
  );
  if (!categories.includes(state.category)) state.category = '';

  $('categoryFilter').innerHTML =
    '<option value="">Semua kategori</option>' +
    categories
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join('');
  $('categoryFilter').value = state.category;

  $('categoryOptions').innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join('');
}

function rowTemplate(product, index) {
  const available = product.stock > 0;
  return `
    <tr>
      <td class="cell-no" data-label="No">${String(index + 1).padStart(2, '0')}</td>
      <td class="cell-item" data-label="Barang">
        <span class="item-name">${escapeHtml(product.name)}</span>
        <span class="item-meta">${escapeHtml(product.category)} · kode ${product.id}</span>
      </td>
      <td class="num cell-price" data-label="Harga">${money.format(product.price)}</td>
      <td class="num cell-stock" data-label="Stok">${quantity.format(product.stock)}</td>
      <td class="cell-status" data-label="Status">
        <span class="stamp ${available ? 'stamp-ok' : 'stamp-out'}">${available ? 'Available' : 'Out of Stock'}</span>
      </td>
      <td class="cell-actions">
        <button class="btn btn-tiny" type="button" data-action="edit" data-id="${product.id}">Ubah</button>
        <button class="btn btn-tiny btn-danger" type="button" data-action="delete" data-id="${product.id}">Hapus</button>
      </td>
    </tr>`;
}

function renderTable() {
  const table = $('productTable');
  const stateBox = $('stateBox');
  const loader = $('stateLoader');
  const action = $('stateAction');

  action.hidden = true;
  loader.hidden = true;

  if (state.loading) {
    table.hidden = true;
    stateBox.hidden = false;
    $('stateTitle').textContent = 'Memuat katalog';
    $('stateText').textContent = 'Menghubungi layanan web1.';
    loader.hidden = false;
    return;
  }

  if (state.error) {
    table.hidden = true;
    stateBox.hidden = false;
    $('stateTitle').textContent = 'Katalog tidak termuat';
    $('stateText').textContent = state.error;
    action.hidden = false;
    action.textContent = 'Coba lagi';
    action.dataset.action = 'retry';
    return;
  }

  const items = visibleProducts();
  $('resultCount').textContent = String(items.length);

  if (state.products.length === 0) {
    table.hidden = true;
    stateBox.hidden = false;
    $('stateTitle').textContent = 'Buku masih kosong';
    $('stateText').textContent = 'Catat barang pertama lewat formulir di samping.';
    action.hidden = false;
    action.textContent = 'Isi formulir';
    action.dataset.action = 'focus-form';
    return;
  }

  if (items.length === 0) {
    table.hidden = true;
    stateBox.hidden = false;
    $('stateTitle').textContent = 'Tidak ada baris yang cocok';
    $('stateText').textContent = 'Ubah kata kunci atau pilih kategori lain.';
    action.hidden = false;
    action.textContent = 'Bersihkan saringan';
    action.dataset.action = 'clear-filter';
    return;
  }

  stateBox.hidden = true;
  table.hidden = false;
  $('productRows').innerHTML = items.map(rowTemplate).join('');
}

function render() {
  renderStats();
  renderCategories();
  renderTable();
}

async function loadProducts({ quiet = false } = {}) {
  if (!quiet) {
    state.loading = true;
    state.error = null;
    renderTable();
  }

  try {
    const products = await request('/api/products');
    state.products = Array.isArray(products) ? products : [];
    state.error = null;
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

async function checkHealth() {
  try {
    const health = await request('/health', { trackLatency: false });
    $('healthBadge').dataset.state = 'up';
    $('healthText').textContent = `UP · ${health.service}`;
    $('healthUptime').textContent = formatUptime(health.uptime);
  } catch (error) {
    $('healthBadge').dataset.state = 'down';
    $('healthText').textContent = 'Tidak terjangkau';
    $('healthUptime').textContent = '-';
  }
}

function readTheme() {
  try {
    const stored = window.localStorage.getItem('katalog-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (error) {
    /* localStorage bisa diblokir, jatuh ke preferensi sistem. */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  $('themeToggle').textContent = isDark ? 'Mode terang' : 'Mode gelap';
  $('themeToggle').setAttribute('aria-pressed', String(isDark));

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#16140f' : '#f5f1e7');

  try {
    window.localStorage.setItem('katalog-theme', theme);
  } catch (error) {
    /* Mode tetap berlaku untuk sesi ini walau preferensi tidak tersimpan. */
  }
}

function openEdit(product) {
  $('editId').value = String(product.id);
  $('editName').value = product.name;
  $('editCategory').value = product.category;
  $('editPrice').value = String(product.price);
  $('editStock').value = String(product.stock);
  showFormError('editError', '');
  $('editDialog').showModal();
  $('editName').focus();
}

function openDelete(product) {
  state.pendingDeleteId = product.id;
  $('deleteName').textContent = product.name;
  $('deleteDialog').showModal();
}

function bindEvents() {
  $('themeToggle').addEventListener('click', () => {
    applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  });

  $('createForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const payload = {
      name: $('productName').value.trim(),
      category: $('productCategory').value.trim(),
      price: Number($('productPrice').value),
      stock: Number($('productStock').value),
    };
    if (!payload.category) delete payload.category;

    const button = $('submitBtn');
    setBusy(button, true, 'Menyimpan...');
    showFormError('formError', '');

    try {
      await request('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      form.reset();
      $('productName').focus();
      toast('Barang tersimpan di katalog.');
      await loadProducts({ quiet: true });
    } catch (error) {
      showFormError('formError', describeError(error));
      toast('Barang gagal disimpan.', 'error');
    } finally {
      setBusy(button, false, 'Simpan ke katalog');
    }
  });

  $('editForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const id = Number($('editId').value);
    const button = $('editSubmit');
    setBusy(button, true, 'Menyimpan...');
    showFormError('editError', '');

    try {
      await request(`/api/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: $('editName').value.trim(),
          category: $('editCategory').value.trim(),
          price: Number($('editPrice').value),
          stock: Number($('editStock').value),
        }),
      });
      $('editDialog').close();
      toast('Perubahan barang tersimpan.');
      await loadProducts({ quiet: true });
    } catch (error) {
      showFormError('editError', describeError(error));
      toast('Perubahan gagal disimpan.', 'error');
    } finally {
      setBusy(button, false, 'Simpan perubahan');
    }
  });

  $('deleteConfirm').addEventListener('click', async (event) => {
    if (state.pendingDeleteId === null) return;
    const button = event.currentTarget;
    setBusy(button, true, 'Menghapus...');

    try {
      await request(`/api/products/${state.pendingDeleteId}`, { method: 'DELETE' });
      $('deleteDialog').close();
      toast('Barang dihapus dari katalog.');
      await loadProducts({ quiet: true });
    } catch (error) {
      toast(describeError(error), 'error');
    } finally {
      setBusy(button, false, 'Hapus dari katalog');
      state.pendingDeleteId = null;
    }
  });

  $('productRows').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const product = state.products.find((item) => item.id === Number(button.dataset.id));
    if (!product) return;

    if (button.dataset.action === 'edit') openEdit(product);
    if (button.dataset.action === 'delete') openDelete(product);
  });

  $('stateAction').addEventListener('click', (event) => {
    const action = event.currentTarget.dataset.action;
    if (action === 'retry') {
      loadProducts();
      return;
    }
    if (action === 'focus-form') {
      $('productName').focus();
      return;
    }
    if (action === 'clear-filter') {
      state.search = '';
      state.category = '';
      $('searchInput').value = '';
      $('categoryFilter').value = '';
      renderTable();
    }
  });

  $('searchInput').addEventListener('input', (event) => {
    state.search = event.currentTarget.value;
    renderTable();
  });

  $('categoryFilter').addEventListener('change', (event) => {
    state.category = event.currentTarget.value;
    renderTable();
  });

  $('refreshBtn').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    setBusy(button, true, 'Memuat...');
    await loadProducts({ quiet: true });
    setBusy(button, false, 'Muat ulang');
    if (!state.error) toast('Katalog dimuat ulang.');
  });

  document.addEventListener('click', (event) => {
    const closer = event.target.closest('[data-close-dialog]');
    if (closer) closer.closest('dialog')?.close();
  });

  ['editDialog', 'deleteDialog'].forEach((id) => {
    const dialog = $(id);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
}

applyTheme(readTheme());
bindEvents();
loadProducts();
checkHealth();
setInterval(checkHealth, 20000);
