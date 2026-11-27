'use client';

/**
 * Shares a product using Web Share API (mobile native share) or falls back
 * to clipboard copy with a toast notification.
 */
export async function shareProduct(
  product: { name: string; slug?: string; id: string },
  showToast?: (title: string, message?: string, variant?: 'success' | 'error' | 'info') => void
) {
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/product/${product.slug || product.id}`
    : `/product/${product.slug || product.id}`;
  const title = product.name;
  const text = `Check out ${product.name} on Rajeshwar Pooja Samagri:`;

  // 1. Try Web Share API (native on mobile devices: WhatsApp, Instagram, Messages, etc.)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err: unknown) {
      const error = err as { name?: string };
      if (error?.name === 'AbortError') return; // User closed the native share dialog
    }
  }

  // 2. Clipboard fallback (desktop browsers)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      if (showToast) {
        showToast('Link Copied! 📋', 'Product link copied to clipboard. Share it on WhatsApp or social media!');
      }
      return;
    }
  } catch {
    /* ignore clipboard failure */
  }

  // 3. Direct WhatsApp web fallback if clipboard is unavailable
  if (typeof window !== 'undefined') {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }
}
