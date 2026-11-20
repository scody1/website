/**
 * Rajeshwar Pooja Samagri - Shared Formatting Utilities
 */

/**
 * Normalizes Indian phone numbers and constructs a WhatsApp direct message URL.
 * Automatically prefixes 10-digit Indian numbers with country code '91'.
 */
export function formatWhatsAppUrl(phone: string, message: string = ''): string {
  if (!phone) return '#';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '#';

  // If 10 digits, prepend India's country code 91
  const normalized = digits.length === 10 ? `91${digits}` : digits;

  if (message && message.trim()) {
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message.trim())}`;
  }
  return `https://wa.me/${normalized}`;
}

/**
 * Formats an amount as Indian Rupee currency.
 */
export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
