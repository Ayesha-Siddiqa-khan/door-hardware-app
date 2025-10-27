import { getDatabase } from '../database/db';
import { EXPENSE_CATEGORIES } from '../constants/categories';

const INSERT_EXPENSE_SQL = `INSERT INTO expenses (category, amount, description, expense_date)
  VALUES (?, ?, ?, ?)`;

export async function fetchExpenses(range = 'monthly', options = {}, db) {
  const database = db ?? (await getDatabase());
  let query = 'SELECT * FROM expenses ORDER BY expense_date DESC';
  let params = [];

  if (range === 'custom' && options.startDate && options.endDate) {
    query = `SELECT * FROM expenses
      WHERE DATE(expense_date) BETWEEN DATE(?) AND DATE(?)
      ORDER BY expense_date DESC`;
    params = [options.startDate, options.endDate];
  }

  return database.getAllAsync(query, params);
}

export async function createExpense(expense, db) {
  const database = db ?? (await getDatabase());
  const values = [
    expense.category,
    Number(expense.amount),
    expense.description ?? '',
    expense.expense_date ?? new Date().toISOString(),
  ];
  const result = await database.runAsync(INSERT_EXPENSE_SQL, values);
  return result.lastInsertRowId;
}

export async function deleteExpense(id, db) {
  const database = db ?? (await getDatabase());
  await database.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

export function getExpenseCategories() {
  return EXPENSE_CATEGORIES;
}
