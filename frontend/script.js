const API = "https://localhost:7248/api";
let currentProducts = [];
let latestSummary = null;
let latestProducts = [];
let latestTransactions = [];
let authMode = "login";

function initNavigation() {
  const navButtons = document.querySelectorAll("[data-section-target]");
  const firstButton = navButtons[0];
  if (firstButton) {
    setActiveSection(firstButton.dataset.sectionTarget, firstButton);
  }
}

function setActiveSection(sectionId, activeButton) {
  const sections = document.querySelectorAll(".section");
  sections.forEach(section => {
    section.classList.toggle("active", section.id === sectionId);
  });

  const navButtons = document.querySelectorAll("[data-section-target]");
  navButtons.forEach(button => {
    button.classList.toggle("active", button === activeButton);
  });
}

function activateSectionById(sectionId) {
  const button = document.querySelector(`[data-section-target="${sectionId}"]`);
  if (button) {
    setActiveSection(sectionId, button);
  }
}

function setMessage(elementId, message, isError = false) {
  const target = document.getElementById(elementId);
  if (!target) return;

  target.textContent = message;
  target.style.color = isError ? "#b42318" : "#027a48";
}

function getStockBadge(stock) {
  const stockNumber = Number(stock || 0);
  if (stockNumber <= 5) {
    return `<span class="stock-badge stock-low">Low (${stockNumber})</span>`;
  }
  if (stockNumber <= 20) {
    return `<span class="stock-badge stock-medium">Medium (${stockNumber})</span>`;
  }
  return `<span class="stock-badge stock-high">High (${stockNumber})</span>`;
}

function safeData(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === "register";

  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const nameField = document.getElementById("nameField");
  const authSubtitle = document.getElementById("authSubtitle");
  const authActionButton = document.getElementById("authActionButton");
  const authMessage = document.getElementById("authMessage");
  const passwordInput = document.getElementById("password");

  if (loginTab) loginTab.classList.toggle("active", !isRegister);
  if (registerTab) registerTab.classList.toggle("active", isRegister);
  if (nameField) nameField.classList.toggle("hidden", !isRegister);
  if (authSubtitle) authSubtitle.textContent = isRegister
    ? "Buat akun baru untuk mengakses dashboard."
    : "Masuk untuk mengelola produk dan transaksi.";
  if (authActionButton) {
    authActionButton.textContent = isRegister ? "Create Account" : "Sign In";
    authActionButton.setAttribute("onclick", isRegister ? "register()" : "login()");
  }
  if (passwordInput) {
    passwordInput.placeholder = isRegister ? "Minimal 6 karakter" : "Masukkan password";
  }
  if (authMessage) authMessage.textContent = "";
}

function setAuthMessage(message, isError = false) {
  const target = document.getElementById("authMessage");
  if (!target) return;
  target.textContent = message;
  target.style.color = isError ? "#b42318" : "#027a48";
}

// 🔐 LOGIN
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  fetch(`${API}/Auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem("token", data.token);
      globalThis.location.href = "dashboard.html";
    } else {
      setAuthMessage(data.message || "Login gagal.", true);
    }
  });
}

function register() {
  const nameInput = document.getElementById("nameRegister");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const name = nameInput ? nameInput.value.trim() : "";
  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  if (!name || !email || !password) {
    setAuthMessage("Nama, email, dan password wajib diisi.", true);
    return;
  }

  fetch(`${API}/Auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      setAuthMessage("Register berhasil. Silakan Sign In.");
      if (nameInput) nameInput.value = "";
      if (passwordInput) passwordInput.value = "";
      setAuthMode("login");
    } else {
      setAuthMessage(data.message || "Register gagal.", true);
    }
  });
}

// 🔓 LOGOUT
function logout() {
  localStorage.removeItem("token");
  globalThis.location.href = "login.html";
}

// 💰 FORMAT RUPIAH
function formatRupiah(num) {
  return "Rp " + num.toLocaleString("id-ID");
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return safeData(dateString);

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Authorization": "Bearer " + token };
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  return fetch(url, { ...options, headers });
}

