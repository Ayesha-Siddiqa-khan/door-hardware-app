export function formatCurrency(value, currency = 'PKR', locale = 'en-PK') {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPhoneNumber(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function formatInvoiceNumber(number) {
  return `INV-${String(number).padStart(5, '0')}`;
}

export function formatPercentage(value) {
  const num = Number(value) || 0;
  return `${num.toFixed(1)}%`;
}
