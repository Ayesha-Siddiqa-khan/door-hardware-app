export function validateProduct(product) {
  const errors = {};
  if (!product.name) errors.name = 'Product name is required';
  if (!product.category) errors.category = 'Select a category';
  if (product.retail_price === undefined || product.retail_price === null) {
    errors.retail_price = 'Retail price is required';
  }
  if (Number(product.retail_price) < 0) errors.retail_price = 'Price must be positive';
  if (product.wholesale_price && Number(product.wholesale_price) < 0) {
    errors.wholesale_price = 'Wholesale price must be positive';
  }
  if (product.stock_quantity && Number(product.stock_quantity) < 0) {
    errors.stock_quantity = 'Stock cannot be negative';
  }
  return errors;
}

export function validateCustomer(customer) {
  const errors = {};
  if (!customer.name) errors.name = 'Customer name is required';
  if (customer.phone && customer.phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Enter a valid phone number';
  }
  return errors;
}

export function validateSale({ items, totalAmount }) {
  const errors = {};
  if (!items || !items.length) errors.items = 'Add at least one item';
  if (!totalAmount || Number(totalAmount) <= 0) errors.totalAmount = 'Sale total must be greater than 0';
  return errors;
}
