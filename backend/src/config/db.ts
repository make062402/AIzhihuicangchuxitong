import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync } from 'fs'
import bcrypt from 'bcryptjs'

const dataDir = join(process.cwd(), 'data')
mkdirSync(dataDir, { recursive: true })

export const db = new Database(join(dataDir, 'wms.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('admin','operator')),
  display_name TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target TEXT NOT NULL,
  channel TEXT NOT NULL CHECK(channel IN ('email','sms')),
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT DEFAULT '件',
  category TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  zone TEXT,
  capacity INTEGER DEFAULT 1000,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS inbound_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  inbound_date TEXT NOT NULL,
  item_id INTEGER NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL,
  location_id INTEGER NOT NULL REFERENCES locations(id),
  remaining_qty INTEGER NOT NULL,
  operator_id INTEGER REFERENCES users(id),
  remark TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS outbound_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  destination TEXT NOT NULL,
  outbound_date TEXT NOT NULL,
  item_id INTEGER NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL,
  storage_fee REAL DEFAULT 0,
  manual_fee REAL DEFAULT 0,
  total_fee REAL DEFAULT 0,
  operator_id INTEGER REFERENCES users(id),
  remark TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS outbound_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outbound_id INTEGER NOT NULL REFERENCES outbound_records(id) ON DELETE CASCADE,
  inbound_id INTEGER NOT NULL REFERENCES inbound_records(id),
  quantity INTEGER NOT NULL,
  days_stored INTEGER NOT NULL,
  price_per_day REAL NOT NULL,
  fee REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  item_id INTEGER REFERENCES items(id),
  location_id INTEGER REFERENCES locations(id),
  start_date TEXT,
  end_date TEXT,
  price_per_day REAL NOT NULL,
  min_days INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  priority_level TEXT DEFAULT 'MEDIUM' CHECK(priority_level IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  username TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  detail TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource);

CREATE TABLE IF NOT EXISTS stock_thresholds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
  low_threshold INTEGER DEFAULT 50,
  high_threshold INTEGER DEFAULT 2000,
  aging_days INTEGER DEFAULT 60,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS fee_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outbound_id INTEGER NOT NULL REFERENCES outbound_records(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL CHECK(fee_type IN ('storage','labor','extra')),
  description TEXT,
  amount REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_inbound_item ON inbound_records(item_id, remaining_qty);
CREATE INDEX IF NOT EXISTS idx_outbound_date ON outbound_records(outbound_date);
CREATE INDEX IF NOT EXISTS idx_fee_outbound ON fee_details(outbound_id);
`

db.exec(schema)

// Lightweight migrations for existing databases
try {
  const cols = db.prepare(`PRAGMA table_info(billing_rules)`).all() as { name: string }[]
  if (!cols.find((c) => c.name === 'priority_level')) {
    db.exec(
      `ALTER TABLE billing_rules ADD COLUMN priority_level TEXT DEFAULT 'MEDIUM'`
    )
    // Map legacy numeric priority -> level
    db.exec(`UPDATE billing_rules SET priority_level = CASE
      WHEN priority >= 100 THEN 'CRITICAL'
      WHEN priority >= 10 THEN 'HIGH'
      WHEN priority >= 1 THEN 'MEDIUM'
      ELSE 'LOW' END`)
  }
} catch (e) {
  console.warn('billing_rules migration skipped:', e)
}

// Seed default data
function seed() {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
  if (userCount === 0) {
    const pw = bcrypt.hashSync('admin123', 10)
    const pw2 = bcrypt.hashSync('operator123', 10)
    db.prepare(
      `INSERT INTO users (username, password_hash, email, phone, role, display_name) VALUES (?,?,?,?,?,?)`
    ).run('admin', pw, 'admin@wms.com', '13800000000', 'admin', '系统管理员')
    db.prepare(
      `INSERT INTO users (username, password_hash, email, phone, role, display_name) VALUES (?,?,?,?,?,?)`
    ).run('operator', pw2, 'operator@wms.com', '13900000000', 'operator', '张操作员')
  }

  const itemCount = (db.prepare('SELECT COUNT(*) as c FROM items').get() as { c: number }).c
  if (itemCount === 0) {
    const items = [
      ['SKU-A001', '不锈钢螺丝 M6', '箱', '五金件'],
      ['SKU-A002', '铝合金型材 3m', '根', '型材'],
      ['SKU-B001', '电子元器件套装', '盒', '电子'],
      ['SKU-B002', '锂电池 18650', '组', '电子'],
      ['SKU-C001', '包装纸箱 大号', '个', '包装'],
      ['SKU-C002', '气泡膜 卷装', '卷', '包装'],
    ]
    const stmt = db.prepare(
      `INSERT INTO items (model_code, name, unit, category) VALUES (?,?,?,?)`
    )
    items.forEach((i) => stmt.run(...i))
  }

  const locCount = (db.prepare('SELECT COUNT(*) as c FROM locations').get() as { c: number }).c
  if (locCount === 0) {
    const locations = [
      ['A-01-01', 'A区', 2000],
      ['A-01-02', 'A区', 2000],
      ['A-02-01', 'A区', 1500],
      ['B-01-01', 'B区', 3000],
      ['B-01-02', 'B区', 3000],
      ['C-01-01', 'C区(冷藏)', 1000],
    ]
    const stmt = db.prepare(`INSERT INTO locations (code, zone, capacity) VALUES (?,?,?)`)
    locations.forEach((l) => stmt.run(...l))
  }

  const ruleCount = (db.prepare('SELECT COUNT(*) as c FROM billing_rules').get() as { c: number }).c
  if (ruleCount === 0) {
    db.prepare(
      `INSERT INTO billing_rules (name, price_per_day, min_days, priority, priority_level, active) VALUES (?,?,?,?,?,?)`
    ).run('通用日租金规则', 0.5, 1, 0, 'LOW', 1)
    db.prepare(
      `INSERT INTO billing_rules (name, item_id, price_per_day, min_days, priority, priority_level, active) VALUES (?,?,?,?,?,?,?)`
    ).run('电子类物品加价', 3, 1.2, 1, 10, 'HIGH', 1)
    db.prepare(
      `INSERT INTO billing_rules (name, location_id, price_per_day, min_days, priority, priority_level, active) VALUES (?,?,?,?,?,?,?)`
    ).run('C区冷藏加价', 6, 2.0, 1, 20, 'CRITICAL', 1)
  }

  const thCount = (db.prepare('SELECT COUNT(*) as c FROM stock_thresholds').get() as { c: number }).c
  if (thCount === 0) {
    // 为所有物品默认设置阈值
    const items = db.prepare('SELECT id FROM items').all() as { id: number }[]
    const stmt = db.prepare(
      `INSERT INTO stock_thresholds (item_id, low_threshold, high_threshold, aging_days) VALUES (?,?,?,?)`
    )
    items.forEach((i) => stmt.run(i.id, 50, 2000, 60))
  }

  const inboundCount = (
    db.prepare('SELECT COUNT(*) as c FROM inbound_records').get() as { c: number }
  ).c
  if (inboundCount === 0) {
    const today = new Date()
    const daysAgo = (n: number) => {
      const d = new Date(today)
      d.setDate(d.getDate() - n)
      return d.toISOString().slice(0, 10)
    }
    const seedInbound = [
      ['华东供应商', daysAgo(30), 1, 500, 1],
      ['华南供应商', daysAgo(25), 2, 200, 2],
      ['深圳电子厂', daysAgo(20), 3, 150, 4],
      ['深圳电子厂', daysAgo(15), 4, 300, 5],
      ['本地包材厂', daysAgo(10), 5, 1000, 3],
      ['本地包材厂', daysAgo(5), 6, 400, 3],
    ]
    const stmt = db.prepare(
      `INSERT INTO inbound_records (source, inbound_date, item_id, quantity, location_id, remaining_qty, operator_id) VALUES (?,?,?,?,?,?,1)`
    )
    seedInbound.forEach((r) => stmt.run(r[0], r[1], r[2], r[3], r[4], r[3]))
  }
}
seed()

export default db
