export function createProductModel(overrides = {}) {
  return {
    name: '',
    category: 'doors',
    description: '',
    retail_price: 0,
    wholesale_price: 0,
    stock_quantity: 0,
    min_stock_level: 5,
    image_uri: null,
    ...overrides,
  };
}

export function createCustomerModel(overrides = {}) {
  return {
    name: '',
    phone: '',
    address: '',
    city: '',
    ...overrides,
  };
}

export function createSaleModel(overrides = {}) {
  return {
    invoice_number: '',
    customer_id: null,
    total_amount: 0,
    payment_method: 'cash',
    payment_status: 'paid',
    sale_date: new Date().toISOString(),
    notes: '',
    ...overrides,
  };
}

export function createSaleItemModel(overrides = {}) {
  return {
    product_id: null,
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    ...overrides,
  };
}

export function createExpenseModel(overrides = {}) {
  return {
    category: 'Miscellaneous',
    amount: 0,
    description: '',
    expense_date: new Date().toISOString(),
    ...overrides,
  };
}
