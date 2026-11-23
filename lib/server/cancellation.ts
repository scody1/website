import { db } from './db';
import { ApiError } from './http';
import { addEvent, changeOrderStatus, getOrder, getOrderRow, refundOrder } from './orders';
import { cancelShipment } from './shipping';
import { sendStatusEmail } from './email';
import { allowedNextStatuses } from '../shared/orderStatus';
import type { AdminOrder, OrderStatus } from '../shared/types';

/** Statuses in which a CUSTOMER may still cancel (nothing handed to the courier yet). */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ['PENDING_PAYMENT', 'NEW', 'PROCESSING', 'PACKED'];

export type RefundOutcome = 'razorpay' | 'manual_due' | 'verify_first' | 'failed' | 'none';

export interface CancelResult {
  order: AdminOrder;
  refund: RefundOutcome;
  refundAmount: number;
  warnings: string[];
}

/**
 * The single place where orders are cancelled (admin panel, customer account).
 *  1. cancels the courier shipment if one was booked and not yet picked up
 *  2. marks the order Cancelled and returns stock + coupon use
 *  3. refunds automatically:
 *     - Razorpay  → full remaining amount refunded through Razorpay right away
 *     - UPI paid  → refund is recorded as DUE and shown to the admin (money must be sent manually)
 *     - UPI not yet verified → admin is warned to check the UTR first
 *     - COD / unpaid → nothing to refund
 *  Any failure is returned as a warning AND written to the order history — never hidden.
 */
export async function cancelOrder(
  id: string,
  opts: { reason: string; actor: 'admin' | 'customer'; by: string; refundUpi?: string }
): Promise<CancelResult> {
  const sql = db();
  const o = await getOrderRow(sql, id);
  const status = o.status as OrderStatus;
  if (status === 'CANCELLED') throw new ApiError(400, 'This order is already cancelled.');

  if (opts.actor === 'customer') {
    if (!CUSTOMER_CANCELLABLE.includes(status) || o.awb_code) {
      throw new ApiError(400, 'This order has already been handed to the courier and can no longer be cancelled. You can request a return instead.');
    }
  } else if (!allowedNextStatuses(status).includes('CANCELLED')) {
    throw new ApiError(400, 'This order can no longer be cancelled (it has already been shipped or closed).');
  }

  const warnings: string[] = [];

  // 1. courier
  if (o.sr_order_id || (o.awb_code && o.courier_provider === 'DELHIVERY')) {
    try {
      await cancelShipment(id, opts.by);
    } catch (err) {
      const w = `Courier shipment could not be cancelled automatically: ${(err as Error).message}. Cancel it in the courier panel so it is not picked up.`;
      warnings.push(w);
      await addEvent(sql, id, 'WARNING', w, 'system');
    }
  }

  // 2. status + stock (customer cancellations are recorded with actor "customer")
  await changeOrderStatus(id, 'CANCELLED', opts.reason, opts.actor === 'admin' ? 'admin' : 'system', opts.by);

  // 3. money
  const fresh = await getOrderRow(sql, id);
  const remaining = Number(fresh.total) - Number(fresh.refund_amount || 0);
  let refund: RefundOutcome = 'none';
  let refundAmount = 0;

  if (fresh.payment_status === 'PAID' && remaining > 0) {
    if (fresh.payment_method === 'RAZORPAY' && fresh.razorpay_payment_id) {
      try {
        await refundOrder(id, { amount: remaining, note: 'Automatic refund on cancellation', method: 'razorpay' }, opts.by);
        refund = 'razorpay';
        refundAmount = remaining;
      } catch (err) {
        refund = 'failed';
        const w = `Automatic Razorpay refund of ₹${remaining} failed: ${(err as Error).message}. Use "Refund" on the order page to retry.`;
        warnings.push(w);
        await addEvent(sql, id, 'WARNING', w, 'system');
      }
    } else {
      refund = 'manual_due';
      refundAmount = remaining;
      const upi = opts.refundUpi?.trim();
      if (upi) {
        await sql`UPDATE orders SET refund_notes = ${[fresh.refund_notes, `Customer refund UPI: ${upi}`].filter(Boolean).join(' | ')} WHERE id = ${id}`;
      }
      await addEvent(sql, id, 'PAYMENT', `Refund of ₹${remaining} is DUE (paid by ${fresh.payment_method}). Send it${upi ? ` to ${upi}` : ''} and record it with "Record manual refund".`, 'system');
    }
  } else if (fresh.payment_status === 'AWAITING_VERIFICATION') {
    refund = 'verify_first';
    await addEvent(sql, id, 'WARNING', `Cancelled before the UPI payment (UTR ${fresh.utr_number}) was verified. Check your bank: if the money arrived, press "Payment received" and then refund it.`, 'system');
  } else if (fresh.payment_status === 'PENDING' && fresh.payment_method === 'RAZORPAY') {
    await sql`UPDATE orders SET payment_status = 'FAILED', updated_at = now() WHERE id = ${id}`;
  }

  await sendStatusEmail(id, 'CANCELLED', opts.actor === 'customer' ? '' : opts.reason);
  return { order: await getOrder(id), refund, refundAmount, warnings };
}
