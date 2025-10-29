import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'door_hardware_shop.db';

let cachedDb = null;

export async function getDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  cachedDb = db;
  return db;
}

export function registerDatabase(db) {
  cachedDb = db;
}

export async function initializeDatabase(db) {
  cachedDb = db;

  const statements = [
    'PRAGMA foreign_keys = ON;',
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      retail_price REAL NOT NULL,
      wholesale_price REAL,
      stock_quantity INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 5,
      image_uri TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      city TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'paid',
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      payment_method TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (sale_id) REFERENCES sales(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      expense_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantity_change INTEGER NOT NULL,
      type TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS user_security (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      pin_hash TEXT,
      last_auth DATETIME,
      lock_enabled INTEGER DEFAULT 0
    );`,
    `INSERT OR IGNORE INTO user_security (id, lock_enabled)
      VALUES (1, 0);`
  ];

  for (const statement of statements) {
    await db.execAsync(statement);
  }
}

export async function resetDatabase() {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS sale_items;
    DROP TABLE IF EXISTS sales;
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS expenses;
    DROP TABLE IF EXISTS stock_history;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS user_security;
  `);
  await initializeDatabase(db);
}