function updateLastSyncTime() {
  const target = document.getElementById("lastSync");
  if (!target) return;
  target.textContent = `Last sync: ${formatDateTime(new Date().toISOString())}`;
}

function renderKpiCards(summary, products, transactions) {
  const target = document.getElementById("kpiCards");
  if (!target) return;

  const lowStockCount = products.filter(item => Number(item.stock || 0) <= 5).length;
  const avgTicket = transactions.length
    ? Math.round(transactions.reduce((sum, tx) => sum + Number(tx.totalPrice || 0), 0) / transactions.length)
    : 0;

  target.innerHTML = `
    <div class="kpi-item">
      <div class="kpi-label">Revenue</div>
      <div class="kpi-value">${formatRupiah(Number(summary.totalSales || 0))}</div>
    </div>
    <div class="kpi-item">
      <div class="kpi-label">Transactions</div>
      <div class="kpi-value">${safeData(summary.totalTransactions, 0)}</div>
    </div>
    <div class="kpi-item">
      <div class="kpi-label">Low Stock Items</div>
      <div class="kpi-value">${lowStockCount}</div>
    </div>
    <div class="kpi-item">
      <div class="kpi-label">Avg Ticket Size</div>
      <div class="kpi-value">${formatRupiah(avgTicket)}</div>
    </div>
  `;
}

function aggregateDailyTotals(transactions, dayCount = 7) {
  const map = new Map();
  const now = new Date();
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  transactions.forEach(tx => {
    const date = new Date(tx.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    if (map.has(key)) {
      map.set(key, map.get(key) + Number(tx.totalPrice || 0));
    }
  });

  return Array.from(map.entries()).map(([key, total]) => ({ key, total }));
}

function drawOverviewChart(transactions) {
  const canvas = document.getElementById("overviewChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = globalThis.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = 280;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const points = aggregateDailyTotals(transactions, 7);
  const padding = { top: 18, right: 18, bottom: 34, left: 68 };
  const chartWidth = cssWidth - padding.left - padding.right;
  const chartHeight = cssHeight - padding.top - padding.bottom;

  const maxValue = Math.max(...points.map(item => item.total), 1);
  const niceMax = Math.ceil(maxValue / 1000) * 1000;
  const gridLines = 4;

  ctx.strokeStyle = "#e4e7ec";
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridLines; i += 1) {
    const y = padding.top + (chartHeight / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();

    const value = niceMax - (niceMax / gridLines) * i;
    ctx.fillStyle = "#667085";
    ctx.font = "11px Segoe UI";
    ctx.fillText(formatRupiah(Math.round(value)), 10, y + 4);
  }

  ctx.strokeStyle = "#175cd3";
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = padding.left + (chartWidth / (points.length - 1 || 1)) * index;
    const y = padding.top + chartHeight - (point.total / niceMax) * chartHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  points.forEach((point, index) => {
    const x = padding.left + (chartWidth / (points.length - 1 || 1)) * index;
    const y = padding.top + chartHeight - (point.total / niceMax) * chartHeight;
    ctx.beginPath();
    ctx.fillStyle = "#175cd3";
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const labelDate = new Date(point.key).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
    ctx.fillStyle = "#667085";
    ctx.font = "11px Segoe UI";
    ctx.fillText(labelDate, x - 18, padding.top + chartHeight + 18);
  });
}

function renderRecentActivity(transactions) {
  const target = document.getElementById("recentActivity");
  if (!target) return;

  if (!transactions.length) {
    target.innerHTML = `<li class="empty-state">Belum ada aktivitas transaksi.</li>`;
    return;
  }

  const top = [...transactions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  target.innerHTML = top.map(item => `
    <li class="activity-item">
      <span>Transaksi ${formatRupiah(item.totalPrice || 0)}</span>
      <span>${formatDateTime(item.createdAt)}</span>
    </li>
  `).join("");
}

function refreshOverviewWidgets() {
  renderKpiCards(latestSummary || {}, latestProducts, latestTransactions);
  drawOverviewChart(latestTransactions);
  renderRecentActivity(latestTransactions);
  updateLastSyncTime();
}

// 📊 DASHBOARD
function loadDashboard() {
  fetchWithAuth(`${API}/Dashboard/summary`)
  .then(res => res.json())
  .then(data => {
    latestSummary = data.data || {};
    refreshOverviewWidgets();
  });
}

// ➕ ADD PRODUCT
function addProduct() {
  const name = document.getElementById("name").value;
  const stock = Number.parseInt(document.getElementById("stock").value, 10);
  const price = Number.parseInt(document.getElementById("price").value, 10);

  fetchWithAuth(`${API}/Product`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, stock, price })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      setMessage("productMessage", "Produk berhasil ditambahkan.");
      setMessage("productListMessage", "");
      loadProducts();
      loadProductOptions();

      document.getElementById("name").value = "";
      document.getElementById("stock").value = "";
      document.getElementById("price").value = "";
    } else {
      setMessage("productMessage", data.message || "Gagal menambahkan produk.", true);
    }
  });
}

