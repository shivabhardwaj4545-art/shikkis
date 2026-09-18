/**
 * Indian Rupee (INR, en-IN) currency formatter.
 * All money in Shikkis is stored as INTEGER paise (₹1 = 100 paise).
 */
export function formatPrice(paise: number): string {
  const rupees = Math.round(paise / 100);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Formats discount badge string
 */
export function formatDiscount(percent: number): string {
  return `${Math.round(percent)}% OFF`;
}
