'use client';

import React from 'react';
import { useStore } from '@/lib/storeContext';
import { IndianRupee, TrendingUp, PackageCheck, AlertOctagon, Wallet, ShieldAlert, ArrowUpRight } from 'lucide-react';

export default function TabAnalytics() {
  const { state } = useStore();

  const totalOrders = state.orders.length;

  // Active (non-cancelled / non-refunded) orders
  const activeOrders = state.orders.filter(
    (o) => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Refunded'
  );

  const cancelledOrders = state.orders.filter((o) => o.orderStatus === 'Cancelled');
  const refundedOrders = state.orders.filter((o) => o.orderStatus === 'Refunded');

  // KPI Calculations
  const grossRevenue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Total COGS from items
  const totalCogs = activeOrders.reduce((sum, o) => {
    return (
      sum +
      o.items.reduce((itemSum, item) => itemSum + (item.cogs || Math.round(item.price * 0.45)) * item.quantity, 0)
    );
  }, 0);

  const totalShippingCollected = activeOrders.reduce((sum, o) => sum + o.shippingFee, 0);
  const totalDiscountsGiven = activeOrders.reduce((sum, o) => sum + o.couponDiscount, 0);
  const estimatedCourierExpenses = activeOrders.length * 75; // Approx ₹75 average courier charge

  // Net Profit = Gross Revenue - Total COGS - Estimated Courier Expenses
  const netProfit = Math.max(0, grossRevenue - totalCogs - estimatedCourierExpenses);
  const profitMarginPercent = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

  // COD vs Prepaid breakdown
  const codPendingCollection = activeOrders
    .filter((o) => o.paymentMethod === 'COD' && o.orderStatus !== 'Delivered')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const codDeliveredCollected = activeOrders
    .filter((o) => o.paymentMethod === 'COD' && o.orderStatus === 'Delivered')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const prepaidCollected = activeOrders
    .filter((o) => o.paymentMethod === 'ONLINE_PREPAID')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const cancelledRefundedValue = [...cancelledOrders, ...refundedOrders].reduce(
    (sum, o) => sum + o.totalAmount,
    0
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-maroon-700">
            Sales, Profit & COD Remittance Analytics
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time financial performance calculated dynamically from active orders, item COGS, and courier fees.
          </p>
        </div>
        <div className="text-xs font-semibold text-espresso bg-parchment-100 border border-gold-400 px-3.5 py-1.5 rounded-full">
          Total Order Volume: <strong>{totalOrders}</strong>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* KPI 1: Gross Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-gold-500/40 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Gross Sales Revenue</span>
            <h4 className="font-serif text-2xl sm:text-3xl font-extrabold text-maroon-700 mt-1">
              ₹{grossRevenue.toLocaleString('en-IN')}
            </h4>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{activeOrders.length} active customer orders</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-maroon-50 text-maroon-700 flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Total COGS */}
        <div className="bg-white p-5 rounded-3xl border border-gold-500/40 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Total COGS (Product Cost)</span>
            <h4 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-800 mt-1">
              ₹{totalCogs.toLocaleString('en-IN')}
            </h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Base artisan & manufacturing cost
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Net Profit & Margin */}
        <div className="bg-white p-5 rounded-3xl border border-gold-500/40 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Estimated Net Profit</span>
            <h4 className="font-serif text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">
              ₹{netProfit.toLocaleString('en-IN')}
            </h4>
            <p className="text-[11px] text-emerald-800 font-bold mt-1">
              Net Profit Margin: {profitMarginPercent}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: COD Pending Remittance */}
        <div className="bg-white p-5 rounded-3xl border border-gold-500/40 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">COD In Transit (Pending)</span>
            <h4 className="font-serif text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1">
              ₹{codPendingCollection.toLocaleString('en-IN')}
            </h4>
            <p className="text-[11px] text-stone-500 mt-1">
              To be collected by courier upon delivery
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 5: Prepaid Revenue (Instant Settled) */}
        <div className="bg-white p-5 rounded-3xl border border-gold-500/40 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Prepaid Settled Revenue</span>
            <h4 className="font-serif text-2xl sm:text-3xl font-extrabold text-maroon-700 mt-1">
              ₹{prepaidCollected.toLocaleString('en-IN')}
            </h4>
            <p className="text-[11px] text-stone-500 mt-1">
              Zero risk UPI & Razorpay payments
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-parchment-200 text-maroon-700 flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 6: Cancelled & Refunded Value */}
        <div className="bg-white p-5 rounded-3xl border border-gold-500/40 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Cancelled / Refunded</span>
            <h4 className="font-serif text-2xl sm:text-3xl font-extrabold text-rose-700 mt-1">
              ₹{cancelledRefundedValue.toLocaleString('en-IN')}
            </h4>
            <p className="text-[11px] text-stone-500 mt-1">
              {cancelledOrders.length} Cancelled, {refundedOrders.length} Refunded
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>

      </div>

    </div>
  );
}
