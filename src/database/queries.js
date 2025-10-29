export function buildInsert(table, fields) {
  const columns = fields.join(', ');
  const placeholders = fields.map(() => '?').join(', ');
  return `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
}

export function buildUpdate(table, fields, where = 'id = ?') {
  const assignments = fields.map((field) => `${field} = ?`).join(', ');
  return `UPDATE ${table} SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE ${where}`;
}

export const queries = {
  products: {
    all: 'SELECT * FROM products ORDER BY created_at DESC',
    byId: 'SELECT * FROM products WHERE id = ?',
    lowStock: 'SELECT * FROM products WHERE stock_quantity <= min_stock_level ORDER BY stock_quantity ASC',
    stockMovement:
      'SELECT sh.*, p.name AS product_name FROM stock_history sh JOIN products p ON p.id = sh.product_id ORDER BY sh.created_at DESC LIMIT 50',
  },
  customers: {
    all: 'SELECT * FROM customers ORDER BY name ASC',
    byId: 'SELECT * FROM customers WHERE id = ?',
    search: 'SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name ASC',
    outstanding:
      `SELECT c.*, COALESCE(SUM(s.total_amount),0) AS total_sales,
              COALESCE(SUM(p.amount),0) AS total_paid,
              COALESCE(SUM(s.total_amount),0) - COALESCE(SUM(p.amount),0) AS balance
       FROM customers c
       LEFT JOIN sales s ON s.customer_id = c.id
       LEFT JOIN payments p ON p.customer_id = c.id
       GROUP BY c.id
       HAVING balance > 0
       ORDER BY balance DESC`,
  },
  sales: {
    list:
      `SELECT s.*, c.name AS customer_name
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.sale_date DESC`,
    byId:
      `SELECT s.*, c.name AS customer_name, c.phone AS customer_phone
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.id = ?`,
    items:
      `SELECT si.*, p.name AS product_name
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
    payments: 'SELECT * FROM payments WHERE sale_id = ? ORDER BY payment_date DESC',
  },
  reports: {
    totalsByRange:
      `SELECT
          SUM(total_amount) AS revenue,
          SUM(CASE WHEN payment_method = 'credit' THEN total_amount ELSE 0 END) AS credit_sales,
          COUNT(*) AS invoices
       FROM sales
       WHERE DATE(sale_date) BETWEEN DATE(?) AND DATE(?)`,
    paymentBreakdown:
      `SELECT payment_method, COUNT(*) AS count, SUM(total_amount) AS total
       FROM sales
       WHERE DATE(sale_date) BETWEEN DATE(?) AND DATE(?)
       GROUP BY payment_method`,
    categorySales:
      `SELECT p.category, SUM(si.total_price) AS total, SUM(si.quantity) AS quantity
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN sales s ON s.id = si.sale_id
       WHERE DATE(s.sale_date) BETWEEN DATE(?) AND DATE(?)
       GROUP BY p.category`,
    expensesByRange:
      `SELECT SUM(amount) AS total_expenses
       FROM expenses
       WHERE DATE(expense_date) BETWEEN DATE(?) AND DATE(?)`,
  },
};
