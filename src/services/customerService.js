import { getDatabase } from '../database/db';
import { buildInsert, buildUpdate, queries } from '../database/queries';

const CUSTOMER_FIELDS = ['name', 'phone', 'address', 'city'];

const INSERT_CUSTOMER_SQL = buildInsert('customers', CUSTOMER_FIELDS);
const UPDATE_CUSTOMER_SQL = buildUpdate('customers', CUSTOMER_FIELDS);

export async function fetchCustomers(db) {
  const database = db ?? (await getDatabase());
  return database.getAllAsync(queries.customers.all);
}

export async function fetchCustomerById(id, db) {
  const database = db ?? (await getDatabase());
  return database.getFirstAsync(queries.customers.byId, [id]);
}

export async function searchCustomers(term, db) {
  const database = db ?? (await getDatabase());
  const wildcard = `%${term}%`;
  return database.getAllAsync(queries.customers.search, [wildcard, wildcard]);
}

export async function fetchOutstandingCustomers(db) {
  const database = db ?? (await getDatabase());
  return database.getAllAsync(queries.customers.outstanding);
}

export async function createCustomer(customer, db) {
  const database = db ?? (await getDatabase());
  const values = CUSTOMER_FIELDS.map((field) => customer[field] ?? null);
  const result = await database.runAsync(INSERT_CUSTOMER_SQL, values);
  return result.lastInsertRowId;
}

export async function updateCustomer(id, customer, db) {
  const database = db ?? (await getDatabase());
  const values = CUSTOMER_FIELDS.map((field) => customer[field] ?? null);
  await database.runAsync(UPDATE_CUSTOMER_SQL, [...values, id]);
  return fetchCustomerById(id, database);
}

export async function deleteCustomer(id, db) {
  const database = db ?? (await getDatabase());
  await database.runAsync('DELETE FROM customers WHERE id = ?', [id]);
}
