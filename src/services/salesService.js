import { getDatabase } from '../database/db';
import { buildInsert, queries } from '../database/queries';

const SALE_FIELDS = [
  'invoice_number',
  'customer_id',
  'total_amount',
  'payment_method',
  'payment_status',
  'sale_date',
  'notes',
];

const SALE_ITEM_FIELDS = ['sale_id', 'product_id', 'quantity', 'unit_price', 'total_price'];

const PAYMENT_FIELDS = ['sale_id', 'customer_id', 'amount', 'payment_date', 'payment_method', 'notes'];

const INSERT_SALE_SQL = buildInsert('sales', SALE_FIELDS);
const INSERT_SALE_ITEM_SQL = buildInsert('sale_items', SALE_ITEM_FIELDS);
const INSERT_PAYMENT_SQL = buildInsert('payments', PAYMENT_FIELDS);

export async function fetchSales(db) {
  const database = db ?? (await getDatabase());
  return database.getAllAsync(queries.sales.list);
}

export async function fetchSaleDetail(saleId, db) {
  const database = db ?? (await getDatabase());
  const sale = await database.getFirstAsync(queries.sales.byId, [saleId]);
  if (!sale) {
    return null;
  }
  const items = await database.getAllAsync(queries.sales.items, [saleId]);
  const payments = await database.getAllAsync(queries.sales.payments, [saleId]);
  return { sale, items, payments };
}

export async function fetchSalesByCustomer(customerId, db) {
  const database = db ?? (await getDatabase());
  return database.getAllAsync(
    `SELECT s.*, SUM(si.total_price) AS items_total
     FROM sales s
     LEFT JOIN sale_items si ON si.sale_id = s.id
     WHERE s.customer_id = ?
     GROUP BY s.id
     ORDER BY s.sale_date DESC`,
    [customerId]
  );
}

export async function fetchCustomerPaymentsTotal(customerId, db) {
  const database = db ?? (await getDatabase());
  const result = await database.getFirstAsync(
    `SELECT 
        COALESCE(SUM(amount), 0) AS total_paid
     FROM payments
     WHERE customer_id = ?`,
    [customerId]
  );
  return result?.total_paid ?? 0;
}

export async function createSale({ sale, items, payments = [] }, db) {
  const database = db ?? (await getDatabase());
  let saleId = null;

  await database.withTransactionAsync(async (tx) => {
    const saleValues = SALE_FIELDS.map((field) => valueOrNull(sale[field]));
    const saleResult = await tx.runAsync(INSERT_SALE_SQL, saleValues);
    saleId = saleResult.lastInsertRowId;

    for (const item of items) {
      const itemValues = [
        saleId,
        item.product_id,
        item.quantity,
        item.unit_price,
        item.total_price,
      ];

      await tx.runAsync(INSERT_SALE_ITEM_SQL, itemValues);
      await tx.runAsync(
        `UPDATE products 
           SET stock_quantity = stock_quantity - ?, 
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [item.quantity, item.product_id]
      );

      await tx.runAsync(
        `INSERT INTO stock_history (product_id, quantity_change, type, notes)
         VALUES (?, ?, 'sale', ?)`,
        [item.product_id, -Math.abs(item.quantity), `Sale #${sale.invoice_number}`]
      );
    }

    for (const payment of payments) {
      const paymentValues = PAYMENT_FIELDS.map((field) =>
        field === 'sale_id'
          ? saleId
          : field === 'customer_id'
          ? payment.customer_id ?? sale.customer_id
          : valueOrNull(payment[field])
      );
      await tx.runAsync(INSERT_PAYMENT_SQL, paymentValues);
    }
  });

  return saleId;
}

export async function recordPayment(payment, db) {
  const database = db ?? (await getDatabase());
  const paymentValues = PAYMENT_FIELDS.map((field) => valueOrNull(payment[field]));
  const result = await database.runAsync(INSERT_PAYMENT_SQL, paymentValues);

  if (payment.sale_id) {
    const totals = await database.getFirstAsync(
      `SELECT 
          total_amount,
          (SELECT COALESCE(SUM(amount),0) FROM payments WHERE sale_id = s.id) AS paid
       FROM sales s
       WHERE id = ?`,
      [payment.sale_id]
    );

    if (totals) {
      const status = totals.paid >= totals.total_amount ? 'paid' : 'partial';
      await database.runAsync('UPDATE sales SET payment_status = ? WHERE id = ?', [
        status,
        payment.sale_id,
      ]);
    }
  }

  return result.lastInsertRowId;
}

export async function deleteSale(saleId, db) {
  const database = db ?? (await getDatabase());
  await database.withTransactionAsync(async (tx) => {
    const items = await tx.getAllAsync('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
    for (const item of items) {
      await tx.runAsync(
        `UPDATE products 
           SET stock_quantity = stock_quantity + ?, 
               updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [item.quantity, item.product_id]
      );
      await tx.runAsync(
        `INSERT INTO stock_history (product_id, quantity_change, type, notes)
         VALUES (?, ?, 'adjustment', ?)`,
        [item.product_id, item.quantity, `Sale #${saleId} deleted`]
      );
    }

    await tx.runAsync('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
    await tx.runAsync('DELETE FROM payments WHERE sale_id = ?', [saleId]);
    await tx.runAsync('DELETE FROM sales WHERE id = ?', [saleId]);
  });
}

function valueOrNull(value) {
  return value === undefined || value === null || value === '' ? null : value;
}

