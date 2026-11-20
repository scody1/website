'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { CourierConfig, Order } from '@/lib/types';
import { Truck, KeyRound, Play, Terminal, CheckCircle2, AlertTriangle, Printer, ExternalLink, ShieldCheck } from 'lucide-react';

interface TabCourierProps {
  onOpenPrintModal: (order: Order) => void;
}

export default function TabCourier({ onOpenPrintModal }: TabCourierProps) {
  const { state, updateCourierConfig, updateOrderCourierBooking, showToast } = useStore();

  const [cfg, setCfg] = useState<CourierConfig>({ ...state.courierConfig });
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'System Ready: Shiprocket & Delhivery Courier Engine initialized.',
    `Mode: ${state.courierConfig.execMode === 'LIVE_API' ? 'LIVE API GATEWAY' : 'INTELLIGENT SIMULATION SANDBOX'}`
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeBookingOrderId, setActiveBookingOrderId] = useState<string | null>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('en-IN');
    setConsoleLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 40)]);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateCourierConfig(cfg);
    addLog(`Configuration saved: Primary Courier = ${cfg.primaryCourier}, Mode = ${cfg.execMode}`);
  };

  // Test / Authenticate Shiprocket Live or Simulated
  const handleTestShiprocketAuth = async () => {
    setIsProcessing(true);
    addLog(`Initiating Shiprocket Authentication (${cfg.execMode})...`);

    const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') || '' : '';
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(adminToken ? { 'x-admin-token': adminToken } : {})
    };

    try {
      const res = await fetch('/api/shiprocket', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          action: 'auth',
          email: cfg.srEmail,
          password: cfg.srPassword,
          execMode: cfg.execMode
        })
      });

      const data = await res.json();
      addLog(`Auth Response: Status = ${res.status}, Success = ${data.success}`);
      
      if (data.token) {
        addLog(`Bearer Token Generated: ${data.token.slice(0, 16)}...`);
        setCfg((prev) => ({ ...prev, srToken: data.token }));
        updateCourierConfig({ srToken: data.token });
        showToast('Shiprocket Connected', 'Live Bearer Token acquired and stored.');
      } else {
        addLog(`Notice: ${data.message || 'Check credentials'}`);
        showToast('Shiprocket Notice', data.message || 'Check API credentials.', 'warn');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Network / Server Error: ${msg}`);
      showToast('Connection Notice', msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Book Courier / Schedule Pickup for an Order
  const handleBookCourierForOrder = async (order: Order) => {
    setIsProcessing(true);
    setActiveBookingOrderId(order.id);
    addLog(`Starting 1-Click Courier Booking via ${cfg.primaryCourier} for Order #${order.id}...`);

    const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') || '' : '';
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(adminToken ? { 'x-admin-token': adminToken } : {})
    };

    try {
      let res: Response;
      if (cfg.primaryCourier === 'Delhivery') {
        res = await fetch('/api/delhivery', {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({
            token: cfg.dlToken,
            order,
            pickupAddress: state.pickupAddress
          })
        });
      } else {
        res = await fetch('/api/shiprocket', {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({
            action: 'book_shipment',
            order,
            pickupAddress: state.pickupAddress,
            token: cfg.srToken,
            email: cfg.srEmail,
            password: cfg.srPassword,
            execMode: cfg.execMode
          })
        });
      }

      const data = await res.json();

      if (data.success && data.booking) {
        addLog(`Courier Successfully Booked: Carrier = ${data.booking.courierPartner}, AWB = ${data.booking.awbCode}`);
        updateOrderCourierBooking(order.id, data.booking);
        showToast('Pickup Scheduled!', `AWB #${data.booking.awbCode} generated via ${data.booking.courierPartner}.`);
      } else {
        addLog(`Booking Error: ${data.message}`);
        showToast('Booking Notice', data.message || 'Failed to book shipment.', 'warn');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addLog(`Booking Request Failed: ${msg}`);
      showToast('Request Failed', msg, 'error');
    } finally {
      setIsProcessing(false);
      setActiveBookingOrderId(null);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. API Credentials Vault & Live Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Settings Form */}
        <form onSubmit={handleSaveConfig} className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <h3 className="font-serif text-base font-bold text-maroon-700 flex items-center gap-2">
              <Truck className="w-5 h-5 text-saffron-600" />
              <span>Shiprocket & Delhivery API Vault</span>
            </h3>

            {/* Mode Tag */}
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                cfg.execMode === 'LIVE_API'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {cfg.execMode === 'LIVE_API' ? 'LIVE API MODE' : 'SIMULATION FALLBACK'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Primary Courier Partner *</label>
                <select
                  value={cfg.primaryCourier}
                  onChange={(e) => setCfg({ ...cfg, primaryCourier: e.target.value as 'Shiprocket' | 'Delhivery' })}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
                >
                  <option value="Shiprocket">Shiprocket (Default / Primary)</option>
                  <option value="Delhivery">Delhivery Direct API</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Execution Mode *</label>
                <select
                  value={cfg.execMode}
                  onChange={(e) => setCfg({ ...cfg, execMode: e.target.value as 'LIVE_API' | 'SIMULATION' })}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 font-bold text-espresso focus:border-maroon-700 focus:outline-none"
                >
                  <option value="SIMULATION">Simulation Sandbox (Offline / Test)</option>
                  <option value="LIVE_API">Live API Gateway (Real AWB & Pickups)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Shiprocket User Email</label>
                <input
                  type="email"
                  value={cfg.srEmail || ''}
                  onChange={(e) => setCfg({ ...cfg, srEmail: e.target.value })}
                  placeholder="your-shiprocket-email@domain.com"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Shiprocket Password</label>
                <input
                  type="password"
                  value={cfg.srPassword || ''}
                  onChange={(e) => setCfg({ ...cfg, srPassword: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-espresso focus:border-maroon-700 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Active Shiprocket Bearer Token <span className="text-[10px] text-stone-400">(Auto-Fetched or Manual)</span>
              </label>
              <input
                type="text"
                value={cfg.srToken || ''}
                onChange={(e) => setCfg({ ...cfg, srToken: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono text-[11px] text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Delhivery Client API Token <span className="text-[10px] text-stone-400">(Optional secondary)</span>
              </label>
              <input
                type="text"
                value={cfg.dlToken || ''}
                onChange={(e) => setCfg({ ...cfg, dlToken: e.target.value })}
                placeholder="delhivery_api_token_..."
                className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono text-[11px] text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              className="flex-1 bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold py-2.5 rounded-xl text-xs transition"
            >
              Save Courier Settings
            </button>

            <button
              type="button"
              onClick={handleTestShiprocketAuth}
              disabled={isProcessing}
              className="bg-stone-800 hover:bg-stone-900 text-amber-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-gold-400" />
              <span>{isProcessing ? 'Authenticating...' : 'Test Shiprocket Auth'}</span>
            </button>
          </div>
        </form>

        {/* Right: Live API Request / Response Inspector */}
        <div className="lg:col-span-5 bg-stone-950 p-5 rounded-3xl border border-gold-500/40 shadow-sm flex flex-col justify-between text-parchment-100">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <span className="font-mono text-xs font-bold text-gold-300 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Live Courier API Inspector</span>
              </span>
              <button
                onClick={() => setConsoleLogs(['Console cleared.'])}
                className="text-[10px] text-stone-500 hover:text-stone-300"
              >
                Clear
              </button>
            </div>

            {/* Terminal Window */}
            <div className="mt-3 bg-stone-900 p-3 rounded-2xl h-56 overflow-y-auto font-mono text-[11px] text-emerald-400 space-y-1.5 leading-relaxed">
              {consoleLogs.map((log, i) => (
                <p key={i} className="break-all">
                  {log}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
            <span>Pickup Hub: {state.pickupAddress.shiprocketPickupNickname || 'Primary_Warehouse'}</span>
            <span className="text-emerald-400 font-bold">API Route: /api/shiprocket</span>
          </div>
        </div>

      </div>

      {/* 2. 1-Click Order Booking & Label Generator Table */}
      <div className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200">
          <div>
            <h3 className="font-serif text-lg font-bold text-maroon-700">
              1-Click Courier Dispatch & Label Generator
            </h3>
            <p className="text-xs text-stone-500">
              Book courier pickups directly from your registered address and print 4×6 thermal labels.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-espresso">
            <thead className="bg-parchment-100 text-maroon-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Weight</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Carrier / AWB</th>
                <th className="p-3 text-right">Dispatch Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {state.orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400">
                    No orders placed yet. Once a customer places an order, you can book Shiprocket with 1-click here.
                  </td>
                </tr>
              ) : (
                state.orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-parchment-50/50 transition">
                    <td className="p-3 font-mono font-bold text-maroon-700">
                      #{ord.id}
                      <span className="block text-[10px] font-normal text-stone-500">
                        {ord.items.map((i) => i.name).join(', ')}
                      </span>
                    </td>

                    <td className="p-3">
                      <p className="font-bold">{ord.customer.name}</p>
                      <p className="text-[10px] text-stone-500">
                        {ord.customer.city}, {ord.customer.state} ({ord.customer.pincode})
                      </p>
                    </td>

                    <td className="p-3 text-stone-600 font-mono">
                      ~0.8 kg
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                          ord.paymentMethod === 'COD'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {ord.paymentMethod} (₹{ord.totalAmount})
                      </span>
                    </td>

                    <td className="p-3">
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
                        <span className="inline-block bg-stone-100 text-stone-600 text-[10px] px-2 py-0.5 rounded font-semibold">
                          Pickup Pending
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      {/* 1-Click Book Courier */}
                      <button
                        onClick={() => handleBookCourierForOrder(ord)}
                        disabled={isProcessing && activeBookingOrderId === ord.id}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-sm ${
                          ord.courierBooking
                            ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            : 'bg-saffron-500 hover:bg-saffron-600 text-white'
                        }`}
                      >
                        {isProcessing && activeBookingOrderId === ord.id
                          ? 'Booking...'
                          : ord.courierBooking
                          ? 'Re-Book Pickup'
                          : '1-Click Book Pickup'}
                      </button>

                      {/* Print 4x6 Label & Tax Invoice */}
                      <button
                        onClick={() => onOpenPrintModal(ord)}
                        className="bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-sm inline-flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5 text-gold-300" />
                        <span>Print Label & Invoice</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