function renderProducts(products) {
  currentProducts = products;

  if (products.length === 0) {
    document.getElementById("products").innerHTML = `<div class="empty-state">Belum ada produk.</div>`;
    return;
  }

  const rows = products.map(p => `
    <tr>
      <td>${safeData(p.name)}</td>
      <td>${getStockBadge(p.stock)}</td>
      <td class="table-money">${formatRupiah(p.price || 0)}</td>
      <td style="text-align: center;">
        <div class="table-actions" style="display: inline-flex; gap: 4px;">
          <button class="btn-secondary" onclick="openUpdateProduct('${p.id}')">Update</button>
          <button class="btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  document.getElementById("products").innerHTML = `
    <table class="list-table">
      <thead>
        <tr>
          <th>Nama</th>
          <th>Status Stock</th>
          <th>Harga</th>
          <th style="text-align: center;">Aksi</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function loadProducts() {
  fetchWithAuth(`${API}/Product`)
  .then(res => res.json())
  .then(data => {
    const products = data.data || [];
    latestProducts = products;
    renderProducts(products);
    setMessage("productListMessage", "");
    refreshOverviewWidgets();
  });
}

function searchProducts() {
  const query = document.getElementById("searchProduct").value.trim();
  if (!query) {
    loadProducts();
    setMessage("productListMessage", "Input search kosong, menampilkan semua produk.");
    return;
  }

  fetchWithAuth(`${API}/Product/search?query=${encodeURIComponent(query)}`)
  .then(res => res.json())
  .then(data => {
    renderProducts(data.data || []);
    setMessage("productListMessage", `Hasil pencarian untuk "${query}".`);
  });
}

function sortProducts() {
  const selected = document.getElementById("sortProduct").value;
  const [sortBy, order] = selected.split("-");

  fetchWithAuth(`${API}/Product/sorted?sortBy=${encodeURIComponent(sortBy)}&order=${encodeURIComponent(order)}`)
  .then(res => res.json())
  .then(data => {
    renderProducts(data.data || []);
    setMessage("productListMessage", "Daftar produk sudah diurutkan.");
  });
}

function loadLowStockProducts() {
  fetchWithAuth(`${API}/Product/low-stock`)
  .then(res => res.json())
  .then(data => {
    renderProducts(data.data || []);
    setMessage("productListMessage", "Menampilkan produk low stock.");
  });
}

function openUpdateProduct(productId) {
  const product = currentProducts.find(p => String(p.id) === String(productId));
  if (!product) {
    setMessage("productListMessage", "Produk tidak ditemukan.", true);
    return;
  }

  const name = globalThis.prompt("Update nama produk:", product.name);
  if (name === null) return;
  const stockInput = globalThis.prompt("Update stock:", String(product.stock));
  if (stockInput === null) return;
  const priceInput = globalThis.prompt("Update harga:", String(product.price));
  if (priceInput === null) return;

  const stock = Number.parseInt(stockInput, 10);
  const price = Number.parseInt(priceInput, 10);

  if (!name.trim() || Number.isNaN(stock) || Number.isNaN(price)) {
    setMessage("productListMessage", "Data update tidak valid.", true);
    return;
  }

  fetchWithAuth(`${API}/Product/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), stock, price })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      setMessage("productListMessage", "Produk berhasil diupdate.");
      loadProducts();
      loadProductOptions();
      loadDashboard();
    } else {
      setMessage("productListMessage", data.message || "Gagal update produk.", true);
    }
  });
}

function deleteProduct(productId) {
  const confirmDelete = globalThis.confirm("Yakin ingin menghapus produk ini?");
  if (!confirmDelete) return;

  fetchWithAuth(`${API}/Product/${productId}`, {
    method: "DELETE"
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      setMessage("productListMessage", "Produk berhasil dihapus.");
      loadProducts();
      loadProductOptions();
      loadDashboard();
    } else {
      setMessage("productListMessage", data.message || "Gagal menghapus produk.", true);
    }
  });
}

// 📋 DROPDOWN PRODUCT
function loadProductOptions() {
  fetchWithAuth(`${API}/Product`)
  .then(res => res.json())
  .then(data => {
    const products = data.data || [];

    if (products.length === 0) {
      document.getElementById("productSelect").innerHTML = `<option value="">Tidak ada produk</option>`;
      return;
    }

    const options = products.map(p => `
      <option value="${p.id}">
        ${p.name} (Stock: ${p.stock})
      </option>
    `).join("");

    document.getElementById("productSelect").innerHTML = options;
  });
}

// 💸 TRANSACTION
function createTransaction() {
  const productId = document.getElementById("productSelect").value;
  const qty = Number.parseInt(document.getElementById("qty").value, 10);

  fetchWithAuth(`${API}/Transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      items: [{ productId, quantity: qty }]
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      setMessage("transactionMessage", "Transaksi berhasil diproses.");
      loadProducts();
      loadProductOptions();
      loadTransactions();

      document.getElementById("qty").value = "";
    } else {
      setMessage("transactionMessage", data.message || "Transaksi gagal.", true);
    }
  });
}

