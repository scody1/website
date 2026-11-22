/** Normalises an Indian phone number and builds a WhatsApp link. */
export function formatWhatsAppUrl(phone: string, message = ''): string {
  if (!phone) return '#';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '#';
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return message.trim()
    ? `https://wa.me/${normalized}?text=${encodeURIComponent(message.trim())}`
    : `https://wa.me/${normalized}`;
}

export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatINR2(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** Last 10 digits of an Indian mobile number. */
export function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
}

/** Tiny className joiner. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
