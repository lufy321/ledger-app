const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'ledger_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

export async function api(path, { method = 'GET', body, raw } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('未登录');
  }

  if (!res.ok) {
    let msg;
    try {
      msg = (await res.json()).error;
    } catch {
      msg = `请求失败 (${res.status})`;
    }
    throw new Error(msg);
  }

  if (raw || path.startsWith('/export/')) {
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // 若响应未带 UTF-8 BOM（旧版后端），补上 BOM，保证 Excel 识别为 UTF-8
    if (bytes[0] !== 0xEF || bytes[1] !== 0xBB || bytes[2] !== 0xBF) {
      const withBom = new Uint8Array(bytes.length + 3);
      withBom.set([0xEF, 0xBB, 0xBF], 0);
      withBom.set(bytes, 3);
      return new TextDecoder('utf-8').decode(withBom);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }
  return res.status === 204 ? null : res.json();
}

// ---- Auth ----
export const authApi = {
  register: (data) => api('/auth/register', { method: 'POST', body: data }),
  login: (data) => api('/auth/login', { method: 'POST', body: data }),
  me: () => api('/auth/me'),
  logout: () => setToken(null),
};

// ---- Transactions ----
export const txApi = {
  list: (params = {}) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    return api(`/transactions${qs ? `?${qs}` : ''}`);
  },
  create: (data) => api('/transactions', { method: 'POST', body: data }),
  update: (id, data) => api(`/transactions/${id}`, { method: 'PUT', body: data }),
  remove: (id) => api(`/transactions/${id}`, { method: 'DELETE' }),
  transfer: (data) => api('/transfers', { method: 'POST', body: data }),
};

// ---- Accounts ----
export const accountApi = {
  list: () => api('/accounts'),
  create: (data) => api('/accounts', { method: 'POST', body: data }),
  update: (id, data) => api(`/accounts/${id}`, { method: 'PUT', body: data }),
  remove: (id) => api(`/accounts/${id}`, { method: 'DELETE' }),
};

// ---- Categories ----
export const categoryApi = {
  list: (type) => api(type ? `/categories?type=${type}` : '/categories'),
  create: (data) => api('/categories', { method: 'POST', body: data }),
  update: (id, data) => api(`/categories/${id}`, { method: 'PUT', body: data }),
  remove: (id) => api(`/categories/${id}`, { method: 'DELETE' }),
};

// ---- Budgets ----
export const budgetApi = {
  list: (params = {}) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return api(`/budgets${qs ? `?${qs}` : ''}`);
  },
  create: (data) => api('/budgets', { method: 'POST', body: data }),
  update: (id, data) => api(`/budgets/${id}`, { method: 'PUT', body: data }),
  remove: (id) => api(`/budgets/${id}`, { method: 'DELETE' }),
};

// ---- Stats ----
export const statsApi = {
  summary: (month) => api(month ? `/stats/summary?month=${month}` : '/stats/summary'),
  byCategory: (month, type = 'expense') => api(`/stats/by-category?month=${month}&type=${type}`),
  byMonth: (years = 12) => api(`/stats/by-month?years=${years}`),
  budgetProgress: (month) => api(month ? `/stats/budget-progress?month=${month}` : '/stats/budget-progress'),
};

// ---- Export ----
export async function downloadCsv(params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  const path = `/export/csv${qs ? `?${qs}` : ''}`;
  const res = await api(path, { method: 'GET' });
  const blob = new Blob([res], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Import ----
export async function importCsv(file) {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  // 注意：不要手动设置 multipart/form-data，浏览器需自动生成 boundary
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/import/csv`, { method: 'POST', headers, body: form });
  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('未登录');
  }
  if (!res.ok) {
    let msg;
    try { msg = (await res.json()).error; } catch { msg = `导入失败 (${res.status})`; }
    throw new Error(msg);
  }
  return res.json();
}

// ---- OCR ----
export async function recognizeImage(file) {
  const token = getToken();
  const form = new FormData();
  form.append('image', file);
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/ocr`, { method: 'POST', headers, body: form });
  if (!res.ok) {
    let msg;
    try { msg = (await res.json()).error; } catch { msg = `识别失败 (${res.status})`; }
    throw new Error(msg);
  }
  return res.json();
}

// ---- Helpers ----
export function fmtMoney(n) {
  const s = Number(n) || 0;
  const sign = s < 0 ? '-' : '';
  return `${sign}¥${Math.abs(s).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
