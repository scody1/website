'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { Order, OrderStatus } from '@/lib/types';
import { Download, MessageCircle, Truck, RefreshCw, XCircle, Users, Package } from 'lucide-react';

interface TabOrdersProps {
  onOpenShiprocketModal?: (order: Order) => void;
  onOpenPrintModal?: (order: Order) => void;
}

export default function TabOrders({ onOpenShiprocketModal, onOpenPrintModal }: TabOrdersProps) {
  const { state, updateOrderStatus, showToast } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'customers'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrderForNotes, setSelectedOrderForNotes] = useState<Order | null>(null);
  const [statusNotesInput, setStatusNotesInput] = useState('');
  const [cancelRefundNoteInput, setCancelRefundNoteInput] = useState('');

  const filteredOrders = state.orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.orderStatus === statusFilter;
  });

  // Extract unique customer directory
  const customerMap = new Map();
  state.orders.forEach((o) => {
    const phone = o.customer.phone;
    if (!customerMap.has(phone)) {
      customerMap.set(phone, {
        name: o.customer.name,
        phone: o.customer.phone,
        email: o.customer.email,
        city: o.customer.city,
        state: o.customer.state,
        totalOrders: 1,
        totalSpent: o.totalAmount
      });
    } else {
      const existing = customerMap.get(phone);
      existing.totalOrders += 1;
      existing.totalSpent += o.totalAmount;
    }
  });
  const customers = Array.from(customerMap.values());

  // 1-Click WhatsApp customer alert generator
  const sendWhatsAppAlert = (order: Order) => {
    const cleanPhone = order.customer.phone.replace(/\D/g, '');
    let text = '';
    if (order.courierBooking) {
      text = `🙏 *Namaste ${order.customer.name}!* Your sacred parcel from *${state.storeConfig.storeName}* has been dispatched via *${order.courierBooking.courierPartner}*.\n\n*AWB Tracking:* ${order.courierBooking.awbCode}\n*Live Tracking:* ${order.courierBooking.trackingUrl}\n\nThank you for choosing authentic devotional essentials!`;
    } else {
      text = `🙏 *Namaste ${order.customer.name}!* Your order *#${order.id}* for ₹${order.totalAmount} is confirmed and currently under *${order.orderStatus}*.\n\nWe will share live courier tracking once dispatched. Dhanyawad!`;
    }
    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // CSV Export for Orders
  const exportOrdersCsv = () => {
    if (state.orders.length === 0) {
      showToast('No Orders', 'There are no orders to export yet.', 'warn');
      return;
    }

    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Phone',
      'Email',
      'Address',
      'City',
      'State',
      'Pincode',
      'Items',
      'Total Amount',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Courier Partner',
      'AWB Code'
    ];

    const rows = state.orders.map((o) => [
      o.id,
      o.createdAt,
      `"${o.customer.name}"`,
      o.customer.phone,
      o.customer.email,
      `"${o.customer.streetAddress}"`,
      o.customer.city,
      o.customer.state,
      o.customer.pincode,
      `"${o.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}"`,
      o.totalAmount,
      o.paymentMethod,
      o.paymentStatus,
      o.orderStatus,
      o.courierBooking?.courierPartner || 'N/A',
      o.courierBooking?.awbCode || 'N/A'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rajeshwar-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Orders Exported', 'Orders CSV exported successfully.');
  };

  // CSV Export for Customers
  const exportCustomersCsv = () => {
    if (customers.length === 0) {
      showToast('No Customers', 'No customer records available yet.', 'warn');
      return;
    }

    const headers = ['Customer Name', 'Phone', 'Email', 'City', 'State', 'Total Orders', 'Total Spent'];
    const rows = customers.map((c) => [
      `"${c.name}"`,
      c.phone,
      c.email,
      c.city,
      c.state,
      c.totalOrders,
      c.totalSpent
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rajeshwar-customers-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Customer Directory Exported', 'Customer Directory CSV downloaded.');
  };

  const handleSaveOrderNotes = (orderId: string) => {
    updateOrderStatus(orderId, selectedOrderForNotes?.orderStatus || 'Processing', statusNotesInput, cancelRefundNoteInput);
    setSelectedOrderForNotes(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gold-500/40 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'orders'
                ? 'bg-maroon-700 text-parchment-100 shadow'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Orders Workflow ({state.orders.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('customers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeSubTab === 'customers'
                ? 'bg-maroon-700 text-parchment-100 shadow'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Directory ({customers.length})</span>
          </button>
        </div>

        {/* CSV Export & Filter Buttons */}
        <div className="flex items-center gap-2">
          {activeSubTab === 'orders' ? (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-stone-300 rounded-xl px-3 py-1.5 text-xs text-espresso"
              >
                <option value="ALL">All Statuses</option>
                <option value="New Order">New Order</option>
                <option value="Processing">Processing</option>
                <option value="Packed">Packed</option>
                <option value="Pickup Scheduled">Pickup Scheduled</option>
                <option value="In Transit">In Transit</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Refunded">Refunded</option>
              </select>

              <button
                onClick={exportOrdersCsv}
                className="bg-stone-800 hover:bg-stone-900 text-amber-200 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5 text-gold-400" />
                <span>Export CSV</span>
              </button>
            </>
          ) : (
            <button
              onClick={exportCustomersCsv}
              className="bg-stone-800 hover:bg-stone-900 text-amber-200 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow"
            >
              <Download className="w-3.5 h-3.5 text-gold-400" />
              <span>Export Customers CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. ORDERS TABLE */}
      {activeSubTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-gold-500/40 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-espresso">
              <thead className="bg-parchment-100 text-maroon-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Order ID & Date</th>
                  <th className="p-3.5">Customer & Delivery</th>
                  <th className="p-3.5">Items & Subtotal</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Status Workflow</th>
                  <th className="p-3.5">Courier & AWB</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400">
                      No orders found for this status. Placed orders will appear here in real-time.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-parchment-50/50 transition">
                      
                      {/* Order ID & Date */}
                      <td className="p-3.5 font-mono">
                        <span className="font-bold text-maroon-700">#{ord.id}</span>
                        <span className="block text-[10px] text-stone-400 mt-0.5">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>

                      {/* Customer & Address */}
                      <td className="p-3.5">
                        <p className="font-bold text-espresso">{ord.customer.name}</p>
                        <p className="text-[11px] text-stone-500 font-mono">{ord.customer.phone}</p>
                        <p className="text-[10px] text-stone-400 truncate max-w-[180px]">
                          {ord.customer.streetAddress}, {ord.customer.city} ({ord.customer.pincode})
                        </p>
                      </td>

                      {/* Items */}
                      <td className="p-3.5">
                        <span className="font-semibold text-espresso block">
                          {ord.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                        </span>
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          Amount: <strong>₹{ord.totalAmount}</strong>
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                            ord.paymentMethod === 'COD'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {ord.paymentMethod}
                        </span>
                        <span className="block text-[10px] text-stone-400 mt-0.5">
                          {ord.paymentStatus}
                        </span>
                      </td>

                      {/* Status Workflow Dropdown */}
                      <td className="p-3.5">
                        <select
                          value={ord.orderStatus}
                          onChange={(e) => updateOrderStatus(ord.id, e.target.value as OrderStatus)}
                          className="border border-stone-300 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
                        >
                          <option value="New Order">New Order</option>
                          <option value="Processing">Processing</option>
                          <option value="Packed">Packed</option>
                          <option value="Pickup Scheduled">Pickup Scheduled</option>
                          <option value="Shipped">Shipped</option>
                          <option value="In Transit">In Transit</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                      </td>

                      {/* Courier & AWB */}
                      <td className="p-3.5">
                        {ord.courierBooking ? (
                          <div>
                            <span className="font-bold text-emerald-700 text-[11px] block">
                              {ord.courierBooking.courierPartner}
                            </span>
                            <span className="font-mono text-[10px] text-stone-500 block">
                              AWB: {ord.courierBooking.awbCode}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">Not booked</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                        {/* 1-Click WhatsApp customer alert */}
                        <button
                          onClick={() => sendWhatsAppAlert(ord)}
                          className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"
                          title="Send WhatsApp Dispatch Alert"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        {/* Print Invoice & Shipping Label */}
                        {onOpenPrintModal && (
                          <button
                            onClick={() => onOpenPrintModal(ord)}
                            className="p-1.5 hover:bg-parchment-200 text-maroon-700 rounded-lg"
                            title="Print 4x6 Thermal Label & Tax Invoice"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CUSTOMER DIRECTORY TABLE */}
      {activeSubTab === 'customers' && (
        <div className="bg-white rounded-3xl border border-gold-500/40 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-espresso">
              <thead className="bg-parchment-100 text-maroon-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Mobile Phone</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">City & State</th>
                  <th className="p-3.5">Total Orders</th>
                  <th className="p-3.5">Lifetime Value (LTV)</th>
                  <th className="p-3.5 text-right">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400">
                      No customer records yet.
                    </td>
                  </tr>
                ) : (
                  customers.map((c, i) => (
                    <tr key={i} className="hover:bg-parchment-50/50 transition">
                      <td className="p-3.5 font-bold text-espresso">{c.name}</td>
                      <td className="p-3.5 font-mono">{c.phone}</td>
                      <td className="p-3.5">{c.email || 'N/A'}</td>
                      <td className="p-3.5">{c.city}, {c.state}</td>
                      <td className="p-3.5 font-bold">{c.totalOrders} order(s)</td>
                      <td className="p-3.5 font-bold text-maroon-700">₹{c.totalSpent}</td>
                      <td className="p-3.5 text-right">
                        <a
                          href={`https://wa.me/91${c.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