// 📜 HISTORY
function loadTransactions() {
  fetchWithAuth(`${API}/Transaction/history`)
  .then(res => res.json())
  .then(data => {
    const transactions = data.data || [];
    latestTransactions = transactions;
    renderTransactionSummary(transactions);
    if (transactions.length === 0) {
      document.getElementById("transactions").innerHTML = `<div class="empty-state">Belum ada transaksi.</div>`;
      refreshOverviewWidgets();
      return;
    }

    const rows = transactions.map(t => `
      <tr>
        <td class="table-money">${formatRupiah(t.totalPrice || 0)}</td>
        <td>${formatDateTime(t.createdAt)}</td>
      </tr>
    `).join("");

    document.getElementById("transactions").innerHTML = `
      <table class="list-table">
        <thead>
          <tr>
            <th>Total</th>
            <th>Waktu</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    refreshOverviewWidgets();
  });
}

function renderTransactionSummary(transactions) {
  const target = document.getElementById("transactionSummary");
  if (!target) return;

  const total = transactions.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const count = transactions.length;
  const avg = count ? Math.round(total / count) : 0;

  target.innerHTML = `
    <div class="summary-item">
      <div class="label">Total Nominal</div>
      <div class="value">${formatRupiah(total)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Total Transaksi</div>
      <div class="value">${count}</div>
    </div>
    <div class="summary-item">
      <div class="label">Rata-rata Transaksi</div>
      <div class="value">${formatRupiah(avg)}</div>
    </div>
  `;
}

function openProductModule() {
  activateSectionById("productSection");
  const input = document.getElementById("name");
  if (input) input.focus();
}

function openTransactionModule() {
  activateSectionById("transactionSection");
  const input = document.getElementById("qty");
  if (input) input.focus();
}

function refreshAllData() {
  loadDashboard();
  loadProducts();
  loadProductOptions();
  loadTransactions();
}

globalThis.addEventListener("resize", () => {
  if (latestTransactions.length) {
    drawOverviewChart(latestTransactions);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("loginTab")) {
    setAuthMode("login");
  }
});