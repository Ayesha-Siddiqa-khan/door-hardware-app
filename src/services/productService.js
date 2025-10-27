import { getDatabase } from '../database/db';
import { buildInsert, buildUpdate, queries } from '../database/queries';

const PRODUCT_FIELDS = [
  'name',
  'category',
  'description',
  'retail_price',
  'wholesale_price',
  'stock_quantity',
  'min_stock_level',
  'image_uri',
];

const INSERT_PRODUCT_SQL = buildInsert('products', PRODUCT_FIELDS);
const UPDATE_PRODUCT_SQL = buildUpdate('products', PRODUCT_FIELDS);

export async function fetchProducts(db) {
  const database = db ?? (await getDatabase());
  return database.getAllAsync(queries.products.all);
}

export async function fetchProductById(id, db) {
  const database = db ?? (await getDatabase());
  return database.getFirstAsync(queries.products.byId, [id]);
}

export async function fetchLowStockProducts(db) {
  const database = db ?? (await getDatabase());
  return database.getAllAsync(queries.products.lowStock);
}

export async function createProduct(product, db) {
  const database = db ?? (await getDatabase());
  const values = PRODUCT_FIELDS.map((field) => valueOrNull(product[field]));
  const result = await database.runAsync(INSERT_PRODUCT_SQL, values);
  return result.lastInsertRowId;
}

export async function updateProduct(id, product, db) {
  const database = db ?? (await getDatabase());
  const values = PRODUCT_FIELDS.map((field) => valueOrNull(product[field]));
  await database.runAsync(UPDATE_PRODUCT_SQL, [...values, id]);
  return fetchProductById(id, database);
}

export async function deleteProduct(id, db) {
  const database = db ?? (await getDatabase());
  await database.runAsync('DELETE FROM products WHERE id = ?', [id]);
}

export async function adjustProductStock(productId, quantityChange, type, notes = '', db) {
  const database = db ?? (await getDatabase());
  await database.withTransactionAsync(async (tx) => {
    await tx.runAsync(
      'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [quantityChange, productId]
    );
    await tx.runAsync(
      `INSERT INTO stock_history (product_id, quantity_change, type, notes)
       VALUES (?, ?, ?, ?)`,
      [productId, quantityChange, type, notes]
    );
  });
  return fetchProductById(productId, database);
}

export async function recordStockSnapshot(db) {
  const database = db ?? (await getDatabase());
  const products = await fetchProducts(database);
  const now = new Date().toISOString();
  await database.withTransactionAsync(async (tx) => {
    for (const product of products) {
      await tx.runAsync(
        `INSERT INTO stock_history (product_id, quantity_change, type, notes, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [product.id, 0, 'snapshot', 'Daily stock snapshot', now]
      );
    }
  });
}

function valueOrNull(value) {
  return value === undefined || value === null || value === '' ? null : value;
}

