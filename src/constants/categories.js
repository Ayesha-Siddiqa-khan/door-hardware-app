export const PRODUCT_CATEGORIES = [
  { key: 'doors', label: 'Doors' },
  { key: 'hardware', label: 'Door Hardware' },
  { key: 'kitchen', label: 'Kitchen & Cabinets' },
  { key: 'wardrobe', label: 'Almirah & Wardrobes' },
  { key: 'accessories', label: 'Accessories' },
];

export const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'upi', label: 'UPI' },
  { key: 'credit', label: 'Credit' },
];

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Transport',
  'Salary',
  'Maintenance',
  'Miscellaneous',
];

export function getProductCategoryLabel(key) {
  return PRODUCT_CATEGORIES.find((category) => category.key === key)?.label ?? key;
}
