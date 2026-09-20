import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'ledger-secret-key-change-in-production';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'ledger.db');

app.use(cors());
app.use(express.json());

// ============ DATABASE SETUP (sql.js) ============

let db;

async function loadDatabase() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  initSchema();
}

function saveDatabase() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function run(sql, params = []) {
  db.run(sql, params);
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'cash',
      initial_balance REAL DEFAULT 0,
      icon TEXT DEFAULT 'wallet',
      balance REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      icon TEXT DEFAULT 'tag',
      color TEXT DEFAULT '#6c757d',
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT,
      account_id TEXT,
      description TEXT,
      tags TEXT,
      date TEXT NOT NULL,
      is_transfer INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT,
      amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      start_date TEXT NOT NULL,
      end_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
  `);
}

// Default categories
const defaultCategories = [
  { name: '餐饮', type: 'expense', icon: '🍜', color: '#ff6b6b' },
  { name: '交通', type: 'expense', icon: '🚗', color: '#ffa94d' },
  { name: '购物', type: 'expense', icon: '🛒', color: '#845ef7' },
  { name: '住房', type: 'expense', icon: '🏠', color: '#339af0' },
  { name: '娱乐', type: 'expense', icon: '🎮', color: '#f06595' },
  { name: '医疗', type: 'expense', icon: '💊', color: '#20c997' },
  { name: '教育', type: 'expense', icon: '📚', color: '#7952b3' },
  { name: '通讯', type: 'expense', icon: '📱', color: '#4dabf7' },
  { name: '工资', type: 'income', icon: '💰', color: '#51cf66' },
  { name: '奖金', type: 'income', icon: '🎁', color: '#94d82d' },
  { name: '投资', type: 'income', icon: '📈', color: '#12b886' },
  { name: '其他收入', type: 'income', icon: '💵', color: '#63e6be' },
  { name: '其他支出', type: 'expense', icon: '📦', color: '#adb5bd' },
];

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ============ AUTH ROUTES ============

app.post('/api/auth/register', (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = queryGet('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const userId = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  run('INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)', [userId, email, username, passwordHash]);

  const insertCat = (id, uid, name, type, icon, color) =>
    run('INSERT INTO categories (id, user_id, name, type, icon, color, is_default) VALUES (?, ?, ?, ?, ?, ?, 1)', [id, uid, name, type, icon, color]);

  for (const cat of defaultCategories) {
    insertCat(uuidv4(), userId, cat.name, cat.type, cat.icon, cat.color);
  }

  run('INSERT INTO accounts (id, user_id, name, type, initial_balance, icon, balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, '现金', 'cash', 0, '💵', 0]);

  saveDatabase();
  const token = jwt.sign({ id: userId, email, username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: userId, email, username } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = queryGet('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = queryGet('SELECT id, email, username, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ============ TRANSACTION ROUTES ============

const TX_SELECT = `
  SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
         a.name as account_name, a.icon as account_icon
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN accounts a ON t.account_id = a.id
`;

app.get('/api/transactions', authMiddleware, (req, res) => {
  const { type, category_id, account_id, date_from, date_to, search, page, limit } = req.query;
  const perPage = Math.min(parseInt(limit) || 50, 200);
  const offset = (Math.max(parseInt(page) || 1, 1) - 1) * perPage;

  let where = 'WHERE t.user_id = ?';
  const params = [req.user.id];

  if (type) { where += ' AND t.type = ?'; params.push(type); }
  if (category_id) { where += ' AND t.category_id = ?'; params.push(category_id); }
  if (account_id) { where += ' AND t.account_id = ?'; params.push(account_id); }
  if (date_from) { where += ' AND t.date >= ?'; params.push(date_from); }
  if (date_to) { where += ' AND t.date <= ?'; params.push(date_to); }
  if (search) { where += ' AND (t.description LIKE ? OR t.tags LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  const total = queryGet(`SELECT COUNT(*) as total FROM transactions t ${where}`, params).total;

  const items = queryAll(
    `${TX_SELECT} ${where} ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  res.json({ items, total, page: parseInt(page) || 1, limit: perPage, totalPages: Math.ceil(total / perPage) });
});

