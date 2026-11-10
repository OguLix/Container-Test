'use strict';

const shortDate = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const quantity = new Intl.NumberFormat('id-ID');

const state = {
  users: [],
  loading: true,
  error: null,
  search: '',
  status: '',
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

const stampClass = (status) => {
  if (status === 'Active') return 'stamp-ok';
  if (status === 'Suspended') return 'stamp-stop';
  return 'stamp-out';
};

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : shortDate.format(date);
};

async function request(path, options = {}) {
  const { trackLatency = true, ...init } = options;
  if (init.body) init.headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };

  const startedAt = performance.now();
  let response;
  try {
    response = await fetch(path, init);
  } catch (cause) {
    throw new Error('Layanan web2 tidak bisa dihubungi. Pastikan kontainer masih berjalan.');
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

function visibleUsers() {
  const needle = state.search.trim().toLowerCase();
  return state.users.filter((user) => {
    const matchStatus = !state.status || user.status === state.status;
    const matchSearch =
      !needle || user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
    return matchStatus && matchSearch;
  });
}

function renderStats() {
  const active = state.users.filter((user) => user.status === 'Active').length;
  const roles = new Set(state.users.map((user) => user.role));

  $('statTotal').textContent = quantity.format(state.users.length);
  $('statActive').textContent = quantity.format(active);
  $('statRoles').textContent = quantity.format(roles.size);
}

function rowTemplate(user, index) {
  return `
    <tr>
      <td class="cell-no" data-label="No">${String(index + 1).padStart(2, '0')}</td>
      <td class="cell-item" data-label="Anggota">
        <span class="item-name">${escapeHtml(user.name)}</span>
        <span class="item-meta">${escapeHtml(user.email)}</span>
      </td>
      <td class="cell-role" data-label="Peran">${escapeHtml(user.role)}</td>
      <td class="cell-status" data-label="Status">
        <span class="stamp ${stampClass(user.status)}">${escapeHtml(user.status)}</span>
      </td>
      <td class="cell-created" data-label="Dibuat">${formatDate(user.createdAt)}</td>
      <td class="cell-actions">
        <button class="btn btn-tiny" type="button" data-action="edit" data-id="${user.id}">Ubah</button>
        <button class="btn btn-tiny btn-danger" type="button" data-action="delete" data-id="${user.id}">Hapus</button>
      </td>
    </tr>`;
}

function renderTable() {
  const table = $('userTable');
  const stateBox = $('stateBox');
  const loader = $('stateLoader');
  const action = $('stateAction');

  action.hidden = true;
  loader.hidden = true;

  if (state.loading) {
    table.hidden = true;
    stateBox.hidden = false;
    $('stateTitle').textContent = 'Memuat register';
    $('stateText').textContent = 'Menghubungi layanan web2.';
    loader.hidden = false;
    return;
  }

  if (state.error) {
    table.hidden = true;
    stateBox.hidden = false;
    $('stateTitle').textContent = 'Register tidak termuat';
    $('stateText').textContent = state.error;
    action.hidden = false;
    action.textContent = 'Coba lagi';
    action.dataset.action = 'retry';
    return;
  }

  const items = visibleUsers();
  $('resultCount').textContent = String(items.length);

  if (state.users.length === 0) {
    table.hidden = true;
    stateBox.hidden = false;
    $('stateTitle').textContent = 'Register masih kosong';
    $('stateText').textContent = 'Daftarkan akun pertama lewat formulir di samping.';
    action.hidden = false;
    action.textContent = 'Isi formulir';
    action.dataset.action = 'focus-form';
    return;
  }

  if (items.length === 0) {
    table.hidden = true;
    stateBox.hidden = false;
    $('stateTitle').textContent = 'Tidak ada akun yang cocok';
    $('stateText').textContent = 'Ubah kata kunci atau pilih status lain.';
    action.hidden = false;
    action.textContent = 'Bersihkan saringan';
    action.dataset.action = 'clear-filter';
    return;
  }

  stateBox.hidden = true;
  table.hidden = false;
  $('userRows').innerHTML = items.map(rowTemplate).join('');
}

function render() {
  renderStats();
  renderTable();
}

async function loadUsers({ quiet = false } = {}) {
  if (!quiet) {
    state.loading = true;
    state.error = null;
    renderTable();
  }

  try {
    const users = await request('/api/users');
    state.users = Array.isArray(users) ? users : [];
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
    const stored = window.localStorage.getItem('register-theme');
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
    window.localStorage.setItem('register-theme', theme);
  } catch (error) {
    /* Mode tetap berlaku untuk sesi ini walau preferensi tidak tersimpan. */
  }
}

function openEdit(user) {
  $('editId').value = String(user.id);
  $('editName').value = user.name;
  $('editEmail').value = user.email;
  $('editRole').value = user.role;
  $('editStatus').value = user.status;
  showFormError('editError', '');
  $('editDialog').showModal();
  $('editName').focus();
}

function openDelete(user) {
  state.pendingDeleteId = user.id;
  $('deleteName').textContent = user.name;
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
      name: $('userName').value.trim(),
      email: $('userEmail').value.trim(),
      role: $('userRole').value,
      status: $('userStatus').value,
    };

    const button = $('submitBtn');
    setBusy(button, true, 'Mendaftarkan...');
    showFormError('formError', '');

    try {
      await request('/api/users', { method: 'POST', body: JSON.stringify(payload) });
      form.reset();
      $('userName').focus();
      toast('Akun terdaftar pada register.');
      await loadUsers({ quiet: true });
    } catch (error) {
      showFormError('formError', describeError(error));
      toast('Pendaftaran gagal.', 'error');
    } finally {
      setBusy(button, false, 'Daftarkan ke register');
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
      await request(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: $('editName').value.trim(),
          email: $('editEmail').value.trim(),
          role: $('editRole').value,
          status: $('editStatus').value,
        }),
      });
      $('editDialog').close();
      toast('Perubahan akun tersimpan.');
      await loadUsers({ quiet: true });
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
      await request(`/api/users/${state.pendingDeleteId}`, { method: 'DELETE' });
      $('deleteDialog').close();
      toast('Akun dihapus dari register.');
      await loadUsers({ quiet: true });
    } catch (error) {
      toast(describeError(error), 'error');
    } finally {
      setBusy(button, false, 'Hapus dari register');
      state.pendingDeleteId = null;
    }
  });

  $('userRows').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const user = state.users.find((item) => item.id === Number(button.dataset.id));
    if (!user) return;

    if (button.dataset.action === 'edit') openEdit(user);
    if (button.dataset.action === 'delete') openDelete(user);
  });

  $('stateAction').addEventListener('click', (event) => {
    const action = event.currentTarget.dataset.action;
    if (action === 'retry') {
      loadUsers();
      return;
    }
    if (action === 'focus-form') {
      $('userName').focus();
      return;
    }
    if (action === 'clear-filter') {
      state.search = '';
      state.status = '';
      $('searchInput').value = '';
      $('statusFilter').value = '';
      renderTable();
    }
  });

  $('searchInput').addEventListener('input', (event) => {
    state.search = event.currentTarget.value;
    renderTable();
  });

  $('statusFilter').addEventListener('change', (event) => {
    state.status = event.currentTarget.value;
    renderTable();
  });

  $('refreshBtn').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    setBusy(button, true, 'Memuat...');
    await loadUsers({ quiet: true });
    setBusy(button, false, 'Muat ulang');
    if (!state.error) toast('Register dimuat ulang.');
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
loadUsers();
checkHealth();
setInterval(checkHealth, 20000);
