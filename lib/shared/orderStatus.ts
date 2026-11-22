import type { OrderStatus, PaymentMethod, PaymentStatus } from './types';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Awaiting Payment',
  NEW: 'New Order',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  READY_TO_SHIP: 'Ready to Ship (AWB assigned)',
  PICKUP_SCHEDULED: 'Pickup Scheduled',
  SHIPPED: 'Shipped',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RTO: 'Returned to Origin (RTO)',
  REFUNDED: 'Refunded'
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  AWAITING_VERIFICATION: 'Verify UTR',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded'
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  COD: 'Cash on Delivery',
  UPI: 'UPI (manual)',
  RAZORPAY: 'Razorpay'
};

export const ALL_ORDER_STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

/** Progress order used so courier updates only ever move an order forward. */
export const STATUS_RANK: Record<OrderStatus, number> = {
  PENDING_PAYMENT: 0,
  NEW: 1,
  PROCESSING: 2,
  PACKED: 3,
  READY_TO_SHIP: 4,
  PICKUP_SCHEDULED: 5,
  SHIPPED: 6,
  IN_TRANSIT: 7,
  OUT_FOR_DELIVERY: 8,
  DELIVERED: 9,
  RTO: 10,
  CANCELLED: 11,
  REFUNDED: 12
};

/** Statuses that can never change again (except REFUNDED after RTO/DELIVERED). */
export const TERMINAL_STATUSES: OrderStatus[] = ['CANCELLED', 'REFUNDED'];

/** Which statuses an admin may move an order to from a given status. */
export function allowedNextStatuses(current: OrderStatus): OrderStatus[] {
  switch (current) {
    case 'PENDING_PAYMENT':
      return ['CANCELLED'];
    case 'CANCELLED':
    case 'REFUNDED':
      return [];
    case 'DELIVERED':
      return ['REFUNDED'];
    case 'RTO':
      return ['REFUNDED'];
    default: {
      const flow: OrderStatus[] = [
        'NEW', 'PROCESSING', 'PACKED', 'READY_TO_SHIP', 'PICKUP_SCHEDULED',
        'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'
      ];
      const forward = flow.filter((s) => s !== current);
      const extra: OrderStatus[] = STATUS_RANK[current] >= STATUS_RANK.SHIPPED ? ['RTO'] : ['CANCELLED'];
      return [...forward, ...extra];
    }
  }
}

/** Customer-facing 5 step tracker. Returns -1 for cancelled / awaiting payment. */
export const TRACKING_STEPS = ['Order Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'] as const;
export function trackingStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'NEW':
    case 'PROCESSING':
      return 0;
    case 'PACKED':
    case 'READY_TO_SHIP':
    case 'PICKUP_SCHEDULED':
      return 1;
    case 'SHIPPED':
    case 'IN_TRANSIT':
      return 2;
    case 'OUT_FOR_DELIVERY':
      return 3;
    case 'DELIVERED':
      return 4;
    default:
      return -1;
  }
}

export function statusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'PENDING_PAYMENT':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'NEW':
      return 'bg-saffron-50 text-saffron-700 border-saffron-400';
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'CANCELLED':
    case 'RTO':
    case 'REFUNDED':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    default:
      return 'bg-sky-50 text-sky-800 border-sky-300';
  }
}
