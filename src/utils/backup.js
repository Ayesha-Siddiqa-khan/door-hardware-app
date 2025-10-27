import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../database/db';

const BACKUP_PREFIX = 'door_hardware_backup';

export async function createBackup() {
  const database = await getDatabase();
  const [products, customers, sales, saleItems, payments, expenses, stockHistory] = await Promise.all([
    database.getAllAsync('SELECT * FROM products'),
    database.getAllAsync('SELECT * FROM customers'),
    database.getAllAsync('SELECT * FROM sales'),
    database.getAllAsync('SELECT * FROM sale_items'),
    database.getAllAsync('SELECT * FROM payments'),
    database.getAllAsync('SELECT * FROM expenses'),
    database.getAllAsync('SELECT * FROM stock_history'),
  ]);

  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    },
    products,
    customers,
    sales,
    saleItems,
    payments,
    expenses,
    stockHistory,
  };

  const fileName = `${BACKUP_PREFIX}_${Date.now()}.json`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, { dialogTitle: 'Share Backup' });
  }

  return fileUri;
}

export async function restoreBackup(fileUri) {
  const content = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const payload = JSON.parse(content);
  if (!payload.products || !payload.customers) {
    throw new Error('Invalid backup file');
  }

  const database = await getDatabase();
  await database.withTransactionAsync(async (tx) => {
    await tx.execAsync(`
      DELETE FROM payments;
      DELETE FROM sale_items;
      DELETE FROM sales;
      DELETE FROM products;
      DELETE FROM customers;
      DELETE FROM expenses;
      DELETE FROM stock_history;
    `);

    for (const product of payload.products) {
      await tx.runAsync(
        `INSERT INTO products 
         (id, name, category, description, retail_price, wholesale_price, stock_quantity, min_stock_level, image_uri, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.name,
          product.category,
          product.description,
          product.retail_price,
          product.wholesale_price,
          product.stock_quantity,
          product.min_stock_level,
          product.image_uri,
          product.created_at,
          product.updated_at,
        ]
      );
    }

    for (const customer of payload.customers) {
      await tx.runAsync(
        `INSERT INTO customers (id, name, phone, address, city, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          customer.id,
          customer.name,
          customer.phone,
          customer.address,
          customer.city,
          customer.created_at,
        ]
      );
    }

    for (const sale of payload.sales || []) {
      await tx.runAsync(
        `INSERT INTO sales (id, invoice_number, customer_id, total_amount, payment_method, payment_status, sale_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sale.id,
          sale.invoice_number,
          sale.customer_id,
          sale.total_amount,
          sale.payment_method,
          sale.payment_status,
          sale.sale_date,
          sale.notes,
        ]
      );
    }

    for (const item of payload.saleItems || []) {
      await tx.runAsync(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.sale_id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.total_price,
        ]
      );
    }

    for (const payment of payload.payments || []) {
      await tx.runAsync(
        `INSERT INTO payments (id, sale_id, customer_id, amount, payment_date, payment_method, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          payment.id,
          payment.sale_id,
          payment.customer_id,
          payment.amount,
          payment.payment_date,
          payment.payment_method,
          payment.notes,
        ]
      );
    }

    for (const expense of payload.expenses || []) {
      await tx.runAsync(
        `INSERT INTO expenses (id, category, amount, description, expense_date)
         VALUES (?, ?, ?, ?, ?)`,
        [
          expense.id,
          expense.category,
          expense.amount,
          expense.description,
          expense.expense_date,
        ]
      );
    }

    for (const history of payload.stockHistory || []) {
      await tx.runAsync(
        `INSERT INTO stock_history (id, product_id, quantity_change, type, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          history.id,
          history.product_id,
          history.quantity_change,
          history.type,
          history.notes,
          history.created_at,
        ]
      );
    }
  });
}
