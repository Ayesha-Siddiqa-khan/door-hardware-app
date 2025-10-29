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

  await seedDemoData(db);
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

async function seedDemoData(db) {
  const [productCountRow, customerCountRow, saleCountRow, expenseCountRow] = await Promise.all([
    db.getFirstAsync('SELECT COUNT(*) AS count FROM products'),
    db.getFirstAsync('SELECT COUNT(*) AS count FROM customers'),
    db.getFirstAsync('SELECT COUNT(*) AS count FROM sales'),
    db.getFirstAsync('SELECT COUNT(*) AS count FROM expenses'),
  ]);

  const productCount = Number(productCountRow?.count ?? 0);
  const customerCount = Number(customerCountRow?.count ?? 0);
  const saleCount = Number(saleCountRow?.count ?? 0);
  const expenseCount = Number(expenseCountRow?.count ?? 0);

  const seededProducts = [];
  const seededCustomers = [];

  if (productCount === 0) {
    const productSeeds = [
      {
        name: 'Premium Oak Door',
        category: 'doors',
        description: 'Solid oak door with matte finish and sound insulation.',
        retail_price: 38000,
        wholesale_price: 34000,
        stock_quantity: 8,
        min_stock_level: 2,
      },
      {
        name: 'Stainless Steel Handle Set',
        category: 'hardware',
        description: 'Pair of heavy-duty stainless steel handles with screws.',
        retail_price: 5200,
        wholesale_price: 4600,
        stock_quantity: 25,
        min_stock_level: 5,
      },
      {
        name: 'Sliding Wardrobe Kit',
        category: 'wardrobe',
        description: 'Complete kit with rails, rollers and soft-close accessories.',
        retail_price: 18500,
        wholesale_price: 16500,
        stock_quantity: 12,
        min_stock_level: 3,
      },
      {
        name: 'Kitchen Cabinet Hinge',
        category: 'kitchen',
        description: 'Soft-close concealed hinge for modular kitchen cabinets.',
        retail_price: 650,
        wholesale_price: 520,
        stock_quantity: 60,
        min_stock_level: 10,
      },
    ];

    for (const product of productSeeds) {
      const result = await db.runAsync(
        `INSERT INTO products 
          (name, category, description, retail_price, wholesale_price, stock_quantity, min_stock_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          product.name,
          product.category,
          product.description,
          product.retail_price,
          product.wholesale_price,
          product.stock_quantity,
          product.min_stock_level,
        ]
      );

      const productId = result.lastInsertRowId;
      seededProducts.push({ ...product, id: productId });

      await db.runAsync(
        `INSERT INTO stock_history (product_id, quantity_change, type, notes)
         VALUES (?, ?, 'purchase', ?)`,
        [productId, product.stock_quantity, 'Initial stock load']
      );
    }
  }

  if (customerCount === 0) {
    const customerSeeds = [
      {
        name: 'Al-Noor Builders',
        phone: '+92-321-5556677',
        address: 'Plot 17, Industrial Area',
        city: 'Karachi',
      },
      {
        name: 'Sara Home Interiors',
        phone: '+92-333-7788990',
        address: '26-B, Commercial Market',
        city: 'Lahore',
      },
      {
        name: 'Bright Future Developers',
        phone: '+92-345-1122334',
        address: 'Suite 5, Business Avenue',
        city: 'Islamabad',
      },
    ];

    for (const customer of customerSeeds) {
      const result = await db.runAsync(
        `INSERT INTO customers (name, phone, address, city)
         VALUES (?, ?, ?, ?)`,
        [customer.name, customer.phone, customer.address, customer.city]
      );

      seededCustomers.push({ ...customer, id: result.lastInsertRowId });
    }
  } else {
    // If customers already exist, reuse a couple for demo sales.
    const existingCustomers = await db.getAllAsync('SELECT * FROM customers LIMIT 2');
    seededCustomers.push(...existingCustomers);
  }

  if (expenseCount === 0) {
    const expenseSeeds = [
      {
        category: 'Logistics',
        amount: 7500,
        description: 'Freight charges for incoming stock',
        expense_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        category: 'Utilities',
        amount: 4200,
        description: 'Monthly electricity bill for showroom',
        expense_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        category: 'Staff',
        amount: 15000,
        description: 'Carpenter contract services',
        expense_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    for (const expense of expenseSeeds) {
      await db.runAsync(
        `INSERT INTO expenses (category, amount, description, expense_date)
         VALUES (?, ?, ?, ?)`,
        [expense.category, expense.amount, expense.description, expense.expense_date]
      );
    }
  }

  if (saleCount === 0 && seededProducts.length >= 3) {
    const [customerA = null, customerB = null] = seededCustomers;
    const today = new Date();
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    const saleOne = await db.runAsync(
      `INSERT INTO sales (invoice_number, customer_id, total_amount, payment_method, payment_status, sale_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'INV-1001',
        customerA ? customerA.id : null,
        38000 + 2 * 5200,
        'cash',
        'paid',
        today.toISOString(),
        'Walk-in customer purchased door set and handles.',
      ]
    );

    const saleOneId = saleOne.lastInsertRowId;

    const saleOneItems = [
      { product: seededProducts[0], quantity: 1, unit_price: seededProducts[0].retail_price },
      { product: seededProducts[1], quantity: 2, unit_price: seededProducts[1].retail_price },
    ];

    for (const item of saleOneItems) {
      await db.runAsync(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [
          saleOneId,
          item.product.id,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price,
        ]
      );

      await db.runAsync(
        `UPDATE products 
           SET stock_quantity = stock_quantity - ?, 
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [item.quantity, item.product.id]
      );

      await db.runAsync(
        `INSERT INTO stock_history (product_id, quantity_change, type, notes)
         VALUES (?, ?, 'sale', ?)`,
        [item.product.id, -item.quantity, `Sale #INV-1001`]
      );
    }

    await db.runAsync(
      `INSERT INTO payments (sale_id, customer_id, amount, payment_date, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        saleOneId,
        customerA ? customerA.id : null,
        saleOneItems.reduce((total, item) => total + item.quantity * item.unit_price, 0),
        today.toISOString(),
        'cash',
        'Paid in full at counter',
      ]
    );

    const saleTwo = await db.runAsync(
      `INSERT INTO sales (invoice_number, customer_id, total_amount, payment_method, payment_status, sale_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'INV-1002',
        customerB ? customerB.id : null,
        seededProducts[2].retail_price + 10 * seededProducts[3].retail_price,
        'credit',
        'partial',
        yesterday.toISOString(),
        'Project supply with partial advance.',
      ]
    );

    const saleTwoId = saleTwo.lastInsertRowId;

    const saleTwoItems = [
      { product: seededProducts[2], quantity: 1, unit_price: seededProducts[2].retail_price },
      { product: seededProducts[3], quantity: 10, unit_price: seededProducts[3].retail_price },
    ];

    for (const item of saleTwoItems) {
      await db.runAsync(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [
          saleTwoId,
          item.product.id,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price,
        ]
      );

      await db.runAsync(
        `UPDATE products 
           SET stock_quantity = stock_quantity - ?, 
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [item.quantity, item.product.id]
      );

      await db.runAsync(
        `INSERT INTO stock_history (product_id, quantity_change, type, notes)
         VALUES (?, ?, 'sale', ?)`,
        [item.product.id, -item.quantity, `Sale #INV-1002`]
      );
    }

    const partialPaymentAmount = seededProducts[2].retail_price * 0.4;

    await db.runAsync(
      `INSERT INTO payments (sale_id, customer_id, amount, payment_date, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        saleTwoId,
        customerB ? customerB.id : null,
        partialPaymentAmount,
        yesterday.toISOString(),
        'upi',
        'Advance transfer received',
      ]
    );
  }
}
