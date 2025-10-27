import { getDatabase } from '../database/db';
import { queries } from '../database/queries';
import { startOfToday, startOfWeek, startOfMonth, toISODate } from '../utils/date';

export async function getSalesSummary(range = 'daily', options = {}, db) {
  const database = db ?? (await getDatabase());
  const { startDate, endDate } = resolveRange(range, options);

  const [totals, paymentBreakdown, categorySales, expenses] = await Promise.all([
    database.getFirstAsync(queries.reports.totalsByRange, [startDate, endDate]),
    database.getAllAsync(queries.reports.paymentBreakdown, [startDate, endDate]),
    database.getAllAsync(queries.reports.categorySales, [startDate, endDate]),
    database.getFirstAsync(queries.reports.expensesByRange, [startDate, endDate]),
  ]);

  const totalPayments = paymentBreakdown.reduce((acc, item) => acc + (item.total ?? 0), 0);
  const totalExpenses = expenses?.total_expenses ?? 0;

  return {
    range: { startDate, endDate },
    totals: {
      revenue: totals?.revenue ?? 0,
      creditSales: totals?.credit_sales ?? 0,
      invoices: totals?.invoices ?? 0,
      netRevenue: totalPayments,
    },
    categorySales,
    paymentBreakdown,
    totalExpenses,
    netProfit: (totals?.revenue ?? 0) - totalExpenses,
  };
}

export async function getTopSellingProducts(limit = 5, range = 'monthly', options = {}, db) {
  const database = db ?? (await getDatabase());
  const { startDate, endDate } = resolveRange(range, options);

  return database.getAllAsync(
    `SELECT p.id, p.name, SUM(si.quantity) AS total_quantity, SUM(si.total_price) AS total_sales
     FROM sale_items si
     JOIN products p ON p.id = si.product_id
     JOIN sales s ON s.id = si.sale_id
     WHERE DATE(s.sale_date) BETWEEN DATE(?) AND DATE(?)
     GROUP BY p.id
     ORDER BY total_sales DESC
     LIMIT ?`,
    [startDate, endDate, limit]
  );
}

export async function getCustomerCreditSummary(db) {
  const database = db ?? (await getDatabase());
  return database.getAllAsync(
    `SELECT 
        c.id,
        c.name,
        c.phone,
        COALESCE(SUM(s.total_amount), 0) AS total_sales,
        COALESCE(SUM(p.amount), 0) AS total_paid,
        COALESCE(SUM(s.total_amount), 0) - COALESCE(SUM(p.amount), 0) AS balance
     FROM customers c
     LEFT JOIN sales s ON s.customer_id = c.id
     LEFT JOIN payments p ON p.customer_id = c.id
     GROUP BY c.id
     HAVING balance > 0
     ORDER BY balance DESC`
  );
}

export async function getExpenseSummary(range = 'monthly', options = {}, db) {
  const database = db ?? (await getDatabase());
  const { startDate, endDate } = resolveRange(range, options);

  return database.getAllAsync(
    `SELECT 
        category,
        SUM(amount) AS total,
        COUNT(*) AS entries
     FROM expenses
     WHERE DATE(expense_date) BETWEEN DATE(?) AND DATE(?)
     GROUP BY category
     ORDER BY total DESC`,
    [startDate, endDate]
  );
}

function resolveRange(range, options) {
  if (range === 'custom') {
    return {
      startDate: toISODate(options.startDate),
      endDate: toISODate(options.endDate),
    };
  }

  switch (range) {
    case 'weekly':
      return { startDate: startOfWeek(), endDate: toISODate(new Date()) };
    case 'monthly':
      return { startDate: startOfMonth(), endDate: toISODate(new Date()) };
    case 'daily':
    default:
      return { startDate: startOfToday(), endDate: toISODate(new Date()) };
  }
}