app.post('/api/transactions', authMiddleware, (req, res) => {
  const { type, amount, category_id, account_id, description, tags, date } = req.body;
  if (!type || amount === undefined || !date) {
    return res.status(400).json({ error: 'Type, amount and date are required' });
  }

  const id = uuidv4();
  const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : (tags || '');
  run('INSERT INTO transactions (id, user_id, type, amount, category_id, account_id, description, tags, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, type, amount, category_id || null, account_id || null, description || '', tagsStr, date]);

  if (account_id) {
    const delta = type === 'expense' ? -amount : amount;
    run("UPDATE accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
      [delta, account_id, req.user.id]);
  }

  saveDatabase();
  const transaction = queryGet(`${TX_SELECT} WHERE t.id = ?`, [id]);
  res.status(201).json(transaction);
});

app.put('/api/transactions/:id', authMiddleware, (req, res) => {
  const existing = queryGet('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  const { type, amount, category_id, account_id, description, tags, date } = req.body;

  if (existing.account_id) {
    const oldDelta = existing.type === 'expense' ? -existing.amount : existing.amount;
    run("UPDATE accounts SET balance = balance - ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
      [oldDelta, existing.account_id, req.user.id]);
  }

  const newType = type || existing.type;
  const newAmount = amount !== undefined ? amount : existing.amount;
  const newAccountId = account_id !== undefined ? account_id : existing.account_id;
  const newTags = tags ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) : (existing.tags || '');

  run("UPDATE transactions SET type=?, amount=?, category_id=?, account_id=?, description=?, tags=?, date=?, updated_at=datetime('now') WHERE id=? AND user_id=?",
    [newType, newAmount, category_id ?? existing.category_id, newAccountId ?? null, description ?? existing.description, newTags, date ?? existing.date, req.params.id, req.user.id]);

  if (newAccountId) {
    const newDelta = newType === 'expense' ? -newAmount : newAmount;
    run("UPDATE accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
      [newDelta, newAccountId, req.user.id]);
  }

  saveDatabase();
  const transaction = queryGet(`${TX_SELECT} WHERE t.id = ?`, [req.params.id]);
  res.json(transaction);
});

app.delete('/api/transactions/:id', authMiddleware, (req, res) => {
  const existing = queryGet('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  if (existing.account_id) {
    const oldDelta = existing.type === 'expense' ? -existing.amount : existing.amount;
    run("UPDATE accounts SET balance = balance - ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
      [oldDelta, existing.account_id, req.user.id]);
  }

  run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  saveDatabase();
  res.json({ success: true });
});

// ============ ACCOUNT ROUTES ============

app.get('/api/accounts', authMiddleware, (req, res) => {
  const accounts = queryAll('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at', [req.user.id]);
  res.json(accounts);
});

app.post('/api/accounts', authMiddleware, (req, res) => {
  const { name, type, initial_balance, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = uuidv4();
  run('INSERT INTO accounts (id, user_id, name, type, initial_balance, icon, balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, name, type || 'cash', initial_balance || 0, icon || '🏦', initial_balance || 0]);
  saveDatabase();
  const account = queryGet('SELECT * FROM accounts WHERE id = ?', [id]);
  res.status(201).json(account);
});

app.put('/api/accounts/:id', authMiddleware, (req, res) => {
  const existing = queryGet('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Account not found' });

  const { name, type, icon, balance } = req.body;
  run("UPDATE accounts SET name=?, type=?, icon=?, balance=?, updated_at=datetime('now') WHERE id=? AND user_id=?",
    [name ?? existing.name, type ?? existing.type, icon ?? existing.icon, balance ?? existing.balance, req.params.id, req.user.id]);
  saveDatabase();
  const account = queryGet('SELECT * FROM accounts WHERE id = ?', [req.params.id]);
  res.json(account);
});

app.delete('/api/accounts/:id', authMiddleware, (req, res) => {
  const hasTransactions = queryGet('SELECT COUNT(*) as c FROM transactions WHERE account_id = ? AND user_id = ?', [req.params.id, req.user.id]).c;
  if (hasTransactions > 0) {
    return res.status(400).json({ error: 'Cannot delete account with transactions' });
  }
  run('DELETE FROM accounts WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  saveDatabase();
  res.json({ success: true });
});

// ============ CATEGORY ROUTES ============

app.get('/api/categories', authMiddleware, (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM categories WHERE user_id = ?';
  const params = [req.user.id];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY is_default DESC, name';
  const categories = queryAll(sql, params);
  res.json(categories);
});

app.post('/api/categories', authMiddleware, (req, res) => {
  const { name, type, icon, color } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
  const id = uuidv4();
  run('INSERT INTO categories (id, user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user.id, name, type, icon || '🏷️', color || '#6c757d']);
  saveDatabase();
  const category = queryGet('SELECT * FROM categories WHERE id = ?', [id]);
  res.status(201).json(category);
});

app.put('/api/categories/:id', authMiddleware, (req, res) => {
  const existing = queryGet('SELECT * FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Category not found' });
  const { name, icon, color } = req.body;
  run('UPDATE categories SET name=?, icon=?, color=? WHERE id=? AND user_id=?',
    [name ?? existing.name, icon ?? existing.icon, color ?? existing.color, req.params.id, req.user.id]);
  saveDatabase();
  const category = queryGet('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  res.json(category);
});

app.delete('/api/categories/:id', authMiddleware, (req, res) => {
  const cat = queryGet('SELECT is_default FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  if (cat.is_default) return res.status(400).json({ error: 'Cannot delete default category' });
  run('UPDATE transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  run('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  saveDatabase();
  res.json({ success: true });
});

// ============ BUDGET ROUTES ============

app.get('/api/budgets', authMiddleware, (req, res) => {
  const { start_date, end_date } = req.query;
  let sql = 'SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.user_id = ?';
  const params = [req.user.id];
  if (start_date && end_date) {
    sql += ' AND b.start_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  sql += ' ORDER BY b.start_date DESC';
  const budgets = queryAll(sql, params);
  res.json(budgets);
});

app.post('/api/budgets', authMiddleware, (req, res) => {
  const { category_id, amount, period, start_date, end_date } = req.body;
  if (!amount || !start_date) return res.status(400).json({ error: 'Amount and start_date are required' });
  const id = uuidv4();
  run('INSERT INTO budgets (id, user_id, category_id, amount, period, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.user.id, category_id || null, amount, period || 'monthly', start_date, end_date || null]);
  saveDatabase();
  const budget = queryGet('SELECT * FROM budgets WHERE id = ?', [id]);
  res.status(201).json(budget);
});

app.put('/api/budgets/:id', authMiddleware, (req, res) => {
  const existing = queryGet('SELECT * FROM budgets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!existing) return res.status(404).json({ error: 'Budget not found' });
  const { category_id, amount, period, start_date, end_date } = req.body;
  run('UPDATE budgets SET category_id=?, amount=?, period=?, start_date=?, end_date=? WHERE id=? AND user_id=?',
    [category_id ?? existing.category_id, amount ?? existing.amount, period ?? existing.period, start_date ?? existing.start_date, end_date ?? existing.end_date, req.params.id, req.user.id]);
  saveDatabase();
  const budget = queryGet('SELECT * FROM budgets WHERE id = ?', [req.params.id]);
  res.json(budget);
});

app.delete('/api/budgets/:id', authMiddleware, (req, res) => {
  run('DELETE FROM budgets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  saveDatabase();
  res.json({ success: true });
});

// ============ TRANSFER ROUTES ============

app.post('/api/transfers', authMiddleware, (req, res) => {
  const { from_account_id, to_account_id, amount, description, date } = req.body;
  if (!from_account_id || !to_account_id || !amount || !date) {
    return res.status(400).json({ error: 'from_account_id, to_account_id, amount and date are required' });
  }

  const fromAcc = queryGet('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [from_account_id, req.user.id]);
  const toAcc = queryGet('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [to_account_id, req.user.id]);
  if (!fromAcc || !toAcc) return res.status(400).json({ error: 'Invalid accounts' });
  if (fromAcc.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

  run('UPDATE accounts SET balance = balance - ?, updated_at = datetime(\'now\') WHERE id = ?', [amount, from_account_id]);
  run('UPDATE accounts SET balance = balance + ?, updated_at = datetime(\'now\') WHERE id = ?', [amount, to_account_id]);

  const desc = description || `${fromAcc.name} → ${toAcc.name}`;
  run('INSERT INTO transactions (id, user_id, type, amount, account_id, description, date, is_transfer) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [uuidv4(), req.user.id, 'expense', amount, from_account_id, `转账: ${desc}`, date]);
  run('INSERT INTO transactions (id, user_id, type, amount, account_id, description, date, is_transfer) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [uuidv4(), req.user.id, 'income', amount, to_account_id, `转账: ${desc}`, date]);

  saveDatabase();
  res.status(201).json({ success: true });
});

// ============ STATS ROUTES ============

app.get('/api/stats/summary', authMiddleware, (req, res) => {
  const { month } = req.query;
  const now = new Date();
  const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [year, mon] = currentMonth.split('-');
  const dateFrom = `${year}-${mon}-01`;
  const dateTo = `${year}-${mon}-31`;

  const income = queryGet("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?", [req.user.id, dateFrom, dateTo]).total;
  const expense = queryGet("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?", [req.user.id, dateFrom, dateTo]).total;

  const accounts = queryAll('SELECT * FROM accounts WHERE user_id = ?', [req.user.id]);
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  res.json({
    month: currentMonth,
    income,
    expense,
    net: income - expense,
    totalBalance,
    accounts: accounts.map(a => ({ id: a.id, name: a.name, icon: a.icon, balance: a.balance }))
  });
});

app.get('/api/stats/by-category', authMiddleware, (req, res) => {
  const { month, type } = req.query;
  const now = new Date();
  const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [year, mon] = currentMonth.split('-');
  const dateFrom = `${year}-${mon}-01`;
  const dateTo = `${year}-${mon}-31`;
  const t = type || 'expense';

  const results = queryAll(`
    SELECT c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total, COUNT(t.id) as count
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND t.type = ? AND t.date >= ? AND t.date <= ? AND COALESCE(t.is_transfer, 0) != 1
    GROUP BY c.name, c.icon, c.color
    ORDER BY total DESC
  `, [req.user.id, t, dateFrom, dateTo]);

  res.json(results);
});

app.get('/api/stats/by-month', authMiddleware, (req, res) => {
  const { years } = req.query;
  const n = Math.min(parseInt(years) || 12, 36);
  const now = new Date();

  const results = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const nextM = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}`;

    const income = queryGet("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND date >= ? AND date < ? AND COALESCE(is_transfer, 0) != 1",
      [req.user.id, `${m}-01`, `${nextM}-01`]).total;
    const expense = queryGet("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date >= ? AND date < ? AND COALESCE(is_transfer, 0) != 1",
      [req.user.id, `${m}-01`, `${nextM}-01`]).total;

    results.push({ month: m, income, expense, net: income - expense });
  }

  res.json(results);
});

app.get('/api/stats/budget-progress', authMiddleware, (req, res) => {
  const { month } = req.query;
  const now = new Date();
  const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [year, mon] = currentMonth.split('-');
  const dateFrom = `${year}-${mon}-01`;
  const dateTo = `${year}-${mon}-31`;

  const budgets = queryAll(`
    SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM budgets b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ? AND b.start_date BETWEEN ? AND ?
  `, [req.user.id, dateFrom, dateTo]);

  const results = budgets.map(b => {
    let spent;
    if (b.category_id) {
      spent = queryGet("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND category_id = ? AND date >= ? AND date <= ? AND COALESCE(is_transfer, 0) != 1",
        [req.user.id, b.category_id, dateFrom, dateTo]).total;
    } else {
      spent = queryGet("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ? AND COALESCE(is_transfer, 0) != 1",
        [req.user.id, dateFrom, dateTo]).total;
    }
    return { ...b, spent, remaining: b.amount - spent, percent: Math.min((spent / b.amount) * 100, 100) };
  });

  res.json(results);
});

// ============ EXPORT ROUTES ============

app.get('/api/export/csv', authMiddleware, (req, res) => {
  const { date_from, date_to, type } = req.query;
  let where = 'WHERE t.user_id = ?';
  const params = [req.user.id];
  if (type) { where += ' AND t.type = ?'; params.push(type); }
  if (date_from) { where += ' AND t.date >= ?'; params.push(date_from); }
  if (date_to) { where += ' AND t.date <= ?'; params.push(date_to); }

  const rows = queryAll(
    `SELECT t.date, t.type, t.amount, c.name as category, a.name as account, t.description, t.tags
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN accounts a ON t.account_id = a.id
     ${where}
     ORDER BY t.date DESC`, params
  );

  const header = '日期,类型,金额,分类,账户,备注,标签';
  const csvRows = rows.map(r =>
    [r.date, r.type === 'income' ? '收入' : '支出', r.amount, r.category || '', r.account || '',
     `"${(r.description || '').replace(/"/g, '""')}"`, r.tags || ''].join(',')
  );

  const csv = '\uFEFF' + [header, ...csvRows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=ledger-export.csv');
  res.send(csv);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
loadDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Ledger API running at http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
