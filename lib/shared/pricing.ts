import type { PaymentMethod, PaymentSettings, PublicCoupon, Quote } from './types';

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

/**
 * Validates a coupon against a subtotal. Returns an error message or null.
 * Date / usage-limit checks happen on the server where that data lives.
 */
export function couponProblem(coupon: PublicCoupon, subtotal: number): string | null {
  if (subtotal < coupon.minOrderValue) {
    return `Coupon ${coupon.code} needs a minimum order of ₹${coupon.minOrderValue}.`;
  }
  return null;
}

export function couponDiscount(coupon: PublicCoupon, subtotal: number): number {
  let d = coupon.discountType === 'PERCENT'
    ? Math.round((subtotal * coupon.discountValue) / 100)
    : coupon.discountValue;
  if (coupon.maxDiscount) d = Math.min(d, coupon.maxDiscount);
  return Math.max(0, Math.min(d, subtotal));
}

/**
 * The single pricing formula used by the cart, the checkout quote and the
 * server when the order is actually created.
 */
export function computeQuote(
  lines: PricedLine[],
  payments: Pick<PaymentSettings, 'standardShippingFee' | 'freeShippingThreshold' | 'codFee' | 'codMaxOrderValue' | 'enableCod'>,
  paymentMethod: PaymentMethod | null,
  coupon: PublicCoupon | null
): Quote {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  let discount = 0;
  let couponError: string | null = null;
  let couponCode: string | null = null;
  if (coupon) {
    couponError = couponProblem(coupon, subtotal);
    if (!couponError) {
      discount = couponDiscount(coupon, subtotal);
      couponCode = coupon.code;
    }
  }

  const threshold = payments.freeShippingThreshold;
  const qualifiesForFreeShipping = threshold > 0 && subtotal >= threshold;
  const shippingFee = subtotal > 0 && !qualifiesForFreeShipping ? payments.standardShippingFee : 0;
  const amountNeededForFreeShipping = threshold > 0 ? Math.max(0, threshold - subtotal) : 0;

  const beforeCod = Math.max(0, subtotal - discount + shippingFee);
  const codAllowed = payments.enableCod && (payments.codMaxOrderValue <= 0 || beforeCod <= payments.codMaxOrderValue);
  const codFee = paymentMethod === 'COD' && codAllowed ? payments.codFee : 0;

  return {
    subtotal,
    discount,
    couponCode,
    couponError,
    shippingFee,
    codFee,
    total: beforeCod + codFee,
    qualifiesForFreeShipping,
    amountNeededForFreeShipping,
    codAllowed
  };
}
